const currentUser = localStorage.getItem("milkkit_user");
const page = location.pathname.split("/").pop();
const isPublicPage = ["", "index", "index.html", "create.html"].includes(page);

if (!currentUser && !isPublicPage) {
  location.href = "index.html";
}

const IS_SINGLE_POST = location.pathname.includes("post.html");

marked.setOptions({ breaks: true });

let posts = JSON.parse(localStorage.getItem("milkkit_posts") || "[]");

function savePosts() {
  localStorage.setItem("milkkit_posts", JSON.stringify(posts));
}

function uid() {
  return crypto.randomUUID();
}

function applyStatus(status) {
  localStorage.setItem("milkkit_status", status);

  const dot = document.getElementById("statusDot");
  const label = document.getElementById("sidebarStatus");

  if (dot) {
    const colors = {
      online: "bg-green-500",
      away: "bg-yellow-400",
      dnd: "bg-red-600",
      offline: "bg-gray-500"
    };
    dot.className =
      `absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${colors[status]}`;
  }

  if (label) label.innerText = status;
}

function formatTime(t) {
  const d = Date.now() - t;
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(t).toLocaleDateString();
}

function getPreview(html, lines = 3) {
  const el = document.createElement("div");
  el.innerHTML = html;
  return el.innerText.split("\n").slice(0, lines).join(" ");
}

function countComments(list) {
  return list.reduce((n, c) => n + 1 + countComments(c.replies || []), 0);
}

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
  inlineTitle.value = "";
  inlineContent.value = "";
  closeComposer();
  renderPosts();
}

function clickPost(id) {
  location.href = `post.html?id=${id}`;
}

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
          <button>💬 ${countComments(p.comments)}</button>
          <button onclick="toggleLike(${i})">⬆ ${p.likes.length}</button>
          <button onclick="toggleBookmark(${i})">🔖</button>
          <button onclick="navigator.clipboard.writeText(
            location.origin + '/post.html?id=${p.id}'
          )">🔗</button>
        </div>
      </div>
    `;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  applyStatus(localStorage.getItem("milkkit_status") || "online");
  if (!IS_SINGLE_POST) renderPosts();
});
