

const SUPABASE_URL = "https://kqshqlgprneqiuohjsyd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_3wg1TKCseDucRuDWBPvH9g_No6l3UJl";

const VISITORS_FUNCTION = `${SUPABASE_URL}/functions/v1/admin_visitors`;
const BROADCAST_FUNCTION = `${SUPABASE_URL}/functions/v1/admin_broadcast`;

const $ = (id) => document.getElementById(id);

let accessToken = "";
let sending = false;

const loginBox = document.createElement("div");
loginBox.style.cssText =
  "position:fixed;inset:0;background:#050505;display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;";

loginBox.innerHTML = `
  <form id="adminLoginForm" style="width:100%;max-width:400px;background:#111;border:1px solid #292929;border-radius:16px;padding:25px;">
    <h2 style="color:#d4af37">QMAI Admin Login</h2>
    <input id="adminEmail" type="email" autocomplete="username" placeholder="Admin email" required style="width:100%;padding:13px;margin:8px 0;background:#080808;color:white;border:1px solid #333;border-radius:8px;">
    <input id="adminPassword" type="password" autocomplete="current-password" placeholder="Password" required style="width:100%;padding:13px;margin:8px 0;background:#080808;color:white;border:1px solid #333;border-radius:8px;">
    <button id="adminLoginButton" type="submit" style="width:100%;padding:13px;margin-top:10px;">LOGIN</button>
    <div id="loginStatus" role="status" style="margin-top:12px;color:#aaa;"></div>
  </form>
`;

document.body.appendChild(loginBox);

const loginForm = $("adminLoginForm");
const loginButton = $("adminLoginButton");
const loginStatus = $("loginStatus");

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

async function readResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text || "Unexpected server response" };
  }
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

/* LOGIN */

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginButton.disabled = true;
  loginStatus.textContent = "Logging in...";

  try {
    const response = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          email: $("adminEmail").value.trim(),
          password: $("adminPassword").value
        })
      }
    );

    const data = await readResponse(response);

    if (!response.ok || !data.access_token) {
      throw new Error(data.error_description || data.msg || "Login failed");
    }

    accessToken = data.access_token;
    loginBox.remove();
    await loadVisitors();

  } catch (error) {
    loginStatus.textContent = error.message || "Login failed";
  } finally {
    loginButton.disabled = false;
  }
});

/* VISITOR DASHBOARD */

async function loadVisitors() {
  const table = $("visitorTable");
  const status = $("status");
  const refresh = $("refreshButton");

  status.textContent = "Loading visitors...";
  refresh.disabled = true;
  table.innerHTML =
    '<tr><td colspan="7" class="empty">Loading...</td></tr>';

  try {
    const response = await fetch(VISITORS_FUNCTION, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY
      }
    });

    const data = await readResponse(response);

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Failed to load visitors");
    }

    const visitors = Array.isArray(data.visitors) ? data.visitors : [];

    $("totalVisitors").textContent = visitors.length;
    $("totalVisits").textContent = visitors.reduce(
      (sum, v) => sum + Number(v.visit_count || 0), 0
    );
    $("lastVisitor").textContent = visitors.length
      ? visitors[0].first_name || visitors[0].username || "Unknown"
      : "—";

    if (!visitors.length) {
      table.innerHTML =
        '<tr><td colspan="7" class="empty">No visitors yet</td></tr>';
      status.textContent = "No visitors found.";
      return;
    }

    table.innerHTML = visitors.map((v) => {
      const name = [v.first_name, v.last_name].filter(Boolean).join(" ") || "—";
      const username = v.username ? "@" + v.username : "—";
      const lastSeen = v.last_seen ? new Date(v.last_seen).getTime() : 0;
      const online = lastSeen > 0 && Date.now() - lastSeen <= 120000;

      const state = online
        ? '<span class="online"><span class="dot-online"></span>Online</span>'
        : '<span class="offline"><span class="dot-offline"></span>Offline</span>';

      return `<tr>
        <td>${escapeHTML(name)}</td>
        <td>${escapeHTML(username)}</td>
        <td>${escapeHTML(v.telegram_user_id || "—")}</td>
        <td>${state}</td>
        <td>${escapeHTML(v.visit_count || 0)}</td>
        <td>${escapeHTML(formatDate(v.first_seen))}</td>
        <td>${escapeHTML(formatDate(v.last_seen))}</td>
      </tr>`;
    }).join("");

    status.textContent = `Showing ${visitors.length} visitor(s).`;

  } catch (error) {
    table.innerHTML =
      '<tr><td colspan="7" class="empty">Unable to load visitors</td></tr>';
    status.textContent = error.message || "Unable to load visitors";
  } finally {
    refresh.disabled = false;
  }
}

