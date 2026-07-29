document.documentElement.classList.add("js");

const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

if (menuBtn && navLinks) {
  const menuLabel = menuBtn.querySelector("[data-menu-label]");
  const siteNav = menuBtn.closest("nav");
  const siteBrand = siteNav?.querySelector("[data-site-brand]");

  const closeMenu = () => {
    menuBtn.setAttribute("aria-expanded", "false");
    if (menuLabel) menuLabel.textContent = "Abrir menu";
  };

  menuBtn.addEventListener("click", () => {
    const willOpen = menuBtn.getAttribute("aria-expanded") !== "true";
    menuBtn.setAttribute("aria-expanded", String(willOpen));
    if (menuLabel) menuLabel.textContent = willOpen ? "Fechar menu" : "Abrir menu";
  });

  navLinks.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  const updateMenuLayout = () => {
    if (!siteNav || !siteBrand) return;

    document.body.classList.remove("menu-collapsed");

    const navStyles = window.getComputedStyle(siteNav);
    const horizontalPadding =
      Number.parseFloat(navStyles.paddingLeft) + Number.parseFloat(navStyles.paddingRight);
    const availableWidth = siteNav.clientWidth - horizontalPadding;
    const requiredWidth = siteBrand.getBoundingClientRect().width + navLinks.scrollWidth + 32;
    const shouldCollapse = requiredWidth > availableWidth;

    document.body.classList.toggle("menu-collapsed", shouldCollapse);
    if (!shouldCollapse) closeMenu();
  };

  window.addEventListener("resize", updateMenuLayout);
  updateMenuLayout();
  window.addEventListener("load", updateMenuLayout);
  if (document.fonts) document.fonts.ready.then(updateMenuLayout);
}

const sections = document.querySelectorAll("section[id]");
const navItems = document.querySelectorAll(".nav-link");

const updateActiveLink = () => {
  let current = "";
  sections.forEach((section) => {
    const top = section.offsetTop - 120;
    if (window.scrollY >= top) current = section.getAttribute("id");
  });

  navItems.forEach((link) => {
    link.classList.remove("active");
    link.removeAttribute("aria-current");
    if (link.getAttribute("href") === `#${current}`) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
  });
};

window.addEventListener("scroll", updateActiveLink, { passive: true });
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

const contactForm = document.querySelector("[data-contact-form]");
const formStatus = contactForm?.querySelector("[data-form-status]");

const setFormStatus = (message, isError = false) => {
  if (!formStatus) return;

  formStatus.textContent = message;
  formStatus.classList.toggle("text-red-700", isError);
  formStatus.classList.toggle("text-gray-600", !isError);
  formStatus.setAttribute("aria-live", isError ? "assertive" : "polite");
};

contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const endpoint = contactForm.dataset.contactEndpoint;
  const submitButton = contactForm.querySelector('[type="submit"]');

  if (!endpoint) {
    setFormStatus("O formulário ainda não está configurado para envio.", true);
    return;
  }

  const formData = new FormData(contactForm);
  const payload = {
    name: formData.get("nome"),
    email: formData.get("email"),
    subject: formData.get("assunto"),
    message: formData.get("mensagem"),
  };

  submitButton?.setAttribute("disabled", "");
  contactForm.setAttribute("aria-busy", "true");
  setFormStatus("Enviando mensagem...");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.json().catch(() => null);
    if (!response.ok || responseBody?.name === "DirectusError" || responseBody?.error) {
      throw new Error("Directus rejected the contact message.");
    }

    contactForm.reset();
    setFormStatus("Mensagem enviada. Entraremos em contato em breve.");
  } catch {
    setFormStatus(
      "Não foi possível enviar sua mensagem agora. Tente novamente em alguns instantes.",
      true,
    );
  } finally {
    submitButton?.removeAttribute("disabled");
    contactForm.removeAttribute("aria-busy");
  }
});
