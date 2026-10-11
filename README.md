# AssetGrid

### Enterprise Instrument & Asset Management System

AssetGrid is an internal enterprise platform for managing company equipment, instrument inventory, loan requests, issuance and returns, locations, Excel imports/exports, real-time notifications, audit history, and reports.

## Technology Stack

* **Frontend:** React, TypeScript, Vite
* **Backend:** Node.js, Express.js, TypeScript
* **Database:** MongoDB with a single-node replica set
* **ODM:** Mongoose
* **Real-Time Communication:** Socket.IO
* **Excel Processing:** SheetJS (`xlsx`)
* **Authentication:** JWT and bcrypt
* **Deployment Support:** Docker Compose

## Prerequisites

* Node.js 20 or later
* npm
* Docker Desktop or Docker Engine
* Git

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Fahadkhan2450/AssetGrid.git
cd AssetGrid
```

### 2. Start MongoDB

```bash
docker compose -f deploy/docker-compose.yml up -d
```

MongoDB runs as a single-node replica set named `rs0`, enabling multi-document transactions.

### 3. Configure and Start the Backend

```bash
cd backend
cp .env.example .env
npm install
npm run seed
npm run dev
```

Backend URL: `http://localhost:4000`

Configure the environment variables in `.env` before starting the application. Use a secure JWT secret for non-development environments.

### 4. Start the Frontend

Open a new terminal from the project root:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## Demo Accounts

If the seed script creates these demo accounts, use the following credentials:

| Role     | Email                  | Password       |
| -------- | ---------------------- | -------------- |
| Admin    | `admin@example.com`    | `Admin123!`    |
| Employee | `employee@example.com` | `Employee123!` |

**Security:** Demo credentials are for local development only. Replace or disable them before deployment.

## Core Features

* **Equipment Inventory:** Manage instrument records, equipment status, serial numbers, models, and locations.
* **Loan Management:** Submit, review, approve or reject requests, issue instruments, and record returns.
* **Department-Based Access:** Enforce permissions and authorization through backend validation.
* **Excel Import and Export:** Import supported business records and export inventory and reports.
* **Real-Time Notifications:** Receive relevant updates through Socket.IO.
* **Audit History:** Maintain records of important actions and workflow changes.
* **Location Management:** Organize equipment by registered locations.
* **Dashboard and Reports:** Track equipment availability, active loans, pending requests, and operational activity.
* **Transaction-Safe Workflows:** Keep related database updates consistent using MongoDB transactions.

## Excel Import Templates

The Administration section supports importing the following data using the specified column names.

| Data Type | Required Template Columns                                                |
| --------- | ------------------------------------------------------------------------ |
| Equipment | `equipmentCode,name,serialNumber,model,locationCode,customerCode,status` |
| Members   | `memberCode,name,email,department,employeeId`                            |
| Customers | `customerCode,name`                                                      |
| Locations | `code,name,address`                                                      |

Imports are validated, logged, and upserted using unique business codes. MongoDB remains the system of record; Excel files are used for data exchange and reporting.

## Main Workflow

1. Administrators create or import members, customers, locations, and equipment.
2. Employees submit loan requests using records available in MongoDB.
3. The backend saves the request, creates relevant notifications, and records an audit entry.
4. Socket.IO notifies the administrator dashboard of changes.
5. The administrator reviews the request and opens the instrument issuance workflow.
6. Request and customer details are pre-filled, and the administrator selects available equipment and an expected return date.
7. The backend processes issuance in a MongoDB transaction, updating the loan, equipment status, request status, history, audit records, and employee notification.
8. Employees receive status updates through real-time notifications.
9. When equipment is returned, the backend updates the relevant loan, request, equipment status, history, and notifications transactionally.

## Real-Time Architecture

Socket.IO runs on the same Node.js server as the backend API.

After successful database changes, the backend emits `dashboard:changed` and targeted `notification:new` events. The frontend retrieves updated records through the API, keeping MongoDB as the source of truth rather than maintaining a separate, independent copy of operational data.

## Security

AssetGrid enforces authorization in the backend. Frontend controls improve usability but are not treated as security boundaries.

Recommended production measures:

* Replace development JWT secrets with strong, securely managed secrets.
* Integrate company SSO or Active Directory where available.
* Use HTTPS behind a properly configured reverse proxy.
* Restrict database access to authorized backend services.
* Disable development index auto-creation and manage indexes during deployment.
* Use company-controlled database storage, backups, and recovery procedures.
* Protect administrative, import, issue, return, and other privileged API routes with server-side authorization.
* Remove demo credentials and avoid committing `.env` files or other secrets to Git.

## Project Structure

```text
AssetGrid/
├── backend/
├── frontend/
├── deploy/
│   └── docker-compose.yml
└── README.md
```

## Purpose

AssetGrid provides a centralized approach to company instrument and equipment management, improving asset visibility, accountability, workflow consistency, and operational reporting.

**AssetGrid — One Platform. Complete Asset Visibility.**
