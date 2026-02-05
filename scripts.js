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
let currentEditId = null;

function savePosts() {
  localStorage.setItem("milkkit_posts", JSON.stringify(posts));
}

function saveNotifs() {
  localStorage.setItem("milkkit_notifs", JSON.stringify(notifications));
}

// =============================================================
// TIME FORMATTER
// =============================================================
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


// =============================================================
// LOGOUT
// =============================================================
function logout() {
  localStorage.removeItem("milkkit_user");
  window.location.href = "index.html";
}


// =============================================================
// NOTIFICATION ENGINE
// =============================================================

// create a new notification
function addNotification(type, message, link = null) {
  notifications.unshift({
    type,
    message,
    link,
    time: Date.now(),
    read: false
  });

  saveNotifs();
  updateNotifDot();
  renderNotifications();
}

// unread dot
function updateNotifDot() {
  const dot = document.getElementById("notifDot");
  if (!dot) return;

  const unread = notifications.some(n => !n.read);
  dot.classList.toggle("hidden", !unread);
}

// toggle dropdown
function toggleNotifications() {
  const menu = document.getElementById("notifMenu");
  menu.classList.toggle("hidden");

  if (!menu.classList.contains("hidden")) {
    notifications.forEach(n => n.read = true);
    saveNotifs();
    updateNotifDot();
    renderNotifications();
  }
}

// render dropdown
function renderNotifications() {
  const menu = document.getElementById("notifMenu");
  if (!menu) return;

  if (notifications.length === 0) {
    menu.innerHTML = `<p class="text-gray-400 text-center py-4">no notifications yet ✦</p>`;
    return;
  }

  menu.innerHTML = notifications.map(n => `
    <div class="p-2 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 transition cursor-pointer">
      <p class="text-white">${n.message}</p>
      <p class="text-xs text-gray-500">${formatTime(n.time)}</p>
    </div>
  `).join("");
}


// =============================================================
// INLINE COMPOSER
// =============================================================
function openComposer() {
  document.getElementById("composerOverlay").classList.remove("hidden");
}

function closeComposer() {
  document.getElementById("composerOverlay").classList.add("hidden");
}

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
    likes: [],
    hidden: false,
    time: Date.now(),
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

  let text = box.value;

  if (type === "bold") text += " **bold**";
  if (type === "italic") text += " *italic*";
  if (type === "h1") text += "\n# heading";
  if (type === "bullet") text += "\n- item";

  box.value = text;
}


// =============================================================
// LIKE BUTTON
// =============================================================
function toggleLike(i) {
  const post = posts[i];
  if (!post.likes) post.likes = [];

  const liked = post.likes.includes(currentUser);

  if (liked) {
    post.likes = post.likes.filter(u => u !== currentUser);
  } else {
    post.likes.push(currentUser);

    if (post.author !== currentUser) {
      addNotification(
        "like",
        `m/${currentUser} liked your post "${post.title}"`,
        `home.html#post-${i}`
      );
    }
  }

  savePosts();
  renderPosts();
}


// =============================================================
// SHARE / BOOKMARK
// =============================================================
function sharePost(i) {
  const url = location.origin + "/home.html#post-" + i;
  navigator.clipboard.writeText(url);
  alert("link copied");
}

function bookmarkPost(i) {
  alert("saved.");
}


// =============================================================
// MENU HANDLING
// =============================================================
function toggleMenu(i) {
  document.querySelectorAll("[id^='menu-']").forEach(m => m.classList.add("hidden"));
  const m = document.getElementById(`menu-${i}`);
  if (m) m.classList.toggle("hidden");
}


// =============================================================
// EDIT / HIDE / DELETE POST
// =============================================================
function startEdit(i) {
  window.location.href = `submit.html?edit=${i}`;
}

function hidePost(i) {
  posts[i].hidden = true;
  savePosts();
  renderPosts();
}

let deleteTarget = null;

function askDelete(i) {
  deleteTarget = i;
  document.getElementById("deleteModal")?.classList.remove("hidden");
}

