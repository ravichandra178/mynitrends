import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

export async function generateAutoreply(dbUrl: string, groqApiKey: string, comment: string, postId: string): Promise<any> {
  if (!groqApiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  // Call GROQ API with Qwen3-32B
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
          role: "system",
          content: `You are a helpful social media community manager. Generate thoughtful, engaging autoreply responses to comments.
Rules:
- Keep replies under 150 characters
- Be friendly and professional
- Answer questions if asked
- Thank users for engagement
- Maintain brand voice
- Avoid overly promotional content`
        },
        {
          role: "user",
          content: `Generate an autoreply response to this comment: "${comment}"`
        }
      ],
      max_tokens: 150,
      temperature: 0.8,
    }),
  });

  if (!groqRes.ok) {
    const error = await groqRes.text();
    throw new Error(`GROQ API error: ${error}`);
  }

  const groqData = await groqRes.json();
  const content = groqData.choices[0].message.content;

  // Save autoreply to database (optional - depends on your schema)
  const client = new Client(dbUrl);
  await client.connect();

  try {
    // Check if table exists, otherwise just return the generated reply
    try {
      const result = await client.queryObject(
        "INSERT INTO autoreplies (post_id, comment, reply, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *",
        [postId, comment, content]
      );
      return result.rows[0];
    } catch (_e) {
      // Table might not exist, just return the generated content
      return { comment, reply: content, postId };
    }
  } finally {
    await client.end();
  }
}
