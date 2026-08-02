export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
  return handlePost(context);
}

export async function onRequestPost(context) {
  return handlePost(context);
}

async function handlePost(context) {
  const { request, env } = context;
  const apiKey = env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("Error at functions/api/analyze.js:18: GEMINI_API_KEY is not defined in the environment.");
    return new Response(
      JSON.stringify({ error: "Could not contact Gemini. Please try again later." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    console.error("Error at functions/api/analyze.js:28: Failed to parse request JSON.", err);
    return new Response(
      JSON.stringify({ error: "Could not contact Gemini. Please try again later." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Determine the model and endpoint dynamically.
  // Defaults to Gemini 3.5 Flash and generateContent.
  let url;
  let fetchMethod = "POST";
  
  if (body.operationName) {
    // For background operation polling
    url = `https://generativelanguage.googleapis.com/v1beta/${body.operationName}?key=${apiKey}`;
    fetchMethod = "GET";
    body = undefined;
  } else {
    const model = body.model || "gemini-3.5-flash";
    const endpoint = body.endpoint || "generateContent";
    
    // Remove metadata fields that the raw Gemini REST API doesn't expect in the body
    delete body.model;
    delete body.endpoint;
    
    url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}?key=${apiKey}`;
  }

  let response;
  try {
    const fetchOptions = {
      method: fetchMethod,
      headers: {
        "Content-Type": "application/json"
      }
    };
    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }
    response = await fetch(url, fetchOptions);
  } catch (err) {
    const errorLine = 56; // Exact line of the fetch call
    console.error(`Error at functions/api/analyze.js:${errorLine}: Network fetch to Gemini failed. Details: ${err.message}`);
    return new Response(
      JSON.stringify({ error: "Could not contact Gemini. Please try again later." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!response.ok) {
    const errorLine = 57; // Exact line where response check failed
    const rawBody = await response.text();
    console.error(`Error at functions/api/analyze.js:${errorLine}`);
    console.error(`HTTP status code: ${response.status}`);
    console.error(`Raw response body: ${rawBody}`);
    
    return new Response(
      JSON.stringify({ error: "Could not contact Gemini. Please try again later." }),
      { status: response.status, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const responseData = await response.json();
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    const errorLine = 73; // Exact line where response JSON parsing failed
    console.error(`Error at functions/api/analyze.js:${errorLine}: Failed to parse Gemini response JSON.`);
    console.error(`HTTP status code: ${response.status}`);
    console.error(`Raw response body: ${await response.text().catch(() => "N/A")}`);
    
    return new Response(
      JSON.stringify({ error: "Could not contact Gemini. Please try again later." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
