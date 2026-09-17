const SUPABASE_URL =
  "https://kqshqlgprneqiuohjsyd.supabase.co";

const FUNCTION_URL =
  SUPABASE_URL +
  "/functions/v1/admin_visitors";

const table =
  document.getElementById("visitorTable");

const totalVisitors =
  document.getElementById("totalVisitors");

const totalVisits =
  document.getElementById("totalVisits");

const lastVisitor =
  document.getElementById("lastVisitor");

const status =
  document.getElementById("status");

const refreshButton =
  document.getElementById("refreshButton");


function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  );
}


async function loadVisitors() {

  status.textContent =
    "Loading visitors...";

  table.innerHTML = `
    <tr>
      <td colspan="6" class="empty">
        Loading...
      </td>
    </tr>
  `;

  try {

    const response =
      await fetch(FUNCTION_URL);

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

      lastVisitor.textContent = "—";

    }

    if (visitors.length === 0) {

      table.innerHTML = `
        <tr>
          <td colspan="6" class="empty">
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
        <td colspan="6" class="empty">
          Unable to load visitors
        </td>
      </tr>
    `;

    status.textContent =
      error.message ||
      "Something went wrong.";

  }

}


refreshButton.addEventListener(
  "click",
  loadVisitors
);

loadVisitors();
