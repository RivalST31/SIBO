export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "GEMINI_API_KEY is missing in Cloudflare secrets."
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    const body = await request.json();

    const { message, history = [], mode = "lightning" } = body;

    if (!message) {
      return new Response(
        JSON.stringify({
          error: "Message cannot be empty."
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    const systemPrompt = `
You are SIBO, an intelligent, friendly and helpful AI assistant.

Rules:

- Answer clearly and naturally.
- Keep answers concise unless the user asks for details.
- Explain difficult concepts simply.
- If the user asks for code, provide working code.
- Mode: ${mode}
`;

    const contents = [];

    contents.push({
      role: "user",
      parts: [
        {
          text: systemPrompt
        }
      ]
    });

    for (const msg of history) {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [
          {
            text: msg.text
          }
        ]
      });
    }

    contents.push({
      role: "user",
      parts: [
        {
          text: message
        }
      ]
    });

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents
        })
      }
    );

    const raw = await geminiResponse.text();

    if (!geminiResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "Gemini request failed.",
          status: geminiResponse.status,
          details: raw
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    const data = JSON.parse(raw);

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response generated.";

    return new Response(
      JSON.stringify({
        text: reply
      }),
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err.message || "Unknown server error."
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}