# SDS Voice Intelligence – Phase 5 API Documentation

## 1. Overview & Global Standards

- **Base URL:** `/api/v1`
- **Protocol:** HTTP/1.1 & HTTP/2 (TLS recommended in production)
- **Data Format:** `application/json`
- **Correlation Header:** All responses return `X-Request-Id: <uuid-v4>`. Clients may supply `X-Request-Id` in request headers.
- **Authentication:** Bearer token in HTTP `Authorization` header: `Authorization: Bearer <jwt-token>`.
- **Global Rate Limiting:** 500 requests per 15-minute window per IP (General API); 15 requests per 15-minute window (Login endpoint).
- **Security Headers:** Enforced via Helmet (HSTS, Content-Type Options, DNS Prefetch Control, Frameguard, Origin Agent Cluster).

---

## 2. Standard Error Representation

All error responses adhere to the standard `ApiErrorResponse` schema:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable explanation of error.",
    "details": [],
    "requestId": "123e4567-e89b-12d3-a456-426614174000",
    "timestamp": "2026-11-03T18:00:00.000Z"
  }
}
```

### Standard Status Codes:
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Validation failure or invalid call state transition.
- `401 Unauthorized`: Missing, invalid, or expired credentials.
- `403 Forbidden`: Authenticated user lacks sufficient role privileges.
- `404 Not Found`: Requested resource does not exist.
- `409 Conflict`: Resource unique constraint violation or concurrent lock conflict.
- `429 Too Many Requests`: Rate limit exceeded.
- `500 Internal Server Error`: Unhandled server exception.

---

## 3. Endpoints Specification

### 3.1 Authentication

#### `POST /api/v1/auth/login`
- **Access:** Public (Rate-limited to 15 requests / 15 min).
- **Description:** Authenticates credentials and returns a signed JWT.
- **Request Body:**
```json
{
  "email": "admin@institution.local",
  "password": "Admin@123"
}
```
- **Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "22222222-2222-2222-2222-222222222001",
    "email": "admin@institution.local",
    "fullName": "Dr. Alice Sharma",
    "role": "admin",
    "phoneNumber": "+15550101"
  },
  "expiresIn": "24h"
}
```

#### `POST /api/v1/auth/logout`
- **Access:** Private (Authenticated).
- **Description:** Terminates the current session and registers the active token in the token blacklist.
- **Response (200 OK):**
```json
{
  "message": "Successfully logged out and session revoked.",
  "timestamp": "2026-11-03T18:00:00.000Z"
}
```

#### `GET /api/v1/auth/me`
- **Access:** Private (Authenticated).
- **Description:** Returns the profile of the caller verified from the JWT.
- **Response (200 OK):**
```json
{
  "user": {
    "id": "22222222-2222-2222-2222-222222222001",
    "email": "admin@institution.local",
    "fullName": "Dr. Alice Sharma",
    "role": "admin"
  },
  "timestamp": "2026-11-03T18:00:00.000Z"
}
```

---

### 3.2 Call Management

#### `GET /api/v1/calls`
- **Access:** Private (Authenticated).
- **Query Parameters:**
  - `page`: integer (default: 1)
  - `limit`: integer (default: 10, max: 100)
  - `status`: CallStatus (`initiated`, `ringing`, `answered_by_ai`, `processing`, `awaiting_staff`, `connecting`, `bridged`, `completed`, `rejected`, `timed_out`, `failed`, `callback_requested`)
  - `departmentId`: UUID
  - `search`: string (matches callerNumber, callerName, intent, or reason)
  - `sortBy`: string (default: `createdAt`)
  - `sortOrder`: `asc` | `desc` (default: `desc`)
