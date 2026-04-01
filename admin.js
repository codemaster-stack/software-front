/**
 * ============================================================
 *  ANGELUNI-SALLTD — admin.js v2.0
 *  Added: Email sender, Chart.js bar chart, Image upload,
 *         Video URL auto-convert, Logo display
 * ============================================================
 */

const API_BASE_URL = "https://angeluni.onrender.com/api";

/* ─── STATE ──────────────────────────────────────────────── */
let authToken      = localStorage.getItem("angeluni_token") || null;
let allProjects    = [];
let allVideos      = [];
let deleteCallback = null;
let projectChart   = null;
let uploadedImageUrl      = "";
let uploadedImagePublicId = "";

/* ─── INIT ───────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  if (authToken) verifyToken(); else showLogin();

  document.getElementById("loginBtn")?.addEventListener("click", handleLogin);
  document.getElementById("loginPass")?.addEventListener("keydown", e => { if (e.key === "Enter") handleLogin(); });
  document.getElementById("passToggle")?.addEventListener("click", () => {
    const input = document.getElementById("loginPass");
    input.type = input.type === "password" ? "text" : "password";
  });
  document.getElementById("logoutBtn")?.addEventListener("click", logout);
  document.querySelectorAll(".sidebar-link").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
  document.getElementById("sidebarToggle")?.addEventListener("click", () => {
    document.getElementById("adminSidebar").classList.toggle("open");
  });
  document.getElementById("sidebarClose")?.addEventListener("click", () => {
    document.getElementById("adminSidebar").classList.remove("open");
  });
  document.getElementById("pDesc")?.addEventListener("input", () => {
    document.getElementById("pDescCount").textContent = document.getElementById("pDesc").value.length;
  });
  document.getElementById("vDesc")?.addEventListener("input", () => {
    document.getElementById("vDescCount").textContent = document.getElementById("vDesc").value.length;
  });
  document.getElementById("pImageFile")?.addEventListener("change", handleImageUpload);
  document.getElementById("vEmbed")?.addEventListener("blur", autoConvertVideoUrl);
  document.getElementById("sendEmailBtn")?.addEventListener("click", handleSendEmail);
  document.getElementById("testEmailBtn")?.addEventListener("click", handleTestEmail);
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", e => { if (e.target === overlay) overlay.classList.remove("open"); });
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") document.querySelectorAll(".modal-overlay.open").forEach(m => m.classList.remove("open"));
  });
});

/* ─── AUTH ───────────────────────────────────────────────── */
async function verifyToken() {
  const res = await authFetch("/auth/verify");
  if (res?.success) showDashboard(); else logout();
}

async function handleLogin() {
  const username = document.getElementById("loginUser")?.value.trim();
  const password = document.getElementById("loginPass")?.value;
  const errorEl  = document.getElementById("loginError");
  const loginBtn = document.getElementById("loginBtn");
  if (!username || !password) { showLoginError("Please enter your username and password."); return; }
  loginBtn.textContent = "Signing in…"; loginBtn.disabled = true; errorEl.style.display = "none";
  try {
    const res  = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.success) { authToken = data.token; localStorage.setItem("angeluni_token", authToken); showDashboard(); }
    else showLoginError(data.message || "Invalid credentials.");
  } catch { showLoginError("Could not connect to the server."); }
  finally { loginBtn.textContent = "Sign In to Dashboard"; loginBtn.disabled = false; }
}

function logout() { authToken = null; localStorage.removeItem("angeluni_token"); showLogin(); }
function showLogin() { document.getElementById("loginScreen").style.display = "flex"; document.getElementById("adminDashboard").style.display = "none"; }
function showDashboard() { document.getElementById("loginScreen").style.display = "none"; document.getElementById("adminDashboard").style.display = "flex"; loadOverviewStats(); loadProjectsTable(); loadVideosTable(); }
function showLoginError(msg) { const el = document.getElementById("loginError"); el.textContent = msg; el.style.display = "block"; }

