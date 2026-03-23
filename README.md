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
├── submission.txt
├── readme.txt
├── members.txt
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

## Services

- API Gateway (`backend/api-gateway`)
- Auth Service
- Patient Service
- Doctor Service
- Appointment Service
- Notification Service
- Payment Service
- Telemedicine Service
- AI Service (optional enhancement)

## Deliverables Placeholders

- `submission.txt` - add GitHub + YouTube links.
- `members.txt` - add group members and IDs.
- `readme.txt` - deployment steps for submission.
- `report.pdf` - final report (add manually).
