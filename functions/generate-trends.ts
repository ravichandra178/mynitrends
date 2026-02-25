import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

export async function generateTrends(dbUrl: string, groqApiKey: string): Promise<any[]> {
  if (!groqApiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  // Call GROQ API to generate trending topics
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
          role: "user",
          content: `Generate 5 trending topics for a social media content creator. Return ONLY a valid JSON array of objects with "topic" and "source" fields. Example: [{"topic": "AI trends", "source": "groq"}]`,
        }
      ],
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  if (!groqRes.ok) {
    const error = await groqRes.text();
    throw new Error(`GROQ API error: ${error}`);
  }

  const groqData = await groqRes.json();
  const response = groqData.choices[0].message.content;
  
  // Parse JSON response
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Invalid response format from GROQ");
  }
  const trends = JSON.parse(jsonMatch[0]);

  // Save trends to database
  const client = new Client(dbUrl);
  await client.connect();
  
  const savedTrends = [];
  
  try {
    for (const trend of trends) {
      const result = await client.queryObject(
        "INSERT INTO trends (topic, source, used, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *",
        [trend.topic || trend, trend.source || "groq", false]
      );
      savedTrends.push(result.rows[0]);
    }
  } finally {
    await client.end();
  }

  return savedTrends;
}
