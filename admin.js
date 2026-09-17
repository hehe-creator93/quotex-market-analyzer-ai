const SUPABASE_URL =
  "https://kqshqlgprneqiuohjsyd.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_3wg1TKCseDucRuDWBPvH9g_No6l3UJl";

const FUNCTION_URL =
  SUPABASE_URL +
  "/functions/v1/admin_visitors";


async function loadVisitors(accessToken) {

  const response = await fetch(
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

  return data.visitors || [];
}
