# Code Changes Summary - Deno Deployment with GROQ & Environment Variables

## Overview
Updated the codebase to use **GROQ API** for AI features and **environment variables** for all sensitive configuration including Facebook credentials.

---

## Files Modified

### 1. `supabase/functions/generate-post/index.ts`
**Changes:**
- Replaced `LOVABLE_API_KEY` with `GROQ_API_KEY`
- Changed API endpoint from `https://ai.gateway.lovable.dev/v1/chat/completions` to `https://api.groq.com/openai/v1/chat/completions`
- Changed model from `google/gemini-3-flash-preview` to `mixtral-8x7b-32768`
- **RESTORED** image generation using Hugging Face Stable Diffusion
- Added `HUGGINGFACE_API_KEY` for AI image generation
- Images are generated with 1080x1080 resolution optimized for Facebook
- Gracefully handles image generation failures (continues without image if generation fails)

**Before:**
```typescript
const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
const contentRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  headers: { Authorization: `Bearer ${lovableApiKey}`, ... },
  body: JSON.stringify({ model: "google/gemini-3-flash-preview", ... })
});
```

**After:**
```typescript
const groqApiKey = Deno.env.get("GROQ_API_KEY")!;
const huggingFaceApiKey = Deno.env.get("HUGGINGFACE_API_KEY")!;
const contentRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  headers: { Authorization: `Bearer ${groqApiKey}`, ... },
  body: JSON.stringify({ model: "mixtral-8x7b-32768", ... })
});

// Then generate image via Hugging Face
const imageRes = await fetch("https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-3.5-large", {
  headers: { Authorization: `Bearer ${huggingFaceApiKey}`, ... },
  body: JSON.stringify({ inputs: imagePrompt, ... })
});
```

---

### 2. `supabase/functions/generate-trends/index.ts`
**Changes:**
- Replaced `LOVABLE_API_KEY` with `GROQ_API_KEY`
- Changed API endpoint to GROQ
- Changed model to `mixtral-8x7b-32768`

**Before:**
```typescript
const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  headers: { Authorization: `Bearer ${lovableApiKey}`, ... },
  body: JSON.stringify({ model: "google/gemini-3-flash-preview", ... })
});
```

**After:**
```typescript
const groqApiKey = Deno.env.get("GROQ_API_KEY")!;
const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  headers: { Authorization: `Bearer ${groqApiKey}`, ... },
  body: JSON.stringify({ model: "mixtral-8x7b-32768", ... })
});
```

---

### 3. `supabase/functions/post-to-facebook/index.ts`
**Changes:**
- Removed database lookup for Facebook credentials
- Now reads credentials from environment variables instead
- Added `FACEBOOK_PAGE_ID` and `FACEBOOK_PAGE_ACCESS_TOKEN` environment variables

**Before:**
```typescript
// Get settings from database
const { data: settings } = await supabase.from("settings").select("*").limit(1).single();
if (!settings?.facebook_page_id || !settings?.facebook_page_access_token) {
  throw new Error("Facebook credentials not configured. Go to Settings.");
}
const pageId = settings.facebook_page_id;
const accessToken = settings.facebook_page_access_token;
```

**After:**
```typescript
// Get credentials from environment variables
const facebookPageId = Deno.env.get("FACEBOOK_PAGE_ID")!;
const facebookAccessToken = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN")!;
const pageId = facebookPageId;
const accessToken = facebookAccessToken;
```

---

### 4. `supabase/functions/auto-post/index.ts`
**Changes:**
- Removed database lookup for settings
- Now reads all configuration from environment variables:
  - `FACEBOOK_PAGE_ID`
  - `FACEBOOK_PAGE_ACCESS_TOKEN`
  - `AUTO_POST_ENABLED`
  - `MAX_POSTS_PER_DAY`
- Updated all references to use environment variables instead of `settings` object

