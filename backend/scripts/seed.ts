
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import { connectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { Member } from '../src/models/Member.js';
import { Customer } from '../src/models/Customer.js';
import { Location } from '../src/models/Location.js';
import { Equipment } from '../src/models/Equipment.js';

async function main() {
  await connectDatabase();

  /*
   * ============================================================
   * PASSWORDS
   * ============================================================
   */

  const approverPass = await bcrypt.hash(
    'Approver@123',
    12
  );

  const issuerPass = await bcrypt.hash(
    'Issuer@123',
    12
  );

  const employeePass = await bcrypt.hash(
    'Employee123!',
    12
  );

  /*
   * ============================================================
   * ADMIN 1 - LOAN APPROVER
   * ============================================================
   *
   * This admin can:
   * - View loan requests
   * - Approve loan requests
   * - Reject loan requests
   *
   * This is the ONLY APPROVER admin.
   */

  const approver = await User.findOneAndUpdate(
    { email: 'approver@company.com' },
    {
      $set: {
        employeeId: 'ADMIN-APPROVER',
        name: 'Loan Approval Admin',
        passwordHash: approverPass,
        role: 'ADMIN',
        adminType: 'APPROVER',
        isActive: true
      }
    },
    {
      upsert: true,
      new: true
    }
  );

  /*
   * ============================================================
   * ADMIN 2 - INSTRUMENT ISSUER
   * ============================================================
   *
   * This admin can:
   * - View approved loan requests
   * - Issue instruments
   *
   * This is the ONLY ISSUER admin.
   */

  const issuer = await User.findOneAndUpdate(
    { email: 'issuer@company.com' },
    {
      $set: {
        employeeId: 'ADMIN-ISSUER',
        name: 'Instrument Issuing Admin',
        passwordHash: issuerPass,
        role: 'ADMIN',
        adminType: 'ISSUER',
        isActive: true
      }
    },
    {
      upsert: true,
      new: true
    }
  );

  /*
   * ============================================================
   * DEMO EMPLOYEE
   * ============================================================
   */

  const employee = await User.findOneAndUpdate(
    { email: 'employee@example.com' },
    {
      $set: {
        employeeId: 'EMP001',
        name: 'Demo Employee',
        passwordHash: employeePass,
        role: 'EMPLOYEE',
        adminType: null,
        isActive: true
      }
    },
    {
      upsert: true,
      new: true
    }
  );

  if (!approver || !issuer || !employee) {
    throw new Error('Could not create demo users');
  }

  /*
   * ============================================================
   * MEMBER
   * ============================================================
   */

  await Member.findOneAndUpdate(
    { memberCode: 'MEM001' },
    {
      $set: {
        name: employee.name,
        email: employee.email,
        department: 'Engineering',
        employeeId: employee.employeeId,
        isActive: true
      }
    },
    {
      upsert: true,
      new: true
    }
  );

  /*
   * ============================================================
   * CUSTOMER
   * ============================================================
   */

  const customer = await Customer.findOneAndUpdate(
    { customerCode: 'CUS001' },
    {
      $set: {
        name: 'Demo Customer',
        isActive: true
      }
    },
    {
      upsert: true,
      new: true
    }
  );

  /*
   * ============================================================
   * LOCATION
   * ============================================================
   */

  const location = await Location.findOneAndUpdate(
    { code: 'LOC001' },
    {
      $set: {
        name: 'Main Store',
        address: 'Company Site'
      }
    },
    {
      upsert: true,
      new: true
    }
  );

  if (!customer || !location) {
    throw new Error(
      'Could not create seed master data'
    );
  }

  /*
   * ============================================================
   * EQUIPMENT 1
   * ============================================================
   */

  await Equipment.findOneAndUpdate(
    { equipmentCode: 'EQ001' },
    {
      $set: {
        name: 'FSW8',
        serialNumber: 'SN-DEMO-001',
        model: 'FSW8',
        status: 'AVAILABLE',
        customerId: customer._id,
        locationId: location._id
      }
    },
    {
      upsert: true,
      new: true
    }
  );

  /*
   * ============================================================
   * EQUIPMENT 2
   * ============================================================
   */

  await Equipment.findOneAndUpdate(
    { equipmentCode: 'EQ002' },
    {
      $set: {
        name: 'ZNB20',
        serialNumber: 'SN-DEMO-002',
        model: 'ZNB20',
        status: 'AVAILABLE',
        customerId: customer._id,
        locationId: location._id
      }
    },
    {
      upsert: true,
      new: true
    }
  );

  /*
   * ============================================================
   * OUTPUT
   * ============================================================
   */

  console.log('');
  console.log('====================================');
  console.log('       DATABASE SEED COMPLETE');
  console.log('====================================');
  console.log('');

  console.log('APPROVAL ADMIN');
  console.log('Email:    approver@company.com');
  console.log('Password: Approver@123');
  console.log('Role:     ADMIN');
  console.log('Duty:     APPROVER');
  console.log('');

  console.log('ISSUING ADMIN');
  console.log('Email:    issuer@company.com');
  console.log('Password: Issuer@123');
  console.log('Role:     ADMIN');
  console.log('Duty:     ISSUER');
  console.log('');

  console.log('EMPLOYEE');
  console.log('Email:    employee@example.com');
  console.log('Password: Employee123!');
  console.log('Role:     EMPLOYEE');
  console.log('');

  console.log('Created demo equipment:');
  console.log('- EQ001 / FSW8');
  console.log('- EQ002 / ZNB20');
  console.log('');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

