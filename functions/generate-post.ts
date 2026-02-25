import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

export async function generatePost(
  dbUrl: string,
  groqApiKey: string,
  trendId: string,
  topic: string
): Promise<any> {
  if (!groqApiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  // Generate post text using GROQ with Qwen3-32B
  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen/qwen3-32b",
      messages: [
        {
          role: "user",
          content: `Write ONLY a professional Facebook post about "${topic}". 
Keep it 150-200 characters. 
No hashtags. 
No explanations.
Just the post text.`
        }
      ],
      max_tokens: 100,
      temperature: 0.7,
    }),
  });

  if (!groqRes.ok) {
    const error = await groqRes.text();
    throw new Error(`GROQ API error: ${error}`);
  }

  const groqData = await groqRes.json();
  let postText = groqData.choices[0].message.content.trim();

  // Clean up any thinking text if present
  if (postText.includes("<think>")) {
    const endThink = postText.indexOf("</think>");
    if (endThink !== -1) {
      postText = postText.substring(endThink + 8).trim();
    }
  }

  // Fallback if no content
  if (!postText || postText.length === 0) {
    postText = `Check out our latest insights on ${topic}! 🚀 Stay tuned for more updates.`;
  }

  // Save post to database
  const client = new Client(dbUrl);
  await client.connect();

  try {
    const result = await client.queryObject(
      `INSERT INTO posts (trend_id, content, created_at) 
       VALUES ($1, $2, NOW()) RETURNING *`,
      [trendId, postText]
    );

    return result.rows[0];
  } finally {
    await client.end();
  }
}

