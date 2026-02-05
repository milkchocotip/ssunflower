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
// GLOBAL STATE (must be var)
// =============================================================
var posts = JSON.parse(localStorage.getItem("milkkit_posts") || "[]");

function savePosts() {
  localStorage.setItem("milkkit_posts", JSON.stringify(posts));
}

// =============================================================
// LOGOUT
// =============================================================
function logout() {
  localStorage.removeItem("milkkit_user");
  window.location.href = "index.html";
}

// =============================================================
// ICONS
// =============================================================
const icons = {
  comment: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M7 8h10M7 12h6m-2 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>`,

  like: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>`,

  bookmark: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z"/></svg>`,

  bookmarkFilled: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2a2 2 0 00-2 2v18l8-5 8 5V4a2 2 0 00-2-2H6z"/></svg>`,

  share: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 8l4-4m0 0l-4-4m4 4H9"/></svg>`
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
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
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

  if (!titleEl || !contentEl) return;

  const title = titleEl.value.trim();
  const content = contentEl.value.trim();
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
    bookmarks: []
  });

  savePosts();
  closeComposer();
  renderPosts();

  titleEl.value = "";
  contentEl.value = "";
}

// =============================================================
// INTERACTIONS
// =============================================================
let openCommentIndex = null;

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

function toggleCommentBox(i) {
  openCommentIndex = openCommentIndex === i ? null : i;
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
  openCommentIndex = i;
  renderPosts();
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

function deleteComment(p, c) {
  posts[p].comments.splice(c, 1);
  savePosts();
  openCommentIndex = p;
  renderPosts();
}

// =============================================================
// POST MENU
// =============================================================
function togglePostMenu(i) {
  document
    .querySelectorAll("[id^='post-menu-']")
    .forEach(m => m.classList.add("hidden"));
  document.getElementById(`post-menu-${i}`)?.classList.toggle("hidden");
}

function startEditPost(i) {
  posts[i]._editing = true;
  renderPosts();
}

function saveEditPost(i) {
  const t = document.getElementById(`edit-title-${i}`).value.trim();
  const c = document.getElementById(`edit-content-${i}`).value.trim();
  if (!t || !c) return;

  posts[i].title = t;
  posts[i].raw = c;
  posts[i].content = marked.parse(c);
  delete posts[i]._editing;
  savePosts();
  renderPosts();
}

function deletePost(i) {
  posts.splice(i, 1);
  savePosts();
  renderPosts();
}

// =============================================================
// RENDER
// =============================================================
function renderPosts() {
  const feed = document.getElementById("feed");
  if (!feed) return;

  feed.innerHTML = "";

  posts.forEach((post, i) => {
    const card = document.createElement("div");
    card.className = "bg-gray-900 p-4 rounded-xl border border-gray-800";

    card.innerHTML = `
      <div class="flex justify-between">
        <div>
          <a href="post.html?id=${post.id}" class="text-xl font-bold hover:underline">${post.title}</a>
          <p class="text-xs text-gray-400">m/${post.author} • ${formatTime(post.time)}</p>
        </div>

        ${post.author === currentUser ? `
        <div class="relative">
          <button onclick="event.stopPropagation(); togglePostMenu(${i})">⋯</button>
          <div id="post-menu-${i}" class="hidden absolute right-0 bg-gray-800 border border-gray-700 rounded z-10">
            <button onclick="startEditPost(${i})" class="block px-3 py-2">edit</button>
            <button onclick="deletePost(${i})" class="block px-3 py-2 text-red-400">delete</button>
          </div>
        </div>` : ``}
      </div>

      <div class="prose prose-invert my-3">${post.content}</div>

      <div class="flex justify-between pt-2 text-gray-400">
        <button onclick="toggleCommentBox(${i})" class="${openCommentIndex===i?'text-white':''}">
          ${icons.comment} ${post.comments.length}
        </button>

        <button onclick="toggleLike(${i})" class="${post.likes.includes(currentUser)?'text-white':''}">
          ${icons.like} ${post.likes.length}
        </button>

        <button onclick="toggleBookmark(${i})" class="${post.bookmarks.includes(currentUser)?'text-white':''}">
          ${post.bookmarks.includes(currentUser)?icons.bookmarkFilled:icons.bookmark}
        </button>

        <button onclick="navigator.clipboard.writeText(location.href)">
          ${icons.share}
        </button>
      </div>

      <div class="${openCommentIndex===i?'':'hidden'} mt-3">
        ${post.comments.map((c,ci)=>`
          <div class="border border-gray-800 p-2 rounded mb-2">
            <div class="flex justify-between text-xs text-gray-400">
              <span>m/${c.author} • ${formatTime(c.time)}</span>
              ${c.author===currentUser?`
                <span>
                  <button onclick="startEditComment(${i},${ci})">edit</button>
                  <button onclick="deleteComment(${i},${ci})" class="text-red-400">delete</button>
                </span>`:''}
            </div>

            ${c._editing?`
              <textarea id="edit-comment-${i}-${ci}" class="w-full bg-gray-800 p-2 rounded">${c.raw}</textarea>
              <button onclick="saveEditComment(${i},${ci})" class="bg-white text-black px-2 py-1 rounded mt-1">save</button>
            `:`<div class="prose prose-invert mt-2">${c.content}</div>`}
          </div>
        `).join("")}

        <input id="comment-${i}" class="w-full p-2 bg-gray-800 rounded" placeholder="add a comment…" />
        <button onclick="submitComment(${i})" class="bg-white text-black px-3 py-1 rounded mt-1">reply</button>
      </div>
    `;

    feed.appendChild(card);
  });
}

// =============================================================
// BOOT
// =============================================================
document.addEventListener("DOMContentLoaded", renderPosts);
