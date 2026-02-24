# Complete Environment Variables Setup - Neon PostgreSQL

## All Variables as Single String (Copy-Paste)

```
VITE_SUPABASE_URL=https://your-project.supabase.co|VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key|VITE_SUPABASE_PROJECT_ID=your_project_id|DATABASE_URL=postgresql://neondb_owner:npg_PASSWORD@ep-floral-block-ai40i3fa-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require|GROQ_API_KEY=your_groq_api_key|HUGGINGFACE_API_KEY=your_huggingface_api_key|FACEBOOK_PAGE_ID=your_page_id|FACEBOOK_PAGE_ACCESS_TOKEN=your_access_token|AUTO_POST_ENABLED=true|MAX_POSTS_PER_DAY=3
```

## Individual Variables for Deno Deploy

Set these in **Deno Deploy Dashboard → Settings → Environment Variables**:

### Frontend Variables
```
VITE_SUPABASE_URL = https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = your_publishable_key
VITE_SUPABASE_PROJECT_ID = your_project_id
```

### Database (Required)
```
DATABASE_URL = postgresql://neondb_owner:npg_pRnuF7YsJ1QL@ep-floral-block-ai40i3fa-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### AI Services
```
GROQ_API_KEY = your_groq_api_key
HUGGINGFACE_API_KEY = your_huggingface_api_key
```

### Facebook Integration
```
FACEBOOK_PAGE_ID = 61586953905789
FACEBOOK_PAGE_ACCESS_TOKEN = EAARLAC5qLtsBQ3Rtx5qaD7ZBSUcEOY3Is9MNgVy2ICm0sBZAw7ZCT5oTTk2Us6MPTaNy97O3qZCCN08zaoYi6uWgn8kdYwvmTZAFhasaL9U2CMELApEDNzFYDuXuIRkBgi5TOUkCnmGZBMcZC03G8JrXIdqjmlx3HlW7h0dDq7VPzvNZC8qFJMJsGCrbiurGZAba7vZAPMSaYhA1scFvT3vRVNV1Rp5VchWykQcu8Qmr4m5GMZD
```

### Auto-Posting
```
AUTO_POST_ENABLED = true
MAX_POSTS_PER_DAY = 3
```

---

## Your Neon Connection String (Already Configured)

```
postgresql://neondb_owner:npg_pRnuF7YsJ1QL@ep-floral-block-ai40i3fa-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### Use this as DATABASE_URL in:
1. **Deno Deploy** → Environment Variables → `DATABASE_URL`
2. **Local development** → `.env` file → `DATABASE_URL`

---

## Setup Steps

### Step 1: Set up Neon Database Schema
Go to Neon Console → SQL Editor and run:
- File: `supabase/migrations/neon_schema.sql`
- This creates all tables needed

### Step 2: Set Environment Variables in Deno Deploy
1. Go to Deno Deploy Dashboard
2. Click your project
3. Settings → Environment Variables
4. Add all variables above
5. Click Save

### Step 3: Redeploy
1. Click "Redeploy" in Deno Deploy
2. Wait for build to complete
3. Check your app at https://mynitrends.mynibot.deno.net

---

## Summary

- **Database**: Neon PostgreSQL (never pauses, free tier)
- **Frontend**: Deno Deploy (static site)
- **AI**: GROQ (text) + Hugging Face (images)
- **Social**: Facebook integration
- **Total Variables**: 10 (frontend + backend combined)

All ready to go!
