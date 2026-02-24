# QUICK REFERENCE - All Environment Variables

## FRONTEND (.env file)
```
VITE_SUPABASE_URL=https://tgrerzmimgjhlxuaohlm.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_PROJECT_ID=tgrerzmimgjhlxuaohlm
```

## DENO EDGE FUNCTIONS SECRETS (Supabase Dashboard → Edge Functions → Secrets)

### Essential (Required)
```
SUPABASE_URL = https://tgrerzmimgjhlxuaohlm.supabase.co
SUPABASE_SERVICE_ROLE_KEY = [from Supabase Settings → API → Service Role]
GROQ_API_KEY = [from https://console.groq.com]
HUGGINGFACE_API_KEY = [from https://huggingface.co → Settings → Access Tokens]
FACEBOOK_PAGE_ID = [your Facebook Page ID]
FACEBOOK_PAGE_ACCESS_TOKEN = [your Facebook Page Access Token]
```

### Optional (Auto-Posting)
```
AUTO_POST_ENABLED = true    # or false
MAX_POSTS_PER_DAY = 3       # 1-20
```

---

## WHERE TO GET EACH SECRET

| Secret | Source |
|--------|--------|
| `SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → Service Role key |
| `GROQ_API_KEY` | https://console.groq.com → Create API Key |
| `HUGGINGFACE_API_KEY` | https://huggingface.co → Settings → Access Tokens → Create token |
| `FACEBOOK_PAGE_ID` | Facebook Page → Settings → Basic Information → Page ID |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Facebook Developers → Graph API Explorer → Select Page → Copy Token |

---

## WHICH FUNCTIONS USE WHICH VARIABLES

| Function | Variables Used |
|----------|----------------|
| generate-trends | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY |
| generate-post | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY, HUGGINGFACE_API_KEY |
| post-to-facebook | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FACEBOOK_PAGE_ID, FACEBOOK_PAGE_ACCESS_TOKEN |
| auto-post | ALL 9 VARIABLES |
| fetch-engagement | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FACEBOOK_PAGE_ACCESS_TOKEN |
| test-connection | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FACEBOOK_PAGE_ID, FACEBOOK_PAGE_ACCESS_TOKEN |

---

## DEPLOYMENT STEPS

1. **Frontend Setup:**
   - Create `.env` file
   - Add 3 VITE_* variables
   - Run `npm run build`

2. **Backend Setup:**
   - Go to Supabase Dashboard
   - Click Edge Functions
   - Click any function's Settings
   - Add all 8 secrets under "Secrets" section
   - Redeploy functions

3. **Test:**
   - Open Settings page in app
   - Verify Supabase connection works
   - Test Facebook connection button
   - Test generating trends/posts

---

## TOTAL VARIABLES NEEDED: 12

**Frontend (.env):** 3 variables  
**Backend (Supabase Secrets):** 9 variables  

All must be set for full functionality.
