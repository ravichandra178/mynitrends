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
  const hfTextModel = (Deno.env.get("HF_TEXT_MODEL") || "distilgpt2").trim();
  const hfTextRes = await fetch(`https://router.huggingface.co/hf-inference/models/${hfTextModel}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${hfApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: `Write ONLY a professional Facebook post about "${topic}". 
Keep it 150-200 characters. 
No hashtags. 
No explanations.
Just the post text.`,
      parameters: {
        max_new_tokens: 100,
        temperature: 0.7,
        do_sample: true,
      },
    }),
  });

  if (!hfTextRes.ok) {
    let errorMessage = `Hugging Face text generation error: HTTP ${hfTextRes.status}`;
    let isTokenExpired = false;
    
    try {
      const errorData = await hfTextRes.json();
      const errorText = errorData.error || `HTTP ${hfTextRes.status}`;
      errorMessage = `Hugging Face text generation error: ${errorText}`;
      
      // Check for token expiration indicators
      if (errorData.error && (
        errorData.error.toLowerCase().includes('token') && 
        (errorData.error.toLowerCase().includes('expired') || 
         errorData.error.toLowerCase().includes('invalid') ||
         errorData.error.toLowerCase().includes('unauthorized'))
      )) {
        isTokenExpired = true;
        console.error(`[HF TOKEN EXPIRED] Hugging Face API token appears to be expired or invalid during post generation: ${errorData.error}`);
      }
    } catch (e) {
      const errorText = await hfTextRes.text();
      errorMessage = `Hugging Face text generation error: ${errorText}`;
    }
    
    if (isTokenExpired) {
      errorMessage += ". Please check your HUGGINGFACE_API_KEY environment variable.";
    }
    
    throw new Error(errorMessage);
  }

  const hfTextData = await hfTextRes.json();
  let postText = "";

  // Handle different response formats
  if (Array.isArray(hfTextData) && hfTextData[0]?.generated_text) {
    postText = hfTextData[0].generated_text.replace(`Write ONLY a professional Facebook post about "${topic}". 
Keep it 150-200 characters. 
No hashtags. 
No explanations.
Just the post text.`, "").trim();
  } else if (hfTextData.generated_text) {
    postText = hfTextData.generated_text.trim();
  } else {
    // Fallback for unexpected format
    postText = `Check out our latest insights on ${topic}! 🚀 Stay tuned for more updates.`;
  }

  // Fallback if no content
  if (!postText || postText.length === 0) {
    postText = `Check out our latest insights on ${topic}! 🚀 Stay tuned for more updates.`;
  }

  // Generate image using working free tier models
  let imageUrl = null;
  const primaryModel = (Deno.env.get("HF_MODEL") || "runwayml/stable-diffusion-v1-5").trim();
  const imageModels = [
    primaryModel,
    "runwayml/stable-diffusion-v1-5",
    "stabilityai/stable-diffusion-xl-base-1.0",
    "CompVis/stable-diffusion-v1-4",
  ];
  
  console.log(`[IMAGE] Starting image generation for topic: "${topic}"`);
  
  for (const model of imageModels) {
    try {
      console.log(`[IMAGE] Trying model: ${model}`);
      const imagePrompt = `Professional social media image for "${topic}". Modern, engaging, trendy design. High quality, clean background.`;
      
      const hfImageRes = await fetch(
        `https://api-inference.huggingface.co/models/${model}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${hfApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: imagePrompt,
            options: {
              wait_for_model: true,
              use_cache: false,
            },
          }),
          signal: AbortSignal.timeout(60000) // Increased timeout
        }
      );

      if (hfImageRes.ok) {
        const contentType = hfImageRes.headers.get("content-type");
        if (contentType && contentType.startsWith("image/")) {
          const imageBuffer = await hfImageRes.arrayBuffer();
          const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
          imageUrl = `data:${contentType};base64,${base64Image}`;
          console.log(`[IMAGE] ✅ Success with ${model} (${imageBuffer.byteLength} bytes)`);
          break;
        } else {
          console.log(`[IMAGE] ❌ Unexpected content type: ${contentType}`);
        }
      } else {
        const errorText = await hfImageRes.text();
        console.log(`[IMAGE] ❌ ${hfImageRes.status} from ${model}: ${errorText.substring(0, 100)}`);
      }
    } catch (e) {
      console.error(`[IMAGE] Error with ${model}:`, e);
    }
  }
  
  if (!imageUrl) {
    console.log("[IMAGE] ⚠️ No image generated, continuing without it");
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