/* ─── AUTHENTICATED FETCH ────────────────────────────────── */
async function authFetch(endpoint, options = {}) {
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${authToken}`, ...options.headers };
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    if (res.status === 401) { logout(); return null; }
    return await res.json();
  } catch (err) { console.error(`authFetch error [${endpoint}]:`, err); return null; }
}

/* ─── TABS ───────────────────────────────────────────────── */
function switchTab(tab) {
  document.querySelectorAll(".sidebar-link").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tab));
  document.querySelectorAll(".tab-pane").forEach(pane => pane.classList.toggle("active", pane.id === `tab-${tab}`));
  const titles = { overview: "Overview", projects: "Projects", videos: "Videos", email: "Send Email" };
  document.getElementById("topbarTitle").textContent = titles[tab] || tab;
  document.getElementById("adminSidebar").classList.remove("open");
  if (tab === "overview") loadChart();
}

/* ─── OVERVIEW + CHART ───────────────────────────────────── */
async function loadOverviewStats() {
  const [pResult, vResult] = await Promise.all([authFetch("/projects/all"), authFetch("/videos/all")]);
  if (pResult?.success) {
    allProjects = pResult.data;
    document.getElementById("statProjects").textContent  = allProjects.length;
    document.getElementById("statVisible").textContent   = allProjects.filter(p => p.isVisible).length;
    document.getElementById("statWithLinks").textContent = allProjects.filter(p => p.demoUrl && p.demoUrl !== "#").length;
    loadChart();
  }
  if (vResult?.success) { allVideos = vResult.data; document.getElementById("statVideos").textContent = allVideos.length; }
}

function loadChart() {
  const canvas = document.getElementById("projectsChart");
  if (!canvas) return;
  const now = new Date();
  const labels = [], counts = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleString("default", { month: "short", year: "2-digit" }));
    counts.push(allProjects.filter(p => {
      const c = new Date(p.createdAt);
      return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear();
    }).length);
  }
  if (projectChart) projectChart.destroy();
  projectChart = new Chart(canvas, {
    type: "bar",
    data: { labels, datasets: [{ label: "Projects Added", data: counts, backgroundColor: "rgba(0,229,189,0.25)", borderColor: "#00e5bd", borderWidth: 2, borderRadius: 6, borderSkipped: false }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: "#0c1526", borderColor: "#00e5bd", borderWidth: 1, titleColor: "#e8edf5", bodyColor: "#8fa0b8" } },
      scales: {
        x: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#8fa0b8", font: { size: 12 } } },
        y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#8fa0b8", stepSize: 1, font: { size: 12 } }, beginAtZero: true },
      },
    },
  });
}

/* ─── PROJECTS TABLE ─────────────────────────────────────── */
async function loadProjectsTable() {
  const container = document.getElementById("projectsTable");
  container.innerHTML = `<div class="loading-state">Loading projects…</div>`;
  const result = await authFetch("/projects/all");
  if (!result?.success) { container.innerHTML = `<div class="loading-state">⚠️ Failed to load projects.</div>`; return; }
  allProjects = result.data;
  if (allProjects.length === 0) { container.innerHTML = `<div class="data-table-wrap"><div class="empty-table">No projects yet. <button class="btn btn-ghost" onclick="openProjectModal()">Add your first →</button></div></div>`; return; }
  const rows = allProjects.map(p => `
    <tr>
      <td>${p.imageUrl ? `<img src="${escHtml(p.imageUrl)}" class="table-thumb" alt="${escHtml(p.title)}" />` : `<div class="table-thumb-placeholder">${p.icon||"🌐"}</div>`}</td>
      <td class="td-title"><span>${escHtml(p.title)}</span><div class="sub">${escHtml(p.description.substring(0,55))}…</div></td>
      <td><span class="badge badge-${p.category}">${formatCategory(p.category)}</span></td>
      <td><span class="visible-dot ${p.isVisible?"on":"off"}"></span>${p.isVisible?"Visible":"Hidden"}</td>
      <td>${p.demoUrl&&p.demoUrl!=="#"?`<a href="${escHtml(p.demoUrl)}" target="_blank" rel="noopener" style="color:var(--teal);font-size:0.82rem;">View ↗</a>`:`<span style="color:var(--text-3);font-size:0.82rem;">No link</span>`}</td>
      <td><div class="actions-cell">
        <button class="btn-sm btn-edit" onclick="openProjectModal('${p._id}')">Edit</button>
        <button class="btn-sm btn-toggle" onclick="toggleProject('${p._id}')">${p.isVisible?"Hide":"Show"}</button>
        <button class="btn-sm btn-delete" onclick="confirmDelete('project','${p._id}','${escHtml(p.title)}')">Delete</button>
      </div></td>
    </tr>`).join("");
  container.innerHTML = `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Image</th><th>Project</th><th>Category</th><th>Status</th><th>Demo</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* ─── PROJECT MODAL ──────────────────────────────────────── */
function openProjectModal(id = null) {
  uploadedImageUrl = ""; uploadedImagePublicId = "";
  ["projectId","pTitle","pDesc","pTags","pDemo"].forEach(i => { const el = document.getElementById(i); if(el) el.value = ""; });
  document.getElementById("pDescCount").textContent = "0";
  document.getElementById("pCategory").value  = "";
  document.getElementById("pIcon").value      = "🌐";
  document.getElementById("pOrder").value     = "0";
  document.getElementById("pVisible").checked = true;
  document.getElementById("pImageFile").value = "";
  document.getElementById("imagePreview").style.display = "none";
  document.getElementById("imagePreview").src = "";
  document.getElementById("uploadStatus").textContent = "";
  document.getElementById("projectModalTitle").textContent = id ? "Edit Project" : "Add Project";
  if (id) {
    const p = allProjects.find(p => p._id === id);
    if (p) {
      document.getElementById("pTitle").value     = p.title;
      document.getElementById("pDesc").value      = p.description;
      document.getElementById("pDescCount").textContent = p.description.length;
      document.getElementById("pCategory").value  = p.category;
      document.getElementById("pIcon").value      = p.icon || "🌐";
      document.getElementById("pTags").value      = (p.tags||[]).join(", ");
      document.getElementById("pDemo").value      = p.demoUrl !== "#" ? p.demoUrl : "";
      document.getElementById("pOrder").value     = p.order || 0;
      document.getElementById("pVisible").checked = p.isVisible;
      if (p.imageUrl) { uploadedImageUrl = p.imageUrl; uploadedImagePublicId = p.imagePublicId||""; const pr = document.getElementById("imagePreview"); pr.src = p.imageUrl; pr.style.display = "block"; }
    }
  }
  openModal("projectModal");
}

async function handleImageUpload(e) {
  const file = e.target.files[0];
  const status  = document.getElementById("uploadStatus");
  const preview = document.getElementById("imagePreview");
  if (!file) return;
  status.textContent = "⏳ Uploading…"; status.style.color = "var(--text-3)";
  const formData = new FormData(); formData.append("image", file);
  try {
    const res  = await fetch(`${API_BASE_URL}/upload/image`, { method: "POST", headers: { Authorization: `Bearer ${authToken}` }, body: formData });
    const data = await res.json();
    if (data.success) { uploadedImageUrl = data.imageUrl; uploadedImagePublicId = data.publicId; preview.src = data.imageUrl; preview.style.display = "block"; status.textContent = "✅ Image uploaded!"; status.style.color = "var(--teal)"; }
    else { status.textContent = "❌ " + (data.message||"Upload failed."); status.style.color = "var(--accent-red)"; }
  } catch { status.textContent = "❌ Upload failed."; status.style.color = "var(--accent-red)"; }
}

async function saveProject() {
  const id = document.getElementById("projectId").value;
  const title    = document.getElementById("pTitle").value.trim();
  const desc     = document.getElementById("pDesc").value.trim();
  const category = document.getElementById("pCategory").value;
  if (!title)    return showToast("Title is required.", "error");
  if (!desc)     return showToast("Description is required.", "error");
  if (!category) return showToast("Please select a category.", "error");
  const payload = { title, description: desc, category, icon: document.getElementById("pIcon").value.trim()||"🌐", tags: document.getElementById("pTags").value.split(",").map(t=>t.trim()).filter(Boolean), demoUrl: document.getElementById("pDemo").value.trim()||"#", order: parseInt(document.getElementById("pOrder").value)||0, isVisible: document.getElementById("pVisible").checked, imageUrl: uploadedImageUrl, imagePublicId: uploadedImagePublicId };
  const btn = document.getElementById("saveProjectBtn"); btn.textContent = "Saving…"; btn.disabled = true;
  const result = await authFetch(id?`/projects/${id}`:"/projects", { method: id?"PUT":"POST", body: JSON.stringify(payload) });
  btn.textContent = "Save Project"; btn.disabled = false;
  if (result?.success) { closeModal("projectModal"); showToast(id?"Project updated!":"Project added!", "success"); await loadProjectsTable(); await loadOverviewStats(); }
  else showToast(result?.message||"Failed to save project.", "error");
}

async function toggleProject(id) {
  const result = await authFetch(`/projects/${id}/toggle`, { method: "PATCH" });
  if (result?.success) { showToast(result.message, "success"); await loadProjectsTable(); await loadOverviewStats(); }
  else showToast("Failed to update visibility.", "error");
}

/* ─── VIDEO URL AUTO-CONVERT ─────────────────────────────── */
function autoConvertVideoUrl() {
  const input = document.getElementById("vEmbed");
  const hint  = document.getElementById("vEmbedHint");
  if (!input) return;

  // Strip any accidental leading/trailing whitespace or emoji
  let url = input.value.trim();
  // Remove any non-URL characters before https
  url = url.replace(/^[^h]*(https)/i, 'https');
  input.value = url;

  if (!url) return;
  if (url.includes("youtube.com/embed/") || url.includes("player.vimeo.com")) {
    if (hint) { hint.textContent = "✅ Valid embed URL"; hint.style.color = "var(--teal)"; }
    return;
  }

  const ytShort = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  const ytWatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
  const ytId    = (ytShort && ytShort[1]) || (ytWatch && ytWatch[1]);

  if (ytId) {
    input.value = "https://www.youtube.com/embed/" + ytId;
    if (hint) { hint.textContent = "✅ Converted to embed URL!"; hint.style.color = "var(--teal)"; }
    return;
  }

  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) {
    input.value = "https://player.vimeo.com/video/" + vimeo[1];
    if (hint) { hint.textContent = "✅ Converted to embed URL!"; hint.style.color = "var(--teal)"; }
  }
}

