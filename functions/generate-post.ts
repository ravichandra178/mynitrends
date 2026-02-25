import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

export async function generatePost(
  dbUrl: string,
  hfApiKey: string,
  trendId: string,
  topic: string
): Promise<any> {
  if (!hfApiKey) {
    throw new Error("HUGGINGFACE_API_KEY not configured");
  }

  const hfModel = (Deno.env.get("HF_MODEL") || "deepgenteam/DeepGen-1.0").trim();

  // Generate post text using Hugging Face
  const hfTextModel = (Deno.env.get("HF_TEXT_MODEL") || "mistralai/Mistral-7B-Instruct-v0.2").trim();
  const hfTextRes = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${hfApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: hfTextModel,
      messages: [
        {
          role: "user",
          content: `Write ONLY a professional Facebook post about "${topic}". 
Keep it 150-200 characters. 
No hashtags. 
No explanations.
Just the post text.`
        }
      ],
      max_tokens: 100,
      temperature: 0.7,
    }),
  });

  if (!hfTextRes.ok) {
    const error = await hfTextRes.text();
    throw new Error(`Hugging Face text generation error: ${error}`);
  }

  const hfTextData = await hfTextRes.json();
  let postText = hfTextData.choices[0].message.content.trim();

  // Fallback if no content
  if (!postText || postText.length === 0) {
    postText = `Check out our latest insights on ${topic}! 🚀 Stay tuned for more updates.`;
  }

  // Generate image using the configured HF_MODEL (Stable Diffusion by default)
  console.log("Generating image with model:", hfModel);
  let imageUrl = null;
  
  try {
    const hfImageRes = await fetch(`https://api-inference.huggingface.co/models/${hfModel}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${hfApiKey}`,
      },
      body: JSON.stringify({
        inputs: `Professional social media image for #${topic}. Modern, engaging, trendy design. High quality.`,
      }),
    });

    if (hfImageRes.ok) {
      const imageBuffer = await hfImageRes.arrayBuffer();
      
      // Convert to base64
      const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
      imageUrl = `data:image/png;base64,${base64Image}`;
      console.log("Image generated successfully");
    } else {
      const error = await hfImageRes.text();
      console.error("Image generation failed:", error);
      console.log("Falling back - skipping image generation");
    }
  } catch (e) {
    console.error("Error generating image:", e);
  }

  // Save post with image to database
  const client = new Client(dbUrl);
  await client.connect();

  try {
    let result;
    if (imageUrl) {
      // Save with image
      result = await client.queryObject(
        `INSERT INTO posts (trend_id, content, image_url, created_at) 
         VALUES ($1, $2, $3, NOW()) RETURNING *`,
        [trendId, postText, imageUrl]
      );
    } else {
      // Save without image
      result = await client.queryObject(
        `INSERT INTO posts (trend_id, content, created_at) 
         VALUES ($1, $2, NOW()) RETURNING *`,
        [trendId, postText]
      );
    }

    return result.rows[0];
  } finally {
    await client.end();
  }
}

