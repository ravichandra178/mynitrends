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

  // Generate post text using Hugging Face Chat Completion API
  // Equivalent to: curl https://router.huggingface.co/v1/chat/completions \
  //   -H "Authorization: Bearer $HUGGINGFACE_API_KEY" \
  //   -H "Content-Type: application/json" \
  //   -d '{"model": "Qwen/Qwen2.5-7B-Instruct", "messages": [{"role": "user", "content": "..."}], "max_tokens": 100, "temperature": 0.7}'
  const hfTextModel = (Deno.env.get("HF_TEXT_MODEL") || "Qwen/Qwen2.5-7B-Instruct").trim();
  const hfTextRes = await fetch(`https://router.huggingface.co/v1/chat/completions`, {
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
  let postText = hfTextData.choices?.[0]?.message?.content?.trim();

  // Fallback if no content
  if (!postText || postText.length === 0) {
    postText = `Check out our latest insights on ${topic}! 🚀 Stay tuned for more updates.`;
  }

  // Generate image using Hugging Face Image Generation API
  // Equivalent to: curl -X POST https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5 \
  //   -H "Authorization: Bearer $HUGGINGFACE_API_KEY" \
  //   -H "Content-Type: application/json" \
  //   -d '{"inputs": "A beautiful landscape painting of mountains at sunrise", "options": {"use_cache": false}}' > output.bin
  let imageUrl = null;
  const primaryModel = (Deno.env.get("HF_MODEL") || "runwayml/stable-diffusion-v1-5").trim();
  
  console.log(`[IMAGE] Starting image generation for topic: "${topic}"`);
  
  try {
    console.log(`[IMAGE] Using model: ${primaryModel}`);
    const imagePrompt = `A beautiful landscape painting of mountains at sunrise`;
    
    const hfImageRes = await fetch(
      `https://api-inference.huggingface.co/models/${primaryModel}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: imagePrompt,
          options: {
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
        console.log(`[IMAGE] ✅ Success with ${primaryModel} (${imageBuffer.byteLength} bytes)`);
      } else {
        console.log(`[IMAGE] ❌ Unexpected content type: ${contentType}`);
      }
    } else {
      const errorText = await hfImageRes.text();
      console.log(`[IMAGE] ❌ ${hfImageRes.status} from ${primaryModel}: ${errorText.substring(0, 100)}`);
    }
  } catch (e) {
    console.error(`[IMAGE] Error with ${primaryModel}:`, e);
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

