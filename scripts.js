// =============================================================
// MILKKIT FULL ENGINE — with users, ownership, logout
// =============================================================

// -------------------------------------------------------------
// AUTH — FIXED (works with file://, live server, and hosting)
// -------------------------------------------------------------
const currentUser = localStorage.getItem("milkkit_user");

// get the actual page name reliably
const page = location.pathname.split("/").pop();

// pages allowed without login
const isPublicPage =
  page === "" ||           // root
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
// LOGOUT
// -------------------------------------------------------------
function logout() {
  localStorage.removeItem("milkkit_user");
  window.location.href = "index.html";
}

// -------------------------------------------------------------
// SUBMIT POST (new or edit)
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
    time: Date.now()
  });

  savePosts();
  window.location.href = "home.html";
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
// RENDER POSTS
// -------------------------------------------------------------
function renderPosts() {
  const feed = document.getElementById("feed");
  if (!feed) return;

  feed.innerHTML = "";

  posts.forEach((post, i) => {
    if (post.hidden) return;

    const isOwner = post.author === currentUser;
    const card = document.createElement("div");
    card.className = "bg-gray-900 p-4 rounded-xl border border-gray-800";

    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <h3 class="text-xl font-bold">${post.title}</h3>
          <p class="text-xs text-gray-400">m/${post.author}</p>
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
// MENU
// -------------------------------------------------------------
function toggleMenu(i) {
  document.querySelectorAll("[id^='menu-']").forEach(m => m.classList.add("hidden"));
  const menu = document.getElementById(`menu-${i}`);
  if (menu) menu.classList.toggle("hidden");
}

// -------------------------------------------------------------
// POST ACTIONS (OWNER ONLY)
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
// COMMENTS & REPLIES
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
// FORMAT BUTTONS
// -------------------------------------------------------------
function applyFormat(type) {
  const box = document.getElementById("postcontent");
  if (!box) return;

  let text = box.value;
  if (type === "bold") text += " **bold**";
  if (type === "italic") text += " *italic*";
  if (type === "h1") text += "\n# heading";
  if (type === "bullet") text += "\n- item";
  box.value = text;
}

// -------------------------------------------------------------
// BOOT
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  renderPosts();
  checkEditMode();

  document.getElementById("confirmDelete")?.addEventListener("click", confirmDelete);
  document.getElementById("cancelDelete")?.addEventListener("click", cancelDelete);
});
