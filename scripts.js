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
// MARKDOWN CONFIG
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

  if (titleEl) titleEl.value = "";
  if (contentEl) contentEl.value = "";
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
// THREE DOT MENU
// =============================================================
function togglePostMenu(i) {
  document.querySelectorAll("[id^='post-menu-']").forEach(m => m.classList.add("hidden"));
  document.getElementById(`post-menu-${i}`)?.classList.toggle("hidden");
}

let pendingDeleteIndex = null;
function deletePost(i) {
  pendingDeleteIndex = i;
  document.getElementById('deleteConfirm')?.classList.remove('hidden');
}

function confirmDelete(yes) {
  document.getElementById('deleteConfirm')?.classList.add('hidden');
  if (yes && pendingDeleteIndex !== null) {
    posts.splice(pendingDeleteIndex, 1);
    savePosts();
    renderPosts();
  }
  pendingDeleteIndex = null;
}

function startEditPost(i) {
  posts[i]._editing = true;
  renderPosts();
}

function saveEditPost(i) {
  const t = document.getElementById(`edit-title-${i}`).value.trim();
  const c = document.getElementById(`edit-content-${i}`).value.trim();
  if (!t || !c) return alert("can’t be empty");

  posts[i].title = t;
  posts[i].raw = c;
  posts[i].content = marked.parse(c);
  delete posts[i]._editing;
  savePosts();
  renderPosts();
}

function cancelEditPost(i) {
  delete posts[i]._editing;
  renderPosts();
}

// =============================================================
// COMMENTS (FULLY FIXED)
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
  renderPosts();

  setTimeout(() => {
    document.getElementById(`comment-box-${i}`)?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, 50);
}

function startEditComment(p, c) {
  posts[p].comments[c]._editing = true;
  renderPosts();
}

function saveEditComment(p, c) {
  const field = document.getElementById(`edit-comment-${p}-${c}`);
  if (!field || !field.value.trim()) return;

  posts[p].comments[c].raw = field.value;
  posts[p].comments[c].content = marked.parse(field.value);
  delete posts[p].comments[c]._editing;
  savePosts();
  renderPosts();
}

function cancelEditComment(p, c) {
  delete posts[p].comments[c]._editing;
  renderPosts();
}

function deleteComment(p, c) {
  posts[p].comments.splice(c, 1);
  savePosts();
  renderPosts();
}