- **Data Scoping:** Staff users only receive calls for their assigned department or calls assigned to their extension. Admins and Operators receive all records.
- **Response (200 OK):**
```json
{
  "calls": [
    {
      "id": "55555555-5555-5555-5555-555555555001",
      "telephonyCallId": "SIP/test-call-001",
      "callerNumber": "+15550199",
      "callerName": "John Doe",
      "detectedIntent": "admissions",
      "departmentId": "11111111-1111-1111-1111-111111111001",
      "assignedStaffId": "33333333-3333-3333-3333-333333333002",
      "status": "completed",
      "confidenceScore": 0.95,
      "durationSeconds": 145,
      "startedAt": "2026-11-03T17:00:00.000Z",
      "endedAt": "2026-11-03T17:02:25.000Z",
      "createdAt": "2026-11-03T17:00:00.000Z",
      "updatedAt": "2026-11-03T17:02:25.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

#### `GET /api/v1/calls/stats`
- **Access:** Private (Authenticated).
- **Description:** Returns aggregate metrics calculated from real database records.
- **Response (200 OK):**
```json
{
  "totalCalls": 42,
  "inProgressCalls": 3,
  "completedCalls": 35,
  "missedCalls": 4,
  "pendingCallbacks": 2,
  "avgDurationSeconds": 118
}
```

#### `GET /api/v1/calls/:id`
- **Access:** Private (Authenticated; IDOR protected).
- **Description:** Retrieves complete call details along with ordered conversational transcripts.
- **Response (200 OK):**
```json
{
  "id": "55555555-5555-5555-5555-555555555001",
  "callerNumber": "+15550199",
  "callerName": "John Doe",
  "status": "completed",
  "detectedIntent": "admissions",
  "transcripts": [
    {
      "id": "uuid-1",
      "speaker": "ai",
      "transcriptText": "Hello, thank you for calling. How may I help you?",
      "confidence": 1.0,
      "audioTimestampOffsetMs": 0
    }
  ]
}
```

#### `PATCH /api/v1/calls/:id/status`
- **Access:** Private (Authenticated).
- **Description:** Transitions call status using the Call State Machine.
- **Request Body:**
```json
{
  "status": "bridged",
  "reason": "Staff accepted call",
  "assignedStaffId": "33333333-3333-3333-3333-333333333002"
}
```
- **Error Response (400 Bad Request):**
```json
{
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Invalid call state transition from 'completed' to 'bridged'. Permitted transitions from 'completed': [].",
    "currentStatus": "completed",
    "targetStatus": "bridged",
    "permittedTransitions": []
  }
}
```

---

### 3.3 Departments

#### `GET /api/v1/departments`
- **Access:** Private (Authenticated).
- **Description:** Returns all departments (Admins receive inactive departments as well).

#### `POST /api/v1/departments`
- **Access:** Private (Admin only).
- **Request Body:**
```json
{
  "name": "Hostel & Housing Office",
  "code": "HST",
  "description": "Hostel inquiries and room allotments",
  "primaryExtension": "106",
  "routingTimeoutSeconds": 20
}
```
- **Response (201 Created):** Department object.

#### `PATCH /api/v1/departments/:id`
- **Access:** Private (Admin only).
- **Request Body:** Partial department fields (`name`, `description`, `routingTimeoutSeconds`, `isActive`).

---

### 3.4 Staff & Extensions

#### `GET /api/v1/staff`
- **Access:** Private (Authenticated).
- **Description:** Returns staff member summaries with extension and availability data.

#### `GET /api/v1/staff/:id`
- **Access:** Private (Authenticated).
- **Description:** Returns staff extension, profile, department, and presence schedule.

#### `PATCH /api/v1/staff/:id/availability`
- **Access:** Private (Staff role can only update their own extension; Admins/Operators can update any).
- **Request Body:**
```json
{
  "status": "busy",
  "customStatusMessage": "In faculty meeting until 3 PM"
}
```

---

### 3.5 Routing Rules

#### `GET /api/v1/routing-rules`
- **Access:** Private (Authenticated).
- **Description:** Returns all routing rules ordered by priority descending.

#### `POST /api/v1/routing-rules`
- **Access:** Private (Admin only).
- **Request Body:**
```json
{
  "departmentId": "11111111-1111-1111-1111-111111111001",
  "intentKeyword": "scholarship",
  "priority": 10,
  "fallbackDestinationType": "voicemail"
}
```

#### `PATCH /api/v1/routing-rules/:id`
- **Access:** Private (Admin only).
- **Request Body:** Partial rule fields (`isActive`, `priority`, `fallbackDestinationType`, etc.).

#### `DELETE /api/v1/routing-rules/:id`
- **Access:** Private (Admin only).

---

### 3.6 Callbacks

#### `GET /api/v1/callbacks`
- **Access:** Private (Authenticated). Staff scoped to assigned department.
- **Query Parameters:** `status`, `departmentId`, `page`, `limit`.

#### `POST /api/v1/callbacks`
- **Access:** Private (Authenticated).
- **Request Body:**
```json
{
  "callerNumber": "+15557788",
  "callerName": "Caller Name",
  "requestedDepartmentId": "11111111-1111-1111-1111-111111111001",
  "notes": "Requested information regarding admission deadlines"
}
```

#### `PATCH /api/v1/callbacks/:id`
- **Access:** Private (Authenticated).
- **Request Body:** `{ "status": "completed", "notes": "Resolved query via callback" }`.

---

## 4. Socket.IO Real-Time Events

- **Namespace:** Default `/`
- **Handshake Protocol:**
  - Token provided via `auth: { token: "<jwt>" }` or `headers: { authorization: "Bearer <jwt>" }`.
- **Rooms:**
  - `user:<id>`: Messages for specific user.
  - `role:<admin|staff|operator>`: Messages scoped to role.
  - `dept:<departmentId>`: Messages scoped to department staff.

### Broadcast Events:
1. `call:created`: Dispatched when an inbound call record is created.
2. `call:updated`: Dispatched when call parameters change.
3. `call:status_changed`: Dispatched on state machine transition (`callId`, `previousStatus`, `currentStatus`, `reason`).
4. `call:routing_updated`: Dispatched when routing decisions assign a staff member or fallback.
5. `staff:availability_changed`: Dispatched when a staff member toggles presence.
6. `callback:created`: Dispatched when an automated or manual callback is queued.