$("refreshButton").addEventListener("click", () => {
  if (accessToken) loadVisitors();
});

/* BROADCAST ELEMENTS */

const messageInput = $("broadcastMessage");
const characterCount = $("broadcastCount");
const previewButton = $("previewBroadcastButton");
const previewBox = $("broadcastPreview");
const previewText = $("broadcastPreviewText");
const confirmCheckbox = $("confirmBroadcast");
const sendButton = $("sendBroadcastButton");
const broadcastStatus = $("broadcastStatus");

/* Update counter immediately and whenever text changes. */

function updateCharacterCount() {
  characterCount.textContent =
    `${messageInput.value.length} / 4096 characters`;
}

messageInput.addEventListener("input", () => {
  updateCharacterCount();
  previewBox.style.display = "none";
  confirmCheckbox.checked = false;
  sendButton.disabled = true;
  broadcastStatus.textContent = "";
});

/* Preview */

previewButton.addEventListener("click", () => {
  const message = messageInput.value.trim();

  if (!message) {
    broadcastStatus.textContent = "Please enter a message first.";
    messageInput.focus();
    return;
  }

  if (message.length > 4096) {
    broadcastStatus.textContent = "Message is too long.";
    return;
  }

  previewText.textContent = message;
  previewBox.style.display = "block";
  confirmCheckbox.checked = false;
  sendButton.disabled = true;
  broadcastStatus.textContent =
    "Review the message and tick the confirmation box to continue.";
});

/* Confirmation */

confirmCheckbox.addEventListener("change", () => {
  sendButton.disabled = !confirmCheckbox.checked || sending;
});

/* Send */

sendButton.addEventListener("click", async () => {
  if (sending || !confirmCheckbox.checked) return;

  const message = messageInput.value.trim();

  if (!accessToken || !message) {
    broadcastStatus.textContent = "Please log in and enter a message.";
    return;
  }

  if (!window.confirm(
    "Send this message to all recorded Telegram visitors?\n\nThis cannot be undone."
  )) {
    return;
  }

  sending = true;
  sendButton.disabled = true;
  previewButton.disabled = true;
  messageInput.disabled = true;
  broadcastStatus.textContent = "Sending messages. Please wait...";

  try {
    const response = await fetch(BROADCAST_FUNCTION, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ message })
    });

    const data = await readResponse(response);

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Broadcast failed");
    }

    broadcastStatus.textContent =
      `Broadcast completed.\n` +
      `Total recipients: ${data.total ?? 0}\n` +
      `Sent successfully: ${data.sent ?? 0}\n` +
      `Failed: ${data.failed ?? 0}`;

    if (Array.isArray(data.results)) {
      const failures = data.results.filter((r) => !r.ok);

      if (failures.length) {
        broadcastStatus.textContent += "\n\nFailed deliveries:\n" +
          failures.slice(0, 20).map((r) =>
            `User ${r.userId}: ${r.error || "Delivery failed"}`
          ).join("\n");
      }
    }

    previewBox.style.display = "none";
    confirmCheckbox.checked = false;

  } catch (error) {
    broadcastStatus.textContent =
      `Error: ${error.message || "Broadcast failed"}\n` +
      "Check Supabase function logs before retrying to avoid duplicate messages.";
  } finally {
    sending = false;
    messageInput.disabled = false;
    previewButton.disabled = false;
    sendButton.disabled = !confirmCheckbox.checked;
  }
});

/* INITIALIZE COUNTER */

updateCharacterCount();

