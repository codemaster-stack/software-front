/**
 * ============================================================
 *  ANGELUNI-SALLTD — script.js (API version)
 *  Fetches projects and videos from the Express/MongoDB backend
 * ============================================================
 *
 *  ADMIN CONFIG:
 *  ─────────────
 *  Change API_BASE_URL to your deployed backend URL.
 *  e.g. "https://angeluni-api.onrender.com"
 *
 *  WHATSAPP:
 *  ─────────
 *  Change WHATSAPP_NUMBER to the admin's number (digits only).
 *  e.g. "2348012345678"
 * ============================================================
 */

/* ─── CONFIG ─────────────────────────────────────────────── */
const API_BASE_URL    = "http://localhost:5000/api"; // ← Change to deployed URL
const WHATSAPP_NUMBER = "2349000000000";             // ← Change to real number
const DEFAULT_WA_MSG  =
  "Hello Angeluni-salltd 👋 I'm interested in your software development services. Could we discuss my project?";

/* ─── INIT ───────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initMobileMenu();
  loadProjects();
  loadVideos();
  initProjectFilter();
  initWhatsApp();
  initRevealObserver();
  initCounters();
  initBackToTop();
  setFooterYear();
});

/* ─── API HELPERS ────────────────────────────────────────── */
async function apiFetch(endpoint) {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`API error [${endpoint}]:`, err.message);
    return null;
  }
}

/* ─── LOAD PROJECTS FROM API ─────────────────────────────── */
async function loadProjects(category = "all") {
  const grid = document.getElementById("projectsGrid");
  if (!grid) return;

  // Show skeleton loaders
  grid.innerHTML = skeletonCards(3);

  const endpoint = category === "all"
    ? "/projects"
    : `/projects?category=${category}`;

  const result = await apiFetch(endpoint);

  if (!result || !result.success) {
    grid.innerHTML = `<p class="empty-state">⚠️ Could not load projects. Please try again later.</p>`;
    return;
  }

  renderProjects(result.data);
}

/* ─── RENDER PROJECTS ────────────────────────────────────── */
function renderProjects(data) {
  const grid = document.getElementById("projectsGrid");
  if (!grid) return;

  grid.innerHTML = "";

  if (!data || data.length === 0) {
    grid.innerHTML = `<p class="empty-state">No projects found for this category.</p>`;
    return;
  }

  data.forEach((project, i) => {
    const card = document.createElement("article");
    card.className = "project-card";
    card.style.animationDelay = `${i * 0.07}s`;
    card.setAttribute("aria-label", `Project: ${project.title}`);

    const tagsHTML = (project.tags || [])
      .map(tag => `<span class="tag">${escHtml(tag)}</span>`)
      .join("");

    const demoLabel = project.demoUrl && project.demoUrl !== "#"
      ? "View Demo ↗"
      : "Test Site (coming soon)";

    const demoAttrs = project.demoUrl && project.demoUrl !== "#"
      ? `href="${escHtml(project.demoUrl)}" target="_blank" rel="noopener noreferrer"`
      : `href="#" aria-disabled="true"`;

    const imgHTML = project.imageUrl
      ? `<div class="project-img-wrap"><img src="${escHtml(project.imageUrl)}" alt="${escHtml(project.title)}" loading="lazy" /></div>`
      : `<div class="project-img-wrap"><div class="project-img-placeholder">${project.icon || "🌐"}</div></div>`;

    card.innerHTML = `
      ${imgHTML}
      <div class="project-header">
        <div class="project-icon" aria-hidden="true">${project.icon || "🌐"}</div>
        <span class="project-category">${formatCategory(project.category)}</span>
      </div>
      <h3 class="project-title">${escHtml(project.title)}</h3>
      <p class="project-desc">${escHtml(project.description)}</p>
      <div class="project-tags" aria-label="Technologies used">${tagsHTML}</div>
      <a ${demoAttrs} class="btn btn-ghost">${demoLabel}</a>
    `;

    grid.appendChild(card);
  });
}

/* ─── PROJECT FILTER ─────────────────────────────────────── */
function initProjectFilter() {
  const buttons = document.querySelectorAll(".filter-btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      loadProjects(btn.dataset.filter);
    });
  });
}

/* ─── LOAD VIDEOS FROM API ───────────────────────────────── */
async function loadVideos() {
  const grid = document.getElementById("videosGrid");
  if (!grid) return;

  grid.innerHTML = skeletonCards(3, true);

  const result = await apiFetch("/videos");

  if (!result || !result.success) {
    grid.innerHTML = `<p class="empty-state">⚠️ Could not load videos. Please try again later.</p>`;
    return;
  }

  renderVideos(result.data);
}

/* ─── RENDER VIDEOS ──────────────────────────────────────── */
function renderVideos(data) {
  const grid = document.getElementById("videosGrid");
  if (!grid) return;

  grid.innerHTML = "";

  if (!data || data.length === 0) {
    grid.innerHTML = `<p class="empty-state">No videos available yet. Check back soon.</p>`;
    return;
  }

  data.forEach((video, i) => {
    const card = document.createElement("article");
    card.className = "video-card";
    card.style.animationDelay = `${i * 0.1}s`;

    const videoContent = video.embedUrl
      ? `<iframe src="${escHtml(video.embedUrl)}"
           title="${escHtml(video.title)}"
           allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
           allowfullscreen loading="lazy"></iframe>`
      : `<div class="video-placeholder">
           <div class="play-icon" aria-hidden="true">▶</div>
           <p>Video coming soon</p>
         </div>`;

    card.innerHTML = `
      <div class="video-wrapper">${videoContent}</div>
      <div class="video-info">
        <h3 class="video-title">${escHtml(video.title)}</h3>
        <p class="video-desc">${escHtml(video.description)}</p>
      </div>
    `;

    grid.appendChild(card);
  });
}

