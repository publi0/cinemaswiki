const siteHeader = document.querySelector(".site-header");
const navToggle = document.querySelector(".nav-toggle");
const primaryNav = document.querySelector(".site-header .nav");

function setNavigationOpen(open) {
  if (!siteHeader || !navToggle || !primaryNav) return;
  siteHeader.dataset.navOpen = String(open);
  navToggle.setAttribute("aria-expanded", String(open));
}

if (siteHeader && navToggle && primaryNav) {
  navToggle.addEventListener("click", () => {
    setNavigationOpen(navToggle.getAttribute("aria-expanded") !== "true");
  });

  primaryNav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setNavigationOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setNavigationOpen(false);
  });

  window.matchMedia("(min-width: 761px)").addEventListener("change", (event) => {
    if (event.matches) setNavigationOpen(false);
  });
}
