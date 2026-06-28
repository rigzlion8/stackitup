## Maisha Predictions

Local development:

1) Copy ENV.example to .env and fill values:

- VITE_API_BASE=
- PORT=4000
- CLIENT_URL=http://localhost:5173
- SESSION_SECRET=change_me
- GOOGLE_CLIENT_ID=
- GOOGLE_CLIENT_SECRET=
- OPENROUTER_API_KEY=
- RESEND_API_KEY= (optional)

2) Install deps:

```bash
npm install
```

3) Start dev servers:

```bash
npm run dev
```

This runs:
- Client: Vite on http://localhost:5173
- Server: Express on http://localhost:4000

Notes:
- Google SSO requires OAuth credentials with callback: http://localhost:4000/auth/google/callback
- Predictions are generated via OpenRouter (uses OpenAI-compatible SDK)
- Demo data for matches/leagues is seeded automatically


