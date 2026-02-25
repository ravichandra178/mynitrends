import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

export async function generateTrends(dbUrl: string, groqApiKey: string): Promise<any[]> {
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
          content: `You are a social media trend analyst. Identify current trending topics relevant to social media marketing.
Return ONLY a valid JSON array of trend objects with this exact structure:
[
  {"topic": "Trend Topic", "source": "Source Name"},
  ...
]
Do not include markdown, code blocks, or any text outside the JSON array.`
        },
        {
          role: "user",
          content: "Generate 5 current social media trends for content creators."
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
  
  // Parse JSON response - handle various formats
  let trends: any[] = [];
  
  try {
    // First try direct JSON parse
    trends = JSON.parse(response);
  } catch (_e1) {
    // Try to extract JSON array from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        trends = JSON.parse(jsonMatch[0]);
      } catch (_e2) {
        // If still failing, create default trends
        console.error("Failed to parse trends JSON:", response);
        trends = [
          { topic: "AI & Automation", source: "general" },
          { topic: "Short-form Video", source: "general" },
          { topic: "Influencer Marketing", source: "general" },
          { topic: "User-Generated Content", source: "general" },
          { topic: "Social Commerce", source: "general" }
        ];
      }
    } else {
      console.error("No JSON array found in response:", response);
      trends = [
        { topic: "AI & Automation", source: "general" },
        { topic: "Short-form Video", source: "general" },
        { topic: "Influencer Marketing", source: "general" },
        { topic: "User-Generated Content", source: "general" },
        { topic: "Social Commerce", source: "general" }
      ];
    }
  }

  // Save trends to database
  const client = new Client(dbUrl);
  await client.connect();
  
  const savedTrends = [];
  
  try {
    for (const trend of trends) {
      const result = await client.queryObject(
        "INSERT INTO trends (topic, source, used, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *",
        [trend.topic || trend, trend.source || "qwen", false]
      );
      savedTrends.push(result.rows[0]);
    }
  } finally {
    await client.end();
  }

  return savedTrends;
}
