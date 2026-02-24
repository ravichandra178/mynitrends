# Copy-Paste Ready Environment Setup

## 1. Create .env File

Create a new file called `.env` in your project root and copy-paste this:

```env
# Supabase Configuration (Frontend)
VITE_SUPABASE_URL=https://tgrerzmimgjhlxuaohlm.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRncmVyem1pbWdqaGx4dWFvaGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NDgyMTUsImV4cCI6MjA4NzUyNDIxNX0.5ypsnq9heOEguB8luwQ-94eBlJHX5iJZ6RcSDl2_LsI
VITE_SUPABASE_PROJECT_ID=tgrerzmimgjhlxuaohlm
```

---

## 2. Add to .gitignore

Make sure your `.gitignore` includes:

```
.env
.env.local
.env.*.local
```

---

## 3. Supabase Secrets Setup

### Step-by-Step:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **Edge Functions** in left sidebar
4. Click on any function (e.g., `generate-trends`)
5. Click **Settings** (⚙️ icon) at the top
6. Scroll to **Secrets** section
7. Add each secret by clicking **+ Add new secret**

### All Secrets to Add:

#### Secret 1: SUPABASE_URL
- **Key:** `SUPABASE_URL`
- **Value:** `https://tgrerzmimgjhlxuaohlm.supabase.co`
- **Click:** Add secret

#### Secret 2: SUPABASE_SERVICE_ROLE_KEY
- **Key:** `SUPABASE_SERVICE_ROLE_KEY`
- **Value:** *(Get from Supabase Dashboard → Settings → API → Service Role key)*
- **Click:** Add secret

