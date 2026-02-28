import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

async function fetchTrendsFromRSS(): Promise<any[]> {
  try {
    console.log("[TRENDS] 🌐 RSS: Fetching from Google Trends RSS feed (geo=IN)...");
    const res = await fetch("https://trends.google.com/trending/rss?geo=IN", {
      signal: AbortSignal.timeout(5000)
    });

    console.log(`[TRENDS] 📡 RSS API Response Status: ${res.status} ${res.statusText}`);

    if (res.ok) {
      const xml = await res.text();
      console.log(`[TRENDS] 📄 RSS Raw XML Response (${xml.length} chars):`, xml.substring(0, 300));

      // Extract titles from RSS <title> tags
      const titleMatches = xml.match(/<title>([^<]+)<\/title>/g) || [];
      console.log(`[TRENDS] 🔍 RSS Found ${titleMatches.length} title tags in XML`);

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

      console.log(`[TRENDS] 📊 RSS Processed ${trends.length} trends from XML titles`);
      if (trends.length > 0) {
        console.log(`[TRENDS] ✅ RSS SUCCESS: Generated ${trends.length} trends`);
        console.log(`[TRENDS] 📋 RSS Trends:`, trends.map(t => `"${t.trend}"`).join(", "));
        return trends;
      } else {
        console.log(`[TRENDS] ⚠️ RSS WARNING: No valid trends extracted from XML`);
      }
    } else {
      console.log(`[TRENDS] ❌ RSS API Error: ${res.status} ${res.statusText}`);
    }
  } catch (e) {
    console.error(`[TRENDS] ❌ RSS Request failed:`, e);
  }
  return [];
}

