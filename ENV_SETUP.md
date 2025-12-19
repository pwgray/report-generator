# Web Frontend Environment Variables Setup

Create a `.env.local` file in the `web/` directory with the following variables:

## Required Variables

```env
# API Server URL (backend endpoint)
# For local development with server running on port 4000:
VITE_API_URL=http://localhost:4000

# Google Gemini API Key (for client-side AI features)
# WARNING: Keys in VITE_* variables are exposed in the compiled bundle!
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```


## Example .env.local File

For local development:

```env
VITE_API_URL=http://localhost:4000
VITE_GEMINI_API_KEY=your_actual_api_key_here
```

## Production Deployment

For production builds, consider:

1. **Use a production API server URL**:
   ```env
   VITE_API_URL=https://your-api-domain.com
   ```

2. **Security Warning**: The `VITE_GEMINI_API_KEY` variable is embedded in the compiled JavaScript bundle and **can be extracted by end users**. 

   **Recommended**: Remove client-side AI calls and route all AI requests through your backend API to keep the API key secure.

## Important Notes

- Vite requires all client-side environment variables to be prefixed with `VITE_`
- The `.env.local` file is automatically ignored by git (don't commit it!)
- Changes to `.env.local` require restarting the dev server (`npm run dev`)
- Use `.env.production` for production-specific values if needed

