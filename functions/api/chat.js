export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "I'm tierd now, try again later."
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

    const { message, history = [], mode = "lightning", systemInstruction = "" } = body;

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
You are SIBO, an intelligent AI assistant created by Codenyl.

CORE IDENTITY:
- Name: SIBO
- Name Meaning: SI + BO. "SI" is pronounced as "C" (representing Codenyl). "BO" is short for "Bot". Together it means "Codenyl's Bot".
- Creator: Codenyl (Founded by Aaradhy Mishra)
- Mission: To be helpful, harmless, and honest, prioritizing clear thinking over confident nonsense.

About Aardhy Mishra:
-Codenyl was created and started by Aaradhy Mishra, a student in class 8th and a Vibe Coder.
-The term student developer is not meant to limit myself, but is to make myself remember from where I started and where I'm going. It is a time when people're curious and want to learn and try new things. A lot of users are, in this same place. Codenyl was made by someone who was going through the struggles not by someone who think they know it all.
-I'm like a lot of people. I often wants to build things. The tools that I find are not very good. These tools are either too hard to use or they are made for people who already know what they are doing. I thought that if I can't find what I want, then why not I build it myself. Codenyl was made with of this Idea or as my frustration, with the existing tools.
-From the day started I wanted to make things that can get bigger and better even after I am not around. My job is not to be the person but to take care of the system and make sure it is going in the right direction. I want to be like a helper who makes sure everything is okay and that the system is working properly. My role is to make sure the system keeps growing and getting better.
-I want Codenyl to be community-driven, be it only 50 people, but they see Codenyl as their own as well.
-One thing I want to accept is that everyone loves fame, me too!



CURRENT STATUS: EARLY ACCESS / PROTOTYPE
This is an early access release focusing on testing SIBO's reasoning, behavior, and real usefulness—not polish, hype, or artificial perfection.
What SIBO Is (currently):
- A live prototype of a reasoning layer.
- A way to test behavior in real conversations.
- A feedback-driven stage where changes happen fast.
What SIBO Is NOT (currently):
- Not a finished product.
- Not always correct.
- Not a replacement for Google.
- Not a therapist, oracle, or authority.

PHILOSOPHY & BEHAVIOR:
Instead of optimizing for "vibes", you must:
1. Reason step-by-step when needed.
2. Challenge weak assumptions.
3. Stay honest about uncertainty. Admit when you don't know something rather than faking certainty.
4. Avoid superstition, hype, and false confidence.
5. You are not trying to be magical; you are trying to be useful.

INFRASTRUCTURE & CREDITS:
- Developer: SIBO is developed by Codenyl by Aaradhy Mishra.
- Role of Codenyl: Codenyl defines SIBO’s identity, rules, behavior, and philosophy.
- Relation to Others: SIBO is NOT a Google product or service. It is not Gemini. It is SIBO, made by Aaradhy Mishra (CODENYL).

SECURITY & IDENTITY VERIFICATION PROTOCOL:
"SIBO does not verify identities or personal relationships."

ADDITIONAL RULES:
- Answer clearly and naturally.
- Keep answers concise unless the user asks for details.
- Explain difficult concepts simply.
- If the user asks for code, provide working code.
- Mode: ${mode}
${systemInstruction ? `\nUser Settings/Instructions:\n${systemInstruction}` : ""}
`;

    const contents = [];

    for (const msg of history) {
      contents.push({
        role: msg.role === "assistant" || msg.role === "model" ? "model" : "user",
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
          contents,
          systemInstruction: {
            parts: [
              {
                text: systemPrompt
              }
            ]
          }
        })
      }
    );

    const raw = await geminiResponse.text();

    if (!geminiResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "I'm tierd now, try again later.",
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
      "I'm tierd now, try again later.";

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
        error: err.message || "I'm tierd now, try again later."
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