const SUPABASE_URL =
  "https://kqshqlgprneqiuohjsyd.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_3wg1TKCseDucRuDWBPvH9g_No6l3UJl";

const FUNCTION_URL =
  SUPABASE_URL +
  "/functions/v1/admin_visitors";

const totalVisitors =
  document.getElementById("totalVisitors");

const totalVisits =
  document.getElementById("totalVisits");

const lastVisitor =
  document.getElementById("lastVisitor");

const table =
  document.getElementById("visitorTable");

const status =
  document.getElementById("status");

const refreshButton =
  document.getElementById("refreshButton");

let accessToken = "";


/* =========================
   LOGIN SCREEN
========================= */

const loginBox =
  document.createElement("div");

loginBox.style.cssText = `
  position: fixed;
  inset: 0;
  background: #050505;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
`;

loginBox.innerHTML = `
  <div style="
    width:100%;
    max-width:400px;
    background:#111;
    border:1px solid #292929;
    border-radius:16px;
    padding:25px;
  ">

    <h2 style="
      color:#d4af37;
      margin-top:0;
    ">
      QMAI Admin Login
    </h2>

    <input
      id="adminEmail"
      type="email"
      placeholder="Admin email"
      style="
        width:100%;
        padding:13px;
        margin:8px 0;
        border-radius:8px;
        border:1px solid #333;
        background:#080808;
        color:#fff;
      "
    >

    <input
      id="adminPassword"
      type="password"
      placeholder="Password"
      style="
        width:100%;
        padding:13px;
        margin:8px 0;
        border-radius:8px;
        border:1px solid #333;
        background:#080808;
        color:#fff;
      "
    >

    <button
      id="adminLoginButton"
      style="
        width:100%;
        margin-top:10px;
        padding:13px;
        background:#d4af37;
        color:#000;
        border:0;
        border-radius:8px;
        font-weight:bold;
        cursor:pointer;
      "
    >
      LOGIN
    </button>

    <div
      id="loginStatus"
      style="
        margin-top:12px;
        color:#888;
        font-size:13px;
      "
    ></div>

  </div>
`;

document.body.appendChild(loginBox);


const emailInput =
  document.getElementById("adminEmail");

const passwordInput =
  document.getElementById("adminPassword");

const loginButton =
  document.getElementById("adminLoginButton");

const loginStatus =
  document.getElementById("loginStatus");


/* =========================
   LOGIN
========================= */

async function login() {

  const email =
    emailInput.value.trim();

  const password =
    passwordInput.value;

  if (!email || !password) {

    loginStatus.textContent =
      "Enter email and password.";

    return;
  }

  loginButton.disabled = true;

  loginStatus.textContent =
    "Logging in...";

  try {

    const response =
      await fetch(
        SUPABASE_URL +
        "/auth/v1/token?grant_type=password",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "apikey":
              SUPABASE_ANON_KEY
          },

          body: JSON.stringify({
            email,
            password
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {

      throw new Error(
        data.error_description ||
        data.msg ||
        "Login failed"
      );

    }

    accessToken =
      data.access_token;

    loginBox.remove();

    await loadVisitors();

  } catch (error) {

    loginStatus.textContent =
      error.message;

    loginButton.disabled = false;

  }

}


loginButton.addEventListener(
  "click",
  login
);


passwordInput.addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {
      login();
    }

  }
);


/* =========================
   LOAD VISITORS
========================= */

async function loadVisitors() {

  status.textContent =
    "Loading visitors...";

  table.innerHTML = `
    <tr>
      <td colspan="7" class="empty">
        Loading...
      </td>
    </tr>
  `;

  try {

    const response =
      await fetch(
        FUNCTION_URL,
        {
          headers: {
            "Authorization":
              `Bearer ${accessToken}`,

            "apikey":
              SUPABASE_ANON_KEY
          }
        }
      );

    const data =
      await response.json();

    if (!response.ok || !data.ok) {

      throw new Error(
        data.error ||
        "Failed to load visitors"
      );

    }

    const visitors =
      data.visitors || [];

    totalVisitors.textContent =
      visitors.length;

    totalVisits.textContent =
      visitors.reduce(
        (total, visitor) =>
          total +
          Number(
            visitor.visit_count || 0
          ),
        0
      );

    if (visitors.length > 0) {

      lastVisitor.textContent =
        visitors[0].first_name ||
        visitors[0].username ||
        "Unknown";

    } else {

      lastVisitor.textContent =
        "—";

    }


    if (!visitors.length) {

      table.innerHTML = `
        <tr>
          <td colspan="7" class="empty">
            No visitors yet
          </td>
        </tr>
      `;

      status.textContent =
        "No visitors found.";

      return;
    }


    table.innerHTML =
      visitors.map(visitor => {

        const name =
          [
            visitor.first_name,
            visitor.last_name
          ]
          .filter(Boolean)
          .join(" ") ||
          "—";


        const username =
          visitor.username
            ? "@" + visitor.username
            : "—";


        /* =========================
           ONLINE CHECK
        ========================= */

        const lastSeen =
          visitor.last_seen
            ? new Date(
                visitor.last_seen
              ).getTime()
            : 0;

        const now =
          Date.now();

        const difference =
          now - lastSeen;

        const isOnline =
          difference <=
          2 * 60 * 1000;


        const statusHtml =
          isOnline
            ? `
              <span class="online">
                <span class="dot-online"></span>
                Online
              </span>
            `
            : `
              <span class="offline">
                <span class="dot-offline"></span>
                Offline
              </span>
            `;


        return `
          <tr>

            <td>
              ${name}
            </td>

            <td>
              ${username}
            </td>

            <td>
              ${visitor.telegram_user_id || "—"}
            </td>

            <td>
              ${statusHtml}
            </td>

            <td>
              ${visitor.visit_count || 0}
            </td>

            <td>
              ${formatDate(
                visitor.first_seen
              )}
            </td>

            <td>
              ${formatDate(
                visitor.last_seen
              )}
            </td>

          </tr>
        `;

      }).join("");


    status.textContent =
      `Showing ${visitors.length} visitor(s).`;

  } catch (error) {

    console.error(error);

    table.innerHTML = `
      <tr>
        <td colspan="7" class="empty">
          Unable to load visitors
        </td>
      </tr>
    `;

    status.textContent =
      error.message;

  }

}


/* =========================
   DATE FORMAT
========================= */

function formatDate(value) {

  if (!value) {
    return "—";
  }

  return new Date(value)
    .toLocaleString(
      "en-IN",
      {
        dateStyle: "medium",
        timeStyle: "short"
      }
    );

}


/* =========================
   REFRESH
========================= */

refreshButton.addEventListener(
  "click",
  () => {

    if (accessToken) {
      loadVisitors();
    }

  }
);
