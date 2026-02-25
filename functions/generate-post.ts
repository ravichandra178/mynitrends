import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

export async function generatePost(
  dbUrl: string,
  hfApiKey: string,
  trendId: string,
  topic: string
): Promise<any> {
  if (!hfApiKey) {
    throw new Error("HUGGINGFACE_API_KEY not configured");
  }

  const hfModel = Deno.env.get("HF_MODEL") || "mistralai/Mistral-7B-Instruct-v0.2";

  // Generate post text using Hugging Face
  const hfRes = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${hfApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: hfModel,
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

  if (!hfRes.ok) {
    const error = await hfRes.text();
    throw new Error(`Hugging Face API error: ${error}`);
  }

  const hfData = await hfRes.json();
  let postText = hfData.choices[0].message.content.trim();

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

