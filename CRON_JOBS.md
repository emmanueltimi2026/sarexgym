# SAREX Internal Cron Jobs

This project keeps the Render backend as the source of truth. External schedulers only trigger protected HTTP endpoints; the same business logic is also used by the CLI commands.

## Render Environment Variable

Set this only on the backend service:

```text
CRON_SECRET=<strong-random-secret>
```

Use a long random value from a password manager or a command such as:

```bash
openssl rand -base64 48
```

Never expose this value through `VITE_` variables, frontend code, logs, screenshots, or client-side configuration.

## cron-job.org Setup

### Activate Scheduled Subscriptions

- URL: `https://sarexgym.onrender.com/api/internal/jobs/activate-subscriptions`
- Method: `POST`
- Schedule: every 10 minutes
- Header: `Authorization: Bearer <CRON_SECRET>`
- Expected success response:

```json
{
  "ok": true,
  "job": "activate-subscriptions",
  "alreadyRunning": false,
  "scanned": 2,
  "activated": 2,
  "expired": 1,
  "skipped": 0,
  "failures": 0
}
```

### Expiry Notifications

- URL: `https://sarexgym.onrender.com/api/internal/jobs/expiry-notifications`
- Method: `POST`
- Schedule: every hour
- Header: `Authorization: Bearer <CRON_SECRET>`
- Expected success response:

```json
{
  "ok": true,
  "job": "expiry-notifications",
  "alreadyRunning": false,
  "scanned": 5,
  "created": 3,
  "skipped": 2,
  "emailSent": 3,
  "emailFailed": 0,
  "failures": 0
}
```

If cron-job.org retries while a previous run is still active, the endpoint can return HTTP `202` with `alreadyRunning: true`. That response is safe and should not be treated as data corruption.

## Timeout and Retry Guidance

- Set cron-job.org timeout to about 30 seconds.
- Retries are safe because each job is idempotent and guarded by a PostgreSQL advisory lock.
- Render cold starts are safe. A delayed activation run still catches scheduled subscriptions where `starts_at <= now()`.
- Missed activation runs are safe because the next run catches overdue scheduled subscriptions.
- Expiry notifications are deduplicated at the database/business-rule level so repeated hourly runs do not create duplicate in-app notifications for the same notification window.

## CLI Commands

These commands remain available for manual operation and local testing:

```bash
pnpm job:activate-subscriptions
pnpm job:expiry-notifications
```

Both commands call the same shared job logic as the HTTP endpoints.

## Secret Rotation

The current implementation uses one active `CRON_SECRET`.

1. Generate a new strong secret.
2. Update `CRON_SECRET` on Render.
3. Redeploy or restart the backend service.
4. Immediately update both cron-job.org jobs with the new `Authorization` header.
5. Trigger each cron job manually once.
6. Confirm Render logs show successful `200` or safe `202` responses.

During the short window between the Render update and cron-job.org update, requests using the old secret will be rejected. For zero-downtime rotation, add temporary dual-secret support before rotating.

## Portability

cron-job.org is only the scheduler. Render Cron or another scheduler can replace it later by calling the same protected endpoints with the same method and header. Business logic does not need to move.
