MediFlow Deployment Steps
=========================

1. Prerequisites
   - Install Node.js 20+
   - Install Docker Desktop
   - Install kubectl (for Kubernetes deployment)

2. Clone project
   - git clone <your-repo-url>
   - cd MediFlow

3. Configure environments
   - Copy `.env.example` to `.env` at root (optional global)
   - In each service/frontend folder, copy `.env.example` to `.env` if needed
   - Set valid `MONGODB_URI` from MongoDB Atlas for each backend service

4. Run backend via Docker Compose
   - docker compose -f backend/docker-compose.yml up --build

5. Run frontend
   - cd frontend
   - npm install
   - npm run dev

6. Access application
   - Frontend: http://localhost:5173
   - API Gateway: http://localhost:8081/api/health

7. Kubernetes (initial setup)
   - kubectl apply -f backend/k8s/namespace.yaml
   - kubectl apply -f backend/k8s/api-gateway.yaml
   - kubectl apply -f backend/k8s/auth-service.yaml
