import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import worker from "../worker/src/index.mjs";

function database(migrated = true) {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync("worker/migrations/0001.sql", "utf8"));
  if (migrated) sqlite.exec(readFileSync("worker/migrations/0002.sql", "utf8"));
  return {
    sqlite,
    async batch(statements) {
      sqlite.exec("BEGIN");
      try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec("COMMIT"); return results; }
      catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
    prepare(sql) { return { bind(...args) { return {
      async run() { const result = sqlite.prepare(sql).run(...args); return { success: true, meta: { changes: Number(result.changes) } }; },
      async first() { return sqlite.prepare(sql).get(...args) ?? null; },
      async all() { return { results: sqlite.prepare(sql).all(...args) }; },
    }; } }; },
  };
}

const origin = "https://example.org";
const envFor = (db) => ({ DB: db, ALLOWED_ORIGINS: origin, TURNSTILE_SECRET: "test-secret", BREVO_API_KEY: "test-key", MAIL_FROM: "sender@example.org", MAIL_TO: "recipient@example.org" });
const request = (body, requestOrigin = origin) => new Request("https://worker.test/contact", { method: "POST", headers: { Origin: requestOrigin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
const sample = { nome: "Pessoa Teste", email: "person@example.org", assunto: "Batismo", mensagem: "Mensagem de teste", turnstileToken: "token-valid" };

test("recebe pedido de oração anônimo validado e inclui no resumo semanal", async () => {
  const db = database(); const env = envFor(db); const sent = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => String(url).includes("siteverify") ? Response.json({ success: true, hostname: "example.org" }) : (sent.push(JSON.parse(options.body)), Response.json({ messageId: "ok" }, { status: 201 }));
  const prayer = (data, requestOrigin = origin) => new Request("https://worker.test/prayer", { method: "POST", headers: { Origin: requestOrigin, "Content-Type": "application/json" }, body: JSON.stringify(data) });
  try {
    const input = { nome: "", mensagem: "Peço oração pela minha família.", turnstileToken: "token-valid" };
    assert.equal((await worker.fetch(prayer(input, "https://other.example"), env, { waitUntil() {} })).status, 403);
    assert.equal((await worker.fetch(prayer({ ...input, mensagem: " " }), env, { waitUntil() {} })).status, 400);
    assert.equal((await worker.fetch(prayer(input), env, { waitUntil() {} })).status, 201);
    const saved = db.sqlite.prepare("SELECT name, message, notified_at FROM prayer_requests").get();
    assert.equal(saved.name, null); assert.equal(saved.message, input.mensagem); assert.equal(saved.notified_at, null);
    assert.equal(sent.length, 0);
    const nextSaturday = new Date();
    nextSaturday.setUTCDate(nextSaturday.getUTCDate() + ((6 - nextSaturday.getUTCDay() + 7) % 7 || 7));
    nextSaturday.setUTCHours(12, 0, 0, 0);
    await worker.scheduled({ cron: "0 12 * * 6", scheduledTime: nextSaturday.getTime() }, env);
    assert.equal(sent.length, 1);
    assert.ok(sent[0].textContent.includes(input.mensagem));
    assert.ok(sent[0].textContent.includes("Pedido anônimo"));
  } finally { globalThis.fetch = previousFetch; }
});

test("recusa origem não autorizada, dados inválidos e proteção antispam inválida", async () => {
  const db = database(); const env = envFor(db);
  assert.equal((await worker.fetch(request(sample, "https://other.example"), env, { waitUntil() {} })).status, 403);
  assert.equal((await worker.fetch(request({ ...sample, email: "inválido" }), env, { waitUntil() {} })).status, 400);
  const malformed = new Request("https://worker.test/contact", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: "{" });
  assert.equal((await worker.fetch(malformed, env, { waitUntil() {} })).status, 400);
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ success: false });
  try { assert.equal((await worker.fetch(request(sample), env, { waitUntil() {} })).status, 403); }
  finally { globalThis.fetch = previousFetch; }
  assert.equal(db.sqlite.prepare("SELECT count(*) AS n FROM contact_messages").get().n, 0);
});

test("migração preserva mensagens existentes e acrescenta telefone", () => {
  const db = database(false);
  db.sqlite.prepare("INSERT INTO contact_messages (id, name, email, subject, message, created_at) VALUES (?, ?, ?, ?, ?, ?)").run("existente", "Pessoa", "pessoa@example.org", "Assunto", "Mensagem", "2026-01-01");
  db.sqlite.exec(readFileSync("worker/migrations/0002.sql", "utf8"));
  const row = db.sqlite.prepare("SELECT email, phone FROM contact_messages WHERE id = ?").get("existente");
  assert.equal(row.email, "pessoa@example.org");
  assert.equal(row.phone, null);
});

