document.documentElement.classList.add("js");

const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

if (menuBtn && navLinks) {
  const menuLabel = menuBtn.querySelector("[data-menu-label]");
  const siteNav = menuBtn.closest("nav");
  const siteBrand = siteNav?.querySelector("[data-site-brand]");

  const closeMenu = ({ restoreFocus = false } = {}) => {
    const shouldRestoreFocus = restoreFocus && navLinks.contains(document.activeElement);

    menuBtn.setAttribute("aria-expanded", "false");
    if (menuLabel) menuLabel.textContent = "Abrir menu";
    if (shouldRestoreFocus) menuBtn.focus();
  };

  menuBtn.addEventListener("click", () => {
    const willOpen = menuBtn.getAttribute("aria-expanded") !== "true";
    menuBtn.setAttribute("aria-expanded", String(willOpen));
    if (menuLabel) menuLabel.textContent = willOpen ? "Fechar menu" : "Abrir menu";
  });

  navLinks.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuBtn.getAttribute("aria-expanded") === "true") {
      closeMenu({ restoreFocus: true });
    }
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

document.querySelector("[data-contact-form]")?.addEventListener("submit", (event) => {
  event.preventDefault();
});
