// =============================================================
// MILKKIT — AUTH
// =============================================================
const currentUser = localStorage.getItem("milkkit_user");

const page = location.pathname.split("/").pop();
const isPublicPage =
  page === "" ||
  page === "index" ||
  page === "index.html";

if (!currentUser && !isPublicPage) {
  location.href = "index.html";
}

// =============================================================
// ROUTING
// =============================================================
const IS_SINGLE_POST = location.pathname.includes("post.html");

// =============================================================
// STATE
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
// COMPOSER
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
// FILTERING (HOME ONLY)
// =============================================================
function getVisiblePosts() {
  const filter = new URLSearchParams(location.search).get("filter");

  if (filter === "myposts") {
    return posts.filter(p => p.author === currentUser);
  }

  if (filter === "saved") {
    return posts.filter(p => p.bookmarks.includes(currentUser));
  }

  return posts;
}

// =============================================================
// NAV
// =============================================================
function clickPost(id) {
  location.href = `post.html?id=${id}`;
}

// =============================================================
// INTERACTIONS
// =============================================================
function toggleLike(index) {
  const p = posts[index];
  const i = p.likes.indexOf(currentUser);
  i === -1 ? p.likes.push(currentUser) : p.likes.splice(i, 1);
  savePosts();
  renderPosts();
}

function toggleBookmark(index) {
  const p = posts[index];
  const i = p.bookmarks.indexOf(currentUser);
  i === -1 ? p.bookmarks.push(currentUser) : p.bookmarks.splice(i, 1);
  savePosts();
  renderPosts();
}

// =============================================================
// COMMENTS (POST PAGE ONLY)
// =============================================================
function submitComment(postIndex) {
  const field = document.getElementById("commentField");
  if (!field.value.trim()) return;

  posts[postIndex].comments.push({
    id: uid(),
    author: currentUser,
    content: marked.parse(field.value),
    time: Date.now()
  });

  field.value = "";
  savePosts();
  renderSinglePost();
}

// =============================================================
// RENDER — HOME
// =============================================================
function renderPosts() {
  if (IS_SINGLE_POST) return;

  const feed = document.getElementById("feed");
  if (!feed) return;

  feed.innerHTML = "";

  const visiblePosts = getVisiblePosts();

  visiblePosts.forEach(p => {
    const i = posts.indexOf(p);

    feed.innerHTML += `
      <div class="bg-gray-900 p-4 rounded-xl border border-gray-800">
        <div onclick="clickPost('${p.id}')" class="cursor-pointer">
          <div class="font-bold text-xl">${p.title}</div>
          <div class="text-xs text-gray-400">
            m/${p.author} • ${formatTime(p.time)}
          </div>
        </div>

        <div class="mt-2 text-sm text-gray-200">
          ${getPreview(p.content)}
        </div>

        <div class="flex justify-between text-gray-400 mt-3">
          <button onclick="toggleLike(${i})">▲ ${p.likes.length}</button>
          <button onclick="toggleBookmark(${i})">
            ${p.bookmarks.includes(currentUser) ? "★" : "☆"}
          </button>
          <button onclick="navigator.clipboard.writeText('${location.origin}/post.html?id=${p.id}')">
            share
          </button>
        </div>
      </div>
    `;
  });
}

// =============================================================
// RENDER — SINGLE POST
// =============================================================
function renderSinglePost() {
  const feed = document.getElementById("feed");
  if (!feed) return;

  const id = new URLSearchParams(location.search).get("id");
  const post = posts.find(p => p.id === id);

  if (!post) {
    feed.innerHTML = "<p class='text-gray-400'>post not found</p>";
    return;
  }

  const index = posts.indexOf(post);

  feed.innerHTML = `
    <div class="bg-gray-900 p-4 rounded-xl border border-gray-800">
      <div class="font-bold text-2xl">${post.title}</div>
      <div class="text-xs text-gray-400 mb-4">
        m/${post.author} • ${formatTime(post.time)}
      </div>

      <div class="prose prose-invert mb-6">
        ${post.content}
      </div>

      <div class="border-t border-gray-700 pt-4">
        <div class="font-semibold mb-2">comments</div>

        ${post.comments.map(c => `
          <div class="mb-3">
            <div class="text-xs text-gray-400">
              m/${c.author} • ${formatTime(c.time)}
            </div>
            <div class="text-sm">${c.content}</div>
          </div>
        `).join("")}

        <textarea
          id="commentField"
          class="w-full bg-gray-800 p-2 rounded mt-3"
          placeholder="write a comment…"
        ></textarea>

        <button
          onclick="submitComment(${index})"
          class="bg-white text-black px-3 py-1 rounded mt-2"
        >
          post
        </button>
      </div>
    </div>
  `;
}

// =============================================================
// BOOT
// =============================================================
document.addEventListener("DOMContentLoaded", () => {
  applyStatus(localStorage.getItem("milkkit_status") || "online");

  document
    .querySelectorAll("#statusMenu button[data-status]")
    .forEach(btn => {
      btn.addEventListener("click", () => {
        applyStatus(btn.dataset.status);
        document.getElementById("statusMenu").classList.add("hidden");
      });
    });

  IS_SINGLE_POST ? renderSinglePost() : renderPosts();
});
