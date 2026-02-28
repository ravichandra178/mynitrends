# Environment Variables Setup Guide for Deno Deploy

## Quick Setup for Deno Deploy

### Step 1: Go to Deno Deploy Project Settings
1. Go to https://dash.deno.com
2. Select your project (mynitrends)
3. Click **Settings** → **Environment Variables**

### Step 2: Add Each Environment Variable

Copy-paste each variable from below. For **demo purposes**, use `heyhere` as placeholder values where marked.

---

## Required Environment Variables

### Database
```
DATABASE_URL=postgresql://86d5b74653652c443396824539dd8586880bf0916d443db...@db.prisma.io/postgres?sslmode=verify-full
```

### Supabase (Frontend)
```
VITE_SUPABASE_URL=https://qhjuecaljadlcebsgjum.supabase.co
VITE_SUPABASE_PROJECT_ID=qhjuecaljadlcebsgjum
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_ANON_KEY_HERE
```

### Supabase (Backend)
```
SUPABASE_URL=https://qhjuecaljadlcebsgjum.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

### AI APIs
```
GROQ_API_KEY=YOUR_GROQ_KEY
HUGGINGFACE_API_KEY=YOUR_HF_KEY
```

### AI Models Configuration
```
HF_TEXT_MODEL=mistralai/Mistral-7B-Instruct-v0.2
HF_MODEL=runwayml/stable-diffusion-v1-5
GROQ_MODEL=qwen/qwen3-32b
```

### Facebook Integration
```
FACEBOOK_PAGE_ID=61586953905789
FACEBOOK_PAGE_ACCESS_TOKEN=YOUR_TOKEN
```

### Application Settings
```
AUTO_POST_ENABLED=true
MAX_POSTS_PER_DAY=3
```

---

## Demo/Testing Values (Replace Later)

For quick testing, you can use placeholder values:

```
GROQ_API_KEY=heyhere-demo-key
HUGGINGFACE_API_KEY=heyhere-demo-key
FACEBOOK_PAGE_ACCESS_TOKEN=heyhere-demo-token
```

---

## How to Find Your Actual Values

### Supabase ANON_KEY
1. Go to https://app.supabase.com
2. Select your project → **Settings** → **API**
3. Copy **anon (public)** key

### Supabase SERVICE_ROLE_KEY
1. Same as above but copy **service_role (secret)** key
2. ⚠️ Keep this secret! Don't share it.

### GROQ_API_KEY
1. Go to https://console.groq.com
2. Click **API Keys**
3. Copy your active API key

### HUGGINGFACE_API_KEY
1. Go to https://huggingface.co/settings/tokens
2. Create or copy your **User Access Token**

### Facebook Tokens
1. Go to https://developers.facebook.com
2. Select your app → **Tools** → **Access Token Debugger**

---

## Testing Your Setup

### Test Database Connection
```bash
curl -X POST https://your-deno-deploy-url/health
```

Should return:
```json
{"status": "ok", "database": "configured"}
```

### Test Supabase Connection
```bash
curl -X GET \
  'https://qhjuecaljadlcebsgjum.supabase.co/rest/v1/trends?select=count()' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

### Check Deno Deploy Logs
1. Go to https://dash.deno.com
2. Select your project
3. Click **Deployments**
4. Check **Logs** tab to see environment variable loading

---

## Local Development (.env file)

Create `.env` file locally (NOT in git):

```bash
DATABASE_URL=postgresql://...
SUPABASE_URL=https://qhjuecaljadlcebsgjum.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key
VITE_SUPABASE_URL=https://qhjuecaljadlcebsgjum.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-key
GROQ_API_KEY=your-key
HUGGINGFACE_API_KEY=your-key
FACEBOOK_PAGE_ID=61586953905789
FACEBOOK_PAGE_ACCESS_TOKEN=your-token
AUTO_POST_ENABLED=true
MAX_POSTS_PER_DAY=3
HF_TEXT_MODEL=mistralai/Mistral-7B-Instruct-v0.2
HF_MODEL=runwayml/stable-diffusion-v1-5
GROQ_MODEL=qwen/qwen3-32b
```

---

## Troubleshooting

### "Failed to connect to supabase.co port 443"
- Check your `SUPABASE_URL` is correct (no typos)
- Verify your API keys are valid in Supabase dashboard
- Make sure firewall/VPN isn't blocking the connection

### "HUGGINGFACE_API_KEY not configured"
- Add `HUGGINGFACE_API_KEY` to Deno Deploy environment variables
- Don't use `heyhere` for actual API calls, use real token

### "Database connection failed"
- Check `DATABASE_URL` format
- Verify the database exists
- Test connection: `curl /health` endpoint

---

## Security Notes

⚠️ **IMPORTANT:**
- Never commit `.env` file to git
- `.env.example` should contain ONLY placeholders
- Rotate tokens periodically
- Use different tokens for prod vs testing
- In Deno Deploy, secrets are encrypted at rest

---

## Environment Variables Used in Code

```typescript
// Database
DATABASE_URL

// Supabase (Frontend)
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID

// Supabase (Backend)
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY

// AI APIs
GROQ_API_KEY
HUGGINGFACE_API_KEY
HF_TEXT_MODEL
HF_MODEL
GROQ_MODEL

// Facebook
FACEBOOK_PAGE_ID
FACEBOOK_PAGE_ACCESS_TOKEN

// App Settings
AUTO_POST_ENABLED
MAX_POSTS_PER_DAY
```

All are accessed via:
```typescript
// In Deno
Deno.env.get("VARIABLE_NAME")

// In Vite (Frontend)
import.meta.env.VITE_VARIABLE_NAME
```

---

## Next Steps

1. ✅ Add all environment variables to Deno Deploy
2. ✅ Verify connection with `/health` endpoint
3. ✅ Check logs in Deno Deploy dashboard
4. ✅ Test trends generation: `POST /api/generate-trends`
5. ✅ Monitor in browser console for `[TRENDS LOG]` messages

