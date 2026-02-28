# MyNitrends Logging Reference Guide

## AI Trends Generation Logging

Enhanced logging in `src/lib/api-helpers.ts` shows exactly what's happening during trend generation.

### Console Output Examples

#### ✅ **Successful AI Generation (GROQ)**

```
[TRENDS LOG] 🔵 Generating trends from /api/generate-trends...
[TRENDS LOG] 🤖 AI Trend Generation Attempt:
[TRENDS LOG]   Model: GROQ (qwen-3-32b)
[TRENDS LOG]   Source: API Endpoint
[TRENDS LOG] ⏳ Waiting for AI response...
[TRENDS LOG] ✅ AI SUCCESS: Generated 5 trends
[TRENDS LOG]   Source: GROQ
[TRENDS LOG]   Duration: 2345.67ms
[TRENDS LOG]   Topics: Healthcare Innovation, Remote Work, Sustainability, Mental Health, Tech News
[TRENDS LOG] 📊 Full Response:
┌─────────┬───────────────────┬────────┬──────┐
│ (index) │       topic       │ source │ used │
├─────────┼───────────────────┼────────┼──────┤
│    0    │ Healthcare Innov… │ groq   │ false│
│    1    │ Remote Work       │ groq   │ false│
│    2    │ Sustainability    │ groq   │ false│
│    3    │ Mental Health     │ groq   │ false│
│    4    │ Tech News         │ groq   │ false│
└─────────┴───────────────────┴────────┴──────┘
```

#### 📡 **Fallback to RSS (AI Failed)**

```
[TRENDS LOG] 🔵 Generating trends from /api/generate-trends...
[TRENDS LOG] 🤖 AI Trend Generation Attempt:
[TRENDS LOG]   Model: GROQ (qwen/qwen3-32b)
[TRENDS LOG]   Source: API Endpoint
[TRENDS LOG] ⏳ Waiting for AI response...
[TRENDS LOG] 📡 RSS FALLBACK: Fetched 5 trends from Google Trends feed
[TRENDS LOG]   Source: Google Trends RSS
[TRENDS LOG]   Duration: 3456.78ms
[TRENDS LOG]   Topics: Trending Topic 1, Trending Topic 2, Trending Topic 3, Trending Topic 4, Trending Topic 5
```

#### 📊 **Fetching Trends from Database**

```
[TRENDS LOG] 📊 Fetching trends from /api/trends...
[TRENDS LOG] ✅ Fetched 5 trends from database:
[TRENDS LOG]   [1] 🤖 "Healthcare Innovation" | source: groq | status: ⭕ Available | id: 550e8400-e29b-41d4-a716-446655440000
[TRENDS LOG]   [2] 🤖 "Remote Work Tips" | source: groq | status: ⭕ Available | id: 550e8400-e29b-41d4-a716-446655440001
[TRENDS LOG]   [3] 📡 "Trending Topic 1" | source: rss | status: ✅ Used | id: 550e8400-e29b-41d4-a716-446655440002
[TRENDS LOG]   [4] 👤 "Custom Topic" | source: manual | status: ⭕ Available | id: 550e8400-e29b-41d4-a716-446655440003
[TRENDS LOG]   [5] 🤖 "Tech News" | source: groq | status: ✅ Used | id: 550e8400-e29b-41d4-a716-446655440004
[TRENDS LOG] 📋 Full response:
┌─────────┬───────────────────┬────────┬──────┐
│ (index) │       topic       │ source │ used │
├─────────┼───────────────────┼────────┼──────┤
│    0    │ Healthcare Innov… │ groq   │ false│
│    1    │ Remote Work Tips  │ groq   │ false│
│    2    │ Trending Topic 1  │ rss    │ true │
│    3    │ Custom Topic      │ manual │ false│
│    4    │ Tech News         │ groq   │ true │
└─────────┴───────────────────┴────────┴──────┘
```

#### ➕ **Adding Manual Trend**

```
[TRENDS LOG] ➕ Adding manual trend: "AI Revolution"
[TRENDS LOG] ✅ Trend added successfully:
[TRENDS LOG]   Topic: "AI Revolution"
[TRENDS LOG]   Source: manual
[TRENDS LOG]   ID: 550e8400-e29b-41d4-a716-446655440005
```

### Color Codes in Browser Console

| Color | Emoji | Meaning |
|-------|-------|---------|
| 🔵 Blue | [TRENDS LOG] | Starting operation |
| 🤖 Purple | AI Attempt | AI model details |
| 🟠 Orange | ⏳ Waiting | Processing |
| 🟢 Green | ✅ Success | AI or manual operation succeeded |
| 🟠 Orange | 📡 RSS | Fallback to RSS feed |
| 🔴 Red | ❌ Failed | Error occurred |
| 🔵 Blue | 📊 📋 | Data display |

### Source Emojis

| Source | Emoji | Meaning |
|--------|-------|---------|
| GROQ/HF | 🤖 | AI-generated (models) |
| RSS | 📡 | Google Trends RSS feed |
| manual | 👤 | Manually added |

### Status Indicators

| Status | Emoji | Meaning |
|--------|-------|---------|
| Available | ⭕ | Not used in a post yet |
| Used | ✅ | Already used in a post |

## Environment Variables for Logging

All logging is built-in and uses console APIs. No environment variables needed for logging configuration.

## How to Read the Logs

### 1. **AI Generation Check**
Look for `[TRENDS LOG] ✅ AI SUCCESS` or `[TRENDS LOG] 📡 RSS FALLBACK`
- **AI SUCCESS** = GROQ/HF models are working ✅
- **RSS FALLBACK** = AI failed, using Google Trends ⚠️

### 2. **Source Tracking**
Look at the `source` field in trends:
- `source: groq` = Generated by GROQ AI
- `source: hf` = Generated by Hugging Face AI
- `source: rss` = Fetched from Google Trends
- `source: manual` = Manually added by user

### 3. **Duration Check**
Look at `Duration: XXXms`
- < 2000ms = Fast (good)
- 2000-5000ms = Normal (acceptable)
- > 5000ms = Slow (may timeout)

### 4. **Error Diagnosis**
If you see `❌ Failed to generate trends`:
1. Check Deno Deploy logs for API errors
2. Verify `GROQ_API_KEY` and `HUGGINGFACE_API_KEY` are set
3. Check network connectivity
4. Confirm database is accessible

## Tips for Debugging

### **If only RSS trends appear:**
1. Check that AI keys are set in Deno Deploy
2. Look for AI failures in the logs
3. Verify the `/api/generate-trends` endpoint is working

### **If no trends appear:**
1. Check database connection: Look for database errors in logs
2. Verify PostgreSQL is accessible
3. Check that tables are created

### **If generation is very slow:**
1. Check `Duration:` value
2. Verify network connection
3. Check Deno Deploy CPU usage

## Git Commit

```
Commit: 67f4c9d
Add detailed AI trends generation logging with source tracking (GROQ/HF/RSS)
```
