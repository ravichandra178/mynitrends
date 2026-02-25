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
          content: `You are a social media trend analyst. Your task is to identify 5 current trending topics for social media content creators.

CRITICAL: Return ONLY a valid JSON array. Do not include any markdown, code blocks, thinking, or text outside the JSON array.

Example format:
[
  {"topic": "AI Content Tools", "source": "TikTok"},
  {"topic": "Short Form Video", "source": "YouTube Shorts"},
  {"topic": "Community Building", "source": "Instagram"},
  {"topic": "Authenticity & Transparency", "source": "Twitter/X"},
  {"topic": "Interactive Storytelling", "source": "TikTok"}
]`
        },
        {
          role: "user",
          content: "Generate ONLY a JSON array with 5 current social media trends. No thinking, no explanation, just the JSON array."
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!groqRes.ok) {
    const error = await groqRes.text();
    throw new Error(`GROQ API error: ${error}`);
  }

  const groqData = await groqRes.json();
  const response = groqData.choices[0].message.content;
  
  // Parse JSON response - must be valid JSON
  let trends: any[] = [];
  
  try {
    // First try direct JSON parse
    trends = JSON.parse(response);
    if (!Array.isArray(trends)) {
      throw new Error("Response is not an array");
    }
  } catch (e) {
    console.error("Primary JSON parse failed:", e);
    
    // Try to extract JSON array from response (in case of extra text)
    const jsonMatch = response.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (jsonMatch) {
      try {
        trends = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(trends)) {
          throw new Error("Extracted response is not an array");
        }
        console.log("Successfully extracted JSON from response");
      } catch (e2) {
        console.error("Failed to parse extracted JSON:", e2);
        console.error("Raw response:", response.substring(0, 500));
        throw new Error(`Could not parse JSON from GROQ response: ${String(e2)}`);
      }
    } else {
      console.error("No JSON array found in response. Raw response:", response.substring(0, 500));
      throw new Error("No valid JSON array found in GROQ response");
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
