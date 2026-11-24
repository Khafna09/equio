# Postal staging pilot

Do not enable this pilot in production. The webhook accepts only the configured Postal inbox, and applies only to one verified Equio account. Use a dedicated Postal team and synthetic messages: the Postal read endpoint requires a full-access team key, not a mailbox-only key. Store credentials in Render, never in the repository or Cloudflare Pages.

## Deployment order

1. Verify V18 and V19 on an isolated PostgreSQL database using the staging runtime role. Verify deny-by-default RLS, separation of two users, repeat submission, lease recovery and atomic approval.
2. Deploy the staging backend. Register only the `email.received` event in Postal with the direct Render URL `https://equio-staging-api.onrender.com/api/v1/webhooks/postal`. Do not use the Pages proxy for the webhook; it does not forward signature headers. If offered, keep the webhook paused until the backend is ready.
3. Put the following values in the Render service environment:
   - `EQUIO_POSTAL_INBOX_ID`: UUID of the dedicated inbox from its Postal URL.
   - `EQUIO_POSTAL_OWNER_ID`: numeric ID of the intended staging account, independently checked by an operator from Neon. Do not guess or use the profile row ID.
   - `EQUIO_POSTAL_API_KEY`: full-access key for the dedicated Postal test team.
   - `EQUIO_POSTAL_WEBHOOK_SECRET`: the signing secret belonging to that webhook.
   - `EQUIO_EMAIL_JEV_API_KEY`: TypeSafe staging key.
   - `APP_EMAIL_POSTAL_ENABLED=true`: enables the webhook and scheduled worker.
4. Verify an unsigned request is rejected; use Send test event in Postal to confirm signed delivery. Deploy the Pages bundle built with `VITE_EMAIL_DRAFTS_ENABLED=true` and the existing same-origin proxy.
5. Resend the two synthetic emails after the webhook is active. In Equio open History > Email drafts. Approve the clear draft and verify exactly one expense. Verify the ambiguous message in the review count and confirm the TypeSafe call in Usage. A replay of the same Postal event must not create a second draft; a separately sent new email has a different ID and is not covered by this deduplication.

To stop intake, pause the Postal webhook and set `APP_EMAIL_POSTAL_ENABLED=false`. Review and failed delivery metadata are retained in PostgreSQL; this pilot summarizes them by count and does not provide replay or individual review in Equio. Use Postal to inspect the original synthetic messages.
