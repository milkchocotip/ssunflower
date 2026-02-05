// =============================================================
// MILKKIT FULL ENGINE — INLINE POST VERSION (UPDATED + TIMESTAMPS + LIKES)
// =============================================================

// -------------------------------------------------------------
// AUTH — protects private pages
// -------------------------------------------------------------
const currentUser = localStorage.getItem("milkkit_user");

// get page name
const page = location.pathname.split("/").pop();

const isPublicPage =
  page === "" ||
  page === "index" ||
  page === "index.html" ||
  page === "create.html";

if (!currentUser && !isPublicPage) {
  window.location.href = "index.html";
}

// -------------------------------------------------------------
// GLOBAL STATE
// -------------------------------------------------------------
let posts = JSON.parse(localStorage.getItem("milkkit_posts") || "[]");
let currentEditId = null;

function savePosts() {
  localStorage.setItem("milkkit_posts", JSON.stringify(posts));
}

// -------------------------------------------------------------
// TIMESTAMP FORMATTER
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// LOGOUT
// -------------------------------------------------------------
function logout() {
  localStorage.removeItem("milkkit_user");
  window.location.href = "index.html";
}

// -------------------------------------------------------------
// COMPOSER OPEN/CLOSE
// -------------------------------------------------------------
function openComposer() {
  document.getElementById("composerOverlay").classList.remove("hidden");
}

function closeComposer() {
  document.getElementById("composerOverlay").classList.add("hidden");
}

// -------------------------------------------------------------
// FULL PAGE SUBMIT (legacy)
// -------------------------------------------------------------
function submitPost() {
  const titleEl = document.getElementById("posttitle");
  const contentEl = document.getElementById("postcontent");
  if (!titleEl || !contentEl) return;

  const title = titleEl.value.trim();
  const content = contentEl.value.trim();
  if (!title || !content) return alert("fill everything out");

  const rendered = marked.parse(content);

  if (currentEditId !== null) {
    if (posts[currentEditId].author !== currentUser) return;

    posts[currentEditId].title = title;
    posts[currentEditId].raw = content;
    posts[currentEditId].content = rendered;

    savePosts();
    window.location.href = "home.html";
    return;
  }

  posts.unshift({
    title,
    raw: content,
    content: rendered,
    author: currentUser,
    comments: [],
    hidden: false,
    likes: [],        // << NEW
    time: Date.now()
  });

  savePosts();
  window.location.href = "home.html";
}

// -------------------------------------------------------------
// INLINE POST SUBMISSION
// -------------------------------------------------------------
function submitInlinePost() {
  const title = document.getElementById("inlineTitle")?.value.trim();
  const content = document.getElementById("inlineContent")?.value.trim();

  if (!title || !content) return alert("fill everything out");

  const rendered = marked.parse(content);

  posts.unshift({
    title,
    raw: content,
    content: rendered,
    author: currentUser,
    comments: [],
    hidden: false,
    likes: [],       // << NEW
    time: Date.now()
  });

  savePosts();
  renderPosts();

  document.getElementById("inlineTitle").value = "";
  document.getElementById("inlineContent").value = "";

  closeComposer();
}

// -------------------------------------------------------------
// INLINE FORMAT HELPERS
// -------------------------------------------------------------
function applyInlineFormat(type) {
  const box = document.getElementById("inlineContent");
  if (!box) return;

  let text = box.value;

  if (type === "bold") text += " **bold**";
  if (type === "italic") text += " *italic*";
  if (type === "h1") text += "\n# heading";
  if (type === "bullet") text += "\n- item";

  box.value = text;
}

// -------------------------------------------------------------
// EDIT MODE
// -------------------------------------------------------------
function checkEditMode() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("edit")) return;

  currentEditId = Number(params.get("edit"));
  const post = posts[currentEditId];

  if (!post || post.author !== currentUser) {
    window.location.href = "home.html";
    return;
  }

  const titleEl = document.getElementById("posttitle");
  const contentEl = document.getElementById("postcontent");

  if (!titleEl || !contentEl) return;

  titleEl.value = post.title;
  contentEl.value = post.raw;
}

// -------------------------------------------------------------
// LIKE BUTTON (🥛)
// -------------------------------------------------------------
function toggleLike(i) {
  const post = posts[i];
  if (!post.likes) post.likes = [];

  const index = post.likes.indexOf(currentUser);

  if (index === -1) post.likes.push(currentUser);
  else post.likes.splice(index, 1);

  savePosts();
  renderPosts();
}

