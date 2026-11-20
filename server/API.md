# AquaShield API

Base URL: `http://localhost:5000/api`. Protected routes require `Authorization: Bearer <JWT>`. JSON errors use `{ "error": "..." }`; validation errors may include a `details` array. The server is the sole authority for premium discounts, claim eligibility and payout amounts.

## Authentication

| Method | Route | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public, rate-limited | Create a homeowner |
| POST | `/auth/login` | Public, rate-limited | Sign in |
| GET | `/auth/me` | User | Current identity |
| POST | `/auth/logout` | User | Stateless logout acknowledgement; client clears its token |

Example registration: `{"name":"Aarav Sharma","email":"aarav@example.com","password":"at-least-8-characters"}`.

## Homeowner endpoints

All require a valid user token and scope records to the signed-in owner.

| Method | Route | Purpose |
|---|---|---|
| GET, POST | `/properties` | List/add a home; add body: `name`, `address`, optional `type` |
| GET, POST | `/devices` | List/link a virtual device; link body: `propertyId`, optional `deviceId` |
| GET | `/sensors`, `/sensors/latest` | Read recent or latest sensor telemetry; optional `deviceId` query |
| POST | `/devices/:id/simulate` | Record one preset: `normal`, `small_leak`, `major_leak`, `pipe_burst`, `sensor_failure`, `offline` |
| POST | `/devices/:id/simulation/start` | Start synthetic five-second sampling |
| POST | `/devices/:id/simulation/stop` | Stop synthetic sampling |
| POST | `/devices/:id/valve` | Set `state` to `OPEN` or `CLOSED`; reopening after an incident also requires `acknowledged` and `safetyConfirmed` booleans |
| GET | `/incidents` | List incidents |
| POST | `/incidents/:id/acknowledge` | Acknowledge an incident |
| POST | `/incidents/:id/resolve` | Resolve; an auto-closed event requires acknowledgment and safety confirmation |
| GET | `/plans` | List sample plans |
| GET, POST | `/policies` | List/activate a plan; activation body: `planId`, `propertyId` |
| POST | `/policies/:id/cancel` | Cancel an owned policy |
| GET | `/claims`, `/claims/:id` | List or view an owned claim and associated simulated payout |
| GET | `/payouts` | List own mock payout records |
| GET | `/notifications` | List own notifications |
| PATCH | `/notifications/:id/read` | Mark an owned notification read |
| GET, PATCH | `/users/profile` | View/update own name and phone |

## Administrator endpoints

All require a JWT for a seeded administrator.

| Method | Route | Purpose |
|---|---|---|
| GET | `/admin/summary` | User/device/incident/policy/claim totals, simulated payout total, and review queue |
| GET | `/admin/users`, `/admin/devices`, `/admin/policies`, `/admin/claims` | Inspect demo records |
| PATCH | `/admin/devices/:id` | Update `connected`, `autoShutoff`, and/or `online` |
| PATCH | `/admin/policies/:id` | Set `status` to `active` or `cancelled` |
| GET | `/admin/plans` | List configurable sample plans |
| PATCH | `/admin/plans/:id` | Bounded updates to premium, coverage, triggers, discount, deductible or waiting days |
| POST | `/admin/claims/:id/decision` | Review a claim using `decision` (`approve` or `reject`) and optional `note` |
| GET | `/admin/audit` | Read recent policy, device, valve and claim audit entries |

Admin approvals write a simulated payout record. Finalized paid/rejected claims cannot be decided again. A claim under review with no approved positive amount does not receive a payout.

## Real-time events

Connect Socket.IO at the API origin and send `auth: { token }` during the handshake. The server verifies the JWT and joins the socket to the user’s private room. Events include `sensor:update`, `incident:new`, `device:offline`, `valve:update` and `claim:update`. No cross-user room subscription is exposed.

## Error behavior

- `400` invalid inputs or missing safe-reopen confirmation
- `401` missing/invalid/expired token
- `403` wrong role
- `404` missing or unowned resource
- `409` duplicate account or finalized claim conflict
- `500` unexpected server error
