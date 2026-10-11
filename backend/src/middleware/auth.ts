import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

import { env } from '../config/env.js';
import { Role } from '../models/enums.js';

export type AdminType = 'APPROVER' | 'ISSUER';

export type AuthUser = {
  id: string;
  name: string;
  role: Role;
  email: string;
  employeeId?: string;
  adminType?: AdminType | null;
};

export type AuthRequest = Request & {
  user?: AuthUser;
};

/*
|--------------------------------------------------------------------------
| AUTHENTICATION
|--------------------------------------------------------------------------
*/

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.header('Authorization');

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Authentication required',
    });
  }

  try {
    const token = header.slice(7);

    const decoded = jwt.verify(
      token,
      env.jwtSecret
    ) as AuthUser;

    req.user = decoded;

    next();
  } catch {
    return res.status(401).json({
      message: 'Invalid or expired token',
    });
  }
}

/*
|--------------------------------------------------------------------------
| ADMIN
|--------------------------------------------------------------------------
|
| Allows both APPROVER and ISSUER admins.
|
*/

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({
      message: 'Administrator access required',
    });
  }

  next();
}

/*
|--------------------------------------------------------------------------
| APPROVER ADMIN
|--------------------------------------------------------------------------
|
| Only APPROVER admins can:
| - Approve loan requests
| - Reject loan requests
|
*/

export function requireApprover(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (
    req.user?.role !== 'ADMIN' ||
    req.user?.adminType !== 'APPROVER'
  ) {
    return res.status(403).json({
      message: 'Approver administrator access required',
    });
  }

  next();
}

/*
|--------------------------------------------------------------------------
| ISSUER ADMIN
|--------------------------------------------------------------------------
|
| Only ISSUER admins can:
| - Issue instruments
| - Return instruments
|
*/

export function requireIssuer(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (
    req.user?.role !== 'ADMIN' ||
    req.user?.adminType !== 'ISSUER'
  ) {
    return res.status(403).json({
      message: 'Issuer administrator access required',
    });
  }

  next();
}