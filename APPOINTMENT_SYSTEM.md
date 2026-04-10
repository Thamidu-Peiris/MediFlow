# MediFlow — Appointment System Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Authentication & Authorization](#authentication--authorization)
6. [Appointment Status Flow](#appointment-status-flow)
7. [Business Logic](#business-logic)
8. [Frontend Pages & Components](#frontend-pages--components)
9. [Inter-Service Communication](#inter-service-communication)
10. [Configuration & Environment](#configuration--environment)

---

## Overview

The MediFlow Appointment System enables patients to book, view, reschedule, and cancel appointments with doctors. Doctors can manage incoming requests by accepting, rejecting, or marking them as completed. The system runs as a dedicated **appointment-service** microservice within the MediFlow backend architecture.

**Service Port:** `8004`  
**API Gateway Path Prefix:** `/api/appointments` → proxied to `http://localhost:8004`

---

## Architecture

```
Frontend (React, Port 5173)
        │
        ▼
API Gateway (Port 8080/8081)
        │  /api/appointments/** → http://appointment-service:8004
        ▼
Appointment Service (Port 8004)
        │
        ├── MongoDB Atlas (mediflow-appointment collection)
        ├── Patient Service (Port 8002) — patient profile enrichment
        └── Payment Service (Port 8006) — occupied slot cross-check
```

**Key Files:**

| Path | Purpose |
|------|---------|
| `backend/services/appointment-service/src/app.js` | Express server entry point |
| `backend/services/appointment-service/src/config/db.js` | MongoDB connection |
| `backend/services/appointment-service/src/models/appointment.model.js` | Mongoose schema |
| `backend/services/appointment-service/src/routes/appointment.routes.js` | Route definitions |
| `backend/services/appointment-service/src/controllers/appointment.controller.js` | Business logic |
| `backend/services/appointment-service/src/middleware/auth.middleware.js` | JWT auth & RBAC |
| `frontend/src/pages/PatientAppointmentsPage.jsx` | Patient appointments UI |
| `frontend/src/pages/PatientDoctorBookingPage.jsx` | Booking / scheduling UI |
| `frontend/src/pages/DoctorAppointmentsPage.jsx` | Doctor appointments UI |
| `frontend/src/components/AppointmentDateRangePicker.jsx` | Date range filter component |

---

## Database Schema

**Collection:** `appointments`  
**Database:** MongoDB Atlas (`mediflow-appointment`)

```js
{
  _id:             ObjectId,           // Auto-generated
  patientId:       String (required),  // JWT sub — indexed
  patientName:     String (default ""),
  doctorId:        String (required),  // Indexed
  doctorName:      String (default ""),
  specialization:  String (default ""),
  date:            String (required),  // Format: YYYY-MM-DD
  time:            String (default ""),// Format: h:mm AM/PM  e.g. "2:30 PM"
  reason:          String (default ""),// Patient-provided reason
  appointmentType: String (enum),      // "physical" | "online", default "physical"
  status:          String (enum),      // See status flow below, default "pending"
  sessionId:       String (default ""),// Links to telemedicine session
  notes:           String (default ""),// Doctor notes (set on completion)
  createdAt:       Date,               // Auto (timestamps: true)
  updatedAt:       Date                // Auto (timestamps: true)
}
```

**Status Enum Values:** `pending` | `accepted` | `rejected` | `completed` | `cancelled`

**Indexes:** `patientId` (single-field), `doctorId` (single-field)

---

## API Endpoints

All routes are mounted at the root `/` of the appointment-service. Via the API Gateway they are accessible at `/api/appointments/...`.

### Public Routes (No Authentication)

#### `GET /public/doctor/:doctorId/occupied`

Returns all occupied time slots for a specific doctor on a given date. Combines data from both the appointment-service and the payment-service (pending payments).

**Query Parameters:**

| Param | Required | Description |
|-------|----------|-------------|
| `date` | Yes | Date in `YYYY-MM-DD` format |

**Response `200`:**
```json
{
  "occupiedTimes": ["9:00 AM", "11:00 AM", "2:00 PM"]
}
```

**Notes:**
- Excludes appointments with status `cancelled` or `rejected`
- Merges occupied times from payment-service (`/doctor-occupied`) with a 3-second timeout fallback
- Used by the booking and reschedule UIs to gray out booked slots in real time

---

### Patient Routes (Auth Required — Role: `patient` or `admin`)

#### `POST /`

Request (create) a new appointment.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

| Field | Required | Description |
|-------|----------|-------------|
| `doctorId` | Yes | Target doctor's user ID |
| `date` | Yes | Appointment date (`YYYY-MM-DD`) |
| `time` | No | Appointment time (`h:mm AM/PM`) |
| `doctorName` | No | Doctor's display name |
| `specialization` | No | Doctor's specialization |
| `reason` | No | Patient-provided reason for visit |
| `appointmentType` | No | `"physical"` or `"online"` (default: `"physical"`) |
| `patientName` | No | Overrides JWT name (used by payment-service) |
| `sessionId` | No | Pre-set telemedicine session ID |
| `notes` | No | Pre-set notes (used by payment-service) |

**Validation:**
- `doctorId` and `date` are required — returns `400` if missing
- `time` must match regex `^(\d{1,2}):(\d{2})\s*(AM|PM)$` — returns `400` if invalid
- Conflict check: if the doctor already has an active (non-cancelled, non-rejected) appointment at the same `date` + `time`, returns `409`

**Response `201`:**
```json
{
  "appointment": { ...appointmentObject }
}
```

---

#### `GET /my`

List all appointments for the authenticated patient, sorted newest first.

**Headers:** `Authorization: Bearer <token>`

**Response `200`:**
```json
{
  "appointments": [ ...appointmentObjects ]
}
```

**Notes:**
- Backfills missing `patientName`, `sessionId`, and `notes` fields automatically
  - `patientName` falls back to JWT `name` claim
  - `sessionId` falls back to the appointment `_id`
  - `notes` falls back to `reason` or `"Consultation paid"`

---

#### `PATCH /:id/cancel`

Cancel an appointment. Only the owning patient can cancel, and only if the status is `pending` or `accepted`.

**Headers:** `Authorization: Bearer <token>`

**Response `200`:**
```json
{
  "appointment": { ...appointmentObject, "status": "cancelled" }
}
```

**Error `404`:** Appointment not found, not owned by patient, or not in a cancellable state.

---

#### `PATCH /:id/reschedule`

Reschedule an appointment to a new date and time. Only works when status is `pending` or `accepted`.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

| Field | Required | Description |
|-------|----------|-------------|
| `date` | Yes | New date (`YYYY-MM-DD`) |
| `time` | Yes | New time (`h:mm AM/PM`) |

**Validation:**
- Both `date` and `time` are required — returns `400` if missing
- `time` must match `h:mm AM/PM` format — returns `400` if invalid
- Conflict check against the doctor's other active appointments at the new slot — returns `409` if taken

**Response `200`:**
```json
{
  "appointment": { ...appointmentObject }
}
```

---

### Doctor Routes (Auth Required — Role: `doctor` or `admin`)

#### `GET /doctor`

List all appointments for the authenticated doctor, sorted newest first. Optionally filter by status.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

| Param | Required | Description |
|-------|----------|-------------|
| `status` | No | Filter by status (e.g. `pending`, `accepted`) |

**Response `200`:**
```json
{
  "appointments": [
    {
      ...appointmentFields,
      "patientImage": "https://...",
      "patientAge": 34,
      "patientGender": "Male",
      "bloodType": "O+ Positive"
    }
  ]
}
```

**Notes:**
- Uses `.lean()` for performance
- Enriches each appointment with patient profile data fetched from the `patients` collection:
  - `patientImage` (avatar URL)
  - `patientAge` (from `patients.age` or calculated from `dob`)
  - `patientGender`
  - `bloodType`
  - `patientName` (from `patients.fullName`)
- Also backfills `patientName`, `sessionId`, and `notes` if missing

---

#### `PATCH /:id/accept`

Accept a `pending` appointment.

**Headers:** `Authorization: Bearer <token>`

**Response `200`:**
```json
{
  "appointment": { ...appointmentObject, "status": "accepted" }
}
```

**Error `404`:** Appointment not found, not owned by doctor, or not in `pending` status.

---

#### `PATCH /:id/reject`

Reject a `pending` appointment.

**Headers:** `Authorization: Bearer <token>`

**Response `200`:**
```json
{
  "appointment": { ...appointmentObject, "status": "rejected" }
}
```

**Error `404`:** Appointment not found, not owned by doctor, or not in `pending` status.

---

#### `PATCH /:id/complete`

Mark an `accepted` appointment as completed. Doctor can add notes at this stage.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

| Field | Required | Description |
|-------|----------|-------------|
| `notes` | No | Doctor's notes / consultation summary |

**Response `200`:**
```json
{
  "appointment": { ...appointmentObject, "status": "completed", "notes": "..." }
}
```

**Error `404`:** Appointment not found, not owned by doctor, or not in `accepted` status.

---

### Health Check

#### `GET /health`

```json
{ "service": "appointment-service", "status": "ok" }
```

---

## Authentication & Authorization

The service uses **JWT Bearer Token** authentication. Tokens are issued by the `auth-service` and validated locally in `auth.middleware.js`.

**Token Extraction:**
```
Authorization: Bearer <jwt>
```

**JWT Payload Used:**
| Claim | Usage |
|-------|-------|
| `sub` | Patient/Doctor ID — stored as `patientId` / used to filter `doctorId` |
| `name` | Display name — fallback for `patientName` |
| `role` | RBAC enforcement |

**Role-Based Access:**

| Role | Allowed Endpoints |
|------|------------------|
| `patient` | `POST /`, `GET /my`, `PATCH /:id/cancel`, `PATCH /:id/reschedule` |
| `doctor` | `GET /doctor`, `PATCH /:id/accept`, `PATCH /:id/reject`, `PATCH /:id/complete` |
| `admin` | All patient and doctor endpoints |

---

## Appointment Status Flow

```
                    ┌─────────┐
   Patient books →  │ PENDING │
                    └────┬────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
         ┌────────┐ ┌──────────┐ ┌───────────┐
         │ACCEPTED│ │ REJECTED │ │ CANCELLED │
         └────┬───┘ └──────────┘ └───────────┘
              │                        ▲
              │ (Patient can cancel)   │
              ├────────────────────────┘
              │
              ▼
         ┌───────────┐
         │ COMPLETED │
         └───────────┘
```

**Transition Rules:**

| From | To | Who | Condition |
|------|----|-----|-----------|
| (new) | `pending` | Patient | On appointment creation |
| `pending` | `accepted` | Doctor | Doctor accepts request |
| `pending` | `rejected` | Doctor | Doctor rejects request |
| `pending` | `cancelled` | Patient | Patient cancels |
| `accepted` | `cancelled` | Patient | Patient cancels |
| `accepted` | `completed` | Doctor | Doctor marks as done (with optional notes) |

---

## Business Logic

### Time Slot Validation

- Time must be in **12-hour format**: `h:mm AM/PM` (e.g. `9:00 AM`, `2:30 PM`)
- Validation regex: `^(\d{1,2}):(\d{2})\s*(AM|PM)$`
- Internal conversion to minutes: e.g. `"2:30 PM"` → `870 minutes`

### Conflict Detection

Before creating or rescheduling an appointment, the service checks:
```js
Appointment.findOne({
  doctorId,
  date,
  time,
  status: { $nin: ["cancelled", "rejected"] }
})
```
If a match exists, a `409 Conflict` is returned.

### Occupied Times — Dual Source Merge

The public endpoint `GET /public/doctor/:doctorId/occupied` merges data from two sources:

1. **Appointment Service** — active appointments (`status` not `cancelled`/`rejected`)
2. **Payment Service** — pending payment bookings (`GET /doctor-occupied`)

The payment service call has a **3-second timeout** and fails silently, so the booking UI still works if the payment service is down.

### Patient Data Backfill

Appointments created through older flows or the payment service may have missing fields. Both `listMyAppointments` and `listDoctorAppointments` automatically backfill:

| Field | Fallback Source |
|-------|----------------|
| `patientName` | JWT `name` claim (patient view) or `patients.fullName` (doctor view) |
| `sessionId` | Appointment `_id` |
| `notes` | `reason` field, or `"Consultation paid"` |

Changes are persisted to MongoDB via `Appointment.updateOne()`.

### Doctor View Patient Enrichment

When a doctor fetches their appointments, each record is enriched with data from the `patients` collection (cross-collection query within the same MongoDB cluster):

| Field Added | Source |
|-------------|--------|
| `patientImage` | `patients.avatar` |
| `patientAge` | `patients.age` (direct), or calculated from `patients.dob` |
| `patientGender` | `patients.gender` |
| `bloodType` | `patients.bloodType` |
| `patientName` | `patients.fullName` |

Age calculation (`calcAge`) accounts for whether the birthday has passed in the current year.

---

## Frontend Pages & Components

### Patient Pages

#### `PatientAppointmentsPage.jsx`
**Route:** `/patient/appointments`

Displays the authenticated patient's appointments in three tabs:

| Tab | Included Statuses |
|-----|------------------|
| Upcoming | `confirmed`, `accepted`, `pending`, `pending_payment`, `approved`, `scheduled`, `upcoming` |
| Completed | `completed`, `done` |
| Cancelled | `cancelled`, `rejected`, `failed`, `expired` |

**Actions available per appointment:**
- **Join Call** — navigates to `/telemedicine/:id` (only for `confirmed` status)
- **Reschedule** — opens reschedule modal; dynamically fetches available slots against doctor availability + occupied times
- **Cancel** — opens confirmation modal; calls `PATCH /appointments/:id/cancel`

**Reschedule Modal Logic:**
1. Fetches doctor list (`GET /doctors/public`)
2. Fetches occupied appointment times (`GET /appointments/public/doctor/:id/occupied`)
3. Fetches occupied payment times (`GET /payments/doctor-occupied`)
4. Filters `timeSlots` array (`09:00 AM` to `05:00 PM`, hourly) against doctor's weekly availability schedule
5. Removes all occupied times from the available list
6. Restores the current appointment's own time slot (so the same slot stays selectable)

**API Fallback:** Tries `/appointments/my` first; falls back to `/patients/appointments` on error.

---

#### `PatientDoctorBookingPage.jsx`
**Route:** `/patient/doctors/:doctorId/book`

Week-based calendar for booking a new appointment with a specific doctor.

**Features:**
- Week navigation (previous / next week)
- Blocks past dates
- Filters selectable days by doctor's `availability` array (e.g. doctor only available Mon/Wed/Fri)
- Fetches occupied times from appointment-service and payment-service for selected date
- Displays hourly slots (9 AM – 6 PM); grays out occupied slots
- Appointment type selection: `Physical` or `Online`
- Reason / notes text input
- Saves booking draft to `sessionStorage` before redirecting to payment flow

---

### Doctor Pages

#### `DoctorAppointmentsPage.jsx`
**Route:** `/doctor/appointments`

Displays the authenticated doctor's appointments with full management capabilities.

**Tabs:**

| Tab | Status Filter |
|-----|--------------|
| Upcoming | `accepted` |
| Pending Requests | `pending` |
| Completed | `completed` |
| Cancelled | `cancelled` / `rejected` |

**Filters:**
- **Search** — by patient name, patient ID, or phone number (client-side)
- **Date Range** — uses `AppointmentDateRangePicker` component; filters by `YYYY-MM-DD` key comparison

**Pagination:** 10 appointments per page (`PAGE_SIZE = 10`)

**Appointment Card displays:**
- Patient avatar (`patientImage`), name, age, gender, blood type
- Date, time, appointment type, reason
- Status badge (with `accepted` displayed as "Confirmed")

**Doctor Actions:**
- **Accept** — `PATCH /appointments/:id/accept` (pending → accepted)
- **Reject** — `PATCH /appointments/:id/reject` (pending → rejected)
- **Complete** — `PATCH /appointments/:id/complete` with optional notes input (accepted → completed)

---

### Shared Component

#### `AppointmentDateRangePicker.jsx`
A reusable calendar component built on **React DayPicker**.

- Supports selecting a start date and an end date (inclusive range)
- Outputs dates as `YYYY-MM-DD` strings
- Used in `DoctorAppointmentsPage` to filter the displayed appointment list
- Highlights appointment dates on the calendar for quick reference

---

## Inter-Service Communication

The appointment-service communicates with two other services at runtime via HTTP (Axios):

### Payment Service

**Base URL:** `PAYMENT_SERVICE_URL` env var (default: `http://localhost:8006`)

| Called From | Method | URL | Purpose |
|-------------|--------|-----|---------|
| `listDoctorOccupiedTimes` | `GET` | `/doctor-occupied?doctorUserId=&date=` | Fetch times blocked by pending payments |

- 3-second timeout; failure is silently ignored (graceful degradation)

### Patient Service (MongoDB cross-collection)

Rather than an HTTP call, the appointment-service queries the `patients` collection directly via a Mongoose reference model (`PatientRef`) on the same MongoDB Atlas cluster.

**Fields read:**
- `userId`, `fullName`, `avatar`, `dob`, `gender`, `bloodType`, `age`

Used only in `listDoctorAppointments` to enrich the doctor's view with patient profile data.

---

## Configuration & Environment

### Appointment Service `.env`

```env
PORT=8004
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/mediflow-appointment
PAYMENT_SERVICE_URL=http://localhost:8006
JWT_SECRET=<shared_secret>
```

### Frontend `.env`

```env
VITE_API_BASE_URL=http://localhost:8081/api
```

### API Gateway Proxy Rule

```js
["/api/appointments", "http://localhost:8004"]
// In Docker: "http://appointment-service:8004"
```

Incoming path `/api/appointments/my` is rewritten to `/my` at the service.

### Dependencies (appointment-service)

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | 4.21.1 | HTTP server / routing |
| `mongoose` | 8.18.0 | MongoDB ODM |
| `jsonwebtoken` | 9.0.2 | JWT verification |
| `axios` | 1.14.0 | HTTP calls to payment-service |
| `cors` | 2.8.5 | Cross-origin resource sharing |
| `morgan` | 1.10.0 | Request logging |
| `dotenv` | 16.4.5 | Environment variable loading |

### Frontend Dependencies (appointment-related)

| Package | Purpose |
|---------|---------|
| `react-day-picker` | Calendar in date range picker and booking page |
| `date-fns` | Date formatting and arithmetic |
| `axios` | API calls via `src/api/client.js` |
| `react-router-dom` | Navigation between appointment pages |
