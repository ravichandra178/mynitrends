# Environment Variables Guide for MyNitrends Deployment

## Overview
This application uses both **frontend environment variables** (for Vite) and **Deno Edge Function secrets** (for backend logic).

---

## 1. FRONTEND ENVIRONMENT VARIABLES (.env file)

These variables go in a `.env` file in the root of your project:

```env
# Supabase - Frontend Configuration
VITE_SUPABASE_URL=https://tgrerzmimgjhlxuaohlm.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRncmVyem1pbWdqaGx4dWFvaGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NDgyMTUsImV4cCI6MjA4NzUyNDIxNX0.5ypsnq9heOEguB8luwQ-94eBlJHX5iJZ6RcSDl2_LsI
VITE_SUPABASE_PROJECT_ID=tgrerzmimgjhlxuaohlm
```

| Variable | Purpose | Where to Get |
|----------|---------|--------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public API key for authentication | Supabase Dashboard → Settings → API → anon public key |
| `VITE_SUPABASE_PROJECT_ID` | Project ID | Visible in Supabase Dashboard URL |

---

## 2. DENO EDGE FUNCTIONS SECRETS

These are set in **Supabase Dashboard → Edge Functions → Secrets** (NOT in your code):

### Required Secrets:

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GROQ_API_KEY
HUGGINGFACE_API_KEY
FACEBOOK_PAGE_ID
FACEBOOK_PAGE_ACCESS_TOKEN
AUTO_POST_ENABLED
MAX_POSTS_PER_DAY
```

### Detailed Configuration:

#### **2.1 Supabase Backend Configuration**

```
SUPABASE_URL = https://tgrerzmimgjhlxuaohlm.supabase.co
```
- **Purpose**: Backend database access for Edge Functions
- **Where to Get**: Supabase Dashboard → Settings → API → Project URL
- **Note**: Same as frontend VITE_SUPABASE_URL

```
SUPABASE_SERVICE_ROLE_KEY = [your_service_role_key]
```
- **Purpose**: Privileged API key with full database access
- **Where to Get**: Supabase Dashboard → Settings → API → Service Role key
- **⚠️ SECURITY**: Keep this secret! Only use in server-side/Edge Functions
- **Never**: Don't commit to GitHub or expose publicly

#### **2.2 AI Configuration (GROQ - Open Source LLM)**

```
GROQ_API_KEY = [your_groq_api_key]
```
- **Purpose**: Powers AI content generation (trending topics and post creation)
- **Where to Get**: 
  1. Sign up at https://console.groq.com
  2. Generate API key in dashboard
  3. Copy the full key
- **Used By**: `generate-trends` and `generate-post` functions
- **Model**: Uses `mixtral-8x7b-32768` (free, fast open-source model)

#### **2.3 Image Generation (Hugging Face)**

```
HUGGINGFACE_API_KEY = [your_huggingface_api_key]
```
- **Purpose**: Generates images for social media posts
- **Where to Get**:
  1. Sign up at https://huggingface.co
  2. Go to Settings → Access Tokens
  3. Create a new token (select "write" permission)
  4. Copy the full token
- **Used By**: `generate-post` function
- **Model**: Uses `stabilityai/stable-diffusion-3.5-large` (free tier available)
- **Features**: Generates 1080x1080 images optimized for Facebook

#### **2.4 Facebook Configuration**

```
FACEBOOK_PAGE_ID = 1234567890
```
- **Purpose**: Your Facebook Page ID for posting
- **Where to Get**:
  1. Go to https://facebook.com/your-page/settings
  2. Basic information → Page ID
  3. Or use Facebook's Graph API Explorer

```
FACEBOOK_PAGE_ACCESS_TOKEN = EAAL8pB7zXXXXXXXXXXXXXXXXXX
```
- **Purpose**: Authentication token to post on your Facebook page
- **Where to Get**:
  1. Facebook Developers Dashboard → My Apps
  2. Create/Select App
  3. Tools → Graph API Explorer
  4. Select your page
  5. Copy the generated access token
  6. Or get from Business Suite

#### **2.5 Auto-Posting Configuration**

```
AUTO_POST_ENABLED = true
```
- **Purpose**: Enable/disable automatic posting
- **Valid Values**: `true` or `false`
- **Default**: `false`

```
MAX_POSTS_PER_DAY = 3
```
- **Purpose**: Maximum number of posts to auto-post per day
- **Valid Values**: `1` to `20`
- **Default**: `3`

---

## 3. SUMMARY TABLE

| Variable | Scope | Type | Required | Where to Set |
|----------|-------|------|----------|--------------|
| `VITE_SUPABASE_URL` | Frontend | String | ✅ | `.env` file |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend | String | ✅ | `.env` file |
| `VITE_SUPABASE_PROJECT_ID` | Frontend | String | ✅ | `.env` file |
| `SUPABASE_URL` | Edge Functions | String | ✅ | Supabase Secrets |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | String | ✅ | Supabase Secrets |
| `GROQ_API_KEY` | Edge Functions | String | ✅ | Supabase Secrets |
| `HUGGINGFACE_API_KEY` | Edge Functions | String | ✅ | Supabase Secrets |
| `FACEBOOK_PAGE_ID` | Edge Functions | String | ✅ | Supabase Secrets |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Edge Functions | String | ✅ | Supabase Secrets |
| `AUTO_POST_ENABLED` | Edge Functions | Boolean | ❌ | Supabase Secrets |
| `MAX_POSTS_PER_DAY` | Edge Functions | Number | ❌ | Supabase Secrets |

---

## 4. FUNCTIONS & THEIR ENVIRONMENT VARIABLE USAGE

| Function | Uses | Purpose |
|----------|------|---------|
| `generate-trends` | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY | Generate trending topics using AI |
| `generate-post` | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY, HUGGINGFACE_API_KEY | Generate post content + AI-generated images |
| `post-to-facebook` | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FACEBOOK_PAGE_ID, FACEBOOK_PAGE_ACCESS_TOKEN | Post to Facebook |
| `auto-post` | All 9 variables | Automatically post scheduled content to Facebook |
| `fetch-engagement` | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FACEBOOK_PAGE_ACCESS_TOKEN | Fetch likes/comments from Facebook |
| `test-connection` | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FACEBOOK_PAGE_ID, FACEBOOK_PAGE_ACCESS_TOKEN | Test Facebook connection |

---

## 5. HOW TO SET SUPABASE SECRETS

1. Go to **Supabase Dashboard**
2. Select your project
3. Click **Edge Functions** in the left sidebar
4. Click on any function (e.g., `generate-trends`)
5. Click the **⚙️ Settings** button
6. Add each secret under **Secrets** section:
   - Key: `SUPABASE_URL`
   - Value: `https://tgrerzmimgjhlxuaohlm.supabase.co`
   - Click **Add secret**
