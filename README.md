# SAREX Fitness Clinic

## Demo and staging API proxy

The Vercel deployment exposes the Render API through the frontend origin:

```text
Browser: https://sarexgym-zeta.vercel.app/api/v1/...
Render:  https://sarexgym.onrender.com/api/v1/...
```

`vercel.json` performs this external rewrite. Production builds use relative `/api` URLs by default, which lets Safari treat the session cookie as first-party for the Vercel site. The Express service, PostgreSQL database, business rules, CSRF validation, and Paystack webhook remain on Render.

For Vercel demo or staging deployments, leave `VITE_API_MODE` unset or set it to `proxy`. `VITE_API_BASE_URL` is used for local development and is intentionally ignored by production builds in proxy mode. Keep Render's `FRONTEND_URL` set to the exact Vercel origin.

The Paystack webhook should continue to target the direct Render endpoint:

```text
https://sarexgym.onrender.com/api/v1/webhooks/paystack
```

## Testing the SAREX AI assistant with Groq

Set these variables in the Render backend service's **Environment** settings, then redeploy:

```text
AI_PROVIDER=groq
AI_API_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=openai/gpt-oss-20b
AI_API_KEY=<Groq API key entered in Render as a secret>
```

The Groq base URL and model are defaults when `AI_PROVIDER=groq`, so those two values may be omitted. `AI_API_KEY` is read only by the Express server; never add it to Vercel frontend settings or a `VITE_` variable. To use OpenAI or another OpenAI-compatible provider, set `AI_PROVIDER=openai-compatible` and configure its server-side base URL, model and key.

To roll back, set `VITE_API_MODE=direct` and `VITE_API_BASE_URL=https://sarexgym.onrender.com` in Vercel, redeploy, and optionally remove the `/api/:path*` rewrite. This restores direct cross-origin browser requests without changing the backend or database.
