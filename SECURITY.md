# Security Policy

## Supported Versions

| Version | Supported |
| --- | --- |
| 1.0.x | Yes |

## Reporting A Vulnerability

If you find a security issue, do not open a public issue with exploit details.

Please contact Kurt McCarver through the project owner account or private project channels with:

- A short description of the issue
- Steps to reproduce
- Affected route, API endpoint, or dependency
- Any relevant logs or screenshots

## Data And Secrets

- Do not commit `.env.local`, Supabase service role keys, admin tokens, broker credentials, exchange API keys, or account credentials.
- The Supabase service role key must only be used server-side.
- Rotate any exposed key immediately.
- Trade and settings data are local-first and stored in browser local storage.
- Supabase is used only for feedback submissions and the private admin feedback page.

## Current Protections

- Server-side rate limiting for feedback submissions
- Server-side rate limiting for price requests
- Admin feedback route protected by `FEEDBACK_ADMIN_TOKEN`
- Row-level security policy for the Supabase feedback table
- Input length limits and text normalization before feedback storage
- Vercel server runtime for service-role Supabase requests

## User Safety

This app is a journal, analytics, and calculator tool. It does not place trades, connect to broker accounts, or provide financial advice. Price data can vary by venue and should be verified against the user's broker or exchange before trading.
