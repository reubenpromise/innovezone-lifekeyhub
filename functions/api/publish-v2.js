
// LifeKey Universal Publisher V2
// Cloudflare Pages Function entry point.

export async function onRequestPost(context) {
  try {
    const mod = await import("../../publish-v2.js");

    if (typeof mod.onRequestPost !== "function") {
      throw new Error(
        "LifeKey Publisher V2 engine could not be loaded."
      );
    }

    return await mod.onRequestPost(context);
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error?.message || "LifeKey Publisher V2 failed to load."
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json; charset=utf-8"
        }
      }
    );
  }
}

export async function onRequestGet() {
  return new Response(
    JSON.stringify({
      ok: true,
      service: "LifeKey Universal Publisher V2",
      endpoint: "/api/publish-v2"
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      }
    }
  );
}