/* ─── SKELETON LOADERS ───────────────────────────────────── */
function skeletonCards(count, isVideo = false) {
  return Array.from({ length: count }, () =>
    isVideo
      ? `<div class="skeleton-card video-card">
           <div class="skel skel-video"></div>
           <div style="padding:20px">
             <div class="skel skel-title"></div>
             <div class="skel skel-text"></div>
           </div>
         </div>`
      : `<div class="skeleton-card project-card">
           <div class="skel skel-icon"></div>
           <div class="skel skel-title" style="margin:14px 0 10px"></div>
           <div class="skel skel-text"></div>
           <div class="skel skel-text short"></div>
           <div class="skel skel-btn"></div>
         </div>`
  ).join("");
}

/* ─── WHATSAPP ────────────────────────────────────────────── */
function initWhatsApp() {
  setWhatsAppHref("whatsappBtn",    DEFAULT_WA_MSG);
  setWhatsAppHref("footerWhatsApp", DEFAULT_WA_MSG);

  const sendBtn = document.getElementById("sendWhatsApp");
  if (sendBtn) sendBtn.addEventListener("click", handleContactFormWhatsApp);
}

function handleContactFormWhatsApp() {
  const name    = (document.getElementById("userName")?.value    || "").trim();
  const service =  document.getElementById("userService")?.value || "";
  const message = (document.getElementById("userMsg")?.value     || "").trim();

  let text = `Hello Angeluni-salltd 👋`;
  if (name)    text += `\n\nMy name is *${name}*.`;
  if (service) text += `\nI'm interested in: *${service}*.`;
  if (message) text += `\n\n${message}`;
  text += `\n\n_(Sent via angeluni-salltd.com)_`;

  window.open(buildWhatsAppUrl(text), "_blank", "noopener,noreferrer");
}

function buildWhatsAppUrl(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function setWhatsAppHref(id, message) {
  const el = document.getElementById(id);
  if (el) {
    el.href = buildWhatsAppUrl(message);
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener noreferrer");
  }
}

/* ─── NAVBAR ─────────────────────────────────────────────── */
function initNavbar() {
  const navbar = document.getElementById("navbar");
  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 20);
    updateActiveNavLink();
  }, { passive: true });
}

function updateActiveNavLink() {
  const sections = ["home", "projects", "videos", "contact"];
  const scrollPos = window.scrollY + 120;
  let current = "home";
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.offsetTop <= scrollPos) current = id;
  });
  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.toggle("active", link.dataset.section === current);
  });
}

/* ─── MOBILE MENU ────────────────────────────────────────── */
function initMobileMenu() {
  const hamburger  = document.getElementById("hamburger");
  const mobileMenu = document.getElementById("mobileMenu");
  const overlay    = document.getElementById("mobOverlay");

  function openMenu() {
    hamburger.classList.add("open");
    mobileMenu.classList.add("open");
    overlay.classList.add("show");
    mobileMenu.setAttribute("aria-hidden", "false");
    hamburger.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }
  function closeMenu() {
    hamburger.classList.remove("open");
    mobileMenu.classList.remove("open");
    overlay.classList.remove("show");
    mobileMenu.setAttribute("aria-hidden", "true");
    hamburger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  hamburger.addEventListener("click", () =>
    mobileMenu.classList.contains("open") ? closeMenu() : openMenu()
  );
  overlay.addEventListener("click", closeMenu);
  document.querySelectorAll("[data-close]").forEach(l => l.addEventListener("click", closeMenu));
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });
}

/* ─── REVEAL OBSERVER ────────────────────────────────────── */
function initRevealObserver() {
  const els = document.querySelectorAll(".reveal");
  if (!els.length) return;
  const obs = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); } }),
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  els.forEach(el => obs.observe(el));
}

/* ─── COUNTER ANIMATION ──────────────────────────────────── */
function initCounters() {
  const counters = document.querySelectorAll(".stat-num[data-target]");
  const obs = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) { animateCounter(e.target); obs.unobserve(e.target); } }),
    { threshold: 0.5 }
  );
  counters.forEach(c => obs.observe(c));
}
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const step   = 1600 / target;
  let current  = 0;
  const iv = setInterval(() => {
    current++;
    el.textContent = current;
    if (current >= target) { el.textContent = target; clearInterval(iv); }
  }, step);
}

/* ─── BACK TO TOP ────────────────────────────────────────── */
function initBackToTop() {
  const btn = document.getElementById("backTop");
  if (!btn) return;
  window.addEventListener("scroll", () => btn.classList.toggle("show", window.scrollY > 500), { passive: true });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

/* ─── FOOTER YEAR ────────────────────────────────────────── */
function setFooterYear() {
  const el = document.getElementById("footerYear");
  if (el) el.textContent = new Date().getFullYear();
}

/* ─── HELPERS ────────────────────────────────────────────── */
function formatCategory(cat) {
  return { website: "Website", webapp: "Web App", ecommerce: "E-commerce" }[cat] || cat;
}
function escHtml(str) {
  if (typeof str !== "string") return "";
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
            .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}