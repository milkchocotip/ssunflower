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
// ICONS
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
    bookmarks: [],
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
// INTERACTIONS
// =============================================================
function toggleLike(i) {
  const likes = posts[i].likes;
  const idx = likes.indexOf(currentUser);
  idx === -1 ? likes.push(currentUser) : likes.splice(idx, 1);
  savePosts();
  renderPosts();
}

function toggleBookmark(i) {
  const bm = posts[i].bookmarks;
  const idx = bm.indexOf(currentUser);
  idx === -1 ? bm.push(currentUser) : bm.splice(idx, 1);
  savePosts();
  renderPosts();
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
// POSTS RENDER (WITH FILTERS)
// =============================================================
function renderPosts() {
  const feed = document.getElementById("feed");
  if (!feed) return;

  const params = new URLSearchParams(location.search);
  const filter = params.get("filter");

  feed.innerHTML = "";

  posts.forEach((post, i) => {
    if (post.hidden) return;
    if (filter === "myposts" && post.author !== currentUser) return;
    if (filter === "saved" && !post.bookmarks.includes(currentUser)) return;

    const liked = post.likes.includes(currentUser);
    const bookmarked = post.bookmarks.includes(currentUser);

    const card = document.createElement("div");
    card.className = "bg-gray-900 p-4 rounded-xl border border-gray-800";

    card.innerHTML = `
      <h3 class="text-xl font-bold">${post.title}</h3>
      <p class="text-xs text-gray-400 mb-3">
        m/${post.author} • ${formatTime(post.time)}
      </p>

      <div class="prose prose-invert mb-4">${post.content}</div>

      <div class="flex items-center justify-around text-gray-400">
        <button onclick="document.getElementById('comment-box-${i}').classList.toggle('hidden')">
          ${icons.comment}
        </button>

        <button onclick="toggleLike(${i})" class="flex items-center gap-1 ${liked ? "text-white" : ""}">
          ${icons.like}<span>${post.likes.length}</span>
        </button>

        <button onclick="toggleBookmark(${i})" class="${bookmarked ? "text-white" : ""}">
          ${icons.bookmark}
        </button>

        <button onclick="navigator.clipboard.writeText(location.href + '#post-${i}')">
          ${icons.share}
        </button>
      </div>

      <div id="comment-box-${i}" class="hidden mt-4">
        <input id="comment-${i}" class="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
        <button onclick="submitComment(${i})"
          class="mt-2 bg-white text-black px-3 py-1 rounded">
          reply
        </button>
      </div>
    `;

    feed.appendChild(card);
  });
}

// =============================================================
// BOOT
// =============================================================
document.addEventListener("DOMContentLoaded", renderPosts);