#### Secret 3: GROQ_API_KEY
- **Key:** `GROQ_API_KEY`
- **Value:** *(Get from https://console.groq.com)*
  - Go to console.groq.com
  - Sign up/Login
  - Click API Keys
  - Create new key
  - Copy the key (looks like: `gsk_xxxxxxxxxxxxx`)
- **Click:** Add secret

#### Secret 4: HUGGINGFACE_API_KEY
- **Key:** `HUGGINGFACE_API_KEY`
- **Value:** *(Get from https://huggingface.co)*
  - Go to https://huggingface.co
  - Sign up/Login
  - Click your profile → Settings
  - Click "Access Tokens"
  - Create new token (select "write" permission)
  - Copy the token (looks like: `hf_xxxxxxxxxxxxx`)
- **Click:** Add secret

#### Secret 5: FACEBOOK_PAGE_ID
- **Key:** `FACEBOOK_PAGE_ID`
- **Value:** *(Get from Facebook)*
  - Go to your Facebook Page
  - Click Settings
  - Basic Information
  - Find "Page ID" (numeric, like: `1234567890`)
  - Copy it
- **Click:** Add secret

#### Secret 6: FACEBOOK_PAGE_ACCESS_TOKEN
- **Key:** `FACEBOOK_PAGE_ACCESS_TOKEN`
- **Value:** *(Get from Facebook Developers)*
  - Go to https://developers.facebook.com
  - Select your App
  - Tools → Graph API Explorer
  - Select your Page from dropdown
  - Copy the generated token (very long string starting with `EAAL...`)
- **Click:** Add secret

#### Secret 7: AUTO_POST_ENABLED
- **Key:** `AUTO_POST_ENABLED`
- **Value:** `false` (or `true` if you want auto-posting)
- **Click:** Add secret

#### Secret 8: MAX_POSTS_PER_DAY
- **Key:** `MAX_POSTS_PER_DAY`
- **Value:** `3` (or 1-20 as preferred)
- **Click:** Add secret

---

## 4. Where to Get Each Secret

### SUPABASE_SERVICE_ROLE_KEY
```
Supabase Dashboard
  ↓
Settings (gear icon)
  ↓
API
  ↓
Look for "Service Role" section
  ↓
Copy the key (starts with "eyJ...")
```

### GROQ_API_KEY
```
Visit https://console.groq.com
  ↓
Sign Up / Log In
  ↓
Click "Keys" in left sidebar
  ↓
Create New API Key
  ↓
Copy the key (starts with "gsk_")
```

### HUGGINGFACE_API_KEY
```
Visit https://huggingface.co
  ↓
Sign Up / Log In
  ↓
Click your Profile → Settings
  ↓
Click "Access Tokens"
  ↓
Create New Token (select "write" permission)
  ↓
Copy the token (starts with "hf_")
```

### FACEBOOK_PAGE_ID
```
Go to your Facebook Page
  ↓
Click Settings
  ↓
Click Basic Information
  ↓
Find "Page ID" (numeric only, e.g., 1234567890)
  ↓
Copy it
```

### FACEBOOK_PAGE_ACCESS_TOKEN
```
Visit https://developers.facebook.com
  ↓
Select your App
  ↓
Tools & Settings → Graph API Explorer
  ↓
In "Get User Access Token" dropdown, select your Page
  ↓
Copy the token (very long string)
  ↓
NOTE: Token may expire, refresh periodically from this page
```

---

## 5. Deployment Checklist

- [ ] Create `.env` file with 3 VITE_* variables
- [ ] Add `.env` to `.gitignore`
- [ ] Create 7 Supabase Secrets
- [ ] Verify `.env` file is NOT committed to git
- [ ] Run `npm run build` to test
- [ ] Deploy frontend
- [ ] Test Settings page to verify connection works

---

## 6. Quick Commands

### Build the project:
```bash
npm run build
```

### Preview the build locally:
```bash
npm run preview
```

### Run tests:
```bash
npm test
```

### Check for errors:
```bash
npm run lint
```

---

## 7. Verification

After setup, test each component:

1. **Frontend Connection:**
   - Open your deployed app
   - Should load without errors
   - Check browser console for errors

2. **Supabase Connection:**
   - Settings page should load
   - Should show configuration sections

3. **GROQ AI:**
   - Click "Generate Trends"
   - Should see 5 trending topics appear
   - If fails, check GROQ_API_KEY is set correctly

4. **Facebook Connection:**
   - In Settings, enter test Facebook Page ID and Token
   - Click "Test Facebook Connection"
   - Should show success message with page name

---

## 8. Common Issues & Fixes

### Error: "Cannot find module 'https://deno.land/std'"
- **Cause:** This is just a linting warning, not a runtime error
- **Fix:** Can be ignored, or add Deno type definitions to avoid warning

### Error: "GROQ_API_KEY is missing"
- **Cause:** Secret not set in Supabase
- **Fix:** 
  1. Go to Supabase → Edge Functions → Settings
  2. Verify `GROQ_API_KEY` is listed under Secrets
  3. Verify the key value is correct
  4. Redeploy functions

### Error: "Facebook credentials not configured"
- **Cause:** FACEBOOK_PAGE_ID or FACEBOOK_PAGE_ACCESS_TOKEN missing
- **Fix:**
  1. Go to Supabase → Edge Functions → Settings
  2. Add both Facebook secrets
  3. Verify token hasn't expired
  4. Redeploy functions

### Error: "Cannot read properties of undefined"
- **Cause:** .env file not loaded or variable name wrong
- **Fix:**
  1. Check .env file exists in project root
  2. Variable names must start with `VITE_` for frontend
  3. Restart dev server if using `npm run dev`

### GROQ API rate limit exceeded
- **Cause:** Free tier has rate limits
- **Fix:**
  1. Wait a few minutes before retrying
  2. Or upgrade GROQ plan
  3. Implement request queue if in production

### Facebook token expired
- **Cause:** Access tokens expire
- **Fix:**
  1. Go to Facebook Graph API Explorer
  2. Regenerate the token
  3. Update `FACEBOOK_PAGE_ACCESS_TOKEN` secret in Supabase
  4. Redeploy functions

---

## 9. Production Deployment

### For Vercel:
1. Go to Vercel Dashboard
2. Select your project
3. Settings → Environment Variables
4. Add all 3 VITE_* variables
5. Redeploy

### For Netlify:
1. Go to Netlify Dashboard
2. Select your site
3. Settings → Build & Deploy → Environment
4. Add all 3 VITE_* variables
5. Trigger redeploy

### For Docker/Self-hosted:
Create an `.env` file on your server with all 3 variables and deploy

---

## 10. Final Verification Script

After deployment, verify everything works:

```bash
# 1. Check if .env file exists (should be hidden)
ls -la | grep .env

# 2. Run build
npm run build

# 3. Check for build errors
echo "If no errors above, build succeeded"

# 4. Verify environment variables are read correctly
# (Check browser console when app loads)
```

---

## Need Help?

### Check these files in your project:
- `ENV_VARIABLES.md` - Full detailed guide
- `ENV_QUICK_REFERENCE.md` - Quick lookup
- `ENV_VISUAL_GUIDE.md` - Visual diagram
- `CHANGES.md` - What was changed and why

### Common Resources:
- Supabase Docs: https://supabase.com/docs
- GROQ Console: https://console.groq.com
- Facebook Developers: https://developers.facebook.com
- Deno Docs: https://deno.land
