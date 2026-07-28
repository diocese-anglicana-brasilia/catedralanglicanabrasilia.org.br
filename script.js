document.documentElement.classList.add("js");

document.getElementById("year").textContent = new Date().getFullYear();

// Mobile menu toggle
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

navLinks
  .querySelectorAll("a")
  .forEach((a) =>
    a.addEventListener("click", closeMenu),
  );

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

window.addEventListener("resize", () => {
  updateMenuLayout();
});

const updateMenuLayout = () => {
  document.body.classList.remove("menu-collapsed");

  const navStyles = window.getComputedStyle(siteNav);
  const horizontalPadding =
    Number.parseFloat(navStyles.paddingLeft) +
    Number.parseFloat(navStyles.paddingRight);
  const availableWidth = siteNav.clientWidth - horizontalPadding;
  const requiredWidth =
    siteBrand.getBoundingClientRect().width + navLinks.scrollWidth + 32;
  const shouldCollapse = requiredWidth > availableWidth;

  document.body.classList.toggle("menu-collapsed", shouldCollapse);
  if (!shouldCollapse) closeMenu();
};

updateMenuLayout();
window.addEventListener("load", updateMenuLayout);
if (document.fonts) {
  document.fonts.ready.then(updateMenuLayout);
}

// Active link on scroll
const sections = document.querySelectorAll("section[id]");
const navItems = document.querySelectorAll(".nav-link");
window.addEventListener("scroll", () => {
  let current = "";
  sections.forEach((sec) => {
    const top = sec.offsetTop - 120;
    if (scrollY >= top) current = sec.getAttribute("id");
  });
  navItems.forEach((a) => {
    a.classList.remove("active");
    a.removeAttribute("aria-current");
    if (a.getAttribute("href") === "#" + current) {
      a.classList.add("active");
      a.setAttribute("aria-current", "page");
    }
  });
});

// Fade-in on scroll
const animatedElements = document.querySelectorAll(".fade-in");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          observer.unobserve(e.target);
        }
      });
    },
    { threshold: 0.15 },
  );
  animatedElements.forEach((el) => observer.observe(el));
} else {
  animatedElements.forEach((el) => el.classList.add("visible"));
}

const contactForm = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");
contactForm.addEventListener("submit", (event) => {
  event.preventDefault();
  formStatus.textContent = "Mensagem registrada neste protótipo. O envio precisa ser conectado a um serviço de formulários.";
  contactForm.reset();
});