/* ─── VIDEOS TABLE ───────────────────────────────────────── */
async function loadVideosTable() {
  const container = document.getElementById("videosTable");
  container.innerHTML = `<div class="loading-state">Loading videos…</div>`;
  const result = await authFetch("/videos/all");
  if (!result?.success) { container.innerHTML = `<div class="loading-state">⚠️ Failed to load videos.</div>`; return; }
  allVideos = result.data;
  if (allVideos.length === 0) { container.innerHTML = `<div class="data-table-wrap"><div class="empty-table">No videos yet. <button class="btn btn-ghost" onclick="openVideoModal()">Add your first →</button></div></div>`; return; }
  const rows = allVideos.map(v => `
    <tr>
      <td class="td-title"><span>${escHtml(v.title)}</span><div class="sub">${escHtml(v.description.substring(0,55))}…</div></td>
      <td>${v.embedUrl?`<a href="${escHtml(v.embedUrl)}" target="_blank" rel="noopener" style="color:var(--teal);font-size:0.82rem;">Embedded ↗</a>`:`<span style="color:var(--text-3);font-size:0.82rem;">No embed</span>`}</td>
      <td><span class="visible-dot ${v.isVisible?"on":"off"}"></span>${v.isVisible?"Visible":"Hidden"}</td>
      <td><div class="actions-cell">
        <button class="btn-sm btn-edit" onclick="openVideoModal('${v._id}')">Edit</button>
        <button class="btn-sm btn-toggle" onclick="toggleVideo('${v._id}')">${v.isVisible?"Hide":"Show"}</button>
        <button class="btn-sm btn-delete" onclick="confirmDelete('video','${v._id}','${escHtml(v.title)}')">Delete</button>
      </div></td>
    </tr>`).join("");
  container.innerHTML = `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Video</th><th>Embed</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function openVideoModal(id = null) {
  document.getElementById("videoId").value = id||"";
  ["vTitle","vDesc","vEmbed"].forEach(i => { const el=document.getElementById(i); if(el) el.value=""; });
  document.getElementById("vDescCount").textContent = "0";
  const hint = document.getElementById("vEmbedHint"); if(hint){hint.textContent="";hint.style.color="";}
  document.getElementById("vOrder").value = "0"; document.getElementById("vVisible").checked = true;
  document.getElementById("videoModalTitle").textContent = id?"Edit Video":"Add Video";
  if (id) { const v=allVideos.find(v=>v._id===id); if(v){ document.getElementById("vTitle").value=v.title; document.getElementById("vDesc").value=v.description; document.getElementById("vDescCount").textContent=v.description.length; document.getElementById("vEmbed").value=v.embedUrl||""; document.getElementById("vOrder").value=v.order||0; document.getElementById("vVisible").checked=v.isVisible; } }
  openModal("videoModal");
}

async function saveVideo() {
  const id = document.getElementById("videoId").value;
  const title    = document.getElementById("vTitle").value.trim();
  const desc     = document.getElementById("vDesc").value.trim();
  const embedUrl = document.getElementById("vEmbed").value.trim();
  if (!title) return showToast("Title is required.","error");
  if (!desc)  return showToast("Description is required.","error");
  const btn = document.getElementById("saveVideoBtn"); btn.textContent="Saving…"; btn.disabled=true;
  const result = await authFetch(id?`/videos/${id}`:"/videos", { method:id?"PUT":"POST", body:JSON.stringify({title,description:desc,embedUrl,order:parseInt(document.getElementById("vOrder").value)||0,isVisible:document.getElementById("vVisible").checked}) });
  btn.textContent="Save Video"; btn.disabled=false;
  if (result?.success) { closeModal("videoModal"); showToast(id?"Video updated!":"Video added!","success"); await loadVideosTable(); await loadOverviewStats(); }
  else showToast(result?.message||"Failed to save video.","error");
}

async function toggleVideo(id) {
  const result = await authFetch(`/videos/${id}/toggle`,{method:"PATCH"});
  if (result?.success) { showToast(result.message,"success"); await loadVideosTable(); }
  else showToast("Failed to update visibility.","error");
}

/* ─── EMAIL ──────────────────────────────────────────────── */
async function handleSendEmail() {
  const recipientEmail = document.getElementById("emailTo").value.trim();
  const recipientName  = document.getElementById("emailName").value.trim();
  const subject        = document.getElementById("emailSubject").value.trim();
  const message        = document.getElementById("emailMessage").value.trim();
  const senderName     = document.getElementById("emailSender").value.trim();
  const attachInput    = document.getElementById("emailAttachment");
  const btn            = document.getElementById("sendEmailBtn");

  if (!recipientEmail) return showToast("Recipient email is required.", "error");
  if (!subject)        return showToast("Subject is required.", "error");
  if (!message)        return showToast("Message is required.", "error");

  btn.textContent = "Sending…";
  btn.disabled    = true;

  // Use FormData to support file attachment
  const formData = new FormData();
  formData.append("recipientEmail", recipientEmail);
  formData.append("recipientName",  recipientName);
  formData.append("subject",        subject);
  formData.append("message",        message);
  formData.append("senderName",     senderName);

  // Attach file if selected
  if (attachInput && attachInput.files[0]) {
    formData.append("attachment", attachInput.files[0]);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/email/send`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body:    formData, // No Content-Type header — browser sets it with boundary
    });
    const result = await res.json();

    if (result?.success) {
      showToast("✅ Email sent successfully!", "success");
      ["emailTo","emailName","emailSubject","emailMessage"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
      if (attachInput) { attachInput.value = ""; }
      const nameEl = document.getElementById("attachmentName");
      if (nameEl) nameEl.textContent = "";
    } else {
      showToast(result?.message || "Failed to send email.", "error");
    }
  } catch {
    showToast("Failed to send email. Check connection.", "error");
  } finally {
    btn.textContent = "Send Email";
    btn.disabled    = false;
  }
}

