import { selectAnnouncements } from "../utils/announcements.mjs";

const data = document.getElementById("announcements-data");
const banner = document.querySelector("[data-announcement-banner]");
const dialog = document.querySelector("[data-announcement-dialog]");
if (data && banner && dialog) {
  const notices = JSON.parse(data.textContent);
  const key = (item) => `announcement:${item.id}:${item.start || ""}:${item.end || ""}`;
  const dismissed = (item) => {
    try {
      if (item.dismiss === "session") return sessionStorage.getItem(key(item)) === "1";
      if (item.dismiss === "days") return Number(localStorage.getItem(key(item)) || 0) > Date.now();
    } catch { /* O aviso continua disponível se o navegador bloquear armazenamento. */ }
    return false;
  };
  const remember = (item) => {
    try {
      if (item.dismiss === "session") sessionStorage.setItem(key(item), "1");
      if (item.dismiss === "days") localStorage.setItem(key(item), String(Date.now() + item.dismiss_days * 86400000));
    } catch { /* Não impede o fechamento na visita atual. */ }
  };
  const closed = new Set();
  const fill = (element, item) => {
    element.querySelector("[data-title]").textContent = item.title;
    element.querySelector("[data-message]").textContent = item.message;
    const link = element.querySelector("[data-link]");
    link.hidden = !item.link_url;
    if (item.link_url) { link.href = item.link_url; link.textContent = item.link_label; }
    element.querySelector("[data-close]").hidden = item.dismiss === "required";
  };
  let currentBanner, currentDialog, previousFocus;
  const height = () => document.documentElement.style.setProperty("--announcement-height", banner.hidden ? "0px" : `${banner.offsetHeight}px`);
  const refresh = () => {
    const [nextBanner, nextModal] = ["banner", "modal"].map((type) => selectAnnouncements(notices.filter((item) => !closed.has(item.id) && !dismissed(item)), location.pathname).find((item) => item.type === type));
    if (nextBanner?.id !== currentBanner?.id) { currentBanner = nextBanner; banner.hidden = !nextBanner; if (nextBanner) fill(banner, nextBanner); height(); }
    if (nextModal?.id !== currentDialog?.id) {
      if (dialog.open) dialog.close();
      currentDialog = nextModal;
      if (nextModal) { previousFocus = document.activeElement; fill(dialog, nextModal); dialog.showModal(); }
      else previousFocus?.focus?.();
    }
  };
  banner.querySelector("[data-close]").addEventListener("click", () => { if (currentBanner) { remember(currentBanner); closed.add(currentBanner.id); refresh(); } });
  dialog.querySelector("[data-close]").addEventListener("click", () => { if (currentDialog) { remember(currentDialog); closed.add(currentDialog.id); refresh(); } });
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); if (currentDialog?.dismiss !== "required") dialog.querySelector("[data-close]").click(); });
  new ResizeObserver(height).observe(banner);
  window.addEventListener("resize", height);
  refresh();
  setInterval(refresh, 30000);
}
