
const SUPABASE_URL = "https://kqshqlgprneqiuohjsyd.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_3wg1TKCseDucRuDWBPvH9g_No6l3UJl";

const VISITORS_FUNCTION =
  `${SUPABASE_URL}/functions/v1/admin_visitors`;

const BROADCAST_FUNCTION =
  `${SUPABASE_URL}/functions/v1/admin_broadcast`;

const $ = (id) => document.getElementById(id);

let accessToken = "";
let broadcastInProgress = false;

const totalVisitors = $("totalVisitors");
const totalVisits = $("totalVisits");
const lastVisitor = $("lastVisitor");
const table = $("visitorTable");
const status = $("status");
const refreshButton = $("refreshButton");

const messageInput = $("broadcastMessage");
const characterCount = $("broadcastCount");
const previewButton = $("previewBroadcastButton");
const previewBox = $("broadcastPreview");
const previewText = $("broadcastPreviewText");
const confirmCheckbox = $("confirmBroadcast");
const sendButton = $("sendBroadcastButton");
const broadcastStatus = $("broadcastStatus");

/* ---------- LOGIN SCREEN ---------- */

const loginBox = document.createElement("div");

loginBox.style.cssText = `
  position:fixed;
  inset:0;
  background:#050505;
  display:flex;
  align-items:center;
  justify-content:center;
  z-index:9999;
  padding:20px;
`;

loginBox.innerHTML = `
  <form id="adminLoginForm" style="
    width:100%;
    max-width:400px;
    background:#111;
    border:1px solid #292929;
    border-radius:16px;
    padding:25px;
  ">
    <h2 style="color:#d4af37;margin-top:0;">QMAI Admin Login</h2>

    <input id="adminEmail" type="email"
      autocomplete="username"
      placeholder="Admin email" required
      style="width:100%;padding:13px;margin:8px 0;
      border-radius:8px;border:1px solid #333;
      background:#080808;color:#fff;">

    <input id="adminPassword" type="password"
      autocomplete="current-password"
      placeholder="Password" required
      style="width:100%;padding:13px;margin:8px 0;
      border-radius:8px;border:1px solid #333;
      background:#080808;color:#fff;">

    <button id="adminLoginButton" type="submit"
      style="width:100%;margin-top:10px;padding:13px;">
      LOGIN
    </button>

    <div id="loginStatus"
      style="margin-top:12px;color:#aaa;font-size:13px;"
      role="status" aria-live="polite"></div>
  </form>
`;

document.body.appendChild(loginBox);

const loginForm = $("adminLoginForm");
const emailInput = $("adminEmail");
const passwordInput = $("adminPassword");
const loginButton = $("adminLoginButton");
const loginStatus = $("loginStatus");

/* ---------- HELPERS ---------- */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
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

async function readResponse(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text || "Unexpected server response" };
  }
}

/* ---------- LOGIN ---------- */

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    loginStatus.textContent = "Enter your email and password.";
    return;
  }

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
        body: JSON.stringify({ email, password })
      }
    );

    const data = await readResponse(response);

    if (!response.ok || !data.access_token) {
      throw new Error(
        data.error_description || data.msg || data.message ||
        "Login failed. Check your credentials."
      );
    }

    accessToken = data.access_token;
    loginBox.remove();

    await loadVisitors();

  } catch (error) {
    loginStatus.textContent = error.message || "Login failed.";
  } finally {
    loginButton.disabled = false;
  }
});

/* ---------- LOAD VISITORS ---------- */

async function loadVisitors() {
  status.textContent = "Loading visitors...";
  refreshButton.disabled = true;

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
      throw new Error(data.error || "Failed to load visitors.");
    }

    const visitors = Array.isArray(data.visitors) ? data.visitors : [];

    totalVisitors.textContent = visitors.length;

    totalVisits.textContent = visitors.reduce(
      (sum, visitor) => sum + Number(visitor.visit_count || 0),
      0
    );

    lastVisitor.textContent = visitors.length
      ? (
          visitors[0].first_name ||
          visitors[0].username ||
          "Unknown"
        )
      : "—";

    if (!visitors.length) {
      table.innerHTML =
        '<tr><td colspan="7" class="empty">No visitors yet</td></tr>';

      status.textContent = "No visitors found.";
      return;
    }

    table.innerHTML = visitors.map((visitor) => {
      const name = [
        visitor.first_name,
        visitor.last_name
      ].filter(Boolean).join(" ") || "—";

      const username = visitor.username
        ? "@" + visitor.username
        : "—";

      const lastSeenTime = visitor.last_seen
        ? new Date(visitor.last_seen).getTime()
        : 0;

      const isOnline =
        lastSeenTime > 0 &&
        Date.now() - lastSeenTime <= 2 * 60 * 1000;

      const visitorStatus = isOnline
        ? '<span class="online"><span class="dot-online"></span>Online</span>'
        : '<span class="offline"><span class="dot-offline"></span>Offline</span>';

      return `
        <tr>
          <td>${escapeHTML(name)}</td>
          <td>${escapeHTML(username)}</td>
          <td>${escapeHTML(visitor.telegram_user_id || "—")}</td>
          <td>${visitorStatus}</td>
          <td>${escapeHTML(visitor.visit_count || 0)}</td>
          <td>${escapeHTML(formatDate(visitor.first_seen))}</td>
          <td>${escapeHTML(formatDate(visitor.last_seen))}</td>
        </tr>
      `;
    }).join("");

    status.textContent = `Showing ${visitors.length} visitor(s).`;

  } catch (error) {
    console.error("Visitor loading failed:", error);

    table.innerHTML =
      '<tr><td colspan="7" class="empty">Unable to load visitors</td></tr>';

    status.textContent = error.message || "Unable to load visitors.";
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", () => {
  if (accessToken) loadVisitors();
});

