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
          content: `List exactly 5 current social media hashtags that are trending right now. Return ONLY the hashtags as a comma-separated list. Start each with #.

Example format: #ShortFormVideo,#AITools,#ContentCreators,#CommunityBuilding,#AuthenticContent`
        }
      ],
      max_tokens: 100,
      temperature: 0.3,
    }),
  });

  if (!groqRes.ok) {
    const error = await groqRes.text();
    throw new Error(`GROQ API error: ${error}`);
  }

  const groqData = await groqRes.json();
  const response = groqData.choices[0].message.content.trim();
  
  // Parse hashtag list - extract everything between # symbols
  const hashtagMatches = response.match(/#[\w]+/g) || [];
  
  // Create trend objects from hashtags
  const trends = hashtagMatches
    .slice(0, 5)
    .map((hashtag: string) => ({
      topic: hashtag.replace('#', ''), // Remove # for storage
      source: "hashtag"
    }));

  // Fallback if we didn't get enough topics
  if (trends.length < 5) {
    console.log("Using fallback trends array");
    const fallbackTrends = [
      { topic: "ShortFormVideo", source: "hashtag" },
      { topic: "AITools", source: "hashtag" },
      { topic: "ContentCreators", source: "hashtag" },
      { topic: "CommunityBuilding", source: "hashtag" },
      { topic: "AuthenticContent", source: "hashtag" }
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