export async function generateTrends(dbUrl: string, groqApiKey: string, hfApiKey?: string): Promise<any[]> {
  const groqModel = (Deno.env.get("GROQ_MODEL") || "qwen-3-32b").trim();
  const hfTextModel = (Deno.env.get("HF_TEXT_MODEL") || "mistralai/Mistral-7B-Instruct-v0.2").trim();

  let trendsData: any[] = [];
  let appliedMethod = "";
  let usedModel = "";

  console.log("[TRENDS] 🚀 Starting trends generation process");
  console.log(`[TRENDS] 📋 Available APIs - GROQ: ${groqApiKey ? '✅' : '❌'}, HF: ${hfApiKey ? '✅' : '❌'}`);
  console.log(`[TRENDS] 🔧 Configured models - GROQ: ${groqModel}, HF: ${hfTextModel}`);

  // Try GROQ first (primary AI method)
  if (groqApiKey) {
    console.log(`[TRENDS] 🔵 PRIMARY: Trying GROQ API with model: ${groqModel}`);
    usedModel = groqModel;

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

      console.log(`[TRENDS] 📡 GROQ API Response Status: ${groqRes.status} ${groqRes.statusText}`);

      if (groqRes.ok) {
        const groqData = await groqRes.json();
        const content = groqData.choices[0].message.content.trim();
        console.log(`[TRENDS] 📝 GROQ Raw Response (${content.length} chars):`, content);

        try {
          // Try to parse JSON from response
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            trendsData = JSON.parse(jsonMatch[0]);
            appliedMethod = "GROQ";
            console.log(`[TRENDS] ✅ GROQ SUCCESS: Parsed ${trendsData.length} trends`);
            console.log(`[TRENDS] 📊 GROQ Generated Trends:`, trendsData.map(t => `"${t.trend}" (${t.source})`).join(", "));
          } else {
            console.log(`[TRENDS] ❌ GROQ JSON parse failed: No JSON array found in response`);
          }
        } catch (e) {
          console.error(`[TRENDS] ❌ GROQ JSON parse failed:`, e);
          console.log(`[TRENDS] 🔍 Failed content preview:`, content.substring(0, 200));
        }
      } else {
        const error = await groqRes.text();
        console.error(`[TRENDS] ❌ GROQ API Error (${groqRes.status}):`, error.substring(0, 200));
      }
    } catch (e) {
      console.error(`[TRENDS] ❌ GROQ Request failed:`, e);
    }
  } else {
    console.log(`[TRENDS] ⏭️ Skipping GROQ: No API key configured`);
  }
  
  // Try HF as first fallback if GROQ failed
  if (trendsData.length === 0 && hfApiKey) {
    console.log(`[TRENDS] 🟠 FALLBACK 1: Trying Hugging Face API with model: ${hfTextModel}`);
    usedModel = hfTextModel;

    try {
      const hfRes = await fetch("https://router.huggingface.co/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: hfTextModel,
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

      console.log(`[TRENDS] 📡 HF API Response Status: ${hfRes.status} ${hfRes.statusText}`);

      if (hfRes.ok) {
        const hfData = await hfRes.json();
        const content = hfData.choices[0].message.content.trim();
        console.log(`[TRENDS] 📝 HF Raw Response (${content.length} chars):`, content);

        try {
          // Try to parse JSON from response
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            trendsData = JSON.parse(jsonMatch[0]);
            appliedMethod = "HF";
            console.log(`[TRENDS] ✅ HF SUCCESS: Parsed ${trendsData.length} trends`);
            console.log(`[TRENDS] 📊 HF Generated Trends:`, trendsData.map(t => `"${t.trend}" (${t.source})`).join(", "));
          } else {
            console.log(`[TRENDS] ❌ HF JSON parse failed: No JSON array found in response`);
          }
        } catch (e) {
          console.error(`[TRENDS] ❌ HF JSON parse failed:`, e);
          console.log(`[TRENDS] 🔍 Failed content preview:`, content.substring(0, 200));
        }
      } else {
        const error = await hfRes.text();
        console.error(`[TRENDS] ❌ HF API Error (${hfRes.status}):`, error.substring(0, 200));
      }
    } catch (e) {
      console.error(`[TRENDS] ❌ HF Request failed:`, e);
    }
  } else if (trendsData.length > 0) {
    console.log(`[TRENDS] ⏭️ Skipping HF: Previous method (${appliedMethod}) succeeded`);
  } else {
    console.log(`[TRENDS] ⏭️ Skipping HF: No API key configured`);
  }
  
  // Fall back to RSS/Google Trends if AI fails
  if (trendsData.length === 0) {
    console.log(`[TRENDS] 🔴 FALLBACK 2: Using RSS/Google Trends feed (no AI methods succeeded)`);
    usedModel = "Google Trends RSS";

    trendsData = await fetchTrendsFromRSS();
    if (trendsData.length > 0) {
      appliedMethod = "RSS";
      console.log(`[TRENDS] ✅ RSS SUCCESS: Fetched ${trendsData.length} trends from Google Trends`);
      console.log(`[TRENDS] 📊 RSS Generated Trends:`, trendsData.map(t => `"${t.trend}" (${t.source})`).join(", "));
    } else {
      console.log(`[TRENDS] ❌ RSS FAILED: No trends fetched from Google Trends feed`);
      throw new Error("Failed to fetch trends from all sources (GROQ, HF, RSS)");
    }
  } else {
    console.log(`[TRENDS] ⏭️ Skipping RSS: AI method (${appliedMethod}) succeeded`);
  }
  
  // Save trends to database
  const client = new Client(dbUrl);
  await client.connect();
  
  const savedTrends = [];
  
  console.log(`[TRENDS] 💾 Saving ${trendsData.length} trends to database...`);
  console.log(`[TRENDS] � Final Results Summary:`);
  console.log(`[TRENDS]   • Method Used: ${appliedMethod}`);
  console.log(`[TRENDS]   • Model/API: ${usedModel}`);
  console.log(`[TRENDS]   • Trends Generated: ${trendsData.length}`);
  console.log(`[TRENDS]   • Database: Connected and ready`);

  try {
    for (const trendItem of trendsData) {
      const topic = trendItem.trend || trendItem.topic;
      const result = await client.queryObject(
        "INSERT INTO trends (topic, source, used, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *",
        [topic, appliedMethod, false]
      );
      savedTrends.push(result.rows[0]);
      console.log(`[TRENDS]   ✅ Saved: "${topic}" (source: ${appliedMethod})`);
    }
    console.log(`[TRENDS] 🎉 SUCCESS: All ${savedTrends.length} trends saved to database`);
    console.log(`[TRENDS] 📈 Generation Summary: ${appliedMethod} (${usedModel}) → ${savedTrends.length} trends`);
  } finally {
    await client.end();
  }

  return savedTrends;
}
