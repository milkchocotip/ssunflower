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

function saveNotifs() {
  localStorage.setItem("milkkit_notifs", JSON.stringify(notifications));
}

// =============================================================
// ICONS (WHITE SVG)
// =============================================================
const icons = {
  comment: `
    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5"
      fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M7 8h10M7 12h6m-2 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
    </svg>
  `,
  like: `
    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5"
      fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M5 15l7-7 7 7" />
    </svg>
  `,
  bookmark: `
    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5"
      fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z" />
    </svg>
  `,
  share: `
    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5"
      fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M15 8l4-4m0 0l-4-4m4 4H9" />
    </svg>
  `
};

// =============================================================
// TIME FORMATTER
// =============================================================
function formatTime(time) {
  const diff = Date.now() - time;
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
// COMPOSER
// =============================================================
function openComposer() {
  document.getElementById("composerOverlay")?.classList.remove("hidden");
}

function closeComposer() {
  document.getElementById("composerOverlay")?.classList.add("hidden");
}

function submitInlinePost() {
  const title = document.getElementById("inlineTitle").value.trim();
  const content = document.getElementById("inlineContent").value.trim();

  if (!title || !content) return alert("fill everything out");

  posts.unshift({
    title,
    raw: content,
    content: marked.parse(content),
    author: currentUser,
    time: Date.now(),
    comments: [],
    likes: [],
    hidden: false
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
// COMMENTS
// =============================================================
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
  field.value = "";
  renderPosts();
}

// =============================================================
// POSTS RENDER
// =============================================================
function renderPosts() {
  const feed = document.getElementById("feed");
  if (!feed) return;

  feed.innerHTML = "";

  posts.forEach((post, i) => {
    if (post.hidden) return;

    post.likes ??= [];
    post.bookmarks ??= [];

    const liked = post.likes.includes(currentUser);
    const bookmarked = post.bookmarks.includes(currentUser);

    const card = document.createElement("div");
    card.className = "bg-gray-900 p-4 rounded-xl border border-gray-800";
    card.id = `post-${i}`;

    card.innerHTML = `
      <h3 class="text-xl font-bold">${post.title}</h3>
      <p class="text-xs text-gray-400 mb-3">
        m/${post.author} • ${formatTime(post.time)}
      </p>

      <div class="prose prose-invert mb-4">${post.content}</div>

      <div class="flex items-center justify-around text-gray-400">

        <!-- COMMENT -->
        <button
          onclick="document.getElementById('comment-box-${i}').classList.toggle('hidden')"
          class="hover:text-white transition"
          aria-label="comment"
        >
          ${icons.comment}
        </button>

        <!-- LIKE (MILK + COUNT) -->
        <button
          onclick="toggleLike(${i})"
          class="flex items-center gap-1 transition ${
            liked ? "text-white" : "hover:text-white"
          }"
          aria-label="like"
        >
          ${icons.like}
          <span class="text-sm">${post.likes.length}</span>
        </button>

        <!-- BOOKMARK (FILLS WHITE WHEN SAVED) -->
        <button
          onclick="toggleBookmark(${i})"
          class="transition ${
            bookmarked ? "text-white" : "hover:text-white"
          }"
          aria-label="bookmark"
        >
          ${icons.bookmark}
        </button>

        <!-- SHARE -->
        <button
          onclick="navigator.clipboard.writeText(location.href + '#post-${i}')"
          class="hover:text-white transition"
          aria-label="share"
        >
          ${icons.share}
        </button>

      </div>

      <div id="comment-box-${i}" class="hidden mt-4">
        <input
          id="comment-${i}"
          class="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white"
          placeholder="add a comment…"
        />
        <button
          onclick="submitComment(${i})"
          class="mt-2 bg-white text-black px-3 py-1 rounded"
        >
          reply
        </button>
      </div>
    `;

    feed.appendChild(card);
  });
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
// STATUS MENU
// =============================================================
document.addEventListener("DOMContentLoaded", () => {
  const statusButton = document.getElementById("statusButton");
  const statusMenu = document.getElementById("statusMenu");
  const statusDot = document.getElementById("statusDot");

  const dotColors = {
    online: "bg-green-500",
    away: "bg-yellow-400",
    dnd: "bg-red-600",
    offline: "bg-gray-500"
  };

  const ringColors = {
    online: "ring-green-500",
    away: "ring-yellow-400",
    dnd: "ring-red-600",
    offline: "ring-gray-500"
  };

  statusButton?.addEventListener("click", e => {
    e.stopPropagation();
    statusMenu.classList.toggle("hidden");
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
  if (savedStatus) syncSidebarStatus(savedStatus);

  document.addEventListener("click", () => statusMenu.classList.add("hidden"));
});

// =============================================================
// BOOT
// =============================================================
document.addEventListener("DOMContentLoaded", () => {
  renderPosts();
});
