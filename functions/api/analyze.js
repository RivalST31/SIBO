export async function onRequest() {
  return new Response(
    JSON.stringify({
      error: "I'm tierd now, try again later."
    }),
    {
      status: 404,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}