**Before:**
```typescript
const { data: settings } = await supabase.from("settings").select("*").limit(1).single();
if (!settings?.auto_post_enabled) { ... }
if (!settings.facebook_page_id || !settings.facebook_page_access_token) { ... }
const { count: postsToday } = await supabase.from("posts").select(...);
if ((postsToday ?? 0) >= settings.max_posts_per_day) { ... }
// ... later in code ...
formData.append("access_token", settings.facebook_page_access_token);
await fetch(`https://graph.facebook.com/${settings.facebook_page_id}/photos`, ...);
```

**After:**
```typescript
const facebookPageId = Deno.env.get("FACEBOOK_PAGE_ID")!;
const facebookAccessToken = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN")!;
const autoPostEnabled = Deno.env.get("AUTO_POST_ENABLED") === "true";
const maxPostsPerDay = parseInt(Deno.env.get("MAX_POSTS_PER_DAY") || "3");

if (!autoPostEnabled) { ... }
if (!facebookPageId || !facebookAccessToken) { ... }
const { count: postsToday } = await supabase.from("posts").select(...);
if ((postsToday ?? 0) >= maxPostsPerDay) { ... }
// ... later in code ...
formData.append("access_token", facebookAccessToken);
await fetch(`https://graph.facebook.com/${facebookPageId}/photos`, ...);
```

---

## Files Created (Documentation)

### 1. `.env.example`
Example environment file for frontend configuration

### 2. `ENV_VARIABLES.md`
Comprehensive guide with:
- Detailed explanations of each variable
- Where to get each value
- Security best practices
- Troubleshooting tips

### 3. `ENV_QUICK_REFERENCE.md`
Quick reference card with all variables in one place

### 4. `ENV_VISUAL_GUIDE.md`
Visual representation of all variables and their relationships

---

## Environment Variables Summary

### Total Required: 11 Variables

**Frontend (3) - in `.env` file:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

**Backend (8) - in Supabase Secrets:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`
- `FACEBOOK_PAGE_ID`
- `FACEBOOK_PAGE_ACCESS_TOKEN`
- `AUTO_POST_ENABLED` (optional, default: false)
- `MAX_POSTS_PER_DAY` (optional, default: 3)

---

## Benefits of These Changes

✅ **No Database Dependency for Secrets** - Settings are now environment-based  
✅ **Open-Source AI** - GROQ uses Mixtral-8x7b (free, no proprietary vendor lock-in)  
✅ **Environment-Based Configuration** - Easier to manage different deployments (dev/prod)  
✅ **Deno Native** - Uses standard `Deno.env.get()` for reading secrets  
✅ **Simplified Auto-Post** - No need to query database for config on every run  
✅ **Better Security** - Facebook tokens managed in Supabase, not in database  
✅ **Faster Execution** - No database queries for configuration  

---

## Deployment Instructions

1. **Set Frontend Variables:**
   ```bash
   # Create .env file
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_PUBLISHABLE_KEY=...
   VITE_SUPABASE_PROJECT_ID=...
   ```

2. **Set Supabase Secrets:**
   - Go to Supabase Dashboard
   - Edge Functions → Settings → Secrets
   - Add all 8 variables

3. **Build & Deploy:**
   ```bash
   npm run build
   # Deploy to your hosting (Vercel, Netlify, etc.)
   ```

4. **Test:**
   - Open Settings page
   - Test Facebook connection
   - Verify trend/post generation works

---

## Backward Compatibility

⚠️ **Breaking Changes:**
- Settings page no longer manages Facebook credentials (they're now env-based)
- Database `settings` table still exists but Facebook fields are no longer read
- Auto-post settings now come from environment variables only

✅ **Migration Path:**
- Existing database records are preserved
- Only Edge Functions changed to use environment variables
- Frontend can be updated to remove Facebook credential UI (if desired)

---

## Files NOT Changed

The following files remain unchanged and don't need modifications:
- `src/pages/SettingsPage.tsx` (still manages UI, but Facebook sections are now N/A)
- `src/pages/PostsPage.tsx`
- `src/pages/ReviewPage.tsx`
- `supabase/functions/fetch-engagement/index.ts`
- `supabase/functions/test-connection/index.ts`

These files can optionally be updated to remove Facebook credential management from the UI, but they will continue to work as-is since the functions they call now use environment variables.

---

## Next Steps

1. Generate GROQ API key at https://console.groq.com
2. Get Facebook Page ID from your page settings
3. Get Facebook Page Access Token from Graph API Explorer
4. Set all 11 environment variables
5. Redeploy Edge Functions
6. Test the application
