
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
      throw new Error(
        data.error_description || data.msg || "Login failed"
      );
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

    const visitors = Array.isArray(data.visitors)
      ? data.visitors
      : [];

    $("totalVisitors").textContent = visitors.length;

    $("totalVisits").textContent = visitors.reduce(
      (sum, visitor) => sum + Number(visitor.visit_count || 0),
      0
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

    table.innerHTML = visitors.map((visitor) => {
      const name =
        [visitor.first_name, visitor.last_name]
          .filter(Boolean)
          .join(" ") || "—";

      const username = visitor.username
        ? "@" + visitor.username
        : "—";

      const lastSeen = visitor.last_seen
        ? new Date(visitor.last_seen).getTime()
        : 0;

      const online =
        lastSeen > 0 && Date.now() - lastSeen <= 120000;

      const state = online
        ? '<span class="online"><span class="dot-online"></span>Online</span>'
        : '<span class="offline"><span class="dot-offline"></span>Offline</span>';

      return `<tr>
        <td>${escapeHTML(name)}</td>
        <td>${escapeHTML(username)}</td>
        <td>${escapeHTML(visitor.telegram_user_id || "—")}</td>
        <td>${state}</td>
        <td>${escapeHTML(visitor.visit_count || 0)}</td>
        <td>${escapeHTML(formatDate(visitor.first_seen))}</td>
        <td>${escapeHTML(formatDate(visitor.last_seen))}</td>
      </tr>`;
    }).join("");

    status.textContent = `Showing ${visitors.length} visitor(s).`;

  } catch (error) {
    table.innerHTML =
      '<tr><td colspan="7" class="empty">Unable to load visitors</td></tr>';

    status.textContent =
      error.message || "Unable to load visitors";

  } finally {
    refresh.disabled = false;
  }
}

$("refreshButton").addEventListener("click", () => {
  if (accessToken) loadVisitors();
});

/* TEST MESSAGE ELEMENTS */

const messageInput = $("broadcastMessage");
const characterCount = $("broadcastCount");
const previewButton = $("previewBroadcastButton");
const previewBox = $("broadcastPreview");
const previewText = $("broadcastPreviewText");
const confirmCheckbox = $("confirmBroadcast");
const sendButton = $("sendBroadcastButton");
const broadcastStatus = $("broadcastStatus");

/* CHARACTER COUNTER */

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

/* PREVIEW */


/* PREVIEW — SAVE A SERVER-SIDE PREVIEW; SEND NOTHING */

previewButton.addEventListener("click", async () => {
  const message = messageInput.value.trim();

  if (!accessToken) {
    broadcastStatus.textContent = "Please log in again.";
    return;
  }

  if (!message) {
    broadcastStatus.textContent = "Please enter a message first.";
    messageInput.focus();
    return;
  }

  if (message.length > 4096) {
    broadcastStatus.textContent = "Message is too long.";
    return;
  }

  previewButton.disabled = true;
  sendButton.disabled = true;
  confirmCheckbox.checked = false;
  previewBox.style.display = "none";
  broadcastStatus.textContent =
    "Creating preview for visitors active in the last 30 days...";

  try {
    const response = await fetch(BROADCAST_FUNCTION, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        mode: "preview",
        message
      })
    });

    const data = await readResponse(response);

    if (!response.ok || !data.ok) {
      throw new Error(
        data.error || `Preview failed (HTTP ${response.status})`
      );
    }

    previewText.textContent = message;
    previewBox.style.display = "block";

    broadcastStatus.textContent =
      `Preview saved successfully.\n` +
      `Preview ID: ${data.job_id}\n` +
      `Eligible unique visitor IDs: ${data.recipient_count}\n` +
      `Invalid or missing IDs: ${data.invalid_or_missing_ids}\n` +
      `Messages sent: ${data.sent}\n\n` +
      "No visitor messages were sent. Real broadcasting is not enabled.";

  } catch (error) {
    broadcastStatus.textContent =
      `Preview failed: ${error.message || "Unknown error"}.\n` +
      "Check the Supabase admin_broadcast function logs.";

  } finally {
    previewButton.disabled = false;
    confirmCheckbox.checked = false;
    sendButton.disabled = true;
  }
});


/* CHECKBOX */

confirmCheckbox.addEventListener("change", () => {
  sendButton.disabled = !confirmCheckbox.checked || sending;
});

/* SEND TEST MESSAGE ONLY */

sendButton.addEventListener("click", async () => {
  if (sending || !confirmCheckbox.checked) return;

  const message = messageInput.value.trim();

  if (!accessToken || !message) {
    broadcastStatus.textContent =
      "Please log in and enter a message.";

    return;
  }

  if (message.length > 4096) {
    broadcastStatus.textContent = "Message is too long.";
    return;
  }

  const confirmed = window.confirm(
    "Send a TEST message only to your configured Telegram test account?\n\nNo visitors will receive this message."
  );

  if (!confirmed) return;

  sending = true;
  sendButton.disabled = true;
  previewButton.disabled = true;
  messageInput.disabled = true;

  broadcastStatus.textContent =
    "Sending test message to the configured test account...";

  try {
    const response = await fetch(BROADCAST_FUNCTION, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        message,
        mode: "test"
      })
    });

    const data = await readResponse(response);

    if (!response.ok || !data.ok) {
      throw new Error(
        data.error || "Test message failed"
      );
    }

    broadcastStatus.textContent =
      "Success! The test message was delivered to the configured Telegram test account.";

    previewBox.style.display = "none";
    confirmCheckbox.checked = false;

  } catch (error) {
    broadcastStatus.textContent =
      `Test failed: ${error.message || "Unknown error"}.\n` +
      "Check the Supabase admin_broadcast function logs before trying again.";

  } finally {
    sending = false;
    messageInput.disabled = false;
    previewButton.disabled = false;
    sendButton.disabled = !confirmCheckbox.checked;
  }
});

/* INITIALIZE */

updateCharacterCount();