function confirmDelete() {
  if (deleteTarget === null) return;
  posts.splice(deleteTarget, 1);
  savePosts();
  deleteTarget = null;
  document.getElementById("deleteModal")?.classList.add("hidden");
  renderPosts();
}

function cancelDelete() {
  deleteTarget = null;
  document.getElementById("deleteModal")?.classList.add("hidden");
}


// =============================================================
// THREADED COMMENTS ENGINE
// =============================================================
function getCommentNode(postIndex, pathString) {
  const path = pathString.split("-").map(Number);
  let node = posts[postIndex].comments;
  let parent = null;

  for (let i = 0; i < path.length; i++) {
    parent = node;
    node = node[path[i]].replies;
  }

  return { parent, node };
}

// top-level comment
function submitComment(postIndex) {
  const field = document.getElementById(`comment-${postIndex}`);
  if (!field) return;

  const text = field.value.trim();
  if (!text) return;

  posts[postIndex].comments.push({
    author: currentUser,
    content: marked.parse(text),
    raw: text,
    time: Date.now(),
    replies: []
  });

  if (posts[postIndex].author !== currentUser) {
    addNotification(
      "comment",
      `m/${currentUser} commented on your post "${posts[postIndex].title}"`,
      `home.html#post-${postIndex}`
    );
  }

  savePosts();
  field.value = "";
  renderComments(postIndex);
}

// nested reply
function submitDeepReply(postIndex, pathString) {
  const field = document.getElementById(`reply-input-${postIndex}-${pathString}`);
  if (!field) return;

  const text = field.value.trim();
  if (!text) return;

  const { parent } = getCommentNode(postIndex, pathString);
  const pathArr = pathString.split("-").map(Number);
  let target = parent[pathArr[pathArr.length - 1]];

  target.replies.push({
    author: currentUser,
    raw: text,
    content: marked.parse(text),
    time: Date.now(),
    replies: []
  });

  if (target.author !== currentUser) {
    addNotification(
      "reply",
      `m/${currentUser} replied to your comment`,
      `home.html#post-${postIndex}`
    );
  }

  savePosts();
  field.value = "";
  renderComments(postIndex);
}

// edit comment
function editComment(postIndex, pathString) {
  const path = pathString.split("-").map(Number);
  let node = posts[postIndex].comments;

  for (let i = 0; i < path.length - 1; i++) {
    node = node[path[i]].replies;
  }

  let comment = node[path[path.length - 1]];

  const newText = prompt("edit comment:", comment.raw);
  if (newText === null) return;

  comment.raw = newText;
  comment.content = marked.parse(newText);
  comment.time = Date.now();

  savePosts();
  renderComments(postIndex);
}

// delete comment
function deleteComment(postIndex, pathString) {
  const path = pathString.split("-").map(Number);
  let node = posts[postIndex].comments;

  for (let i = 0; i < path.length - 1; i++) {
    node = node[path[i]].replies;
  }

  node.splice(path[path.length - 1], 1);

  savePosts();
  renderComments(postIndex);
}

// collapse
function toggleCollapse(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle("hidden");
}

// render thread
function renderThread(postIndex, list, container, path = []) {
  container.innerHTML = "";

  list.forEach((comment, index) => {
    const currentPath = [...path, index];
    const pathString = currentPath.join("-");
    const collapseId = `collapse-${postIndex}-${pathString}`;

    const isOP = comment.author === posts[postIndex].author;

    const div = document.createElement("div");
    div.className = "bg-gray-800 p-3 rounded-lg";
    div.style.marginLeft = `${path.length * 20}px`;

    div.innerHTML = `
      <div class="flex justify-between items-start">
        <p class="text-xs text-gray-400 mb-1">
          <span class="${isOP ? 'text-blue-400 font-bold' : ''}">
            m/${comment.author}
          </span> • ${formatTime(comment.time)}
        </p>

        <div class="flex gap-2 text-xs text-gray-400">
          <button onclick="toggleCollapse('${collapseId}')" class="hover:text-white">collapse</button>

          ${
            comment.author === currentUser
              ? `
                <button onclick="editComment(${postIndex}, '${pathString}')" class="hover:text-white">edit</button>
                <button onclick="deleteComment(${postIndex}, '${pathString}')" class="hover:text-red-400">delete</button>
              `
              : ""
          }
        </div>
      </div>

      <div class="prose prose-invert">${comment.content}</div>

      <div class="mt-2 ml-1">
        <input 
          id="reply-input-${postIndex}-${pathString}" 
          class="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white"
          placeholder="reply to m/${comment.author}..."
        />

        <button 
          onclick="submitDeepReply(${postIndex}, '${pathString}')"
          class="mt-2 bg-white text-black px-3 py-1 rounded"
        >
          reply
        </button>
      </div>

      <div id="${collapseId}" class="mt-3 space-y-3"></div>
    `;

    container.appendChild(div);

    if (comment.replies.length > 0) {
      const repliesContainer = document.getElementById(collapseId);
      renderThread(postIndex, comment.replies, repliesContainer, currentPath);
    }
  });
}

