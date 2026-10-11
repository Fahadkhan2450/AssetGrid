import express from 'express';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import auth from './modules/auth/auth.routes.js';
import dashboard from './modules/dashboard/dashboard.routes.js';
import masters from './modules/masters/masters.routes.js';
import equipment from './modules/equipment/equipment.routes.js';
import loans from './modules/loans/loans.routes.js';
import notifications from './modules/notifications/notifications.routes.js';
import excel from './modules/excel/excel.routes.js';
import reports from './modules/reports/reports.routes.js';
import audit from './modules/audit/audit.routes.js';
import email from './modules/email/email.routes.js';

// Administration module
import admin from './modules/admin/admin.routes.js';

import { env } from './config/env.js';


export const app = express();

/*
 * =========================================================
 * SECURITY
 * =========================================================
 *
 * - trust proxy: the app runs behind Caddy (HTTPS reverse
 *   proxy), so the real client IP comes from X-Forwarded-For.
 * - helmet: sets secure HTTP headers.
 * - rate limits: protect login from brute force and the
 *   API from abuse.
 */

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet());

// Brute-force protection on login / signup
app.use(
  ['/api/auth/login', '/api/auth/signup'],
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: 'Too many attempts. Try again in 15 minutes.',
    },
  })
);

// General API limit
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/*
 * =========================================================
 * CORS
 * =========================================================
 *
 * Set CLIENT_URL in .env to the URL employees use,
 * for example https://192.168.0.70
 */

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);

/*
 * =========================================================
 * BODY PARSING
 * =========================================================
 */

app.use(
  express.json({
    limit: '2mb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '2mb',
  })
);

/*
 * =========================================================
 * HEALTH CHECK
 * =========================================================
 *
 * GET /api/health
 */

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    message: 'Company Instrument Management API is running',
  });
});

/*
 * =========================================================
 * AUTHENTICATION
 * =========================================================
 *
 * POST /api/auth/login
 * POST /api/auth/signup
 * GET  /api/auth/me
 */

app.use('/api/auth', auth);

/*
 * =========================================================
 * DASHBOARD
 * =========================================================
 */

app.use('/api/dashboard', dashboard);

/*
 * =========================================================
 * MEMBERS, CUSTOMERS AND LOCATIONS
 * =========================================================
 */

app.use('/api', masters);

/*
 * =========================================================
 * EQUIPMENT
 * =========================================================
 */

app.use('/api/equipment', equipment);

/*
 * =========================================================
 * LOAN REQUESTS AND LOANS
 * =========================================================
 *
 * Employee: create loan request
 * Approver: approve / reject request
 * Issuer:   issue approved instrument
 */

app.use('/api/loans', loans);

/*
 * =========================================================
 * NOTIFICATIONS
 * =========================================================
 */

app.use('/api/notifications', notifications);

/*
 * =========================================================
 * EXCEL IMPORT / EXPORT / PREVIEW
 * =========================================================
 */

app.use('/api/excel', excel);

/*
 * =========================================================
 * REPORTS
 * =========================================================
 */

app.use('/api/reports', reports);

/*
 * =========================================================
 * AUDIT LOGS
 * =========================================================
 */

app.use('/api/audit-logs', audit);

/*
 * =========================================================
 * EMAIL
 * =========================================================
 *
 * SMTP credentials stay in .env and are never exposed
 * to the frontend.
 */

app.use('/api/email', email);

/*
 * =========================================================
 * ADMINISTRATION
 * =========================================================
 *
 * Administrator management and admin-duty transfer /
 * approval workflow. Public signup can NEVER create an
 * admin account.
 */

app.use('/api/admin', admin);

/*
 * =========================================================
 * FRONTEND (built Vite app) + API 404
 * =========================================================
 *
 * Serves frontend/dist so employees only need one URL.
 * Works from src/app.ts (dev) and dist/app.js (production),
 * because both sit one level below backend/.
 */

const distPath = path.resolve(__dirname, '../../frontend/dist');

app.use(express.static(distPath));

// Unknown API routes return JSON instead of the React app
app.use('/api', (_req, res) => {
  res.status(404).json({
    message: 'API route not found',
  });
});

// Everything else (except Socket.IO) gets the React app
app.get(/^\/(?!socket\.io).*/, (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

/*
 * =========================================================
 * GLOBAL ERROR HANDLER
 * =========================================================
 *
 * Internal error details are hidden in production.
 */

app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('API Error:', err);

    const statusCode =
      Number.isInteger(err?.status) &&
      err.status >= 400 &&
      err.status < 600
        ? err.status
        : 500;

    res.status(statusCode).json({
      message:
        statusCode >= 500 && process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : err?.message || 'Internal server error',
    });
  }
);