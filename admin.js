/**
 * ============================================================
 *  ANGELUNI-SALLTD — admin.js
 *  Admin panel logic: auth, CRUD for projects & videos
 * ============================================================
 *  Change API_BASE_URL to your deployed backend URL.
 * ============================================================
 */

const API_BASE_URL = "https://angeluni.onrender.com/api";

/* ─── STATE ──────────────────────────────────────────────── */
let authToken      = localStorage.getItem("angeluni_token") || null;
let allProjects    = [];
let allVideos      = [];
let deleteCallback = null; // Holds the function to call on confirm delete

/* ─── INIT ───────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  // If token exists, verify it before showing dashboard
  if (authToken) {
    verifyToken();
  } else {
    showLogin();
  }

  // Login form
  document.getElementById("loginBtn")?.addEventListener("click", handleLogin);
  document.getElementById("loginPass")?.addEventListener("keydown", e => {
    if (e.key === "Enter") handleLogin();
  });

  // Password toggle
  document.getElementById("passToggle")?.addEventListener("click", () => {
    const input = document.getElementById("loginPass");
    input.type = input.type === "password" ? "text" : "password";
  });

  // Logout
  document.getElementById("logoutBtn")?.addEventListener("click", logout);

  // Sidebar tabs
  document.querySelectorAll(".sidebar-link").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Mobile sidebar toggle
  document.getElementById("sidebarToggle")?.addEventListener("click", () => {
    document.getElementById("adminSidebar").classList.toggle("open");
  });
  document.getElementById("sidebarClose")?.addEventListener("click", () => {
    document.getElementById("adminSidebar").classList.remove("open");
  });

  // Textarea char counters
  document.getElementById("pDesc")?.addEventListener("input", () => {
    document.getElementById("pDescCount").textContent =
      document.getElementById("pDesc").value.length;
  });
  document.getElementById("vDesc")?.addEventListener("input", () => {
    document.getElementById("vDescCount").textContent =
      document.getElementById("vDesc").value.length;
  });

  // Close modals on overlay click
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", e => {
      if (e.target === overlay) overlay.classList.remove("open");
    });
  });

  // Close modals on Escape
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-overlay.open").forEach(m =>
        m.classList.remove("open")
      );
    }
  });
});

/* ─── AUTH ───────────────────────────────────────────────── */
async function verifyToken() {
  try {
    const res = await authFetch("/auth/verify");
    if (res && res.success) {
      showDashboard();
    } else {
      logout();
    }
  } catch {
    logout();
  }
}

async function handleLogin() {
  const username = document.getElementById("loginUser")?.value.trim();
  const password = document.getElementById("loginPass")?.value;
  const errorEl  = document.getElementById("loginError");
  const loginBtn = document.getElementById("loginBtn");

  if (!username || !password) {
    showLoginError("Please enter your username and password.");
    return;
  }

  loginBtn.textContent = "Signing in…";
  loginBtn.disabled = true;
  errorEl.style.display = "none";

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (data.success) {
      authToken = data.token;
      localStorage.setItem("angeluni_token", authToken);
      showDashboard();
    } else {
      showLoginError(data.message || "Invalid credentials.");
    }
  } catch (err) {
    showLoginError("Could not connect to the server. Is the backend running?");
  } finally {
    loginBtn.textContent = "Sign In to Dashboard";
    loginBtn.disabled = false;
  }
}

function logout() {
  authToken = null;
  localStorage.removeItem("angeluni_token");
  showLogin();
}

function showLogin() {
  document.getElementById("loginScreen").style.display    = "flex";
  document.getElementById("adminDashboard").style.display = "none";
}

function showDashboard() {
  document.getElementById("loginScreen").style.display    = "none";
  document.getElementById("adminDashboard").style.display = "flex";
  loadOverviewStats();
  loadProjectsTable();
  loadVideosTable();
}

function showLoginError(msg) {
  const el = document.getElementById("loginError");
  el.textContent   = msg;
  el.style.display = "block";
}

