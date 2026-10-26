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

## Daily management operations summary

The staff and administrator dashboards show the previous calendar day's operations after the first dashboard visit following login. The backend uses the timezone of the earliest active branch (ordered by creation time and ID), falling back to `Africa/Lagos` when no active branch is configured. Reporting windows are half-open: local midnight yesterday through, but not including, local midnight today.

The summary includes persisted successful check-in events, unique members, saved denial reasons, peak check-in hour, successful payment totals grouped by currency and method, new members created, paid renewals, and memberships with expired status whose scheduled end fell yesterday. Revenue uses successful payment records and `paid_at`; pending orders are excluded. A renewal is a successful membership payment linked to a subscription for a member with a prior successful membership payment.

The API requires an authenticated `admin` or `staff` role and the existing `payments.view` permission. Dismissal is stored once per account and gym-local display date in PostgreSQL, so it remains dismissed across refreshes and devices; the dashboard's “Yesterday's summary” action reopens the same report. A database primary key handles concurrent presentation requests.

