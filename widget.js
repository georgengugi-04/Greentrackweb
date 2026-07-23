/**
 * GreenTrack floating chat widget.
 * Visitor messages are saved and forwarded to WhatsApp — no signup or
 * login needed, just an anonymous per-device session ID plus an optional
 * name/email so you know who's asking.
 *
 * Configure this line before deploying:
 */
window.GREENTRACK_API_BASE = window.GREENTRACK_API_BASE || "https://greentrackweb-production.up.railway.app";

(function () {
  const API = window.GREENTRACK_API_BASE;
  const SESSION_KEY = "gt_session_id";

  function getSessionId() {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  function timeAgo(iso) {
    const diff = Math.max(0, Date.now() - new Date(iso).getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    return Math.floor(hrs / 24) + "d ago";
  }

  function el(html) {
    const div = document.createElement("div");
    div.innerHTML = html.trim();
    return div.firstChild;
  }

  const sessionId = getSessionId();
  let contact = JSON.parse(localStorage.getItem("gt_contact") || "null");

  // ---------- build markup ----------
  const root = el(`
    <div id="gt-widget">
      <button class="gt-launcher" aria-label="Open GreenTrack chat">
        <svg viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="gt-badge" style="display:none">0</span>
      </button>
      <div class="gt-panel">
        <div class="gt-head">
          <div class="gt-head-title">
            <span class="dot"></span>
            <div><b>GreenTrack</b><span>Chat with the team</span></div>
          </div>
          <button class="gt-close" aria-label="Close">✕</button>
        </div>
        <div class="gt-messages"><div class="gt-empty">Say hello — it's forwarded straight to WhatsApp.</div></div>
        <form class="gt-precontact" style="${contact ? "display:none" : ""}">
          <input type="text" name="name" placeholder="Your name" required>
          <input type="email" name="email" placeholder="Email (optional)">
          <small>Just so we know who's asking. Saved on this device only.</small>
        </form>
        <form class="gt-composer">
          <input type="text" name="body" placeholder="Type a message…" autocomplete="off" required>
          <button type="submit" aria-label="Send">
            <svg viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </form>
      </div>
    </div>
  `);
  document.body.appendChild(root);

  // ---------- element refs ----------
  const launcher = root.querySelector(".gt-launcher");
  const closeBtn = root.querySelector(".gt-close");
  const messagesEl = root.querySelector(".gt-messages");
  const precontactForm = root.querySelector(".gt-precontact");
  const composerForm = root.querySelector(".gt-composer");

  let opened = false;
  let pollTimer = null;

  launcher.addEventListener("click", () => {
    opened = !opened;
    root.classList.toggle("open", opened);
    if (opened) {
      loadChatHistory();
      if (!pollTimer) pollTimer = setInterval(loadChatHistory, 8000);
    }
  });
  closeBtn.addEventListener("click", () => {
    opened = false;
    root.classList.remove("open");
  });

  // ---------- chat ----------
  function renderMessages(messages) {
    if (!messages.length) {
      messagesEl.innerHTML = `<div class="gt-empty">Say hello — it's forwarded straight to WhatsApp.</div>`;
      return;
    }
    messagesEl.innerHTML = "";
    messages.forEach((m) => {
      const bubble = el(`
        <div class="gt-msg ${m.sender === "user" ? "user" : "team"}">
          ${m.body.replace(/</g, "&lt;")}
          <span class="gt-msg-meta">${m.sender === "user" ? "You" : "GreenTrack"} · ${timeAgo(m.createdAt)}</span>
        </div>
      `);
      messagesEl.appendChild(bubble);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function loadChatHistory() {
    try {
      const res = await fetch(`${API}/api/chat/messages?sessionId=${encodeURIComponent(sessionId)}`);
      if (!res.ok) throw new Error("bad response");
      renderMessages(await res.json());
    } catch {
      // Backend not reachable yet — leave the friendly empty state as-is.
    }
  }

  async function currentMessagesOrEmpty() {
    try {
      const res = await fetch(`${API}/api/chat/messages?sessionId=${encodeURIComponent(sessionId)}`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  precontactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(precontactForm);
    contact = { name: data.get("name"), email: data.get("email") || "" };
    localStorage.setItem("gt_contact", JSON.stringify(contact));
    precontactForm.style.display = "none";
  });

  composerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(composerForm);
    const body = String(data.get("body") || "").trim();
    if (!body) return;

    if (!contact) {
      const nameInput = precontactForm.querySelector('input[name="name"]');
      const emailInput = precontactForm.querySelector('input[name="email"]');
      const name = (nameInput.value || "").trim();
      if (!name) {
        precontactForm.style.display = "flex";
        nameInput.focus();
        return;
      }
      contact = { name, email: (emailInput.value || "").trim() };
      localStorage.setItem("gt_contact", JSON.stringify(contact));
      precontactForm.style.display = "none";
    }

    composerForm.querySelector("input").value = "";
    // Optimistic render
    const optimistic = { sender: "user", body, createdAt: new Date().toISOString() };
    renderMessages([...(await currentMessagesOrEmpty()), optimistic]);

    try {
      await fetch(`${API}/api/chat/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, name: contact.name, email: contact.email, body }),
      });
      loadChatHistory();
    } catch {
      messagesEl.appendChild(el(`<div class="gt-empty">Couldn't reach the server — try again shortly, or use WhatsApp directly.</div>`));
    }
  });
})();
