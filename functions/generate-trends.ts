import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

async function fetchTrendsFromRSS(): Promise<string> {
  try {
    console.log("Attempting to fetch trends from RSS feed");
    const res = await fetch("https://trends.google.com/trending/rss?geo=US", {
      signal: AbortSignal.timeout(5000)
    });
    
    if (res.ok) {
      const xml = await res.text();
      // Extract titles from RSS <title> tags
      const titleMatches = xml.match(/<title>([^<]+)<\/title>/g) || [];
      const trends = titleMatches
        .slice(1, 6) // Skip first title (feed title), get next 5
        .map(t => t.replace(/<\/?title>/g, ''))
        .map(t => ({ topic: t.trim(), source: "rss" }));
      
      if (trends.length > 0) {
        console.log("Got trends from RSS:", trends);
        return JSON.stringify(trends);
      }
    }
  } catch (e) {
    console.error("RSS fetch failed:", e);
  }
  return "";
}

export async function generateTrends(dbUrl: string, groqApiKey: string, hfApiKey?: string): Promise<any[]> {
  // Call GROQ API with configurable model
  const groqModel = (Deno.env.get("GROQ_MODEL") || "qwen/qwen3-32b").trim();
  const preferHF = Deno.env.get("TRENDS_USE_HF") === "true";
  
  let response = "";
  let source = "ai";
  
  if (preferHF && hfApiKey) {
    // Use HF for trends with JSON model
    console.log("Using HF for trends generation");
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
              role: "user",
              content: `List exactly 5 current social media trending hashtags. Return ONLY as comma-separated list with # prefix.
Example: #ShortFormVideo,#AITools,#ContentCreators,#CommunityBuilding,#AuthenticContent`
            }
          ],
          max_tokens: 100,
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (hfRes.ok) {
        const hfData = await hfRes.json();
        response = hfData.choices[0].message.content.trim();
        source = "hf";
      } else {
        const error = await hfRes.text();
        console.error("HF trends error, falling back:", error);
      }
    } catch (e) {
      console.error("HF request failed:", e);
    }
  }
  
  // Fall back to GROQ if HF not available or not preferred
  if (!response && groqApiKey) {
    try {
      console.log("Using GROQ for trends generation with model:", groqModel);
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
              content: `List exactly 5 current social media trending hashtags. Return ONLY as comma-separated list with # prefix. No other text.
Example: #ShortFormVideo,#AITools,#ContentCreators,#CommunityBuilding,#AuthenticContent`
            }
          ],
          max_tokens: 100,
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (groqRes.ok) {
        const groqData = await groqRes.json();
        response = groqData.choices[0].message.content.trim();
        source = "groq";
      } else {
        const error = await groqRes.text();
        console.error("GROQ API error:", error);
      }
    } catch (e) {
      console.error("GROQ request failed:", e);
    }
  }
  
  // Fall back to RSS/Google Trends if AI fails
  if (!response) {
    const rssResponse = await fetchTrendsFromRSS();
    if (rssResponse) {
      try {
        const rssTrends = JSON.parse(rssResponse);
        if (rssTrends.length > 0) {
          // Save RSS trends to database
          const client = new Client(dbUrl);
          await client.connect();
          
          const savedTrends = [];
          try {
            for (const trend of rssTrends) {
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
      } catch (e) {
        console.error("RSS parsing error:", e);
      }
    }
  }
  
  // Parse hashtag list - extract everything between # symbols
  const hashtagMatches = response.match(/#[\w]+/g) || [];
  
  // Create trend objects from hashtags
  const trends = hashtagMatches
    .slice(0, 5)
    .map((hashtag: string) => ({
      topic: hashtag.replace('#', ''), // Remove # for storage
      source: source
    }));

  // Fallback if we didn't get enough topics
  if (trends.length < 5) {
    console.log("Using hardcoded fallback trends array");
    const fallbackTrends = [
      { topic: "ShortFormVideo", source: "fallback" },
      { topic: "AITools", source: "fallback" },
      { topic: "ContentCreators", source: "fallback" },
      { topic: "CommunityBuilding", source: "fallback" },
      { topic: "AuthenticContent", source: "fallback" }
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