async function handleTestEmail() {
  const btn = document.getElementById("testEmailBtn"); btn.textContent="Sending test…"; btn.disabled=true;
  const result = await authFetch("/email/test");
  btn.textContent="Send Test Email"; btn.disabled=false;
  if (result?.success) showToast("✅ Test email sent to your Gmail!","success");
  else showToast(result?.message||"Test failed.","error");
}

/* ─── DELETE ─────────────────────────────────────────────── */
function confirmDelete(type,id,name) {
  document.getElementById("deleteMessage").textContent = `Are you sure you want to delete "${name}"? This cannot be undone.`;
  deleteCallback = async () => {
    const result = await authFetch(type==="project"?`/projects/${id}`:`/videos/${id}`,{method:"DELETE"});
    if (result?.success) { closeModal("deleteModal"); showToast(`${type==="project"?"Project":"Video"} deleted.`,"success"); if(type==="project") await loadProjectsTable(); else await loadVideosTable(); await loadOverviewStats(); }
    else showToast(result?.message||"Delete failed.","error");
  };
  openModal("deleteModal");
  const confirmBtn = document.getElementById("confirmDeleteBtn"); confirmBtn.replaceWith(confirmBtn.cloneNode(true));
  document.getElementById("confirmDeleteBtn").addEventListener("click",deleteCallback);
}

/* ─── HELPERS ────────────────────────────────────────────── */
function openModal(id)  { document.getElementById(id)?.classList.add("open");    }
function closeModal(id) { document.getElementById(id)?.classList.remove("open"); }
let toastTimer = null;
function showToast(message,type="success") { const t=document.getElementById("toast"); t.textContent=message; t.className=`toast ${type} show`; if(toastTimer) clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove("show"),3500); }
function formatCategory(cat) { return {website:"Website",webapp:"Web App",ecommerce:"E-commerce"}[cat]||cat; }
function escHtml(str) { if(typeof str!=="string") return ""; return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }