import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

export async function generateTrends(dbUrl: string, groqApiKey: string): Promise<any[]> {
  if (!groqApiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  // Call GROQ API with configurable model
  const groqModel = Deno.env.get("GROQ_MODEL") || "qwen/qwen3-32b";
  
  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: groqModel,
      messages: [
        {
          role: "user",
          content: `List exactly 5 current social media trending topics. Return ONLY the topics as a simple comma-separated list.
Example: AI tools, Short videos, Community building, Authenticity, Interactive content`
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
    }),
  });

  if (!groqRes.ok) {
    const error = await groqRes.text();
    throw new Error(`GROQ API error: ${error}`);
  }

  const groqData = await groqRes.json();
  const response = groqData.choices[0].message.content.trim();
  
  // Parse simple comma-separated list
  const topicList = response
    .split(',')
    .map((t: string) => t.trim())
    .filter((t: string) => t.length > 0)
    .slice(0, 5);

  // Create trend objects from the list
  const trends = topicList.map((topic: string) => ({
    topic: topic,
    source: "social_media"
  }));

  // Fallback if we didn't get enough topics
  if (trends.length < 5) {
    console.log("Using fallback trends array");
    const fallbackTrends = [
      { topic: "AI Content Tools", source: "TikTok" },
      { topic: "Short Form Video", source: "YouTube Shorts" },
      { topic: "Community Building", source: "Instagram" },
      { topic: "Authenticity & Transparency", source: "Twitter/X" },
      { topic: "Interactive Storytelling", source: "TikTok" }
    ];
    trends.push(...fallbackTrends.slice(trends.length));
  }

  // Save trends to database
  const client = new Client(dbUrl);
  await client.connect();
  
  const savedTrends = [];
  
  try {
    for (const trend of trends) {
      const result = await client.queryObject(
        "INSERT INTO trends (topic, source, used, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *",
        [trend.topic, trend.source, false]
      );
      savedTrends.push(result.rows[0]);
    }
  } finally {
    await client.end();
  }

  return savedTrends;
}
