const cors = (origin) => ({ "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin", "Cache-Control": "no-store" });
const response = (status, body, origin) => Response.json(body, { status, headers: cors(origin) });
const allowed = (origin, env) => Boolean(origin && env.ALLOWED_ORIGINS?.split(",").map((item) => item.trim()).includes(origin));
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const nowIso = () => new Date().toISOString();

async function readLimited(request, limit) {
  if (Number(request.headers.get("Content-Length")) > limit) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0, text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); return null; }
    text += decoder.decode(value, { stream: true });
  }
}

async function notifyPending(env) {
  if (!env.DB || !env.BREVO_API_KEY || !env.MAIL_FROM || !env.MAIL_TO) return;
  for (let i = 0; i < 20; i++) {
    const token = crypto.randomUUID();
    const now = nowIso();
    const until = new Date(Date.now() + 5 * 60_000).toISOString();
    const claim = await env.DB.prepare("UPDATE contact_messages SET claim_token = ?, claim_until = ? WHERE id = (SELECT id FROM contact_messages WHERE notified_at IS NULL AND (claim_until IS NULL OR claim_until < ?) ORDER BY created_at LIMIT 1) RETURNING id, name, email, subject, message").bind(token, until, now).first();
    if (!claim) return;
    try {
      const sent = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": env.BREVO_API_KEY },
        body: JSON.stringify({ sender: { email: env.MAIL_FROM }, to: [{ email: env.MAIL_TO }], subject: "Novo contato pelo site da Catedral", textContent: `Nome: ${claim.name}\nE-mail: ${claim.email}\nAssunto: ${claim.subject}\n\nMensagem:\n${claim.message}` }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!sent.ok) throw new Error("Falha de envio");
      await env.DB.prepare("UPDATE contact_messages SET notified_at = ?, claim_token = NULL, claim_until = NULL WHERE id = ? AND claim_token = ?").bind(nowIso(), claim.id, token).run();
    } catch {
      await env.DB.prepare("UPDATE contact_messages SET claim_token = NULL, claim_until = NULL WHERE id = ? AND claim_token = ?").bind(claim.id, token).run();
      return;
    }
  }
}

