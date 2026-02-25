import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

export async function generatePost(dbUrl: string, hfApiKey: string, trendId: string, topic: string): Promise<any> {
  if (!hfApiKey) {
    throw new Error("HUGGINGFACE_API_KEY not configured");
  }

  // Call Hugging Face API with Qwen3-32B
  const hfRes = await fetch("https://api-inference.huggingface.co/models/Qwen/Qwen3-32B-Instruct", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${hfApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: `You are a social media copywriter. Generate a compelling social media post about: "${topic}". 
Rules:
- Keep under 280 characters
- Engaging and shareable
- Include call-to-action
- Add 3-5 relevant hashtags
Return only the post text.`,
      parameters: {
        max_new_tokens: 200,
        temperature: 0.8,
      },
    }),
  });

  if (!hfRes.ok) {
    const error = await hfRes.text();
    throw new Error(`Hugging Face API error: ${error}`);
  }

  const hfData = await hfRes.json();
  let content = "";
  
  // Handle different response formats from HF
  if (Array.isArray(hfData)) {
    content = hfData[0]?.generated_text || hfData[0]?.text || String(hfData[0]);
  } else if (hfData.generated_text) {
    content = hfData.generated_text;
  } else if (hfData.text) {
    content = hfData.text;
  } else {
    content = JSON.stringify(hfData);
  }

  // Clean up the content if it has extra characters
  content = content.trim();

  // Save post to database
  const client = new Client(dbUrl);
  await client.connect();

  try {
    const result = await client.queryObject(
      "INSERT INTO posts (trend_id, content, created_at) VALUES ($1, $2, NOW()) RETURNING *",
      [trendId, content]
    );
    return result.rows[0];
  } finally {
    await client.end();
  }
}


