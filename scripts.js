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
// GLOBAL STATE
// =============================================================
let posts = JSON.parse(localStorage.getItem("milkkit_posts") || "[]");
let notifications = JSON.parse(localStorage.getItem("milkkit_notifs") || "[]");
let currentEditId = null;

function savePosts() {
  localStorage.setItem("milkkit_posts", JSON.stringify(posts));
}

function saveNotifs() {
  localStorage.setItem("milkkit_notifs", JSON.stringify(notifications));
}

// =============================================================
// TIME FORMATTER
// =============================================================
function formatTime(time) {
  const now = Date.now();
  const diff = now - time;

  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (sec < 5) return "just now";
  if (sec < 60) return sec + "s ago";
  if (min < 60) return min + "m ago";
  if (hr < 24) return hr + "h ago";
  if (day < 7) return day + "d ago";

  return new Date(time).toLocaleDateString();
}

// =============================================================
// LOGOUT
// =============================================================
function logout() {
  localStorage.removeItem("milkkit_user");
  window.location.href = "index.html";
}

// =============================================================
// NOTIFICATION ENGINE
// =============================================================
function addNotification(type, message, link = null) {
  notifications.unshift({
    type,
    message,
    link,
    time: Date.now(),
    read: false
  });

  saveNotifs();
  updateNotifDot();
  renderNotifications();
}

function updateNotifDot() {
  const dot = document.getElementById("notifDot");
  if (!dot) return;

  const unread = notifications.some(n => !n.read);
  dot.classList.toggle("hidden", !unread);
}

function toggleNotifications() {
  const menu = document.getElementById("notifMenu");
  menu.classList.toggle("hidden");

  if (!menu.classList.contains("hidden")) {
    notifications.forEach(n => n.read = true);
    saveNotifs();
    updateNotifDot();
    renderNotifications();
  }
}

function renderNotifications() {
  const menu = document.getElementById("notifMenu");
  if (!menu) return;

  if (notifications.length === 0) {
    menu.innerHTML = `<p class="text-gray-400 text-center py-4">no notifications yet ✦</p>`;
    return;
  }

  menu.innerHTML = notifications.map(n => `
    <div class="p-2 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 transition cursor-pointer">
      <p class="text-white">${n.message}</p>
      <p class="text-xs text-gray-500">${formatTime(n.time)}</p>
    </div>
  `).join("");
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
  const title = document.getElementById("inlineTitle")?.value.trim();
  const content = document.getElementById("inlineContent")?.value.trim();
  if (!title || !content) return alert("fill everything out");

  posts.unshift({
    title,
    raw: content,
    content: marked.parse(content),
    author: currentUser,
    comments: [],
    likes: [],
    hidden: false,
    time: Date.now(),
  });

  savePosts();
  renderPosts();

  document.getElementById("inlineTitle").value = "";
  document.getElementById("inlineContent").value = "";
  closeComposer();
}

function applyInlineFormat(type) {
  const box = document.getElementById("inlineContent");
  if (!box) return;

  if (type === "bold") box.value += " **bold**";
  if (type === "italic") box.value += " *italic*";
  if (type === "h1") box.value += "\n# heading";
  if (type === "bullet") box.value += "\n- item";
}

// =============================================================
// LIKE / SHARE / BOOKMARK
// =============================================================
function toggleLike(i) {
  const post = posts[i];
  post.likes ??= [];

  const liked = post.likes.includes(currentUser);
  post.likes = liked
    ? post.likes.filter(u => u !== currentUser)
    : [...post.likes, currentUser];

  if (!liked && post.author !== currentUser) {
    addNotification("like", `m/${currentUser} liked your post "${post.title}"`);
  }

  savePosts();
  renderPosts();
}

function sharePost(i) {
  navigator.clipboard.writeText(location.origin + "/home.html#post-" + i);
  alert("link copied");
}

function bookmarkPost() {
  alert("saved.");
}

// =============================================================
// MENU / POST CONTROLS
// =============================================================
function toggleMenu(i) {
  document.querySelectorAll("[id^='menu-']").forEach(m => m.classList.add("hidden"));
  document.getElementById(`menu-${i}`)?.classList.toggle("hidden");
}

function startEdit(i) {
  window.location.href = `submit.html?edit=${i}`;
}

function hidePost(i) {
  posts[i].hidden = true;
  savePosts();
  renderPosts();
}

let deleteTarget = null;

function askDelete(i) {
  deleteTarget = i;
  document.getElementById("deleteModal")?.classList.remove("hidden");
}

function confirmDelete() {
  if (deleteTarget === null) return;
  posts.splice(deleteTarget, 1);
  savePosts();
  deleteTarget = null;
  document.getElementById("deleteModal")?.classList.add("hidden");
  renderPosts();
}

function cancelDelete() {
  deleteTarget = null;
  document.getElementById("deleteModal")?.classList.add("hidden");
}

// =============================================================
// SIDEBAR STATUS SYNC
// =============================================================
const statusTextColors = {
  online: "text-green-400",
  away: "text-yellow-400",
  dnd: "text-red-500",
  offline: "text-gray-400"
};

function syncSidebarStatus(status) {
  const el = document.getElementById("sidebarStatus");
  if (!el) return;

  el.textContent = status;
  el.className = "text-xs " + statusTextColors[status];
}

// =============================================================
// STATUS ICON LOGIC
// =============================================================
document.addEventListener("DOMContentLoaded", () => {
  const statusButton = document.getElementById("statusButton");
  const statusMenu = document.getElementById("statusMenu");
  const statusDot = document.getElementById("statusDot");

  const ringColors = {
    online: "ring-green-500",
    away: "ring-yellow-400",
    dnd: "ring-red-600",
    offline: "ring-gray-500"
  };

  const dotColors = {
    online: "bg-green-500",
    away: "bg-yellow-400",
    dnd: "bg-red-600",
    offline: "bg-gray-500"
  };

  statusButton?.addEventListener("click", e => {
    e.stopPropagation();
    statusMenu?.classList.toggle("hidden");
  });

  document.querySelectorAll("#statusMenu button[data-status]").forEach(btn => {
    btn.addEventListener("click", () => {
      const status = btn.dataset.status;
      localStorage.setItem("milkkit_status", status);

      statusDot.className =
        "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 " +
        dotColors[status];

      statusButton.className =
        "relative w-8 h-8 rounded-full bg-gray-700 cursor-pointer ring-2 " +
        ringColors[status];

      syncSidebarStatus(status);
      statusMenu.classList.add("hidden");
    });
  });

  const savedStatus = localStorage.getItem("milkkit_status");
  if (savedStatus && statusDot) {
    statusDot.className =
      "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 " +
      dotColors[savedStatus];

    statusButton.className =
      "relative w-8 h-8 rounded-full bg-gray-700 cursor-pointer ring-2 " +
      ringColors[savedStatus];

    syncSidebarStatus(savedStatus);
  }

  document.addEventListener("click", () => statusMenu?.classList.add("hidden"));
});

// =============================================================
// BOOT
// =============================================================
document.addEventListener("DOMContentLoaded", () => {
  renderPosts();
  renderNotifications();
  updateNotifDot();

  document.getElementById("confirmDelete")?.addEventListener("click", confirmDelete);
  document.getElementById("cancelDelete")?.addEventListener("click", cancelDelete);
});
