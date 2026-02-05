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
  comment: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M7 8h10M7 12h6m-2 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>`,
  like: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M5 15l7-7 7 7"/></svg>`,
  bookmark: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z"/></svg>`,
  bookmarkFilled: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2a2 2 0 00-2 2v18l8-5 8 5V4a2 2 0 00-2-2H6z"/></svg>`,
  share: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 8l4-4m0 0l-4-4m4 4H9"/></svg>`
};

// =============================================================
// GLOBAL STATE
// =============================================================
let posts = JSON.parse(localStorage.getItem("milkkit_posts") || "[]");

function savePosts() {
  localStorage.setItem("milkkit_posts", JSON.stringify(posts));
}

function uid() {
  return crypto.randomUUID();
}

// =============================================================
// STATUS
// =============================================================
function applyStatus(status) {
  localStorage.setItem("milkkit_status", status);
  const dot = document.getElementById("statusDot");
  if (!dot) return;

  const colors = {
    online: "bg-green-500",
    away: "bg-yellow-400",
    dnd: "bg-red-600",
    offline: "bg-gray-500"
  };

  dot.className = `absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${colors[status]}`;
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
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(time).toLocaleDateString();
}

// =============================================================
// PREVIEW
// =============================================================
function getPreview(html, lines = 3) {
  const el = document.createElement("div");
  el.innerHTML = html;
  return el.innerText.split("\n").slice(0, lines).join(" ");
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
  const title = inlineTitle.value.trim();
  const raw = inlineContent.value.trim();
  if (!title || !raw) return;

  posts.unshift({
    id: uid(),
    title,
    content: marked.parse(raw),
    author: currentUser,
    time: Date.now(),
    likes: [],
    bookmarks: [],
    comments: []
  });

  savePosts();
  closeComposer();
  renderPosts();
}

// =============================================================
// POST INTERACTIONS
// =============================================================
function clickPost(id) {
  window.location.href = `post.html?id=${id}`;
}

function toggleLike(i) {
  const p = posts[i];
  const idx = p.likes.indexOf(currentUser);
  idx === -1 ? p.likes.push(currentUser) : p.likes.splice(idx, 1);
  savePosts();
  renderPosts();
}

function toggleBookmark(i) {
  const p = posts[i];
  const idx = p.bookmarks.indexOf(currentUser);
  idx === -1 ? p.bookmarks.push(currentUser) : p.bookmarks.splice(idx, 1);
  savePosts();
  renderPosts();
}

// =============================================================
// COMMENTS
// =============================================================
function toggleReply(id) {
  document.getElementById(`reply-box-${id}`)?.classList.toggle("hidden");
}

function findComment(list, id) {
  for (const c of list) {
    if (c.id === id) return c;
    const f = findComment(c.replies || [], id);
    if (f) return f;
  }
  return null;
}

function submitComment(postIndex, parentId = null) {
  const field = document.getElementById(parentId ? `reply-${parentId}` : `comment-${postIndex}`);
  if (!field?.value.trim()) return;

  const comment = {
    id: uid(),
    author: currentUser,
    content: marked.parse(field.value),
    time: Date.now(),
    likes: [],
    replies: []
  };

  parentId
    ? findComment(posts[postIndex].comments, parentId).replies.push(comment)
    : posts[postIndex].comments.push(comment);

  field.value = "";
  savePosts();
  renderPosts();
}

function toggleCommentLike(postIndex, id) {
  const c = findComment(posts[postIndex].comments, id);
  const i = c.likes.indexOf(currentUser);
  i === -1 ? c.likes.push(currentUser) : c.likes.splice(i, 1);
  savePosts();
  renderPosts();
}

// =============================================================
// COMMENT TREE
// =============================================================
function renderCommentTree(comments, postIndex, depth = 0) {
  return comments.map(c => `
    <div class="ml-${depth * 4} border-l border-gray-700 pl-3 mt-3">
      <div class="text-xs text-gray-400">m/${c.author} • ${formatTime(c.time)}</div>
      <div class="prose prose-invert text-sm">${c.content}</div>

      <div class="flex gap-3 text-xs text-gray-400">
        <button onclick="toggleCommentLike(${postIndex}, '${c.id}')">${icons.like} ${c.likes.length}</button>
        <button onclick="toggleReply('${c.id}')">reply</button>
      </div>

      <div id="reply-box-${c.id}" class="hidden mt-2">
        <input id="reply-${c.id}" class="w-full bg-gray-800 p-2 rounded" />
        <button onclick="submitComment(${postIndex}, '${c.id}')" class="mt-1 bg-white text-black px-2 py-1 rounded">post</button>
      </div>

      ${renderCommentTree(c.replies, postIndex, depth + 1)}
    </div>
  `).join("");
}

// =============================================================
// RENDER POSTS
// =============================================================
function renderPosts() {
  const feed = document.getElementById("feed");
  if (!feed) return;

  feed.innerHTML = "";

  posts.forEach((p, i) => {
    feed.innerHTML += `
      <div class="bg-gray-900 p-4 rounded-xl border border-gray-800">
        <div onclick="clickPost('${p.id}')" class="cursor-pointer">
          <div class="font-bold text-xl">${p.title}</div>
          <div class="text-xs text-gray-400">m/${p.author} • ${formatTime(p.time)}</div>
        </div>

        <div class="mt-2 text-sm">${IS_SINGLE_POST ? p.content : getPreview(p.content)}</div>

        <div class="flex justify-between text-gray-400 mt-3">
          <button>${icons.comment} ${p.comments.length}</button>
          <button onclick="toggleLike(${i})">${icons.like} ${p.likes.length}</button>
          <button onclick="toggleBookmark(${i})">${p.bookmarks.includes(currentUser) ? icons.bookmarkFilled : icons.bookmark}</button>
          <button onclick="navigator.clipboard.writeText(location.href)">${icons.share}</button>
        </div>

        ${IS_SINGLE_POST ? `
          <div class="mt-4">
            ${renderCommentTree(p.comments, i)}
            <input id="comment-${i}" class="w-full bg-gray-800 p-2 rounded mt-3" />
            <button onclick="submitComment(${i})" class="bg-white text-black px-3 py-1 rounded mt-1">reply</button>
          </div>
        ` : ""}
      </div>
    `;
  });
}

// =============================================================
// BOOT
// =============================================================
document.addEventListener("DOMContentLoaded", () => {
  applyStatus(localStorage.getItem("milkkit_status") || "online");
  renderPosts();
});
