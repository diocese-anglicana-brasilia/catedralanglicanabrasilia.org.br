document.documentElement.classList.add("js");

document.getElementById("year").textContent = new Date().getFullYear();

const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");
const menuLabel = menuBtn.querySelector("[data-menu-label]");
const siteNav = menuBtn.closest("nav");
const siteBrand = siteNav.querySelector('a[href="#inicio"]');

const closeMenu = () => {
  menuBtn.setAttribute("aria-expanded", "false");
  menuLabel.textContent = "Abrir menu";
};

menuBtn.addEventListener("click", () => {
  const willOpen = menuBtn.getAttribute("aria-expanded") !== "true";
  menuBtn.setAttribute("aria-expanded", String(willOpen));
  menuLabel.textContent = willOpen ? "Fechar menu" : "Abrir menu";
});

navLinks.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

const updateMenuLayout = () => {
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

contactForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (formStatus) {
    formStatus.textContent =
      "Mensagem registrada neste protótipo. O envio precisa ser conectado a um serviço de formulários.";
  }
  contactForm.reset();
});
