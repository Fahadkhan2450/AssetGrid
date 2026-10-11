# Company Instrument Management System

Internal enterprise system for equipment/inventory, loan requests, issue/return workflow, Excel import/export, real-time notifications, audit history, locations and reports.

## Stack
- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript + Mongoose
- Database: MongoDB replica set (local Docker setup)
- Real-time: Socket.IO
- Excel: SheetJS (`xlsx`)
- Authentication: JWT + bcrypt

## Requirements
- Node.js 20+
- Docker Desktop / Docker Engine
- npm

## Run MongoDB
```bash
docker compose -f deploy/docker-compose.yml up -d
```

The compose file runs MongoDB as a single-node replica set (`rs0`) so multi-document transactions work.

## Run backend
```bash
cd backend
cp .env.example .env
npm install
npm run seed
npm run dev
```
Backend: http://localhost:4000

## Run frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend: http://localhost:5173

## Demo accounts
- Admin: `admin@example.com` / `Admin123!`
- Employee: `employee@example.com` / `Employee123!`

## Excel import templates
Administration -> Excel Import supports:
- Equipment: `equipmentCode,name,serialNumber,model,locationCode,customerCode,status`
- Members: `memberCode,name,email,department,employeeId`
- Customers: `customerCode,name`
- Locations: `code,name,address`

Imports are validated, logged, and upserted by unique business code. Excel is not the system of record; MongoDB is.

## Main workflow
1. Admin imports or creates members, customers, locations and equipment.
2. Employee creates a loan request using only members/customers/equipment present in MongoDB.
3. Backend writes request + admin notifications + audit entry.
4. Socket.IO tells the Admin dashboard immediately.
5. Admin opens the Issue Instrument card; requester/customer/request data is pre-filled.
6. Admin chooses available equipment and confirms expected return date.
7. Backend runs one MongoDB transaction that creates the loan, changes equipment to `ON_LOAN`, changes request to `ISSUED`, writes loan history/audit, and creates the employee notification.
8. Employee receives the status in real time.
9. Admin marks the instrument returned; the transaction changes the loan/request/equipment and history, then notifies the employee.

## Production notes
- Replace demo JWT secret.
- Use company SSO/Active Directory where available.
- Put the app behind HTTPS/reverse proxy.
- Disable development index auto-creation and create indexes during deployment.
- Use company-controlled MongoDB and file storage/backup.
- Restrict database access to the backend server.

## Real-time behavior
Socket.IO is attached to the same Node.js server. After the backend successfully changes MongoDB, it emits `dashboard:changed` and targeted `notification:new` events. The frontend refreshes the relevant data from MongoDB through the API instead of trying to maintain an independent copy of counts.

## Security rule
Frontend controls are only UX. Authorization is enforced in the backend for approve, reject, issue, return, Excel import and administration routes.
