import { Handler } from '@netlify/functions';
import { GoogleGenAI } from '@google/genai';

const handler: Handler = async (event, context) => {
  // CORS Headers for local development
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    // Check both variable names
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error("Missing API_KEY in environment variables");
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ error: 'System configuration error. API Key missing.' }) 
      };
    }

    const { model, contents, config } = JSON.parse(event.body || '{}');

    if (!contents) {
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ error: 'Missing content' }) 
      };
    }

    // Initialize AI on the server side
    const ai = new GoogleGenAI({ apiKey });
    
    // Call Gemini
    const response = await ai.models.generateContent({
      model: model || 'gemini-3-flash-preview',
      contents,
      config
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error: any) {
    // Log the actual error for debugging in Netlify logs
    console.error("Backend GenAI Error:", error);
    
    // Return a generic error to the frontend to avoid exposing internal stack traces
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'An internal error occurred. Please try again later.' })
    };
  }
};

export { handler };