/* ─── AUTHENTICATED FETCH ────────────────────────────────── */
async function authFetch(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authToken}`,
    ...options.headers,
  };

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

    // If 401, token expired — log out
    if (res.status === 401) {
      logout();
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error(`authFetch error [${endpoint}]:`, err);
    return null;
  }
}

/* ─── TABS ───────────────────────────────────────────────── */
function switchTab(tab) {
  // Update sidebar buttons
  document.querySelectorAll(".sidebar-link").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });

  // Show tab pane
  document.querySelectorAll(".tab-pane").forEach(pane => {
    pane.classList.toggle("active", pane.id === `tab-${tab}`);
  });

  // Update topbar title
  const titles = { overview: "Overview", projects: "Projects", videos: "Videos" };
  document.getElementById("topbarTitle").textContent = titles[tab] || tab;

  // Close sidebar on mobile
  document.getElementById("adminSidebar").classList.remove("open");
}

/* ─── OVERVIEW STATS ─────────────────────────────────────── */
async function loadOverviewStats() {
  const [pResult, vResult] = await Promise.all([
    authFetch("/projects/all"),
    authFetch("/videos/all"),
  ]);

  if (pResult?.success) {
    allProjects = pResult.data;
    document.getElementById("statProjects").textContent  = allProjects.length;
    document.getElementById("statVisible").textContent   = allProjects.filter(p => p.isVisible).length;
    document.getElementById("statWithLinks").textContent = allProjects.filter(p => p.demoUrl && p.demoUrl !== "#").length;
  }

  if (vResult?.success) {
    allVideos = vResult.data;
    document.getElementById("statVideos").textContent = allVideos.length;
  }
}

/* ─── PROJECTS TABLE ─────────────────────────────────────── */
async function loadProjectsTable() {
  const container = document.getElementById("projectsTable");
  container.innerHTML = `<div class="loading-state">Loading projects…</div>`;

  const result = await authFetch("/projects/all");
  if (!result?.success) {
    container.innerHTML = `<div class="loading-state">⚠️ Failed to load projects.</div>`;
    return;
  }

  allProjects = result.data;

  if (allProjects.length === 0) {
    container.innerHTML = `
      <div class="data-table-wrap">
        <div class="empty-table">No projects yet. <button class="btn btn-ghost" onclick="openProjectModal()">Add your first project →</button></div>
      </div>`;
    return;
  }

  const rows = allProjects.map(p => `
    <tr>
      <td class="td-title">
        <span>${escHtml(p.title)}</span>
        <div class="sub">${escHtml(p.description.substring(0, 60))}…</div>
      </td>
      <td><span class="badge badge-${p.category}">${formatCategory(p.category)}</span></td>
      <td>
        <span class="visible-dot ${p.isVisible ? "on" : "off"}"></span>
        ${p.isVisible ? "Visible" : "Hidden"}
      </td>
      <td>
        ${p.demoUrl && p.demoUrl !== "#"
          ? `<a href="${escHtml(p.demoUrl)}" target="_blank" rel="noopener" style="color:var(--teal);font-size:0.82rem;">View ↗</a>`
          : `<span style="color:var(--text-3);font-size:0.82rem;">No link</span>`}
      </td>
      <td>
        <div class="actions-cell">
          <button class="btn-sm btn-edit"   onclick="openProjectModal('${p._id}')">Edit</button>
          <button class="btn-sm btn-toggle" onclick="toggleProject('${p._id}')">
            ${p.isVisible ? "Hide" : "Show"}
          </button>
          <button class="btn-sm btn-delete" onclick="confirmDelete('project','${p._id}','${escHtml(p.title)}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");

  container.innerHTML = `
    <div class="data-table-wrap">
      <table class="data-table" aria-label="Projects table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Category</th>
            <th>Status</th>
            <th>Demo Link</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/* ─── PROJECT MODAL ──────────────────────────────────────── */
function openProjectModal(id = null) {
  // Reset form
  document.getElementById("projectId").value   = id || "";
  document.getElementById("pTitle").value       = "";
  document.getElementById("pDesc").value        = "";
  document.getElementById("pDescCount").textContent = "0";
  document.getElementById("pCategory").value   = "";
  document.getElementById("pIcon").value        = "🌐";
  document.getElementById("pTags").value        = "";
  document.getElementById("pDemo").value        = "";
  document.getElementById("pOrder").value       = "0";
  document.getElementById("pVisible").checked   = true;
  document.getElementById("projectModalTitle").textContent = id ? "Edit Project" : "Add Project";

  if (id) {
    const project = allProjects.find(p => p._id === id);
    if (project) {
      document.getElementById("pTitle").value       = project.title;
      document.getElementById("pDesc").value        = project.description;
      document.getElementById("pDescCount").textContent = project.description.length;
      document.getElementById("pCategory").value   = project.category;
      document.getElementById("pIcon").value        = project.icon || "🌐";
      document.getElementById("pTags").value        = (project.tags || []).join(", ");
      document.getElementById("pDemo").value        = project.demoUrl !== "#" ? project.demoUrl : "";
      document.getElementById("pOrder").value       = project.order || 0;
      document.getElementById("pVisible").checked   = project.isVisible;
    }
  }

  openModal("projectModal");
}

async function saveProject() {
  const id       = document.getElementById("projectId").value;
  const title    = document.getElementById("pTitle").value.trim();
  const desc     = document.getElementById("pDesc").value.trim();
  const category = document.getElementById("pCategory").value;
  const icon     = document.getElementById("pIcon").value.trim() || "🌐";
  const tagsRaw  = document.getElementById("pTags").value;
  const demoUrl  = document.getElementById("pDemo").value.trim() || "#";
  const order    = parseInt(document.getElementById("pOrder").value) || 0;
  const isVisible= document.getElementById("pVisible").checked;

  // Validation
  if (!title)    return showToast("Title is required.", "error");
  if (!desc)     return showToast("Description is required.", "error");
  if (!category) return showToast("Please select a category.", "error");

  const tags = tagsRaw
    .split(",")
    .map(t => t.trim())
    .filter(t => t.length > 0);

  const payload = { title, description: desc, category, icon, tags, demoUrl, order, isVisible };

  const btn = document.getElementById("saveProjectBtn");
  btn.textContent = "Saving…";
  btn.disabled = true;

  const endpoint = id ? `/projects/${id}` : "/projects";
  const method   = id ? "PUT" : "POST";

  const result = await authFetch(endpoint, {
    method,
    body: JSON.stringify(payload),
  });

  btn.textContent = "Save Project";
  btn.disabled = false;

  if (result?.success) {
    closeModal("projectModal");
    showToast(id ? "Project updated!" : "Project added!", "success");
    await loadProjectsTable();
    await loadOverviewStats();
  } else {
    showToast(result?.message || "Failed to save project.", "error");
  }
}

async function toggleProject(id) {
  const result = await authFetch(`/projects/${id}/toggle`, { method: "PATCH" });
  if (result?.success) {
    showToast(result.message, "success");
    await loadProjectsTable();
    await loadOverviewStats();
  } else {
    showToast("Failed to update visibility.", "error");
  }
}

/* ─── VIDEOS TABLE ───────────────────────────────────────── */
async function loadVideosTable() {
  const container = document.getElementById("videosTable");
  container.innerHTML = `<div class="loading-state">Loading videos…</div>`;

  const result = await authFetch("/videos/all");
  if (!result?.success) {
    container.innerHTML = `<div class="loading-state">⚠️ Failed to load videos.</div>`;
    return;
  }

  allVideos = result.data;

  if (allVideos.length === 0) {
    container.innerHTML = `
      <div class="data-table-wrap">
        <div class="empty-table">No videos yet. <button class="btn btn-ghost" onclick="openVideoModal()">Add your first video →</button></div>
      </div>`;
    return;
  }

  const rows = allVideos.map(v => `
    <tr>
      <td class="td-title">
        <span>${escHtml(v.title)}</span>
        <div class="sub">${escHtml(v.description.substring(0, 60))}…</div>
      </td>
      <td>
        ${v.embedUrl
          ? `<a href="${escHtml(v.embedUrl)}" target="_blank" rel="noopener" style="color:var(--teal);font-size:0.82rem;">Embedded ↗</a>`
          : `<span style="color:var(--text-3);font-size:0.82rem;">No embed</span>`}
      </td>
      <td>
        <span class="visible-dot ${v.isVisible ? "on" : "off"}"></span>
        ${v.isVisible ? "Visible" : "Hidden"}
      </td>
      <td>
        <div class="actions-cell">
          <button class="btn-sm btn-edit"   onclick="openVideoModal('${v._id}')">Edit</button>
          <button class="btn-sm btn-toggle" onclick="toggleVideo('${v._id}')">
            ${v.isVisible ? "Hide" : "Show"}
          </button>
          <button class="btn-sm btn-delete" onclick="confirmDelete('video','${v._id}','${escHtml(v.title)}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");

  container.innerHTML = `
    <div class="data-table-wrap">
      <table class="data-table" aria-label="Videos table">
        <thead>
          <tr>
            <th>Video</th>
            <th>Embed</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/* ─── VIDEO MODAL ────────────────────────────────────────── */
function openVideoModal(id = null) {
  document.getElementById("videoId").value   = id || "";
  document.getElementById("vTitle").value    = "";
  document.getElementById("vDesc").value     = "";
  document.getElementById("vDescCount").textContent = "0";
  document.getElementById("vEmbed").value    = "";
  document.getElementById("vOrder").value    = "0";
  document.getElementById("vVisible").checked= true;
  document.getElementById("videoModalTitle").textContent = id ? "Edit Video" : "Add Video";

  if (id) {
    const video = allVideos.find(v => v._id === id);
    if (video) {
      document.getElementById("vTitle").value  = video.title;
      document.getElementById("vDesc").value   = video.description;
      document.getElementById("vDescCount").textContent = video.description.length;
      document.getElementById("vEmbed").value  = video.embedUrl || "";
      document.getElementById("vOrder").value  = video.order || 0;
      document.getElementById("vVisible").checked = video.isVisible;
    }
  }

  openModal("videoModal");
}

async function saveVideo() {
  const id       = document.getElementById("videoId").value;
  const title    = document.getElementById("vTitle").value.trim();
  const desc     = document.getElementById("vDesc").value.trim();
  const embedUrl = document.getElementById("vEmbed").value.trim();
  const order    = parseInt(document.getElementById("vOrder").value) || 0;
  const isVisible= document.getElementById("vVisible").checked;

  if (!title) return showToast("Title is required.", "error");
  if (!desc)  return showToast("Description is required.", "error");

  const payload = { title, description: desc, embedUrl, order, isVisible };

  const btn = document.getElementById("saveVideoBtn");
  btn.textContent = "Saving…";
  btn.disabled = true;

  const endpoint = id ? `/videos/${id}` : "/videos";
  const method   = id ? "PUT" : "POST";

  const result = await authFetch(endpoint, {
    method,
    body: JSON.stringify(payload),
  });

  btn.textContent = "Save Video";
  btn.disabled = false;

  if (result?.success) {
    closeModal("videoModal");
    showToast(id ? "Video updated!" : "Video added!", "success");
    await loadVideosTable();
    await loadOverviewStats();
  } else {
    showToast(result?.message || "Failed to save video.", "error");
  }
}

async function toggleVideo(id) {
  const result = await authFetch(`/videos/${id}/toggle`, { method: "PATCH" });
  if (result?.success) {
    showToast(result.message, "success");
    await loadVideosTable();
    await loadOverviewStats();
  } else {
    showToast("Failed to update visibility.", "error");
  }
}

/* ─── DELETE ─────────────────────────────────────────────── */
function confirmDelete(type, id, name) {
  document.getElementById("deleteMessage").textContent =
    `Are you sure you want to delete "${name}"? This cannot be undone.`;

  deleteCallback = async () => {
    const endpoint = type === "project" ? `/projects/${id}` : `/videos/${id}`;
    const result = await authFetch(endpoint, { method: "DELETE" });

    if (result?.success) {
      closeModal("deleteModal");
      showToast(`${type === "project" ? "Project" : "Video"} deleted.`, "success");
      if (type === "project") {
        await loadProjectsTable();
      } else {
        await loadVideosTable();
      }
      await loadOverviewStats();
    } else {
      showToast(result?.message || "Delete failed.", "error");
    }
  };

  openModal("deleteModal");

  const confirmBtn = document.getElementById("confirmDeleteBtn");
  // Remove old listener and attach fresh one
  confirmBtn.replaceWith(confirmBtn.cloneNode(true));
  document.getElementById("confirmDeleteBtn").addEventListener("click", deleteCallback);
}

/* ─── MODAL HELPERS ──────────────────────────────────────── */
function openModal(id) {
  document.getElementById(id)?.classList.add("open");
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove("open");
}

/* ─── TOAST ──────────────────────────────────────────────── */
let toastTimer = null;
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className   = `toast ${type} show`;

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
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