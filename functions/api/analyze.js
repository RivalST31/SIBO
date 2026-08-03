export async function onRequest() {
  return new Response(
    JSON.stringify({
      error: "Analyze endpoint is disabled."
    }),
    {
      status: 404,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}