// =============================================================
// RENDER
// =============================================================
function renderPosts() {
  const feed = document.getElementById("feed");
  if (!feed) return;

  const filter = new URLSearchParams(location.search).get("filter");
  feed.innerHTML = "";

  posts.forEach((post, i) => {
    if (post.hidden) return;
    if (filter === "myposts" && post.author !== currentUser) return;
    if (filter === "saved" && !post.bookmarks.includes(currentUser)) return;

    const card = document.createElement("div");
    card.className = "bg-gray-900 p-4 rounded-xl border border-gray-800";

    card.innerHTML = post._editing ? `
      <input id="edit-title-${i}" class="w-full p-2 mb-2 bg-gray-800 rounded" value="${post.title}" />
      <textarea id="edit-content-${i}" rows="6" class="w-full p-2 bg-gray-800 rounded">${post.raw}</textarea>
      <div class="flex gap-2 mt-2">
        <button onclick="saveEditPost(${i})" class="px-3 py-1 bg-white text-black rounded">save</button>
        <button onclick="cancelEditPost(${i})" class="px-3 py-1 bg-gray-700 rounded">cancel</button>
      </div>` : `
      <div class="flex justify-between">
        <div>
          <h3 class="text-xl font-bold">${post.title}</h3>
          <p class="text-xs text-gray-400">m/${post.author} • ${formatTime(post.time)}</p>
        </div>
        ${post.author === currentUser ? `
        <div class="relative">
          <button onclick="togglePostMenu(${i})">⋯</button>
          <div id="post-menu-${i}" class="hidden absolute right-0 bg-gray-800 rounded border border-gray-700">
            <button onclick="startEditPost(${i})" class="block px-3 py-2">edit</button>
            <button onclick="deletePost(${i})" class="block px-3 py-2 text-red-400">delete</button>
          </div>
        </div>` : ``}
      </div>
      <div class="prose prose-invert my-3 whitespace-pre-wrap">${post.content}</div>
      <div class="flex items-center justify-between text-gray-400 pt-2">
        <button onclick="document.getElementById('comment-box-${i}')?.classList.toggle('hidden')" class="flex items-center gap-1 hover:text-white">${icons.comment}<span class="text-sm">${post.comments.length}</span></button>
        <button onclick="toggleLike(${i})" class="flex items-center gap-1 ${post.likes.includes(currentUser) ? 'text-white' : 'hover:text-white'}">${icons.like}<span class="text-sm">${post.likes.length}</span></button>
        <button onclick="toggleBookmark(${i})" class="flex items-center ${post.bookmarks.includes(currentUser) ? 'text-white' : 'hover:text-white'}">${icons.bookmark}</button>
        <button onclick="navigator.clipboard.writeText(location.href)" class="hover:text-white">${icons.share}</button>
      </div>
      <div id="comment-box-${i}" class="hidden mt-3 space-y-3">
        <div class="space-y-2">
          ${post.comments.map((c, ci) => `
            <div class="text-sm border border-gray-800 rounded p-2">
              <div class="flex justify-between text-xs text-gray-400">
                <span>m/${c.author} • ${formatTime(c.time)}</span>
                ${c.author === currentUser ? `<span class="flex gap-2"><button onclick="startEditComment(${i},${ci})">edit</button><button class="text-red-400" onclick="deleteComment(${i},${ci})">delete</button></span>` : ``}
              </div>
              ${c._editing ? `
                <textarea id="edit-comment-${i}-${ci}" class="w-full mt-2 p-2 bg-gray-800 rounded">${c.raw}</textarea>
                <div class="flex gap-2 mt-2">
                  <button onclick="saveEditComment(${i},${ci})" class="px-3 py-1 bg-white text-black rounded">save</button>
                  <button onclick="cancelEditComment(${i},${ci})" class="px-3 py-1 bg-gray-700 rounded">cancel</button>
                </div>` : `<div class="prose prose-invert whitespace-pre-wrap mt-2">${c.content}</div>`}
            </div>`).join("")}
        </div>
        <input id="comment-${i}" class="w-full p-2 bg-gray-800 border border-gray-700 rounded" placeholder="add a comment…" />
        <button onclick="submitComment(${i})" class="bg-white text-black px-3 py-1 rounded">reply</button>
      </div>`;

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

  const dotColors = { online: "bg-green-500", away: "bg-yellow-400", dnd: "bg-red-600", offline: "bg-gray-500" };
  const ringColors = { online: "ring-green-500", away: "ring-yellow-400", dnd: "ring-red-600", offline: "ring-gray-500" };

  statusButton.addEventListener("click", e => { e.stopPropagation(); statusMenu.classList.toggle("hidden"); });

  statusMenu.querySelectorAll("button[data-status]").forEach(btn => {
    btn.addEventListener("click", () => {
      const s = btn.dataset.status;
      localStorage.setItem("milkkit_status", s);
      statusDot.className = `absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 ${dotColors[s]}`;
      statusButton.className = `relative w-8 h-8 rounded-full bg-gray-700 cursor-pointer ring-2 ${ringColors[s]}`;
      if (sidebarStatus) sidebarStatus.textContent = s;
      statusMenu.classList.add("hidden");
    });
  });

  const saved = localStorage.getItem("milkkit_status") || "online";
  statusDot.classList.add(dotColors[saved]);
  statusButton.classList.add(ringColors[saved]);
  if (sidebarStatus) sidebarStatus.textContent = saved;

  document.addEventListener("click", () => statusMenu.classList.add("hidden"));
});

// =============================================================
// BOOT
// =============================================================
document.addEventListener("DOMContentLoaded", renderPosts);