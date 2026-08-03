export async function onRequestPost(context) {
    const GEMINI_API_KEY = context.env.GEMINI_API_KEY;

    const body = await context.request.json();

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: body.message
                            }
                        ]
                    }
                ]
            })
        }
    );

    return new Response(await response.text(), {
        headers: {
            "Content-Type": "application/json"
        }
    });
}