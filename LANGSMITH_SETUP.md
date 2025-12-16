# LangSmith Setup Guide

LangSmith provides observability and monitoring for your LLM applications.

## Option 1: Using Environment Variables (Recommended for Development)

### Step 1: Get Your LangSmith API Key

1. Go to https://smith.langchain.com/
2. Sign up or log in
3. Navigate to Settings > API Keys
4. Create a new API key (starts with `lsv2_pt_...`)

### Step 2: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```env
   VITE_LANGCHAIN_TRACING_V2=true
   VITE_LANGCHAIN_API_KEY=lsv2_pt_your_actual_key_here
   VITE_LANGCHAIN_PROJECT=my-project-name
   ```

3. Restart your dev server:
   ```bash
   npm run dev
   ```

### Step 3: Verify It's Working

1. Open your browser console
2. Look for: `✅ LangSmith tracing enabled`
3. Make a chat interaction
4. Check https://smith.langchain.com/ for traces

## Option 2: Using Settings UI (Runtime Configuration)

**Note:** Runtime configuration works but has limitations in browser environments due to CORS and security restrictions.

1. Go to Settings page in the app
2. Scroll to "LangSmith Configuration"
3. Check "Enable LangSmith Tracing"
4. Enter your API Key and Project Name
5. Click "Save Global Settings"

## What Gets Tracked?

With LangSmith enabled, you'll see:

- 📊 All chat conversations
- 📊 Rule evaluation calls
- ⏱️ Latency and performance metrics
- 💰 Token usage and costs
- 🔄 Full input/output traces
- ❌ Errors and exceptions

## Troubleshooting

### Not seeing traces?

1. Check browser console for errors
2. Verify API key is correct (starts with `lsv2_pt_`)
3. Make sure project name doesn't have spaces or special characters
4. Restart dev server after changing `.env`

### CORS errors?

LangSmith tracing from browser apps may have CORS restrictions. For production:
- Consider implementing server-side tracing
- Or use LangSmith's proxy service
- Or implement your own backend proxy

## Production Deployment

For production, set environment variables in your hosting platform:

### Vercel
```bash
vercel env add VITE_LANGCHAIN_TRACING_V2
vercel env add VITE_LANGCHAIN_API_KEY
vercel env add VITE_LANGCHAIN_PROJECT
```

### Netlify
Add in Site Settings > Build & Deploy > Environment Variables

### Other Platforms
Consult your platform's documentation for setting environment variables.

## Security Note

⚠️ **Important**: API keys in client-side code are visible to users. For production:
- Consider server-side tracing only
- Or use LangSmith's public/private key separation
- Never commit `.env` files to git (already in `.gitignore`)