7. Repeat for all other secrets
8. Save and redeploy functions

---

## 6. DEPLOYMENT CHECKLIST

### Frontend Setup:
- [ ] Create `.env` file in project root
- [ ] Add `VITE_SUPABASE_URL`
- [ ] Add `VITE_SUPABASE_PUBLISHABLE_KEY`
- [ ] Add `VITE_SUPABASE_PROJECT_ID`
- [ ] Run `npm run build` to verify

### Deno/Supabase Setup:
- [ ] Create Supabase account and project
- [ ] Get Service Role Key from Settings → API
- [ ] Get GROQ API Key from https://console.groq.com
- [ ] Get Facebook Page ID and Access Token
- [ ] Set all 8 secrets in Supabase Edge Functions
- [ ] Deploy Edge Functions to Supabase
- [ ] Test connection using Settings page in app

### Post-Deployment:
- [ ] Verify frontend can connect to Supabase
- [ ] Test trend generation
- [ ] Test post creation
- [ ] Test Facebook posting
- [ ] Enable auto-posting if desired

---

## 7. TROUBLESHOOTING

**Error: "Missing GROQ_API_KEY"**
- ✅ Set `GROQ_API_KEY` in Supabase Secrets
- ✅ Make sure the secret name is exactly `GROQ_API_KEY`
- ✅ Redeploy functions after adding secret

**Error: "Facebook credentials not configured"**
- ✅ Set `FACEBOOK_PAGE_ID` in Supabase Secrets
- ✅ Set `FACEBOOK_PAGE_ACCESS_TOKEN` in Supabase Secrets
- ✅ Verify token is valid and not expired
- ✅ Use Test Connection button in Settings page to debug

**Supabase connection errors**
- ✅ Verify `VITE_SUPABASE_URL` matches `SUPABASE_URL`
- ✅ Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- ✅ Check browser console for specific error messages
- ✅ Ensure browser has internet access

**GROQ API rate limiting**
- ✅ Groq free tier has rate limits
- ✅ Implement request queuing if hitting limits
- ✅ Consider upgrading Groq plan if in production

---

## 8. SECURITY BEST PRACTICES

1. **Never commit secrets to GitHub**
   - Keep `.env` in `.gitignore`
   - Use `.env.example` for templates only

2. **Rotate Facebook tokens regularly**
   - Token can expire or be invalidated
   - Check expiration in Facebook Business Suite

3. **Monitor Supabase Service Role Key**
   - Only share with trusted team members
   - Use separate keys for different environments (dev/prod)

4. **Limit API Key permissions**
   - Facebook tokens should only have page posting permissions
   - Don't grant unnecessary scopes

5. **Use environment-specific secrets**
   - Development: One set of credentials
   - Production: Different, more restricted credentials
