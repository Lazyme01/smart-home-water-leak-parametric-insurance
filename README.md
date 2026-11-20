# AquaShield — Smart Home Water-Leak Parametric Insurance

AquaShield is an internship project prototype built with the MERN stack. It demonstrates virtual water-sensor telemetry, rule-based leak detection, a simulated shut-off valve, transparent sample policies, and parametric claim decisions. It runs locally with MongoDB and never connects to real plumbing, an insurer, a bank, or a payment processor.

> **SIMULATED / DEMO ONLY:** readings, incidents, thresholds, insurance policies, claim decisions and payout references are synthetic. No real money is moved. Demo trigger values are not certified plumbing safety rules or real insurance terms.

## Submission documents

- [Project report](PROJECT_REPORT.md) — scope, architecture, key flows, verification, limitations, and a review checklist.
- [API documentation](server/API.md) — routes, access controls, payloads, and errors.

## Architecture

- **`client/`** — React 18 + Vite, React Router, Axios, Tailwind CSS, Recharts, Lucide, Framer Motion, React Hook Form and Zod.
- **`server/`** — Express REST API, Mongoose models, bcrypt password hashing, JWT authentication, Socket.IO telemetry events and server-side decision services.
- **MongoDB** — Users, properties, virtual IoT devices, sensor readings, incidents, plans, policies, claims, mock payouts, notifications and audit entries.
- **Decision rules** — Server code checks detection thresholds, connectivity, uptime, auto-shutoff eligibility, policy inception, waiting periods, telemetry evidence, plan triggers, exclusions, deductibles and payout/coverage caps.
- **Idempotency** — MongoDB unique indexes prevent duplicate incidents, claims for one incident, and payouts for one claim.

## Requirements

- Node.js 20 or newer and npm
- MongoDB Community Server running locally, or a MongoDB URI you control

## Run locally

From this directory:

```powershell
npm run install:all
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env
```

Set a long, private `JWT_SECRET` in `server\.env`. Keep MongoDB available at the `MONGODB_URI` in that file (default `mongodb://127.0.0.1:27017/aquashield`). Then seed the database and start both apps:

```powershell
npm run seed
npm run dev
```

Open **http://localhost:5173**. The API is at **http://localhost:5000/api** and its health check is **http://localhost:5000/api/health**.

To start only one application, use `npm run dev --prefix server` or `npm run dev --prefix client`. Use `npm run build` for a production client build and `npm test` for the backend rule and authorization tests.

### Demo accounts

Seeded by `npm run seed` (both accounts use the same password):

| Role | Email | Password |
|---|---|---|
| Homeowner | `homeowner@aquashield.demo` | `AquaDemo123!` |
| Administrator | `admin@aquashield.demo` | `AquaDemo123!` |

The seed also creates one resolved sample leak, an evaluated demo claim and a simulated payout so the claims and receipt screens are populated on first sign-in.

Change these credentials before sharing a live instance. Public registration always creates a homeowner; the demo admin account is created only by the seed script.

## Reproducible demo scenario

1. Sign in as the homeowner and inspect the seeded Lakeview Home, Standard sample policy, and normal synthetic reading.
2. Open **Device simulator** and select **Major leak**. The backend persists the sensor reading and incident and automatically closes the simulated valve.
3. Inspect the claim and rule-by-rule evaluation in **Claims & activity**. A qualifying high-severity event may be automatically approved and receive a simulated payout. A critical event is sent for administrator review; a failed policy/trigger check is rejected.
4. To see the admin review path, sign in as the administrator and inspect the command center. Review decisions are audited; approvals create a mock payout only.
5. Reopening a closed valve asks for acknowledgment and a safety confirmation. This is a UI confirmation for a simulated device and is not plumbing guidance.

Small-leak and normal presets help demonstrate non-qualifying and no-incident outcomes. The offline and sensor-failure presets show device-health states and do not automatically qualify for a claim.

## API documentation

See [server/API.md](server/API.md) for routes, authorization, payload examples and error conventions.

## Limitations and security notes

- This is an internship demonstration prototype—not real insurance, financial advice, a validated leak detector, or an emergency monitoring system.
- Payouts are database records labeled `SIMULATED_PAID`; no payment integration is configured.
- The client stores a short-lived demo JWT in browser local storage. For production, use a security-reviewed session/token strategy, secure cookies, CSRF defenses, transport security, key management and operational monitoring.
- The seeded password and demo credentials are public project fixtures. Do not reuse them outside a local demonstration.
- MongoDB unique indexes are built by Mongoose; production deployments should create/verify indexes as part of deployment.
- The sample premiums, discounts, coverage limits, waiting periods, thresholds and claim formulas are illustrative only.
