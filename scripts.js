// =============================================================
// MILKKIT — AUTH
// =============================================================
const currentUser = localStorage.getItem("milkkit_user");

const page = location.pathname.split("/").pop();
const isPublicPage =
  page === "" ||
  page === "index" ||
  page === "index.html" ||
  page === "create.html";

if (!currentUser && !isPublicPage) {
  window.location.href = "index.html";
}

// =============================================================
// RENDER MODE
// =============================================================
const IS_SINGLE_POST = location.pathname.includes("post.html");

// =============================================================
// ICONS
// =============================================================
const icons = {
  comment: `<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"w-5 h-5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\"><path d=\"M7 8h10M7 12h6m-2 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z\"/></svg>`,
  like: `<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"w-5 h-5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\"><path d=\"M5 15l7-7 7 7\"/></svg>`,
  bookmark: `<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"w-5 h-5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\"><path d=\"M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z\"/></svg>`,
  bookmarkFilled: `<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"w-5 h-5\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M6 2a2 2 0 00-2 2v18l8-5 8 5V4a2 2 0 00-2-2H6z\"/></svg>`,
  share: `<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"w-5 h-5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\"><path d=\"M15 8l4-4m0 0l-4-4m4 4H9\"/></svg>`
};

// =============================================================
// GLOBAL STATE
// =============================================================
var posts = JSON.parse(localStorage.getItem("milkkit_posts") || "[]");

function savePosts() {
  localStorage.setItem("milkkit_posts", JSON.stringify(posts));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// =============================================================
// LOGOUT
// =============================================================
function logout() {
  localStorage.removeItem("milkkit_user");
  window.location.href = "index.html";
}

// =============================================================
// STATUS
// =============================================================
function applyStatus(status) {
  localStorage.setItem("milkkit_status", status);

  const dot = document.getElementById("statusDot");
  const sidebar = document.getElementById("sidebarStatus");

  const colors = {
    online: "bg-green-500",
    away: "bg-yellow-400",
    dnd: "bg-red-600",
    offline: "bg-gray-500"
  };

  if (dot) {
    dot.className = `absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${colors[status]}`;
  }

  if (sidebar) sidebar.textContent = status;
}

// =============================================================
// MARKDOWN
// =============================================================
marked.setOptions({ breaks: true });

// =============================================================
// TIME
// =============================================================
function formatTime(time) {
  const diff = Date.now() - time;
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;
  return new Date(time).toLocaleDateString();
}

// =============================================================
// PREVIEW
// =============================================================
function getPreview(html, lines = 3) {
  const el = document.createElement("div");
  el.innerHTML = html;
  const text = el.innerText.trim();
  const split = text.split("\n").filter(Boolean);
  return split.slice(0, lines).join(" ") + (split.length > lines ? "…" : "");
}

// =============================================================
// INLINE COMPOSER
// =============================================================
function openComposer() {
  document.getElementById("composerOverlay")?.classList.remove("hidden");
}

function closeComposer() {
  document.getElementById("composerOverlay")?.classList.add("hidden");
}

function submitInlinePost() {
  const title = document.getElementById("inlineTitle").value.trim();
  const raw   = document.getElementById("inlineContent").value.trim();

  if (!title || !raw) {
    alert("title and content required");
    return;
  }

  posts.unshift({
    id: crypto.randomUUID(),
    title,
    raw,
    content: marked.parse(raw),
    author: currentUser,
    time: Date.now(),
    likes: [],
    bookmarks: [],
    comments: []
  });

  savePosts();

  document.getElementById("inlineTitle").value = "";
  document.getElementById("inlineContent").value = "";

  closeComposer();
  renderPosts();
}

// =============================================================
// BOOT
// =============================================================
document.addEventListener("DOMContentLoaded", () => {
  applyStatus(localStorage.getItem("milkkit_status") || "online");

  document.querySelectorAll("#statusMenu button[data-status]").forEach(btn => {
    btn.addEventListener("click", () => applyStatus(btn.dataset.status));
  });

  renderPosts();
});
