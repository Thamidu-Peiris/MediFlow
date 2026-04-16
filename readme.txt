================================================================================
  MediFlow – AI-Enabled Smart Healthcare Platform
  Deployment Guide
================================================================================

GROUP MEMBERS
--------------
  - Sandaru   : Payment Service / AI Symptom Checker Service
  - Thamidu   : Patient Management Service / Auth Service
  - Dilshan   : Appointment Service / Telemedicine Service
  - Aloka     : Doctor Management Service / Notification Service

--------------------------------------------------------------------------------
PREREQUISITES
--------------------------------------------------------------------------------
  - Node.js v18+ (https://nodejs.org)
  - npm v9+
  - Docker Desktop (https://www.docker.com/products/docker-desktop/)
  - Docker Compose v2+ (bundled with Docker Desktop)
  - Git
  - MongoDB Atlas account (https://cloud.mongodb.com) OR local MongoDB 6+
  - Cloudinary account (https://cloudinary.com) – required for file uploads
  - Agora account (https://www.agora.io) – required for video calls
  - Stripe account (https://stripe.com) – required for payments
  - Google AI Studio account – for Gemini API key (https://aistudio.google.com)
  - Brevo account (https://brevo.com) – required for email notifications (optional)
  - Twilio account (https://twilio.com) – required for SMS notifications (optional)

================================================================================
STEP 1 – CLONE THE REPOSITORY
================================================================================

  git clone <your-github-repo-url>
  cd MediFlow

================================================================================
STEP 2 – CONFIGURE ENVIRONMENT VARIABLES
================================================================================

  Each service has a .env.example file. Copy each to .env and fill in values.

  2.1  Auth Service
  -----------------
  cd backend/services/auth-service
  copy .env.example .env     (Windows)
  # or: cp .env.example .env (Mac/Linux)

  Edit backend/services/auth-service/.env:
    PORT=8001
    JWT_SECRET=<strong-random-secret-min-32-chars>
    MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/mediflow-auth?retryWrites=true&w=majority
    ADMIN_BOOTSTRAP_KEY=<admin-bootstrap-key>

  2.2  Patient Service
  --------------------
  cd backend/services/patient-service
  copy .env.example .env

  Edit backend/services/patient-service/.env:
    PORT=8002
    MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/mediflow-patient?retryWrites=true&w=majority
    JWT_SECRET=<same-as-auth-service>
    CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud-name>
    CLOUDINARY_API_KEY=<your-cloudinary-api-key>
    CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>

  2.3  Doctor Service
  -------------------
  cd backend/services/doctor-service
  copy .env.example .env

  Edit backend/services/doctor-service/.env:
    PORT=8003
    MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/mediflow-doctor?retryWrites=true&w=majority
    JWT_SECRET=<same-as-auth-service>
    CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud-name>
    CLOUDINARY_API_KEY=<your-cloudinary-api-key>
    CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>

  2.4  Appointment Service
  ------------------------
  cd backend/services/appointment-service
  copy .env.example .env

  Edit backend/services/appointment-service/.env:
    PORT=8004
    MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/mediflow-appointment?retryWrites=true&w=majority
    JWT_SECRET=<same-as-auth-service>
    NOTIFICATION_SERVICE_URL=http://notification-service:8005

  2.5  Notification Service
  -------------------------
  cd backend/services/notification-service
  copy .env.example .env

  Edit backend/services/notification-service/.env:
    PORT=8005
    MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/mediflow-notification?retryWrites=true&w=majority
    SMTP_HOST=smtp-relay.brevo.com
    SMTP_PORT=587
    SMTP_USER=<brevo-login-email>
    SMTP_PASSWORD=<brevo-smtp-key>
    SMTP_FROM_EMAIL=no-reply@yourdomain.com
    SMTP_FROM_NAME=MediFlow Notifications
    TWILIO_ACCOUNT_SID=<twilio-sid>
    TWILIO_AUTH_TOKEN=<twilio-token>
    TWILIO_PHONE_NUMBER=<twilio-number>

  2.6  Payment Service
  --------------------
  cd backend/services/payment-service
  copy .env.example .env

  Edit backend/services/payment-service/.env:
    PORT=8006
    MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/mediflow-payment?retryWrites=true&w=majority
    JWT_SECRET=<same-as-auth-service>
    STRIPE_SECRET_KEY=sk_test_<your-stripe-key>
    STRIPE_PUBLISHABLE_KEY=pk_test_<your-stripe-key>
    STRIPE_WEBHOOK_SECRET=whsec_<from-stripe-listen>
    APPOINTMENT_SERVICE_URL=http://appointment-service:8004
    DOCTOR_SERVICE_URL=http://doctor-service:8003
    PAYHERE_MERCHANT_ID=<payhere-merchant-id>
    PAYHERE_MERCHANT_SECRET=<payhere-secret>
    PAYHERE_SANDBOX=true
    API_PUBLIC_URL=http://localhost:8081
    FRONTEND_URL=http://localhost:5173

  2.7  Telemedicine Service
  -------------------------
  cd backend/services/telemedicine-service
  copy .env.example .env

  Edit backend/services/telemedicine-service/.env:
    PORT=8007
    MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/mediflow-telemedicine?retryWrites=true&w=majority
    JWT_SECRET=<same-as-auth-service>
    AGORA_APP_ID=<your-agora-app-id>
    AGORA_APP_CERTIFICATE=<your-agora-certificate>
    NOTIFICATION_SERVICE_URL=http://notification-service:8005

  2.8  AI Service
  ---------------
  cd backend/services/ai-service
  copy .env.example .env

  Edit backend/services/ai-service/.env:
    PORT=8008
    MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/mediflow-ai?retryWrites=true&w=majority
    JWT_SECRET=<same-as-auth-service>
    GEMINI_API_KEY=<your-google-gemini-api-key>
    GEMINI_MODEL=gemini-3-flash-preview

  2.9  API Gateway
  ----------------
  cd backend/api-gateway
  copy .env.example .env

  Edit backend/api-gateway/.env:
    PORT=8080
    AUTH_SERVICE_URL=http://auth-service:8001
    PATIENT_SERVICE_URL=http://patient-service:8002
    DOCTOR_SERVICE_URL=http://doctor-service:8003
    APPOINTMENT_SERVICE_URL=http://appointment-service:8004
    NOTIFICATION_SERVICE_URL=http://notification-service:8005
    PAYMENT_SERVICE_URL=http://payment-service:8006
    TELEMEDICINE_SERVICE_URL=http://telemedicine-service:8007
    AI_SERVICE_URL=http://ai-service:8008

  2.10  Frontend
  --------------
  cd frontend
  copy .env.example .env   (if exists)

  Create frontend/.env:
    VITE_API_BASE_URL=http://localhost:8081/api
    VITE_AGORA_APP_ID=<your-agora-app-id>

================================================================================
STEP 3 – DEPLOY BACKEND (Docker Compose)
================================================================================

  From the project root:

    cd backend
    docker compose up --build

  This will build and start all 9 containers:
    api-gateway       → http://localhost:8081
    auth-service      → http://localhost:8001
    patient-service   → http://localhost:8002
    doctor-service    → http://localhost:8003
    appointment-service → http://localhost:8004
    notification-service → http://localhost:8005
    payment-service   → http://localhost:8006
    telemedicine-service → http://localhost:8007
    ai-service        → http://localhost:8008

  Run in background (detached):
    docker compose up --build -d

  Verify all services are healthy:
    curl http://localhost:8081/api/health
    curl http://localhost:8001/health
    curl http://localhost:8002/health
    curl http://localhost:8008/health

================================================================================
STEP 4 – DEPLOY FRONTEND
================================================================================

  From the project root:

    cd frontend
    npm install
    npm run dev       ← development server at http://localhost:5173

  For production build:
    npm run build
    npm run preview   ← preview production build at http://localhost:4173

================================================================================
STEP 5 – BOOTSTRAP ADMIN USER
================================================================================

  After services are running, create the first admin account:

    POST http://localhost:8081/api/auth/admin/bootstrap
    Content-Type: application/json

    {
      "email": "admin@mediflow.com",
      "password": "AdminPassword123!",
      "name": "Admin",
      "bootstrapKey": "<ADMIN_BOOTSTRAP_KEY from auth-service .env>"
    }

================================================================================
STEP 6 – STRIPE WEBHOOK (Local Development)
================================================================================

  Install the Stripe CLI:
    https://docs.stripe.com/stripe-cli

  Forward webhooks:
    stripe listen --forward-to http://localhost:8081/api/payments/webhook

  Copy the webhook secret printed by the CLI into:
    STRIPE_WEBHOOK_SECRET in payment-service/.env

================================================================================
STEP 7 – SHORT COMMANDS (from project root)
================================================================================

  npm run up          Start backend containers (docker compose up)
  npm run up:build    Rebuild and start backend containers
  npm run down        Stop and remove containers
  npm run logs        Follow all container logs

================================================================================
STEP 8 – RUNNING WITHOUT DOCKER (Manual / Development)
================================================================================

  Open a separate terminal for each service and run:

    cd backend/services/auth-service && npm install && npm start
    cd backend/services/patient-service && npm install && npm start
    cd backend/services/doctor-service && npm install && npm start
    cd backend/services/appointment-service && npm install && npm start
    cd backend/services/notification-service && npm install && npm start
    cd backend/services/payment-service && npm install && npm start
    cd backend/services/telemedicine-service && npm install && npm start
    cd backend/services/ai-service && npm install && npm start
    cd backend/api-gateway && npm install && npm start
    cd frontend && npm install && npm run dev

  NOTE: When running without Docker, update all SERVICE_URL variables in
  each .env to use "http://localhost:<port>" instead of the container names.
  e.g., NOTIFICATION_SERVICE_URL=http://localhost:8005

================================================================================
TROUBLESHOOTING
================================================================================

  - Docker containers not starting: Check docker logs <container-name>
  - MongoDB connection errors: Verify your Atlas IP whitelist includes 0.0.0.0/0
    (or your current IP) and the MONGODB_URI is correct
  - Cloudinary uploads failing: Confirm CLOUDINARY_CLOUD_NAME/API_KEY/SECRET
  - Agora video not connecting: Check AGORA_APP_ID and AGORA_APP_CERTIFICATE
  - Gemini AI not working: Ensure GEMINI_API_KEY is valid and model name is correct
  - JWT errors across services: Ensure JWT_SECRET is identical in all services
  - CORS issues: Ensure FRONTEND_URL is set correctly in payment-service

================================================================================
PROJECT URLS (after deployment)
================================================================================

  Frontend App:         http://localhost:5173
  API Gateway:          http://localhost:8081
  API Health Check:     http://localhost:8081/api/health

================================================================================
