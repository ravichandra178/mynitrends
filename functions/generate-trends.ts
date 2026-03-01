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

// Helper: fetch N trends from GROQ
async function fetchTrendsFromGROQ(groqApiKey: string, groqModel: string, count: number, prompt: string): Promise<any[]> {
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
          { role: "user", content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.4,
      }),
      signal: AbortSignal.timeout(10000)
    });

    console.log(`[TRENDS] 📡 GROQ API Response Status: ${groqRes.status} ${groqRes.statusText}`);

    if (groqRes.ok) {
      const groqData = await groqRes.json();
      const content = groqData.choices[0].message.content.trim();
      console.log(`[TRENDS] 📝 GROQ Raw Response (${content.length} chars):`, content);
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`[TRENDS] ✅ GROQ: Parsed ${parsed.length} trends, taking ${count}`);
        return parsed.slice(0, count);
      }
    } else {
      const error = await groqRes.text();
      console.error(`[TRENDS] ❌ GROQ API Error (${groqRes.status}):`, error.substring(0, 200));
    }
  } catch (e) {
    console.error(`[TRENDS] ❌ GROQ Request failed:`, e);
  }
  return [];
}

// Helper: fetch N trends from Hugging Face
async function fetchTrendsFromHF(hfApiKey: string, hfTextModel: string, count: number, prompt: string): Promise<any[]> {
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
          { role: "user", content: prompt }
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
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`[TRENDS] ✅ HF: Parsed ${parsed.length} trends, taking ${count}`);
        return parsed.slice(0, count);
      }
    } else {
      const error = await hfRes.text();
      console.error(`[TRENDS] ❌ HF API Error (${hfRes.status}):`, error.substring(0, 200));
    }
  } catch (e) {
    console.error(`[TRENDS] ❌ HF Request failed:`, e);
  }
  return [];
}

