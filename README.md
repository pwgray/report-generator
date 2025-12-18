<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1mu33uerwFmMpDYt5PADukienhcrZM-IV

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create a `.env.local` at the project root and set the `VITE_GEMINI_API_KEY` to your Gemini API key (Vite uses `import.meta.env.VITE_*` variables):

```
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```
3. Run the app:
   `npm run dev`

## Security

- **Do not** commit API keys or other secrets into the repository. Add `.env.local` to your local `.gitignore` (it is commonly ignored by default) and never push files containing `VITE_GEMINI_API_KEY` or other credentials.
- **Avoid embedding production secrets in frontend builds.** Vite exposes `import.meta.env.VITE_*` values in the compiled bundle — a public build can expose those values to end users. For production, move calls that require secrets to a trusted server-side endpoint (API gateway / serverless function) and have the frontend call that endpoint instead.
- **Rotate keys regularly** and use least-privilege credentials for AI services.