test("aceita email ou telefone, rejeita ambos vazios e inclui telefone na notificação", async () => {
  const db = database();
  const env = envFor(db); const jobs = []; const sent = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => String(url).includes("siteverify") ? Response.json({ success: true, hostname: "example.org" }) : (sent.push(JSON.parse(options.body)), Response.json({ messageId: "ok" }, { status: 201 }));
  try {
    assert.equal((await worker.fetch(request({ ...sample, email: "", telefone: "" }), env, { waitUntil() {} })).status, 400);
    assert.equal((await worker.fetch(request({ ...sample, email: "", telefone: "(61) 98191-3204" }), env, { waitUntil(p) { jobs.push(p); } })).status, 201);
    await Promise.all(jobs);
    const saved = db.sqlite.prepare("SELECT email, phone FROM contact_messages").get();
    assert.equal(saved.email, ""); assert.equal(saved.phone, "(61) 98191-3204");
    assert.match(sent[0].textContent, /\(61\) 98191-3204/);
    assert.equal((await worker.fetch(request({ ...sample, telefone: "" }), env, { waitUntil(p) { jobs.push(p); } })).status, 201);
    assert.equal((await worker.fetch(request({ ...sample, email: "inválido", telefone: "(61) 98191-3204" }), env, { waitUntil() {} })).status, 400);
  } finally { await Promise.all(jobs); globalThis.fetch = previousFetch; }
});

test("aceita telefone quando o campo email é omitido da requisição", async () => {
  const db = database(); const env = envFor(db); const jobs = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url) => String(url).includes("siteverify") ? Response.json({ success: true, hostname: "example.org" }) : Response.json({ messageId: "ok" }, { status: 201 });
  try {
    const { email, ...withoutEmail } = sample;
    assert.equal((await worker.fetch(request({ ...withoutEmail, telefone: "(61) 98191-3204" }), env, { waitUntil(p) { jobs.push(p); } })).status, 201);
    await Promise.all(jobs);
    assert.equal(db.sqlite.prepare("SELECT email FROM contact_messages").get().email, "");
  } finally { await Promise.all(jobs); globalThis.fetch = previousFetch; }
});

test("rejeita corpo grande sem consumir o fluxo inteiro", async () => {
  const db = database(); const env = envFor(db); let produced = 0;
  const stream = new ReadableStream({ pull(controller) { produced++; if (produced > 20) controller.close(); else controller.enqueue(new Uint8Array(4096)); } });
  const oversized = new Request("https://worker.test/contact", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: stream, duplex: "half" });
  assert.equal((await worker.fetch(oversized, env, { waitUntil() {} })).status, 413);
  assert.ok(produced < 20);
});

test("salva o contato antes de notificar e mantém pendência quando Brevo falha", async () => {
  const db = database(); const env = envFor(db); const jobs = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url) => String(url).includes("siteverify") ? Response.json({ success: true, hostname: "example.org" }) : new Response("offline", { status: 503 });
  try {
    const response = await worker.fetch(request(sample), env, { waitUntil(promise) { jobs.push(promise); } });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { ok: true });
    await Promise.all(jobs);
    const saved = db.sqlite.prepare("SELECT name, email, message, notified_at FROM contact_messages").get();
    assert.equal(saved.name, sample.nome); assert.equal(saved.email, sample.email); assert.equal(saved.message, sample.mensagem); assert.equal(saved.notified_at, null);
  } finally { globalThis.fetch = previousFetch; }
});

test("retenta pendências e registra confirmação do Brevo", async () => {
  const db = database(); const env = envFor(db); const jobs = [];
  const previousFetch = globalThis.fetch; let sendSucceeded = false; let emails = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes("siteverify")) return Response.json({ success: true, hostname: "example.org" });
    emails++; return sendSucceeded ? Response.json({ messageId: "confirmed" }, { status: 201 }) : new Response("offline", { status: 503 });
  };
  try {
    await worker.fetch(request(sample), env, { waitUntil(promise) { jobs.push(promise); } });
    await Promise.all(jobs);
    sendSucceeded = true;
    await worker.scheduled({ cron: "*/5 * * * *", scheduledTime: Date.now() }, env, { waitUntil() {} });
    assert.ok(db.sqlite.prepare("SELECT notified_at FROM contact_messages").get().notified_at);
    await worker.scheduled({ cron: "*/5 * * * *", scheduledTime: Date.now() }, env, { waitUntil() {} });
    assert.equal(emails, 2);
  } finally { globalThis.fetch = previousFetch; }
});