export async function generateTrends(dbUrl: string, groqApiKey: string, hfApiKey?: string): Promise<any> {
  const groqModel = (Deno.env.get("GROQ_MODEL") || "llama-3.1-8b-instant").trim();
  const hfTextModel = (Deno.env.get("HF_TEXT_MODEL") || "mistralai/Mistral-7B-Instruct-v0.2").trim();

  let trendsData: any[] = [];
  let appliedMethod = "";
  let usedModel = "";

  console.log("[TRENDS] 🚀 Starting trends generation process");
  console.log(`[TRENDS] 📋 Available APIs - GROQ: ${groqApiKey ? '✅' : '❌'}, HF: ${hfApiKey ? '✅' : '❌'}`);
  console.log(`[TRENDS] 🔧 Configured models - GROQ: ${groqModel}, HF: ${hfTextModel}`);

  // ===== HYBRID MODE: Try to get 2 GROQ + 2 HF + 1 RSS =====
  if (groqApiKey && hfApiKey) {
    console.log(`[TRENDS] 🌟 HYBRID MODE: Both GROQ & HF available, attempting 2+2+1 mix`);

    const groqPrompt = `Generate 2 top social media trends relevant for India in 2026.
Sources can be: Facebook, Instagram, YouTube, X, LinkedIn.
Engagement score must be between 80 and 100 (top trends only).
Return ONLY valid JSON array, nothing else.`;

    const hfPrompt = `Generate 2 social media trends relevant for India in 2026.
Sources can be: Facebook, Instagram, YouTube, X, LinkedIn.
Engagement score must be between 60 and 90.
Return ONLY valid JSON array, nothing else.`;

    // Fetch from all 3 sources in parallel
    const [groqTrends, hfTrends, rssTrends] = await Promise.all([
      fetchTrendsFromGROQ(groqApiKey, groqModel, 2, groqPrompt),
      fetchTrendsFromHF(hfApiKey, hfTextModel, 2, hfPrompt),
      fetchTrendsFromRSS()
    ]);

    console.log(`[TRENDS] 📊 Hybrid results - GROQ: ${groqTrends.length}, HF: ${hfTrends.length}, RSS: ${rssTrends.length}`);

    // Hybrid succeeds only if ALL 3 sources returned results
    if (groqTrends.length >= 2 && hfTrends.length >= 2 && rssTrends.length >= 1) {
      trendsData = [
        ...groqTrends.slice(0, 2),
        ...hfTrends.slice(0, 2),
        ...rssTrends.slice(0, 1)
      ];
      appliedMethod = "Hybrid (GROQ+HF+RSS)";
      usedModel = `${groqModel} + ${hfTextModel} + RSS`;
      console.log(`[TRENDS] ✅ HYBRID SUCCESS: 2 GROQ + 2 HF + 1 RSS = ${trendsData.length} trends`);
      console.log(`[TRENDS] 📋 Hybrid Trends:`, trendsData.map(t => `"${t.trend}" (${t.source})`).join(", "));
    } else {
      console.log(`[TRENDS] ⚠️ HYBRID INCOMPLETE: Not all 3 sources returned enough results, falling back...`);
    }
  } else {
    console.log(`[TRENDS] ⏭️ Skipping Hybrid: Need both GROQ & HF keys`);
  }

  // ===== FALLBACK 1: GROQ only (5 trends) =====
  if (trendsData.length === 0 && groqApiKey) {
    console.log(`[TRENDS] 🔵 FALLBACK 1: Trying GROQ API with model: ${groqModel}`);
    usedModel = groqModel;

    const prompt = `Generate 5 latest social media trends relevant for India in 2026.
Sources can be: Facebook, Instagram, YouTube, X, LinkedIn.
Engagement score must be between 1 and 100.
Return ONLY valid JSON array, nothing else.`;

    trendsData = await fetchTrendsFromGROQ(groqApiKey, groqModel, 5, prompt);
    if (trendsData.length > 0) {
      appliedMethod = "GROQ";
      console.log(`[TRENDS] ✅ GROQ FALLBACK SUCCESS: ${trendsData.length} trends`);
    } else {
      console.log(`[TRENDS] ❌ GROQ FALLBACK FAILED`);
    }
  }

  // ===== FALLBACK 2: HF only (5 trends) =====
  if (trendsData.length === 0 && hfApiKey) {
    console.log(`[TRENDS] 🟠 FALLBACK 2: Trying Hugging Face API with model: ${hfTextModel}`);
    usedModel = hfTextModel;

    const prompt = `Generate 5 latest social media trends relevant for India in 2026.
Sources can be: Facebook, Instagram, YouTube, X, LinkedIn.
Engagement score must be between 1 and 100.
Return ONLY valid JSON array, nothing else.`;

    trendsData = await fetchTrendsFromHF(hfApiKey, hfTextModel, 5, prompt);
    if (trendsData.length > 0) {
      appliedMethod = "HF";
      console.log(`[TRENDS] ✅ HF FALLBACK SUCCESS: ${trendsData.length} trends`);
    } else {
      console.log(`[TRENDS] ❌ HF FALLBACK FAILED`);
    }
  }

  // ===== FALLBACK 3: RSS only =====
  if (trendsData.length === 0) {
    console.log(`[TRENDS] 🔴 FALLBACK 3: Using RSS/Google Trends feed`);
    usedModel = "Google Trends RSS";

    trendsData = await fetchTrendsFromRSS();
    if (trendsData.length > 0) {
      appliedMethod = "RSS";
      console.log(`[TRENDS] ✅ RSS FALLBACK SUCCESS: ${trendsData.length} trends`);
    } else {
      console.log(`[TRENDS] ❌ ALL METHODS FAILED`);
      throw new Error("Failed to fetch trends from all sources (Hybrid, GROQ, HF, RSS)");
    }
  }

  // Save trends to database
  const client = new Client(dbUrl);
  await client.connect();

  const savedTrends = [];

  console.log(`[TRENDS] 💾 Saving ${trendsData.length} trends to database...`);
  console.log(`[TRENDS] 📋 Final Results Summary:`);
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

  return {
    trends: savedTrends,
    source: appliedMethod,
    model: usedModel,
    count: savedTrends.length,
    timestamp: new Date().toISOString()
  };
}
