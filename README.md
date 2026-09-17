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

To roll back, set `VITE_API_MODE=direct` and `VITE_API_BASE_URL=https://sarexgym.onrender.com` in Vercel, redeploy, and optionally remove the `/api/:path*` rewrite. This restores direct cross-origin browser requests without changing the backend or database.
