import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

export async function generatePost(dbUrl: string, groqApiKey: string, trendId: string, topic: string): Promise<any> {
  if (!groqApiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  // Call GROQ API to generate post content
  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-70b-versatile", // Updated model
      messages: [
        {
          role: "system",
          content: `You are a social media copywriter. Generate compelling Facebook posts.
Rules:
- Keep under 280 characters
- Engaging and shareable
- Include a call-to-action
- Add 3-5 relevant hashtags`
        },
        {
          role: "user",
          content: `Generate a social media post about: "${topic}"`
        }
      ],
      max_tokens: 200,
      temperature: 0.8,
    }),
  });

  if (!groqRes.ok) {
    const error = await groqRes.text();
    throw new Error(`GROQ API error: ${error}`);
  }

  const groqData = await groqRes.json();
  const content = groqData.choices[0].message.content;

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
