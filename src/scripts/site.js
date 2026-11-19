import { ageOnDate, dateInBrasilia } from "../utils/person-age.mjs";

document.documentElement.classList.add("js");

document.querySelectorAll("[data-person-age]").forEach((element) => {
  const age = ageOnDate(element.dataset.personAge, dateInBrasilia());
  if (age !== null) element.textContent = ` (${age} ${age === 1 ? "ano" : "anos"})`;
});

const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

if (menuBtn && navLinks) {
  const menuLabel = menuBtn.querySelector("[data-menu-label]");
  const siteNav = menuBtn.closest("nav");
  const siteBrand = siteNav?.querySelector("[data-site-brand]");
  const groupButtons = [...navLinks.querySelectorAll(".nav-group-toggle")];

  const closeSubmenus = (except = null) => {
    groupButtons.forEach((button) => {
      if (button === except) return;
      button.setAttribute("aria-expanded", "false");
      const submenu = document.getElementById(button.getAttribute("aria-controls"));
      if (submenu) submenu.hidden = true;
    });
  };

  const closeMenu = ({ restoreFocus = false } = {}) => {
    const shouldRestoreFocus = restoreFocus && navLinks.contains(document.activeElement);

    menuBtn.setAttribute("aria-expanded", "false");
    closeSubmenus();
    if (menuLabel) menuLabel.textContent = "Abrir menu";
    if (shouldRestoreFocus) menuBtn.focus();
  };

  menuBtn.addEventListener("click", () => {
    const willOpen = menuBtn.getAttribute("aria-expanded") !== "true";
    if (!willOpen) closeSubmenus();
    menuBtn.setAttribute("aria-expanded", String(willOpen));
    if (menuLabel) menuLabel.textContent = willOpen ? "Fechar menu" : "Abrir menu";
  });

  groupButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const willOpen = button.getAttribute("aria-expanded") !== "true";
      closeSubmenus(button);
      button.setAttribute("aria-expanded", String(willOpen));
      const submenu = document.getElementById(button.getAttribute("aria-controls"));
      if (submenu) submenu.hidden = !willOpen;
    });
  });

  navLinks.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const openButton = groupButtons.find((button) => button.getAttribute("aria-expanded") === "true");
    if (openButton) {
      closeSubmenus();
      openButton.focus();
    } else if (menuBtn.getAttribute("aria-expanded") === "true") {
      closeMenu({ restoreFocus: true });
    }
  });

  document.addEventListener("click", (event) => {
    if (!siteNav?.contains(event.target)) {
      closeSubmenus();
      if (menuBtn.getAttribute("aria-expanded") === "true") closeMenu();
    }
  });

  const updateMenuLayout = () => {
    if (!siteNav || !siteBrand) return;

    document.body.classList.remove("menu-collapsed");

    const navStyles = window.getComputedStyle(siteNav);
    const horizontalPadding =
      Number.parseFloat(navStyles.paddingLeft) + Number.parseFloat(navStyles.paddingRight);
    const availableWidth = siteNav.clientWidth - horizontalPadding;
    const searchButton = siteNav.querySelector("[data-search-open]");
    const requiredWidth = siteBrand.getBoundingClientRect().width + navLinks.scrollWidth + (searchButton?.getBoundingClientRect().width || 0) + 48;
    const shouldCollapse = requiredWidth > availableWidth;

    document.body.classList.toggle("menu-collapsed", shouldCollapse);
    if (!shouldCollapse) closeMenu();
  };

  window.addEventListener("resize", updateMenuLayout);
  updateMenuLayout();
  window.addEventListener("load", updateMenuLayout);
  if (document.fonts) document.fonts.ready.then(updateMenuLayout);
}

const navItems = document.querySelectorAll(".nav-link");

const updateActiveLink = () => {
  const normalizePath = (path) => path.replace(/\/+$/, "") || "/";
  const current = normalizePath(window.location.pathname);
  navItems.forEach((link) => {
    link.classList.remove("active");
    link.removeAttribute("aria-current");
    const href = link.getAttribute("href");
    if (href?.startsWith("/") && normalizePath(new URL(href, window.location.href).pathname) === current) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
  });
};

updateActiveLink();

const animatedElements = document.querySelectorAll(".fade-in");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 },
  );
  animatedElements.forEach((element) => observer.observe(element));
} else {
  animatedElements.forEach((element) => element.classList.add("visible"));
}

document.querySelectorAll("[data-contact-form], [data-prayer-form]").forEach((formElement) => formElement.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const prayer = form.hasAttribute("data-prayer-form");
  const endpoint = prayer ? form.dataset.prayerEndpoint : form.dataset.contactEndpoint;
  if (!endpoint) return;
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector("[data-form-status]");
  if (button.disabled) return;
  const token = new FormData(form).get("cf-turnstile-response");
  if (typeof token !== "string" || !token) {
    status.textContent = "Conclua a verificação de segurança antes de enviar.";
    return;
  }
  button.disabled = true;
  status.textContent = "Enviando mensagem...";
  try {
    const data = new FormData(form);
    data.delete("cf-turnstile-response");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...Object.fromEntries(data.entries()), turnstileToken: token }),
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    if (!response.ok || result?.ok !== true) throw new Error("Envio não confirmado");
    form.reset();
    status.textContent = prayer ? "Pedido enviado. Obrigado por compartilhar." : "Mensagem enviada. Obrigado pelo contato!";
  } catch {
    status.textContent = "Não foi possível enviar sua mensagem. Tente novamente ou escreva para anglicana309sul@gmail.com.";
  } finally {
    button.disabled = false;
    const widget = form.querySelector(".cf-turnstile");
    if (widget && window.turnstile) window.turnstile.reset(widget);
  }
}));