// -------------------------------------------------------------
// RENDER POSTS
// -------------------------------------------------------------
function renderPosts() {
  const feed = document.getElementById("feed");
  if (!feed) return;

  feed.innerHTML = "";

  if (posts.length === 0) {
    feed.innerHTML = `<p class="text-gray-500 text-center mt-10">no posts yet — be the first ✦</p>`;
    return;
  }

  posts.forEach((post, i) => {
    if (post.hidden) return;

    const isOwner = post.author === currentUser;
    const liked = post.likes?.includes(currentUser);

    const card = document.createElement("div");
    card.className = "bg-gray-900 p-4 rounded-xl border border-gray-800";

    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <h3 class="text-xl font-bold">${post.title}</h3>
          <p class="text-xs text-gray-400">m/${post.author} • ${formatTime(post.time)}</p>
        </div>

        ${isOwner ? `
        <div class="relative">
          <button onclick="toggleMenu(${i})" class="px-2">⋯</button>
          <div id="menu-${i}" class="hidden absolute right-0 top-6 bg-gray-800 border border-gray-700 rounded p-2 text-sm">
            <button onclick="startEdit(${i})" class="block w-full text-left">edit</button>
            <button onclick="hidePost(${i})" class="block w-full text-left">hide</button>
            <button onclick="askDelete(${i})" class="block w-full text-left">delete</button>
          </div>
        </div>` : ""}
      </div>

      <div class="prose prose-invert mt-3">${post.content}</div>

      <!-- LIKE BUTTON -->
      <div class="mt-3 flex items-center gap-3">
        <button
          onclick="toggleLike(${i})"
          class="text-xl ${liked ? "opacity-100" : "opacity-40"} hover:opacity-100 transition"
        >
          🥛
        </button>

        <span class="text-sm text-gray-400">${post.likes?.length || 0} likes</span>
      </div>

      <!-- COMMENTS -->
      <div class="mt-4">
        <input id="comment-${i}" class="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white" placeholder="add a comment..." />
        <button onclick="submitComment(${i})" class="mt-2 bg-white text-black px-3 py-1 rounded">comment</button>
      </div>

      <div id="comments-${i}" class="mt-4 space-y-3"></div>
    `;

    feed.appendChild(card);
    renderComments(i);
  });
}

// -------------------------------------------------------------
// MENU HANDLING
// -------------------------------------------------------------
function toggleMenu(i) {
  document.querySelectorAll("[id^='menu-']").forEach(m => m.classList.add("hidden"));
  const m = document.getElementById(`menu-${i}`);
  if (m) m.classList.toggle("hidden");
}

// -------------------------------------------------------------
// POST ACTIONS
// -------------------------------------------------------------
function startEdit(i) {
  if (posts[i].author !== currentUser) return;
  window.location.href = `submit.html?edit=${i}`;
}

function hidePost(i) {
  if (posts[i].author !== currentUser) return;
  posts[i].hidden = true;
  savePosts();
  renderPosts();
}

let deleteTarget = null;

function askDelete(i) {
  if (posts[i].author !== currentUser) return;
  deleteTarget = i;
  document.getElementById("deleteModal")?.classList.remove("hidden");
}

function confirmDelete() {
  if (deleteTarget === null) return;
  posts.splice(deleteTarget, 1);
  savePosts();
  document.getElementById("deleteModal")?.classList.add("hidden");
  deleteTarget = null;
  renderPosts();
}

function cancelDelete() {
  document.getElementById("deleteModal")?.classList.add("hidden");
  deleteTarget = null;
}

// -------------------------------------------------------------
// COMMENTS / REPLIES
// -------------------------------------------------------------
function submitComment(i) {
  const field = document.getElementById(`comment-${i}`);
  if (!field) return;

  const text = field.value.trim();
  if (!text) return;

  posts[i].comments.push({
    author: currentUser,
    content: marked.parse(text),
    replies: []
  });

  savePosts();
  field.value = "";
  renderComments(i);
}

function renderComments(i) {
  const wrap = document.getElementById(`comments-${i}`);
  if (!wrap) return;

  wrap.innerHTML = "";

  posts[i].comments.forEach((c, ci) => {
    const div = document.createElement("div");
    div.className = "bg-gray-800 p-3 rounded-lg";

    div.innerHTML = `
      <p class="text-xs text-gray-400 mb-1">m/${c.author}</p>
      <div class="prose prose-invert">${c.content}</div>

      <div class="mt-2">
        <input id="reply-${i}-${ci}" class="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white" placeholder="reply..." />
        <button onclick="submitReply(${i}, ${ci})" class="mt-2 bg-white text-black px-3 py-1 rounded">reply</button>
      </div>

      <div id="replies-${i}-${ci}" class="mt-3 ml-4 border-l border-gray-600 pl-4 space-y-2"></div>
    `;

    wrap.appendChild(div);
    renderReplies(i, ci);
  });
}

function submitReply(i, ci) {
  const field = document.getElementById(`reply-${i}-${ci}`);
  if (!field) return;

  const text = field.value.trim();
  if (!text) return;

  posts[i].comments[ci].replies.push({
    author: currentUser,
    content: marked.parse(text)
  });

  savePosts();
  field.value = "";
  renderReplies(i, ci);
}

function renderReplies(i, ci) {
  const wrap = document.getElementById(`replies-${i}-${ci}`);
  if (!wrap) return;

  wrap.innerHTML = "";

  posts[i].comments[ci].replies.forEach(r => {
    const div = document.createElement("div");
    div.className = "prose prose-invert bg-gray-700 p-2 rounded";
    div.innerHTML = `<p class="text-xs text-gray-400">m/${r.author}</p>${r.content}`;
    wrap.appendChild(div);
  });
}

// -------------------------------------------------------------
// STATUS DROPDOWN
// -------------------------------------------------------------
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

  if (statusButton) {
    statusButton.addEventListener("click", (e) => {
      e.stopPropagation();
      statusMenu?.classList.toggle("hidden");
    });
  }

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

      statusMenu.classList.add("hidden");
    });
  });

  const savedStatus = localStorage.getItem("milkkit_status");
  if (savedStatus && statusDot && statusButton) {
    statusDot.className =
      "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 " +
      dotColors[savedStatus];

    statusButton.className =
      "relative w-8 h-8 rounded-full bg-gray-700 cursor-pointer ring-2 " +
      ringColors[savedStatus];
  }

  document.addEventListener("click", () => {
    statusMenu?.classList.add("hidden");
  });
});

// -------------------------------------------------------------
// BOOT
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  renderPosts();
  checkEditMode();

  document.getElementById("confirmDelete")?.addEventListener("click", confirmDelete);
  document.getElementById("cancelDelete")?.addEventListener("click", cancelDelete);
});
