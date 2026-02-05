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

      <button
        onclick="toggleReply('${c.id}')"
        class="text-xs text-gray-400 hover:text-white mt-1"
      >
        reply
      </button>

      <div id="reply-box-${c.id}" class="hidden mt-2">
        <input
          id="reply-${c.id}"
          class="w-full p-2 bg-gray-800 rounded text-sm"
          placeholder="reply…"
        />
        <button
          onclick="submitComment(${postIndex}, '${c.id}')"
          class="bg-white text-black px-2 py-1 rounded mt-1 text-xs"
        >
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
    const card = document.createElement("div");
    card.className = "bg-gray-900 p-4 rounded-xl border border-gray-800";

    card.innerHTML = `
      <div class="flex justify-between">
        <div>
          <a href="post.html?id=${post.id}" class="text-xl font-bold hover:underline">
            ${post.title}
          </a>
          <p class="text-xs text-gray-400">
            m/${post.author} • ${formatTime(post.time)}
          </p>
        </div>
      </div>

      <div class="my-3 text-sm text-gray-200 leading-snug max-h-24 overflow-hidden relative">
        ${
          IS_SINGLE_POST
            ? post.content
            : getPreview(post.content)
        }

        ${
          !IS_SINGLE_POST && post.content.split("\n").length > 3
            ? `
              <div class="absolute bottom-0 left-0 w-full h-6 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none"></div>
              <a href="post.html?id=${post.id}" class="text-xs text-gray-400 hover:text-white block mt-2 relative z-10">
                see more…
              </a>
            `
            : ""
        }
      </div>

      <div class="${IS_SINGLE_POST ? "" : "hidden"} mt-4">
        ${renderCommentTree(post.comments, i)}

        <input
          id="comment-${i}"
          class="w-full p-2 bg-gray-800 rounded mt-3"
          placeholder="add a comment…"
        />
        <button
          onclick="submitComment(${i})"
          class="bg-white text-black px-3 py-1 rounded mt-1"
        >
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
