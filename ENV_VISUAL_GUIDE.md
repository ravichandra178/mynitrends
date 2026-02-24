# Environment Variables - Visual Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    MYNITRENDS DEPLOYMENT                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  FRONTEND (React/Vite) - .env FILE (3 variables)                │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  VITE_SUPABASE_URL                                              │
│  ├─ Value: https://tgrerzmimgjhlxuaohlm.supabase.co           │
│  └─ Source: Supabase Dashboard → Settings → API               │
│                                                                   │
│  VITE_SUPABASE_PUBLISHABLE_KEY                                 │
│  ├─ Value: eyJhbGciOiJIUzI1NiIs...                            │
│  └─ Source: Supabase Dashboard → Settings → API → anon key    │
│                                                                   │
│  VITE_SUPABASE_PROJECT_ID                                       │
│  ├─ Value: tgrerzmimgjhlxuaohlm                                │
│  └─ Source: Supabase Dashboard                                 │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  DENO EDGE FUNCTIONS - Supabase Secrets (9 variables)           │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  SUPABASE_URL                                                    │
│  ├─ Value: https://tgrerzmimgjhlxuaohlm.supabase.co           │
│  ├─ Source: Supabase Dashboard → Settings → API               │
│  ├─ Used By: All 6 Edge Functions                             │
│  └─ ⚠️ Required: YES                                            │
│                                                                   │
│  SUPABASE_SERVICE_ROLE_KEY                                      │
│  ├─ Value: eyJhbGciOiJIUzI1NiIs... (long string)             │
│  ├─ Source: Supabase Dashboard → Settings → API → Service Role│
│  ├─ Used By: All 6 Edge Functions                             │
│  ├─ ⚠️ Required: YES                                            │
│  └─ ⚠️ KEEP SECRET! (Backend only)                             │
│                                                                   │
│  GROQ_API_KEY                                                    │
│  ├─ Value: gsk_xxxxxxxxxxxxxxxxxxxxx                           │
│  ├─ Source: https://console.groq.com → API Keys              │
│  ├─ Used By: generate-trends, generate-post                   │
│  ├─ ⚠️ Required: YES (for AI features)                         │
│  └─ Purpose: AI content generation (mixtral-8x7b model)       │
│                                                                   │
│  HUGGINGFACE_API_KEY                                             │
│  ├─ Value: hf_xxxxxxxxxxxxxxxxxxxxx                            │
│  ├─ Source: https://huggingface.co → Settings → Access Tokens│
│  ├─ Used By: generate-post                                    │
│  ├─ ⚠️ Required: YES (for image generation)                    │
│  └─ Purpose: AI image generation (Stable Diffusion model)     │
│                                                                   │
│  FACEBOOK_PAGE_ID                                                │
│  ├─ Value: 1234567890 (numeric)                                │
│  ├─ Source: Facebook Page → Settings → Basic Info → Page ID   │
│  ├─ Used By: post-to-facebook, auto-post, fetch-engagement    │
│  ├─ ⚠️ Required: YES (for Facebook integration)                │
│  └─ Purpose: Identifies your Facebook page                     │
│                                                                   │
│  FACEBOOK_PAGE_ACCESS_TOKEN                                      │
│  ├─ Value: EAAL8pB7zXXXXXXXXX... (long string)               │
│  ├─ Source: Facebook Developers → Graph API Explorer           │
│  ├─ Used By: post-to-facebook, auto-post, fetch-engagement    │
│  ├─ ⚠️ Required: YES (for Facebook integration)                │
│  ├─ ⚠️ May expire (refresh periodically)                       │
│  └─ Purpose: Authentication for posting                        │
│                                                                   │
│  AUTO_POST_ENABLED                                               │
│  ├─ Value: "true" or "false"                                   │
│  ├─ Used By: auto-post function                               │
│  ├─ ⚠️ Required: NO (default: false)                           │
│  └─ Purpose: Enable/disable automatic posting                  │
│                                                                   │
│  MAX_POSTS_PER_DAY                                               │
│  ├─ Value: 1-20 (number)                                       │
│  ├─ Used By: auto-post function                               │
│  ├─ ⚠️ Required: NO (default: 3)                               │
│  └─ Purpose: Limit daily auto posts                            │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  EDGE FUNCTIONS OVERVIEW                                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ✓ generate-trends                                               │
│    └─ Generates trending topics using GROQ AI                  │
│    └─ Uses: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GROQ_API │
│                                                                   │
│  ✓ generate-post                                                 │
│    └─ Creates post content + AI-generated images               │
│    └─ Uses: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GROQ_API │
│    └─        HUGGINGFACE_API_KEY                               │
│                                                                   │
│  ✓ post-to-facebook                                              │
│    └─ Posts to your Facebook page                              │
│    └─ Uses: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FB keys  │
│                                                                   │
│  ✓ auto-post                                                     │
│    └─ Automatically posts scheduled content                    │
│    └─ Uses: ALL 9 variables                                     │
│                                                                   │
│  ✓ fetch-engagement                                              │
│    └─ Gets likes/comments from Facebook posts                  │
│    └─ Uses: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FB token │
│                                                                   │
│  ✓ test-connection                                               │
│    └─ Tests Facebook connection                                │
│    └─ Uses: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FB keys  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  SETUP QUICK GUIDE                                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  STEP 1: Create .env file in project root                       │
│  ────────────────────────────────────────────────────────        │
│  .env                                                             │
│  VITE_SUPABASE_URL=...                                           │
│  VITE_SUPABASE_PUBLISHABLE_KEY=...                              │
│  VITE_SUPABASE_PROJECT_ID=...                                   │
│                                                                   │
│  STEP 2: Set Supabase Secrets                                    │
│  ────────────────────────────────────────────────────────        │
│  Supabase Dashboard → Edge Functions → Settings → Secrets       │
│  Add all 8 secrets listed above                                  │
│                                                                   │
│  STEP 3: Build & Deploy                                          │
│  ────────────────────────────────────────────────────────        │
│  npm run build                                                    │
│  Deploy to Vercel, Netlify, or your platform                    │
│                                                                   │
│  STEP 4: Test                                                     │
│  ────────────────────────────────────────────────────────        │
│  Open app → Settings page                                        │
│  Test Facebook connection                                        │
│  Try generating trends/posts                                     │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

TOTAL: 12 ENVIRONMENT VARIABLES REQUIRED
├─ Frontend: 3 (.env file)
└─ Backend: 9 (Supabase Secrets)
```

---

## Key Points

✅ **Frontend variables** (VITE_*) are safe to expose (public keys only)  
🔐 **Backend variables** (SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY, FB tokens) must be KEPT SECRET  
🚀 **All 8 backend variables** must be set in Supabase for full functionality  
🔄 **Facebook tokens may expire** - refresh periodically  
⚡ **GROQ API** provides free tier with rate limits  

---

## Important Security Notes

```
NEVER:
  ✗ Commit .env to GitHub
  ✗ Expose SUPABASE_SERVICE_ROLE_KEY
  ✗ Share GROQ_API_KEY publicly
  ✗ Expose FACEBOOK_PAGE_ACCESS_TOKEN

ALWAYS:
  ✓ Use .env files with .gitignore
  ✓ Set backend secrets in Supabase Dashboard only
  ✓ Use different credentials for dev vs production
  ✓ Rotate tokens periodically
```
