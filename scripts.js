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

function savePosts() {
  localStorage.setItem("milkkit_posts", JSON.stringify(posts));
}

// =============================================================
// ICONS
// =============================================================
const icons = {
  comment: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M7 8h10M7 12h6m-2 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>`,
  like: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" /></svg>`,
  bookmark: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z" /></svg>`,
  share: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 8l4-4m0 0l-4-4m4 4H9" /></svg>`
};

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
  if (min < 60) return min + "m ago";
  if (hr < 24) return hr + "h ago";
  if (day < 7) return day + "d ago";
  return new Date(time).toLocaleDateString();
}

// =============================================================
// COMPOSER
// =============================================================
function openComposer() {
  document.getElementById("composerOverlay")?.classList.remove("hidden");
}
function closeComposer() {
  document.getElementById("composerOverlay")?.classList.add("hidden");
}

function submitInlinePost() {
  const titleEl = document.getElementById("inlineTitle");
  const contentEl = document.getElementById("inlineContent");
  const overlay = document.getElementById("composerOverlay");

  const title = titleEl?.value.trim();
  const content = contentEl?.value.trim();
  if (!title || !content) return alert("fill everything out");

  posts.unshift({
    id: crypto.randomUUID(),
    title,
    raw: content,
    content: marked.parse(content),
    author: currentUser,
    time: Date.now(),
    comments: [],
    likes: [],
    bookmarks: [],
    hidden: false
  });

  savePosts();
  overlay?.classList.add("hidden");
  renderPosts();

  titleEl.value = "";
  contentEl.value = "";
}

// =============================================================
// INTERACTIONS
// =============================================================
function toggleLike(i) {
  const l = posts[i].likes;
  const idx = l.indexOf(currentUser);
  idx === -1 ? l.push(currentUser) : l.splice(idx, 1);
  savePosts();
  renderPosts();
}

function toggleBookmark(i) {
  const b = posts[i].bookmarks;
  const idx = b.indexOf(currentUser);
  idx === -1 ? b.push(currentUser) : b.splice(idx, 1);
  savePosts();
  renderPosts();
}

// =============================================================
// COMMENTS (FIXED)
// =============================================================
let openCommentIndex = null;

function submitComment(i) {
  const field = document.getElementById(`comment-${i}`);
  if (!field || !field.value.trim()) return;

  posts[i].comments.push({
    author: currentUser,
    raw: field.value,
    content: marked.parse(field.value),
    time: Date.now()
  });

  savePosts();
  openCommentIndex = i;
  renderPosts();

  setTimeout(() => {
    document
      .getElementById(`comment-box-${i}`)
      ?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, 50);
}

// =============================================================
// RENDER
// =============================================================
function renderPosts() {
  const feed = document.getElementById("feed");
  if (!feed) return;

  feed.innerHTML = "";

  posts.forEach((post, i) => {
    if (post.hidden) return;

    const card = document.createElement("div");
    card.className = "bg-gray-900 p-4 rounded-xl border border-gray-800";

    card.innerHTML = `
      <h2 class="text-xl font-bold">${post.title}</h2>
      <p class="text-xs text-gray-400">m/${post.author} • ${formatTime(post.time)}</p>
      <div class="prose prose-invert my-3">${post.content}</div>

      <button onclick="toggleCommentBox(${i})">comment (${post.comments.length})</button>

      <div id="comment-box-${i}" class="${openCommentIndex === i ? "" : "hidden"} mt-2">
        <input id="comment-${i}" class="w-full p-2 bg-gray-800 rounded" placeholder="add a comment…" />
        <button onclick="submitComment(${i})" class="mt-1 bg-white text-black px-2 py-1 rounded">reply</button>
      </div>
    `;

    feed.appendChild(card);
  });
}

// =============================================================
// STATUS MENU
// =============================================================
document.addEventListener("DOMContentLoaded", () => {
  const statusButton = document.getElementById("statusButton");
  const statusMenu = document.getElementById("statusMenu");
  const statusDot = document.getElementById("statusDot");
  const sidebarStatus = document.getElementById("sidebarStatus");

  if (!statusButton || !statusMenu || !statusDot) return;

  const dotColors = {
    online: "bg-green-500",
    away: "bg-yellow-400",
    dnd: "bg-red-600",
    offline: "bg-gray-500"
  };

  statusButton.addEventListener("click", e => {
    e.stopPropagation();
    statusMenu.classList.toggle("hidden");
  });

  statusMenu.querySelectorAll("button[data-status]").forEach(btn => {
    btn.addEventListener("click", () => {
      const s = btn.dataset.status;
      localStorage.setItem("milkkit_status", s);
      statusDot.className = `w-3 h-3 rounded-full ${dotColors[s]}`;
      if (sidebarStatus) sidebarStatus.textContent = s;
      statusMenu.classList.add("hidden");
    });
  });

  document.addEventListener("click", () => statusMenu.classList.add("hidden"));
});

// =============================================================
// BOOT
// =============================================================
document.addEventListener("DOMContentLoaded", renderPosts);