/* ---------- BROADCAST MESSAGE ---------- */

function updateCharacterCount() {
  characterCount.textContent =
    `${messageInput.value.length} / 4096 characters`;
}

messageInput.addEventListener("input", () => {
  updateCharacterCount();

  // Any message edit requires a fresh preview and confirmation.
  previewBox.style.display = "none";
  confirmCheckbox.checked = false;
  sendButton.disabled = true;
  broadcastStatus.textContent = "";
});

previewButton.addEventListener("click", () => {
  const message = messageInput.value.trim();

  if (!message) {
    broadcastStatus.textContent = "Please enter a message first.";
    messageInput.focus();
    return;
  }

  if (message.length > 4096) {
    broadcastStatus.textContent =
      "The message exceeds Telegram's 4096-character limit.";
    return;
  }

  previewText.textContent = message;
  previewBox.style.display = "block";
  confirmCheckbox.checked = false;
  sendButton.disabled = true;

  broadcastStatus.textContent =
    "Review the preview. Confirm only when you are ready to send.";
});

confirmCheckbox.addEventListener("change", () => {
  sendButton.disabled =
    !confirmCheckbox.checked || broadcastInProgress;
});

/* ---------- SEND BROADCAST ---------- */

sendButton.addEventListener("click", async () => {
  if (broadcastInProgress) return;

  const message = messageInput.value.trim();

  if (!accessToken) {
    broadcastStatus.textContent = "Please log in again.";
    return;
  }

  if (!message) {
    broadcastStatus.textContent = "Please enter a message.";
    return;
  }

  if (!confirmCheckbox.checked) {
    broadcastStatus.textContent =
      "Please confirm the message before sending.";
    return;
  }

  const approved = window.confirm(
    "Send this message to all recorded Telegram visitors now?\n\n" +
    "This action cannot be undone."
  );

  if (!approved) return;

  broadcastInProgress = true;
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
      throw new Error(data.error || "Broadcast request failed.");
    }

    broadcastStatus.textContent =
      "Broadcast request finished.\n" +
      `Total recipients: ${data.total ?? 0}\n` +
      `Sent successfully: ${data.sent ?? 0}\n` +
      `Failed: ${data.failed ?? 0}`;

    if (Array.isArray(data.results) && data.results.length) {
      const failedResults = data.results.filter((item) => !item.ok);

      if (failedResults.length) {
        broadcastStatus.textContent +=
          "\n\nFailed deliveries:\n" +
          failedResults.slice(0, 20).map((item) =>
            `User ${item.userId}: ${item.error || "Delivery failed"}`
          ).join("\n");

        if (failedResults.length > 20) {
          broadcastStatus.textContent +=
            `\n...and ${failedResults.length - 20} more failure(s).`;
        }
      }
    }

    if ((data.sent ?? 0) > 0) {
      broadcastStatus.textContent +=
        "\n\nTelegram accepted the successful messages.";
    }

    // Require a fresh preview and confirmation for another broadcast.
    confirmCheckbox.checked = false;
    previewBox.style.display = "none";

  } catch (error) {
    console.error("Broadcast failed:", error);

    broadcastStatus.textContent =
      `Broadcast error: ${error.message || "Please try again."}\n` +
      "Check the Supabase Edge Function logs before retrying, " +
      "so you don't accidentally send duplicate messages.";

  } finally {
    broadcastInProgress = false;
    messageInput.disabled = false;
    previewButton.disabled = false;
    sendButton.disabled = !confirmCheckbox.checked;
  }
});

updateCharacterCount();

