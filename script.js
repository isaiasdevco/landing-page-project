"use strict";

function initNavigation() {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector("#primary-navigation");
  if (!header || !toggle || !navigation) return;

  const links = [...navigation.querySelectorAll('a[href^="#"]')];
  const mobileViewport = window.matchMedia("(max-width: 760px)");

  function setOpen(isOpen, restoreFocus = false) {
    navigation.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.querySelector(".menu-label").textContent = isOpen ? "Close" : "Menu";
    if (restoreFocus) toggle.focus();
  }

  header.classList.add("menu-ready");
  toggle.hidden = false;
  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  header.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", () => {
      const wasOpen = toggle.getAttribute("aria-expanded") === "true";
      setOpen(false);
      // Keep keyboard focus out of navigation that has just been hidden.
      if (wasOpen && mobileViewport.matches) {
        document.querySelector(link.hash)?.focus({ preventScroll: true });
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      toggle.getAttribute("aria-expanded") === "true"
    ) {
      setOpen(false, true);
    }
  });

  document.addEventListener("click", (event) => {
    if (header.contains(event.target)) return;
    // If focus was inside the menu, return it before hiding those links.
    const focusWasInside = navigation.contains(document.activeElement);
    setOpen(false, focusWasInside && mobileViewport.matches);
  });

  mobileViewport.addEventListener("change", () => {
    const focusWasInside = navigation.contains(document.activeElement);
    setOpen(false, mobileViewport.matches && focusWasInside);
    // The toggle is hidden on desktop; do not leave focus on it after resize.
    if (!mobileViewport.matches && document.activeElement === toggle)
      links[0].focus();
  });
}

function initSectionTracking() {
  if (!("IntersectionObserver" in window)) return;

  const links = [
    ...document.querySelectorAll('.primary-navigation a[href^="#"]'),
  ];
  // Secondary sections use their related primary navigation link.
  const navigationForSection = {
    home: "#home",
    services: "#services",
    work: "#services",
    about: "#about",
    testimonials: "#about",
    contact: "#contact",
  };
  const sectionIds = Object.keys(navigationForSection);
  const visibleSections = new Set();

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visibleSections.add(entry.target.id);
        else visibleSections.delete(entry.target.id);
      });
      // A section can stay visible while its neighbor leaves the viewport.
      const currentId = sectionIds
        .filter((id) => visibleSections.has(id))
        .pop();
      if (!currentId) return;
      const current = navigationForSection[currentId];
      links.forEach((link) => {
        if (link.hash === current)
          link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    },
    { rootMargin: "-15% 0px -55% 0px" },
  );

  sectionIds.forEach((id) => {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  });
}

function initReveals() {
  const motionPreference = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  if (!("IntersectionObserver" in window) || motionPreference.matches) return;

  const elements = [...document.querySelectorAll("[data-reveal]")];
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove("is-pending");
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.08 },
  );

  elements.forEach((element) => {
    element.classList.add("is-pending");
    observer.observe(element);
  });

  // Respect a preference change made while the page is already open.
  motionPreference.addEventListener("change", (event) => {
    if (!event.matches) return;
    observer.disconnect();
    elements.forEach((element) => element.classList.remove("is-pending"));
  });
}

initNavigation();
initSectionTracking();
initReveals();

const year = document.querySelector("#copyright-year");
if (year) year.textContent = String(new Date().getFullYear());