// render all comments for post
function renderComments(postIndex) {
  const wrap = document.getElementById(`comments-${postIndex}`);
  if (!wrap) return;

  wrap.innerHTML = "";
  renderThread(postIndex, posts[postIndex].comments, wrap, []);
}


// =============================================================
// RENDER POSTS
// =============================================================
function renderPosts() {
  const feed = document.getElementById("feed");
  if (!feed) return;

  feed.innerHTML = "";

  posts.forEach((post, i) => {
    if (post.hidden) return;

    const liked = post.likes.includes(currentUser);

    const card = document.createElement("div");
    card.className = "bg-gray-900 p-4 rounded-xl border border-gray-800";
    card.id = `post-${i}`;

    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <h3 class="text-xl font-bold">${post.title}</h3>
          <p class="text-xs text-gray-400">m/${post.author} • ${formatTime(post.time)}</p>
        </div>

        <div class="relative">
          ${
            post.author === currentUser
              ? `
                <button onclick="toggleMenu(${i})" class="px-2">⋯</button>
                <div id="menu-${i}" class="hidden absolute right-0 top-6 bg-gray-800 border border-gray-700 rounded p-2 text-sm">
                  <button onclick="startEdit(${i})" class="block w-full text-left">edit</button>
                  <button onclick="hidePost(${i})" class="block w-full text-left">hide</button>
                  <button onclick="askDelete(${i})" class="block w-full text-left">delete</button>
                </div>
              `
              : ""
          }
        </div>
      </div>

      <div class="prose prose-invert mt-3">${post.content}</div>

      <div class="mt-4 flex items-center justify-around text-gray-500">

        <!-- comment -->
        <button onclick="document.getElementById('comment-box-${i}').classList.remove('hidden')"
                class="hover:text-white">
          💬
        </button>

        <!-- like -->
        <button onclick="toggleLike(${i})" class="hover:text-white flex items-center gap-1 ${liked ? 'text-white' : ''}">
          🥛 <span>${post.likes.length}</span>
        </button>

        <!-- bookmark -->
        <button onclick="bookmarkPost(${i})" class="hover:text-white">🔖</button>

        <!-- share -->
        <button onclick="sharePost(${i})" class="hover:text-white">↗</button>

      </div>

      <div id="comment-box-${i}" class="hidden mt-3">
        <input id="comment-${i}" class="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white"
          placeholder="add a comment..." />
        <button onclick="submitComment(${i})"
          class="mt-2 bg-white text-black px-3 py-1 rounded">reply</button>
      </div>

      <div id="comments-${i}" class="mt-4 space-y-3"></div>
    `;

    feed.appendChild(card);
    renderComments(i);
  });
}


// =============================================================
// STATUS ICON LOGIC
// =============================================================
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
    statusButton.addEventListener("click", e => {
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

  // restore saved status
  const savedStatus = localStorage.getItem("milkkit_status");
  if (savedStatus && statusDot) {
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


// =============================================================
// BOOT
// =============================================================
document.addEventListener("DOMContentLoaded", () => {
  renderPosts();
  renderNotifications();
  updateNotifDot();

  document.getElementById("confirmDelete")?.addEventListener("click", confirmDelete);
  document.getElementById("cancelDelete")?.addEventListener("click", cancelDelete);
});
