# AI Diary Service

Next.js frontend + FastAPI backend + PostgreSQL/Prisma starter for an AI diary chatbot service.

## Structure

```txt
apps/
  web/  Next.js app
  api/  FastAPI app
```

## Setup

```powershell
npm install
Copy-Item .env.example .env
Copy-Item apps/web/.env.example apps/web/.env
npm run db:up
npm run prisma:generate
npm run prisma:migrate
cd apps/api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..\..
npm run dev
```

Web: http://localhost:3000

API: http://localhost:8000/docs

Prisma Studio:

```powershell
npm run prisma:studio
```

## Google Login

Set these values in `.env` and `apps/web/.env`:

```env
AUTH_SECRET=replace-with-random-secret
AUTH_GOOGLE_ID=replace-with-google-client-id
AUTH_GOOGLE_SECRET=replace-with-google-client-secret
```

Google OAuth authorized redirect URI for local development:

```txt
http://localhost:3000/api/auth/callback/google
```
