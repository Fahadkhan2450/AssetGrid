/*
 * Creates (or updates) the initial APPROVER and ISSUER administrators.
 *
 * Run from the backend folder:
 *
 *   npx tsx scripts/createadmins.ts
 *
 * Optional environment variables (put them in front of the command):
 *
 *   APPROVER_EMAIL, APPROVER_PASSWORD, APPROVER_DEPARTMENT
 *   ISSUER_EMAIL,   ISSUER_PASSWORD,   ISSUER_DEPARTMENT
 *
 * If a password is not provided, a strong random one is generated and
 * printed ONCE when the account is created. Save it immediately.
 *
 * Example:
 *   APPROVER_DEPARTMENT="Engineering" npx tsx scripts/createadmins.ts
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import { User } from '../src/models/User.js';
import { connectDatabase } from '../src/config/database.js';

type AdminType = 'APPROVER' | 'ISSUER';

type AdminConfig = {
  employeeId: string;
  name: string;
  email: string;
  password: string | null; // null => generate a random one
  department: string | null; // null => leave unchanged on existing users
  adminType: AdminType;
};

const admins: AdminConfig[] = [
  {
    employeeId: 'ADMIN-APPROVER',
    name: 'Loan Approval Admin',
    email: (
      process.env.APPROVER_EMAIL || 'approver@company.com'
    ).toLowerCase(),
    password: process.env.APPROVER_PASSWORD || null,
    department: process.env.APPROVER_DEPARTMENT || null,
    adminType: 'APPROVER',
  },
  {
    employeeId: 'ADMIN-ISSUER',
    name: 'Instrument Issuing Admin',
    email: (
      process.env.ISSUER_EMAIL || 'issuer@company.com'
    ).toLowerCase(),
    password: process.env.ISSUER_PASSWORD || null,
    department: process.env.ISSUER_DEPARTMENT || null,
    adminType: 'ISSUER',
  },
];

type Result = {
  email: string;
  adminType: AdminType;
  action: 'created' | 'updated';
  generatedPassword?: string;
};

function generatePassword(): string {
  // 18 random bytes -> 24 URL-safe characters
  return crypto.randomBytes(18).toString('base64url');
}

async function createOrUpdateAdmin(admin: AdminConfig): Promise<Result> {
  const existingUser = await User.findOne({ email: admin.email });

  /*
   * Existing account: update its admin information only.
   * The password is intentionally NOT changed, so running the script
   * again never resets an existing administrator's password.
   */
  if (existingUser) {
    const update: Record<string, unknown> = {
      role: 'ADMIN',
      adminType: admin.adminType,
      isActive: true,
    };

    if (admin.department) {
      update.department = admin.department;
    }

    await User.updateOne({ _id: existingUser._id }, { $set: update });

    return {
      email: admin.email,
      adminType: admin.adminType,
      action: 'updated',
    };
  }

  /*
   * New account: hash the password before storing it.
   */
  const plainPassword = admin.password || generatePassword();

  if (plainPassword.length < 10) {
    throw new Error(
      `The password for ${admin.email} must be at least 10 characters.`
    );
  }

  const passwordHash = await bcrypt.hash(plainPassword, 12);

  await User.create({
    employeeId: admin.employeeId,
    name: admin.name,
    email: admin.email,
    passwordHash,
    role: 'ADMIN',
    adminType: admin.adminType,
    department: admin.department || 'Administration',
    isActive: true,
  });

  return {
    email: admin.email,
    adminType: admin.adminType,
    action: 'created',
    // Only returned for generated passwords; supplied ones are not echoed.
    generatedPassword: admin.password ? undefined : plainPassword,
  };
}

async function createAdmins() {
  let exitCode = 0;

  try {
    console.log('Connecting to database...');

    await connectDatabase();

    console.log('Creating administrative accounts...\n');

    const results: Result[] = [];

    for (const admin of admins) {
      results.push(await createOrUpdateAdmin(admin));
    }

    console.log('----------------------------------------');
    console.log('Admin setup completed successfully.');
    console.log('----------------------------------------');

    for (const result of results) {
      console.log('');
      console.log(`${result.action.toUpperCase()}: ${result.email}`);
      console.log(`Role: ADMIN`);
      console.log(`Duty: ${result.adminType}`);

      if (result.generatedPassword) {
        console.log(`Temporary password (shown once): ${result.generatedPassword}`);
      }
    }

    console.log('');
    console.log('----------------------------------------');
    console.log(
      'Save any temporary password now and change it after first login.'
    );
    console.log(
      'Make sure the admin department matches the employees it approves for,'
    );
    console.log(
      'because loan requests are routed to APPROVERs of the same department.'
    );
    console.log('----------------------------------------');
  } catch (error) {
    exitCode = 1;

    console.error('\nAdmin setup failed.');

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
  } finally {
    await mongoose.connection.close();
    process.exit(exitCode);
  }
}

createAdmins();