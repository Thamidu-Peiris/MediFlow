# MediFlow - AI-Enabled Smart Healthcare Platform

Starter monorepo for a microservices-based healthcare appointment and telemedicine system.

## Project Structure

```text
MediFlow/
├── frontend/
├── backend/
│   ├── api-gateway/
│   ├── services/
│   ├── docker-compose.yml
│   └── k8s/
├── readme.txt
└── README.md
```

## Quick Start (Local)

1. Copy env files:
   - `cp .env.example .env`
   - Copy each service `*.env.example` to `.env` inside the service folder.
2. Start all backend services:
   - `docker compose -f backend/docker-compose.yml up --build`
3. Start frontend:
   - `cd frontend && npm install && npm run dev`
4. Gateway health:
   - `http://localhost:8081/api/health`

## Short Commands

- `npm run up` - start backend containers
- `npm run up:build` - rebuild and start backend containers
- `npm run down` - stop/remove backend containers
- `npm run logs` - follow backend logs

## MongoDB Atlas

- Create a cluster in MongoDB Atlas.
- Add your IP to Network Access.
- Create a DB user and password.
- Set `MONGODB_URI` in each service `.env` (copy from `*.env.example`).

## Services

- API Gateway (`backend/api-gateway`)
- Auth Service
- Patient Service
- Doctor Service
- Appointment Service
- Notification Service
- Payment Service
- Telemedicine Service
- AI Service (Gemini 3 symptom checker — `GEMINI_API_KEY` / `GEMINI_MODEL` in `services/ai-service/.env`; see [Gemini 3 guide](https://ai.google.dev/gemini-api/docs/gemini-3))

## Implemented Module (Current)

### Auth Service APIs

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (Bearer token)

### Patient Service APIs

- `GET /api/patients/profiles/me` (Bearer token)
- `POST /api/patients/profiles/me` (Bearer token)
- `PUT /api/patients/profiles/me` (Bearer token)
- `GET /api/patients/reports` (Bearer token)
- `POST /api/patients/reports/upload` (multipart file field: `report`)

## Deliverables Placeholders

- `submission.txt` - add GitHub + YouTube links.
- `members.txt` - add group members and IDs.
- `readme.txt` - deployment steps for submission.
- `report.pdf` - final report (add manually).
