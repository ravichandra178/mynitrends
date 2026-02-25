import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

async function fetchTrendsFromRSS(): Promise<any[]> {
  try {
    console.log("[TRENDS] Fetching from Google Trends RSS feed...");
    const res = await fetch("https://trends.google.com/trending/rss?geo=IN", {
      signal: AbortSignal.timeout(5000)
    });
    
    if (res.ok) {
      const xml = await res.text();
      // Extract titles from RSS <title> tags
      const titleMatches = xml.match(/<title>([^<]+)<\/title>/g) || [];
      const trends = titleMatches
        .slice(1, 6) // Skip first title (feed title), get next 5
        .map(t => t.replace(/<\/?title>/g, ''))
        .filter(t => t.trim().length > 0)
        .slice(0, 5)
        .map(t => ({
          trend: t.trim(),
          source: "Google Trends RSS",
          category: "trending",
          engagement_score: 75
        }));
      
      if (trends.length > 0) {
        console.log("[TRENDS] ✅ RSS SUCCESS:", trends.length, "trends fetched");
        return trends;
      }
    }
  } catch (e) {
    console.error("[TRENDS] RSS fetch failed:", e);
  }
  return [];
}

export async function generateTrends(dbUrl: string, groqApiKey: string, hfApiKey?: string): Promise<any[]> {
  const groqModel = (Deno.env.get("GROQ_MODEL") || "qwen/qwen3-32b").trim();
  const preferHF = Deno.env.get("TRENDS_USE_HF") === "true";
  
  let trendsData: any[] = [];
  let appliedMethod = "";
  
  // Try HF first if preferred
  if (preferHF && hfApiKey) {
    console.log("[TRENDS] 🔵 Trying HF JSON model...");
    const hfModel = (Deno.env.get("HF_JSON_MODEL") || "mistralai/Mistral-7B-Instruct-v0.2").trim();
    
    try {
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
              role: "system",
              content: `You are a trends generation API.
Return ONLY valid JSON.
Do NOT include explanations, markdown, or backticks.
Output must be a valid JSON array.
Each item must follow this exact format:
{
  "trend": "string",
  "source": "string",
  "category": "string",
  "engagement_score": number
}
If output is not valid JSON, regenerate until valid.`
            },
            {
              role: "user",
              content: `Generate 5 latest social media trends relevant for India in 2026.
Sources can be: Facebook, Instagram, YouTube, X, LinkedIn.
Engagement score must be between 1 and 100.
Return ONLY valid JSON array, nothing else.`
            }
          ],
          max_tokens: 500,
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (hfRes.ok) {
        const hfData = await hfRes.json();
        const content = hfData.choices[0].message.content.trim();
        console.log("[TRENDS] HF Response:", content.substring(0, 200));
        
        try {
          // Try to parse JSON from response
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            trendsData = JSON.parse(jsonMatch[0]);
            appliedMethod = "HF";
            console.log("[TRENDS] ✅ HF SUCCESS:", trendsData.length, "trends parsed");
          }
        } catch (e) {
          console.error("[TRENDS] ❌ HF JSON parse failed:", e);
        }
      } else {
        const error = await hfRes.text();
        console.error("[TRENDS] ❌ HF error:", error.substring(0, 200));
      }
    } catch (e) {
      console.error("[TRENDS] ❌ HF request failed:", e);
    }
  }
  
  // Try GROQ if HF didn't work or not preferred
  if (trendsData.length === 0 && groqApiKey) {
    console.log("[TRENDS] 🟠 Trying GROQ model:", groqModel);
    
    try {
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
              role: "system",
              content: `You are a trends generation API.
Return ONLY valid JSON.
Do NOT include explanations, markdown, or backticks.
Output must be a valid JSON array.
Each item must follow this exact format:
{
  "trend": "string",
  "source": "string",
  "category": "string",
  "engagement_score": number
}
If output is not valid JSON, regenerate until valid.`
            },
            {
              role: "user",
              content: `Generate 5 latest social media trends relevant for India in 2026.
Sources can be: Facebook, Instagram, YouTube, X, LinkedIn.
Engagement score must be between 1 and 100.
Return ONLY valid JSON array, nothing else.`
            }
          ],
          max_tokens: 500,
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (groqRes.ok) {
        const groqData = await groqRes.json();
        const content = groqData.choices[0].message.content.trim();
        console.log("[TRENDS] GROQ Response:", content.substring(0, 200));
        
        try {
          // Try to parse JSON from response
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            trendsData = JSON.parse(jsonMatch[0]);
            appliedMethod = "GROQ";
            console.log("[TRENDS] ✅ GROQ SUCCESS:", trendsData.length, "trends parsed");
          }
        } catch (e) {
          console.error("[TRENDS] ❌ GROQ JSON parse failed:", e);
        }
      } else {
        const error = await groqRes.text();
        console.error("[TRENDS] ❌ GROQ error:", error.substring(0, 200));
      }
    } catch (e) {
      console.error("[TRENDS] ❌ GROQ request failed:", e);
    }
  }
  
  // Fall back to RSS/Google Trends if AI fails
  if (trendsData.length === 0) {
    console.log("[TRENDS] 🔴 Falling back to RSS/Google Trends");
    trendsData = await fetchTrendsFromRSS();
    if (trendsData.length > 0) {
      appliedMethod = "RSS";
      console.log("[TRENDS] ✅ RSS SUCCESS:", trendsData.length, "trends fetched");
    } else {
      throw new Error("Failed to fetch trends from all sources (HF, GROQ, RSS)");
    }
  }
  
  // Save trends to database
  const client = new Client(dbUrl);
  await client.connect();
  
  const savedTrends = [];
  
  try {
    for (const trendItem of trendsData) {
      const result = await client.queryObject(
        "INSERT INTO trends (topic, source, used, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *",
        [trendItem.trend || trendItem.topic, appliedMethod, false]
      );
      savedTrends.push(result.rows[0]);
    }
    console.log(`[TRENDS] 💾 Saved ${savedTrends.length} trends to DB (method: ${appliedMethod})`);
  } finally {
    await client.end();
  }

  return savedTrends;
}
