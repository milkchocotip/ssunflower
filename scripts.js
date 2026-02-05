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
var posts = JSON.parse(localStorage.getItem("milkkit_posts") || "[]");
var users = JSON.parse(localStorage.getItem("milkkit_users") || "{}");

function savePosts() {
  localStorage.setItem("milkkit_posts", JSON.stringify(posts));
}
function saveUsers() {
  localStorage.setItem("milkkit_users", JSON.stringify(users));
}

if (currentUser && !users[currentUser]) {
  users[currentUser] = { status: "online", lastSeen: Date.now() };
  saveUsers();
}

// =============================================================
// LOGOUT
// =============================================================
function logout() {
  if (users[currentUser]) {
    users[currentUser].status = "offline";
    users[currentUser].lastSeen = Date.now();
    saveUsers();
  }
  localStorage.removeItem("milkkit_user");
  window.location.href = "index.html";
}

// =============================================================
// ICONS
// =============================================================
const icons = {
  comment: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M7 8h10M7 12h6m-2 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>`,
  like: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" /></svg>`,
  bookmark: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z" /></svg>`,
  bookmarkFilled: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2a2 2 0 00-2 2v18l8-5 8 5V4a2 2 0 00-2-2H6z"/></svg>`
};

// =============================================================
// MARKDOWN
// =============================================================
marked.setOptions({ breaks: true });

// =============================================================
// PREVIEW HELPER
// =============================================================
function getPreview(html, maxChars = 280) {
  const text = html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  if (text.length <= maxChars) {
    return { preview: html, truncated: false };
  }
  return {
    preview: text.slice(0, maxChars) + "…",
    truncated: true
  };
}

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
// POST MENU (⋯)
// =============================================================
function togglePostMenu(i) {
  document.querySelectorAll("[id^='post-menu-']").forEach(m => m.classList.add("hidden"));
  document.getElementById(`post-menu-${i}`)?.classList.toggle("hidden");
}

function startEditPost(i) {
  posts[i]._editing = true;
  renderPosts();
}

function cancelEditPost(i) {
  delete posts[i]._editing;
  renderPosts();
}

function saveEditPost(i) {
  const title = document.getElementById(`edit-title-${i}`).value.trim();
  const body = document.getElementById(`edit-body-${i}`).value.trim();
  if (!title || !body) return alert("cannot be empty");

  posts[i].title = title;
  posts[i].raw = body;
  posts[i].content = marked.parse(body);
  delete posts[i]._editing;

  savePosts();
  renderPosts();
}

function deletePost(i) {
  if (!confirm("delete this post?")) return;
  posts.splice(i, 1);
  savePosts();
  renderPosts();
}

// =============================================================
// RENDER FEED
// =============================================================
function renderPosts() {
  const feed = document.getElementById("feed");
  if (!feed) return;

  const filter = new URLSearchParams(location.search).get("filter");
  feed.innerHTML = "";

  posts.forEach((post, i) => {
    if (filter === "myposts" && post.author !== currentUser) return;
    if (filter === "saved" && !post.bookmarks.includes(currentUser)) return;

    const card = document.createElement("div");
    card.className = "bg-gray-900 p-4 rounded-xl border border-gray-800";

    // EDIT MODE
    if (post._editing) {
      card.innerHTML = `
        <input id="edit-title-${i}" class="w-full bg-gray-800 p-2 rounded mb-2" value="${post.title}">
        <textarea id="edit-body-${i}" class="w-full bg-gray-800 p-2 rounded h-40">${post.raw}</textarea>
        <div class="flex gap-2 justify-end mt-2">
          <button onclick="cancelEditPost(${i})" class="px-3 py-1 bg-gray-700 rounded">cancel</button>
          <button onclick="saveEditPost(${i})" class="px-3 py-1 bg-white text-black rounded">save</button>
        </div>
      `;
      feed.appendChild(card);
      return;
    }

    const { preview, truncated } = getPreview(post.content);

    card.innerHTML = `
      <div class="flex justify-between">
        <div>
          <a href="post.html?id=${post.id}" class="text-xl font-bold hover:underline">${post.title}</a>
          <p class="text-xs text-gray-400">m/${post.author} • ${formatTime(post.time)}</p>
        </div>

        ${post.author === currentUser ? `
          <div class="relative">
            <button onclick="togglePostMenu(${i})" class="text-xl">⋯</button>
            <div id="post-menu-${i}" class="hidden absolute right-0 bg-gray-800 border border-gray-700 rounded z-10">
              <button onclick="startEditPost(${i})" class="block px-3 py-2 hover:bg-gray-700">edit</button>
              <button onclick="deletePost(${i})" class="block px-3 py-2 text-red-400 hover:bg-gray-700">delete</button>
            </div>
          </div>
        ` : ``}
      </div>

      <div class="prose prose-invert my-3">${preview}</div>
      ${truncated ? `<a href="post.html?id=${post.id}" class="text-sm text-gray-400 hover:text-white">see more…</a>` : ""}

      <div class="flex justify-between pt-2 text-gray-400">
        <button onclick="toggleCommentBox(${i})">${icons.comment} ${post.comments.length}</button>
        <button onclick="toggleLike(${i})">${icons.like} ${post.likes.length}</button>
        <button onclick="toggleBookmark(${i})">${post.bookmarks.includes(currentUser) ? icons.bookmarkFilled : icons.bookmark}</button>
      </div>
    `;

    feed.appendChild(card);
  });
}

// =============================================================
// BOOT
// =============================================================
document.addEventListener("DOMContentLoaded", renderPosts);
