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
var posts = JSON.parse(localStorage.getItem("milkkit_posts") || "[]");

function savePosts() {
  localStorage.setItem("milkkit_posts", JSON.stringify(posts));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// =============================================================
// LOGOUT
// =============================================================
function logout() {
  localStorage.removeItem("milkkit_user");
  window.location.href = "index.html";
}

// =============================================================
// STATUS
// =============================================================
function applyStatus(status) {
  localStorage.setItem("milkkit_status", status);

  const dot = document.getElementById("statusDot");
  const sidebar = document.getElementById("sidebarStatus");

  const colors = {
    online: "bg-green-500",
    away: "bg-yellow-400",
    dnd: "bg-red-600",
    offline: "bg-gray-500"
  };

  if (dot) {
    dot.className =
      `absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${colors[status]}`;
  }

  if (sidebar) sidebar.textContent = status;
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
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;
  return new Date(time).toLocaleDateString();
}

// =============================================================
// PREVIEW (FEED ONLY)
// =============================================================
function getPreview(html, lines = 3) {
  const el = document.createElement("div");
  el.innerHTML = html;
  const text = el.innerText.trim();
  const split = text.split("\n").filter(Boolean);
  return split.slice(0, lines).join(" ") + (split.length > lines ? "…" : "");
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
  const b = posts[i].bookmarks;
  const idx = b.indexOf(currentUser);
  idx === -1 ? b.push(currentUser) : b.splice(idx, 1);
  savePosts();
  renderPosts();
}

function scrollToComments(i) {
  document.getElementById(`comment-${i}`)?.scrollIntoView({ behavior: "smooth" });
}

// =============================================================
// CLICK POST
// =============================================================
function clickPost(id) {
  window.location.href = `post.html?id=${id}`;
}

// =============================================================
// COMMENTS — TREE HELPERS
// =============================================================
function findComment(list, id) {
  for (const c of list) {
    if (c.id === id) return c;
    const found = findComment(c.replies || [], id);
    if (found) return found;
  }
  return null;
}

function toggleReply(id) {
  document.getElementById(`reply-box-${id}`)?.classList.toggle("hidden");
}

// =============================================================
// COMMENT SUBMIT
// =============================================================
function submitComment(postIndex, parentId = null) {
  const fieldId = parentId ? `reply-${parentId}` : `comment-${postIndex}`;
  const field = document.getElementById(fieldId);
  if (!field?.value.trim()) return;

  const newComment = {
    id: uid(),
    author: currentUser,
    raw: field.value,
    content: marked.parse(field.value),
    time: Date.now(),
  likes: [],  
    replies: []
  };

  if (!parentId) {
    posts[postIndex].comments.push(newComment);
  } else {
    const parent = findComment(posts[postIndex].comments, parentId);
    parent?.replies.push(newComment);
  }

  field.value = "";
  savePosts();
  renderPosts();

// =============================================================
// COMMENT LIKE
// =============================================================
function toggleCommentLike(postIndex, commentId) {
  const comment = findComment(posts[postIndex].comments, commentId);
  if (!comment) return;

  comment.likes ||= [];

  const idx = comment.likes.indexOf(currentUser);
  idx === -1
    ? comment.likes.push(currentUser)
    : comment.likes.splice(idx, 1);

  savePosts();
  renderPosts();
}


}

// =============================================================
// RENDER COMMENT TREE
// =============================================================
function renderCommentTree(comments, postIndex, depth = 0) {
  return comments.map(c => `
    <div class="mt-3 border-l border-gray-700 pl-3 ml-${Math.min(depth * 4, 16)}">
      <div class="text-xs text-gray-400">
        m/${c.author} • ${formatTime(c.time)}
      </div>

<div class="prose prose-invert text-sm mt-1">
  ${c.content}
</div>

<div class="flex items-center gap-4 mt-1 text-xs text-gray-400">

  <!-- COMMENT LIKE -->
  <button
    onclick="toggleCommentLike(${postIndex}, '${c.id}')"
    class="flex items-center gap-1 hover:text-white ${c.likes?.includes(currentUser) ? "text-white" : ""}"
  >
    ${icons.like}
    <span>${c.likes?.length || 0}</span>
  </button>

  <!-- REPLY -->
  <button
    onclick="toggleReply('${c.id}')"
    class="hover:text-white"
  >
    reply
  </button>

</div>


      <div id="reply-box-${c.id}" class="hidden mt-2">
        <input id="reply-${c.id}" class="w-full p-2 bg-gray-800 rounded text-sm" placeholder="reply…" />
        <button onclick="submitComment(${postIndex}, '${c.id}')" class="bg-white text-black px-2 py-1 rounded mt-1 text-xs">
          post
        </button>
      </div>

      ${renderCommentTree(c.replies || [], postIndex, depth + 1)}
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

  posts.forEach((post, i) => {
    post.likes ||= [];
    post.bookmarks ||= [];
    post.comments ||= [];

    const card = document.createElement("div");
    card.className = "bg-gray-900 p-4 rounded-xl border border-gray-800";

    card.innerHTML = `
      <div onclick="clickPost('${post.id}')" class="cursor-pointer">
        <div class="text-xl font-bold hover:underline">${post.title}</div>
        <p class="text-xs text-gray-400">
          m/${post.author} • ${formatTime(post.time)}
        </p>
      </div>

      <div class="my-3 text-sm text-gray-200 leading-snug max-h-24 overflow-hidden relative">
        ${IS_SINGLE_POST ? post.content : getPreview(post.content)}
        ${!IS_SINGLE_POST && post.content.split("\n").length > 3 ? `
          <div class="absolute bottom-0 left-0 w-full h-6 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none"></div>
        ` : ""}
      </div>

      <div class="flex justify-between pt-2 text-gray-400">
        <button onclick="scrollToComments(${i})" class="flex items-center gap-1 hover:text-white">
          ${icons.comment}<span class="text-xs">${post.comments.length}</span>
        </button>

        <button onclick="toggleLike(${i})" class="flex items-center gap-1 hover:text-white ${post.likes.includes(currentUser) ? "text-white" : ""}">
          ${icons.like}<span class="text-xs">${post.likes.length}</span>
        </button>

        <button onclick="toggleBookmark(${i})" class="hover:text-white">
          ${post.bookmarks.includes(currentUser) ? icons.bookmarkFilled : icons.bookmark}
        </button>

        <button onclick="navigator.clipboard.writeText(location.origin + '/post.html?id=${post.id}')" class="hover:text-white">
          ${icons.share}
        </button>
      </div>

      <div class="${IS_SINGLE_POST ? "" : "hidden"} mt-4">
        ${renderCommentTree(post.comments, i)}

        <input id="comment-${i}" class="w-full p-2 bg-gray-800 rounded mt-3" placeholder="add a comment…" />
        <button onclick="submitComment(${i})" class="bg-white text-black px-3 py-1 rounded mt-1">
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
document.addEventListener("DOMContentLoaded", () => {
  applyStatus(localStorage.getItem("milkkit_status") || "online");

  document.querySelectorAll("#statusMenu button[data-status]").forEach(btn => {
    btn.addEventListener("click", () => applyStatus(btn.dataset.status));
  });

  renderPosts();
});
