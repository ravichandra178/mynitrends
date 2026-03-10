import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

export async function generatePost(
  dbUrl: string,
  groqApiKey: string,
  hfApiKey: string,
  trendId: string,
  topic: string
): Promise<any> {
  if (!groqApiKey && !hfApiKey) {
    throw new Error("GROQ_API_KEY or HUGGINGFACE_API_KEY not configured");
  }

  const groqModel = (Deno.env.get("GROQ_MODEL") || Deno.env.get("GROK_MODEL") || "llama-3.1-8b-instant").trim();
  const hfModel = (Deno.env.get("HF_MODEL") || "stabilityai/stable-diffusion-xl-base-1.0").trim();
  const hfTextModel = (Deno.env.get("HF_TEXT_MODEL") || "Qwen/Qwen2.5-7B-Instruct").trim();

  // Generate post text using GROQ API (primary) or Hugging Face (fallback)
  // Equivalent to: curl https://api.groq.com/openai/v1/chat/completions \
  //   -H "Authorization: Bearer $GROQ_API_KEY" \
  //   -H "Content-Type: application/json" \
  //   -d '{"model": "llama-3.1-8b-instant", "messages": [{"role": "user", "content": "..."}], "max_tokens": 100, "temperature": 0.7}'
  let postText = null;
  let usedApi = "";

  // Try GROQ first
  if (groqApiKey) {
    console.log(`[TEXT] 🔵 PRIMARY: Using GROQ API with model: ${groqModel}`);
    usedApi = "GROQ";
    
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
        signal: AbortSignal.timeout(10000)
      });

      if (groqRes.ok) {
        const groqData = await groqRes.json();
        postText = groqData.choices?.[0]?.message?.content?.trim();
        console.log(`[TEXT] ✅ GROQ Success: Generated post (${postText?.length || 0} chars)`);
      } else {
        let errorMessage = `GROQ API error: HTTP ${groqRes.status}`;
        
        try {
          const errorData = await groqRes.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = groqRes.statusText || errorMessage;
        }
        
        console.log(`[TEXT] ❌ GROQ ${groqRes.status}: ${errorMessage}`);
      }
    } catch (e) {
      console.error(`[TEXT] Error with GROQ:`, e);
    }
  }

  // Fallback to Hugging Face if GROQ failed
  if (!postText && hfApiKey) {
    console.log(`[TEXT] 🟠 FALLBACK: Using Hugging Face API with model: ${hfTextModel}`);
    usedApi = "Hugging Face";
    
    try {
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
          const errorText = await hfTextRes.text();  // Read body once
          
          // Try to parse as JSON if possible
          try {
            const errorData = JSON.parse(errorText);
            const apiError = errorData.error || errorText;
            errorMessage = `Hugging Face text generation error: ${apiError}`;
            
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
          } catch (parseError) {
            // If not JSON, use the raw text
            errorMessage = `Hugging Face text generation error: ${errorText}`;
          }
        } catch (e) {
          errorMessage = `Hugging Face text generation error: Failed to read response`;
        }
        
        if (isTokenExpired) {
          errorMessage += ". Please check your HUGGINGFACE_API_KEY environment variable.";
        }
        
        throw new Error(errorMessage);
      }

      const hfTextData = await hfTextRes.json();
      postText = hfTextData.choices?.[0]?.message?.content?.trim();
      console.log(`[TEXT] ✅ HF Success: Generated post (${postText?.length || 0} chars)`);
    } catch (e) {
      console.error(`[TEXT] Error with HF fallback:`, e);
      throw e; // Re-throw since this is our last option
    }
  }

  // Fallback if no content
  if (!postText || postText.length === 0) {
    postText = `Check out our latest insights on ${topic}! 🚀 Stay tuned for more updates.`;
    console.log(`[TEXT] ⚠️ Using fallback text: "${postText}"`);
  }

  // Generate image using Hugging Face Image Generation API
  let imageUrl = null;
  const primaryModel = (Deno.env.get("HF_MODEL") || "stabilityai/stable-diffusion-xl-base-1.0").trim();
  
  console.log(`[IMAGE] Starting image generation for topic: "${topic}"`);
  
  if (hfApiKey) {
    // Default image prompt using the user's preferred template
    let imagePrompt = `Create a social media poster about: ${postText}, modern design, vibrant colors, trending topic, 4k, cinematic lighting`;
    
    // Try to get a better image prompt from GROQ
    if (groqApiKey) {
      try {
        console.log(`[IMAGE] Generating optimized image prompt from GROQ...`);
        const promptRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
                content: `Generate a short image prompt (max 50 words) for an AI image generator.
The image should be a social media poster for this post:
"${postText}"
Topic: ${topic}
Follow this format strictly:
"Create a social media poster about: [topic summary], modern design, vibrant colors, trending topic, 4k, cinematic lighting"
Return ONLY the prompt, nothing else.`
              }
            ],
            max_tokens: 80,
            temperature: 0.6,
          }),
          signal: AbortSignal.timeout(8000)
        });

        if (promptRes.ok) {
          const promptData = await promptRes.json();
          const aiPrompt = promptData.choices?.[0]?.message?.content?.trim();
          if (aiPrompt && aiPrompt.length > 10) {
            imagePrompt = aiPrompt;
            console.log(`[IMAGE] ✅ AI-generated prompt: "${imagePrompt}"`);
          }
        }
      } catch (e) {
        console.log(`[IMAGE] ⚠️ Prompt generation failed, using default prompt`);
      }
    }

    // Ensure imagePrompt is valid
    if (!imagePrompt || imagePrompt.length === 0) {
      // Simplified fallback: Use a hardcoded default prompt without external dependencies
      imagePrompt = `Create a social media poster about: ${topic}, featuring a professional design, vibrant colors, and a modern aesthetic.`;
      console.log(`[IMAGE] ⚠️ Using simplified fallback image prompt: "${imagePrompt}"`);
    }

    try {
      console.log(`[IMAGE] Using model: ${primaryModel}`);
      console.log(`[IMAGE] Prompt: "${imagePrompt}"`);
      
      const hfImageRes = await fetch(
        `https://router.huggingface.co/hf-inference/models/${primaryModel}`,
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
          signal: AbortSignal.timeout(60000)
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
          const body = await hfImageRes.text();
          console.log(`[IMAGE] Response body: ${body.substring(0, 200)}`);
        }
      } else {
        let errorMessage = `Image generation error: HTTP ${hfImageRes.status}`;
        
        try {
          const errorData = await hfImageRes.json();
          errorMessage = errorData.error || JSON.stringify(errorData);
        } catch (e) {
          try {
            errorMessage = await hfImageRes.text();
          } catch (_) {}
        }
        
        console.log(`[IMAGE] ❌ ${hfImageRes.status} from ${primaryModel}: ${errorMessage}`);

        // Try fallback model if primary fails
        if (primaryModel !== "stabilityai/stable-diffusion-xl-base-1.0") {
          console.log(`[IMAGE] 🔄 Trying fallback model: stabilityai/stable-diffusion-xl-base-1.0`);
          try {
            const fallbackRes = await fetch(
              `https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0`,
              {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${hfApiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  inputs: imagePrompt,
                  options: { use_cache: false },
                }),
                signal: AbortSignal.timeout(60000)
              }
            );

            if (fallbackRes.ok) {
              const ct = fallbackRes.headers.get("content-type");
              if (ct && ct.startsWith("image/")) {
                const buf = await fallbackRes.arrayBuffer();
                const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
                imageUrl = `data:${ct};base64,${b64}`;
                console.log(`[IMAGE] ✅ Fallback success (${buf.byteLength} bytes)`);
              }
            } else {
              console.log(`[IMAGE] ❌ Fallback also failed: ${fallbackRes.status}`);
            }
          } catch (e) {
            console.error(`[IMAGE] ❌ Fallback error:`, e);
          }
        }
      }
    } catch (e) {
      console.error(`[IMAGE] Error with ${primaryModel}:`, e);
    }
  } else {
    console.log("[IMAGE] ⏭️ Skipping image generation: No HF API key");
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