async function notifyPrayerDigest(env) {
  if (!env.DB || !env.BREVO_API_KEY || !env.MAIL_FROM || !env.MAIL_TO) return;
  const token = crypto.randomUUID();
  const now = nowIso();
  const until = new Date(Date.now() + 5 * 60_000).toISOString();
  const digest = await env.DB.prepare("UPDATE prayer_digests SET claim_token = ?, claim_until = ? WHERE id = (SELECT id FROM prayer_digests WHERE sent_at IS NULL AND (claim_until IS NULL OR claim_until < ?) ORDER BY cutoff LIMIT 1) RETURNING id, cutoff").bind(token, until, now).first();
  if (!digest) return;
  try {
    const { results } = await env.DB.prepare("SELECT name, message FROM prayer_requests WHERE notified_at IS NULL AND digest_id = ? ORDER BY created_at, id").bind(digest.id).all();
    if (results.length) {
      const textContent = results.map(({ name, message }, index) => `${index + 1}. ${name || "Pedido anônimo"}\n${message}`).join("\n\n");
      const sent = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST", headers: { "Content-Type": "application/json", "api-key": env.BREVO_API_KEY }, signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({ sender: { email: env.MAIL_FROM }, to: [{ email: env.MAIL_TO }], subject: "Pedidos de oração da semana", textContent }),
      });
      if (!sent.ok) throw new Error("Falha de envio");
    }
    const completed = nowIso();
    await env.DB.batch([
      env.DB.prepare("UPDATE prayer_requests SET notified_at = ? WHERE notified_at IS NULL AND digest_id = ? AND EXISTS (SELECT 1 FROM prayer_digests WHERE id = ? AND claim_token = ? AND sent_at IS NULL)").bind(completed, digest.id, digest.id, token),
      env.DB.prepare("UPDATE prayer_digests SET sent_at = ?, claim_token = NULL, claim_until = NULL WHERE id = ? AND claim_token = ?").bind(completed, digest.id, token),
    ]);
  } catch {
    await env.DB.prepare("UPDATE prayer_digests SET claim_token = NULL, claim_until = NULL WHERE id = ? AND claim_token = ?").bind(digest.id, token).run();
  }
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin");
    if (!allowed(origin, env)) return new Response(null, { status: 403, headers: { "Cache-Control": "no-store" } });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    const path = new URL(request.url).pathname;
    if (request.method !== "POST" || !["/contact", "/prayer"].includes(path)) return response(404, { ok: false }, origin);
    if (!env.DB || !env.TURNSTILE_SECRET || !env.BREVO_API_KEY || !env.MAIL_FROM || !env.MAIL_TO) return response(503, { ok: false }, origin);
    try {
      if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) return response(400, { ok: false }, origin);
      const raw = await readLimited(request, 12_000);
      if (raw === null) return response(413, { ok: false }, origin);
      let data;
      try { data = JSON.parse(raw); } catch { return response(400, { ok: false }, origin); }
      const fields = path === "/contact" ? ["nome", "email", "assunto", "mensagem", "turnstileToken"] : ["nome", "mensagem", "turnstileToken"];
      if (!data || typeof data !== "object" || fields.some((key) => typeof data[key] !== "string")) return response(400, { ok: false }, origin);
      const name = data.nome.trim(), message = data.mensagem.trim();
      if (name.length > 150 || !message || message.length > 600 || !data.turnstileToken || data.turnstileToken.length > 2048) return response(400, { ok: false }, origin);
      if (path === "/contact" && (!name || !validEmail(data.email.trim()) || data.email.trim().length > 254 || !data.assunto.trim() || data.assunto.trim().length > 120)) return response(400, { ok: false }, origin);
      const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: data.turnstileToken }), signal: AbortSignal.timeout(10_000) });
      if (!verification.ok) return response(503, { ok: false }, origin);
      const result = await verification.json();
      if (!result.success || result.hostname !== new URL(origin).hostname) return response(403, { ok: false }, origin);
      if (path === "/contact") {
        await env.DB.prepare("INSERT INTO contact_messages (id, name, email, subject, message, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), name, data.email.trim(), data.assunto.trim(), message, nowIso()).run();
        ctx.waitUntil(notifyPending(env));
      } else {
        await env.DB.prepare("INSERT INTO prayer_requests (id, name, message, created_at) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), name || null, message, nowIso()).run();
      }
      return response(201, { ok: true }, origin);
    } catch {
      return response(503, { ok: false }, origin);
    }
  },
  async scheduled(controller, env) {
    const time = new Date(controller.scheduledTime);
    if (controller.cron !== "*/5 * * * *") {
      const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", hourCycle: "h23" }).formatToParts(time).map(({ type, value }) => [type, value]));
      if (parts.weekday === "Sat" && parts.hour === "09") {
        const cutoff = time.toISOString();
        await env.DB.batch([
          env.DB.prepare("INSERT OR IGNORE INTO prayer_digests (id, cutoff) SELECT ?, ? WHERE EXISTS (SELECT 1 FROM prayer_requests WHERE notified_at IS NULL AND digest_id IS NULL AND created_at < ?)").bind(cutoff, cutoff, cutoff),
          env.DB.prepare("UPDATE prayer_requests SET digest_id = ? WHERE notified_at IS NULL AND digest_id IS NULL AND created_at < ? AND EXISTS (SELECT 1 FROM prayer_digests WHERE id = ? AND sent_at IS NULL)").bind(cutoff, cutoff, cutoff),
        ]);
      }
    }
    await notifyPending(env);
    await notifyPrayerDigest(env);
  },
};