test("envia todos os dados do contato ao destinatário configurado, inclusive na nova tentativa", async () => {
  const db = database(); const env = envFor(db); const jobs = []; const deliveries = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (String(url).includes("siteverify")) return Response.json({ success: true, hostname: "example.org" });
    deliveries.push(JSON.parse(options.body));
    return deliveries.length === 1 ? new Response("offline", { status: 503 }) : Response.json({ messageId: "confirmed" }, { status: 201 });
  };
  try {
    await worker.fetch(request(sample), env, { waitUntil(promise) { jobs.push(promise); } });
    await Promise.all(jobs);
    await worker.scheduled({ cron: "*/5 * * * *", scheduledTime: Date.now() }, env);
    assert.equal(deliveries.length, 2);
    for (const email of deliveries) {
      assert.equal(email.to[0].email, env.MAIL_TO);
      for (const value of [sample.nome, sample.email, sample.assunto, sample.mensagem]) assert.ok(email.textContent.includes(value));
    }
  } finally { globalThis.fetch = previousFetch; }
});

test("agrupa os pedidos de oração no sábado às 9h e não repete o resumo", async () => {
  const db = database(); const env = envFor(db); const sent = [];
  db.sqlite.prepare("INSERT INTO prayer_requests (id, name, message, created_at) VALUES (?, ?, ?, ?)").run("prayer-1", "Pessoa Teste", "Pedido de teste", "2026-11-12T12:00:00.000Z");
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => { sent.push(JSON.parse(options.body)); return Response.json({ messageId: "confirmed" }, { status: 201 }); };
  try {
    await worker.scheduled({ cron: "0 12 * * 6", scheduledTime: Date.parse("2026-11-14T12:00:00.000Z") }, env, { waitUntil() {} });
    assert.equal(sent.length, 1);
    assert.match(sent[0].textContent, /Pessoa Teste/);
    assert.match(sent[0].textContent, /Pedido de teste/);
    assert.ok(db.sqlite.prepare("SELECT notified_at FROM prayer_requests").get().notified_at);
    await worker.scheduled({ cron: "0 12 * * 6", scheduledTime: Date.parse("2026-11-14T12:00:00.000Z") }, env, { waitUntil() {} });
    assert.equal(sent.length, 1);
  } finally { globalThis.fetch = previousFetch; }
});

test("mantém pedidos pendentes quando falha o envio do resumo", async () => {
  const db = database(); const env = envFor(db);
  db.sqlite.prepare("INSERT INTO prayer_requests (id, name, message, created_at) VALUES (?, ?, ?, ?)").run("prayer-1", "Pessoa", "Pedido de teste", "2026-11-12T12:00:00.000Z");
  const previousFetch = globalThis.fetch; let succeeds = false; let text = "";
  globalThis.fetch = async (_url, options) => { text = JSON.parse(options.body).textContent; return succeeds ? Response.json({ messageId: "confirmed" }, { status: 201 }) : new Response("offline", { status: 503 }); };
  try {
    await worker.scheduled({ cron: "0 12 * * 6", scheduledTime: Date.parse("2026-11-14T12:00:00.000Z") }, env, { waitUntil() {} });
    assert.equal(db.sqlite.prepare("SELECT notified_at FROM prayer_requests").get().notified_at, null);
    db.sqlite.prepare("INSERT INTO prayer_requests (id, name, message, created_at) VALUES (?, ?, ?, ?)").run("after-cutoff", "Pessoa", "Pedido posterior", "2026-11-14T12:01:00.000Z");
    succeeds = true;
    await worker.scheduled({ cron: "*/5 * * * *", scheduledTime: Date.parse("2026-11-14T12:05:00.000Z") }, env, { waitUntil() {} });
    assert.match(text, /Pedido de teste/);
    assert.doesNotMatch(text, /Pedido posterior/);
    assert.ok(db.sqlite.prepare("SELECT notified_at FROM prayer_requests WHERE id = 'prayer-1'").get().notified_at);
    assert.equal(db.sqlite.prepare("SELECT notified_at FROM prayer_requests WHERE id = 'after-cutoff'").get().notified_at, null);
  } finally { globalThis.fetch = previousFetch; }
});

test("não marca pedido que não estava no resumo como enviado", async () => {
  const db = database(); const env = envFor(db);
  db.sqlite.prepare("INSERT INTO prayer_requests (id, name, message, created_at) VALUES (?, ?, ?, ?)").run("first", "Pessoa", "Incluído", "2026-11-12T12:00:00.000Z");
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    db.sqlite.prepare("INSERT INTO prayer_requests (id, name, message, created_at) VALUES (?, ?, ?, ?)").run("late", "Pessoa", "Não incluído", "2026-11-13T12:00:00.000Z");
    return Response.json({ messageId: "confirmed" }, { status: 201 });
  };
  try {
    await worker.scheduled({ cron: "0 12 * * 6", scheduledTime: Date.parse("2026-11-14T12:00:00.000Z") }, env, { waitUntil() {} });
    assert.equal(db.sqlite.prepare("SELECT notified_at FROM prayer_requests WHERE id = 'late'").get().notified_at, null);
  } finally { globalThis.fetch = previousFetch; }
});
