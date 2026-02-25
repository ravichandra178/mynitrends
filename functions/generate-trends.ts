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
          role: "user",
          content: `Return ONLY a JSON array with exactly 5 social media trends. No markdown, no thinking, no explanation. Just valid JSON.

[
  {"topic": "AI Content Tools", "source": "TikTok"},
  {"topic": "Short Form Video", "source": "YouTube Shorts"},
  {"topic": "Community Building", "source": "Instagram"},
  {"topic": "Authenticity & Transparency", "source": "Twitter/X"},
  {"topic": "Interactive Storytelling", "source": "TikTok"}
]`
        }
      ],
      max_tokens: 400,
      temperature: 0.3,
    }),
  });

  if (!groqRes.ok) {
    const error = await groqRes.text();
    throw new Error(`GROQ API error: ${error}`);
  }

  const groqData = await groqRes.json();
  const response = groqData.choices[0].message.content;
  
  // Parse JSON response
  let trends: any[] = [];
  
  try {
    // First try direct JSON parse
    trends = JSON.parse(response);
    if (!Array.isArray(trends)) {
      throw new Error("Response is not an array");
    }
  } catch (e) {
    console.error("Primary JSON parse failed, attempting to extract JSON...");
    
    // Try to extract JSON array from response (removes thinking text, etc.)
    const startIdx = response.indexOf('[');
    const endIdx = response.lastIndexOf(']');
    
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const jsonStr = response.substring(startIdx, endIdx + 1);
      try {
        trends = JSON.parse(jsonStr);
        if (!Array.isArray(trends)) {
          throw new Error("Extracted response is not an array");
        }
        console.log("Successfully extracted JSON from response");
      } catch (e2) {
        console.error("Failed to parse extracted JSON:", e2);
        console.log("Using fallback trends array");
        trends = [
          { topic: "AI Content Tools", source: "TikTok" },
          { topic: "Short Form Video", source: "YouTube Shorts" },
          { topic: "Community Building", source: "Instagram" },
          { topic: "Authenticity & Transparency", source: "Twitter/X" },
          { topic: "Interactive Storytelling", source: "TikTok" }
        ];
      }
    } else {
      console.error("No JSON array markers found in response");
      console.log("Using fallback trends array");
      trends = [
        { topic: "AI Content Tools", source: "TikTok" },
        { topic: "Short Form Video", source: "YouTube Shorts" },
        { topic: "Community Building", source: "Instagram" },
        { topic: "Authenticity & Transparency", source: "Twitter/X" },
        { topic: "Interactive Storytelling", source: "TikTok" }
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
