import { Schema, model } from 'mongoose';
import { Role } from './enums.js';

/*
 * =========================================================
 * ADMIN TYPES
 * =========================================================
 *
 * APPROVER
 * - Approves/rejects employee loan requests
 * - Approves/rejects admin duty-change requests
 *
 * ISSUER
 * - Issues approved instruments
 * - Can temporarily approve loan requests when
 *   approval override is enabled
 *
 * EMPLOYEE
 * - Cannot perform administrative actions
 * - adminType must always be null
 */
export const adminTypes = [
  'APPROVER',
  'ISSUER',
] as const;

export type AdminType =
  (typeof adminTypes)[number];

/*
 * =========================================================
 * USER DOCUMENT TYPE
 * =========================================================
 */

export type UserDocument = {
  employeeId: string;
  name: string;
  email: string;
  passwordHash: string;

  /*
   * Employee department
   *
   * Examples:
   * - Engineering
   * - Sales & Service
   * - Technical Support
   * - Administration
   */
  department: string;

  role: Role;

  /*
   * Administrative duty.
   *
   * EMPLOYEE -> null
   * ADMIN    -> APPROVER or ISSUER
   */
  adminType: AdminType | null;

  /*
   * Only relevant for ISSUER administrators.
   *
   * false:
   *   ISSUER can only issue instruments.
   *
   * true:
   *   ISSUER can temporarily approve loan requests
   *   when an APPROVER is unavailable.
   *
   * This must be explicitly enabled by an
   * authorized administrator.
   */
  approvalOverrideEnabled: boolean;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/*
 * =========================================================
 * USER SCHEMA
 * =========================================================
 */

const schema = new Schema<UserDocument>(
  {
    /*
     * =====================================================
     * EMPLOYEE ID
     * =====================================================
     */

    employeeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    /*
     * =====================================================
     * FULL NAME
     * =====================================================
     */

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    /*
     * =====================================================
     * COMPANY EMAIL
     * =====================================================
     */

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    /*
     * =====================================================
     * DEPARTMENT
     * =====================================================
     *
     * Every employee and administrator belongs to a
     * department.
     *
     * Examples:
     *
     * Engineering
     * Sales & Service
     * Technical Support
     * Administration
     */

    department: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
      index: true,
    },

    /*
     * =====================================================
     * PASSWORD HASH
     * =====================================================
     *
     * Password is never returned by normal queries.
     */

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    /*
     * =====================================================
     * USER ROLE
     * =====================================================
     *
     * ADMIN
     * EMPLOYEE
     */

    role: {
      type: String,
      enum: ['ADMIN', 'EMPLOYEE'],
      default: 'EMPLOYEE' as Role,
      index: true,
    },

    /*
     * =====================================================
     * ADMIN DUTY
     * =====================================================
     *
     * ADMIN + APPROVER
     *     Can approve/reject loan requests.
     *     Can approve/reject admin duty requests.
     *
     * ADMIN + ISSUER
     *     Can issue approved instruments.
     *     May receive temporary approval authority.
     *
     * EMPLOYEE
     *     Must always have adminType = null.
     *
     * IMPORTANT:
     *
     * There is NO unique constraint on adminType.
     *
     * Therefore the system supports:
     *
     * APPROVER:
     *   User A
     *   User B
     *   User C
     *
     * ISSUER:
     *   User D
     *   User E
     *   User F
     */

    adminType: {
      type: String,
      enum: [...adminTypes, null],
      default: null,
      index: true,
    },

    /*
     * =====================================================
     * ISSUER APPROVAL OVERRIDE
     * =====================================================
     *
     * Normally:
     *
     * ISSUER
     *   -> Can issue instruments
     *   -> Cannot approve loan requests
     *
     * When enabled:
     *
     * ISSUER
     *   -> Can approve loan requests
     *   -> Can issue instruments
     *
     * This is intended for situations where an APPROVER
     * is unavailable.
     *
     * The backend must verify this field before allowing
     * an ISSUER to approve a request.
     *
     * Default = false
     */

    approvalOverrideEnabled: {
      type: Boolean,
      default: false,
      index: true,
    },

    /*
     * =====================================================
     * ACCOUNT STATUS
     * =====================================================
     */

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    /*
     * =====================================================
     * CREATION TIMESTAMP
     * =====================================================
     */

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    /*
     * =====================================================
     * LAST UPDATE TIMESTAMP
     * =====================================================
     */

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'users',
    versionKey: false,
  }
);

/*
 * =========================================================
 * ROLE / ADMIN TYPE VALIDATION
 * =========================================================
 *
 * Valid:
 *
 * ADMIN + APPROVER
 * ADMIN + ISSUER
 * EMPLOYEE + null
 *
 * Invalid:
 *
 * EMPLOYEE + APPROVER
 * EMPLOYEE + ISSUER
 * ADMIN + null
 *
 * Also:
 *
 * approvalOverrideEnabled is automatically disabled
 * for employees and APPROVER administrators.
 */

schema.pre('validate', function () {
  /*
   * -------------------------------------------------------
   * EMPLOYEES CANNOT HAVE ADMIN DUTIES
   * -------------------------------------------------------
   */

  if (
    this.role === 'EMPLOYEE' &&
    this.adminType !== null
  ) {
    throw new Error(
      'Employee users cannot have an adminType.'
    );
  }

  /*
   * -------------------------------------------------------
   * ADMINISTRATORS MUST HAVE A DUTY
   * -------------------------------------------------------
   */

  if (
    this.role === 'ADMIN' &&
    !this.adminType
  ) {
    throw new Error(
      'Admin users must have an adminType of APPROVER or ISSUER.'
    );
  }

  /*
   * -------------------------------------------------------
   * ONLY SUPPORTED ADMIN DUTIES ARE ALLOWED
   * -------------------------------------------------------
   */

  if (
    this.role === 'ADMIN' &&
    !adminTypes.includes(
      this.adminType as AdminType
    )
  ) {
    throw new Error(
      'Invalid administrator duty.'
    );
  }

  /*
   * -------------------------------------------------------
   * APPROVAL OVERRIDE IS ONLY FOR ISSUERS
   * -------------------------------------------------------
   *
   * APPROVER:
   *   approvalOverrideEnabled = false
   *
   * EMPLOYEE:
   *   approvalOverrideEnabled = false
   *
   * ISSUER:
   *   can be true or false
   */

  if (
    this.role !== 'ADMIN' ||
    this.adminType !== 'ISSUER'
  ) {
    this.approvalOverrideEnabled = false;
  }
});

/*
 * =========================================================
 * SAVE TIMESTAMP
 * =========================================================
 */

schema.pre('save', async function () {
  this.updatedAt = new Date();
});

/*
 * =========================================================
 * UPDATE TIMESTAMP
 * =========================================================
 *
 * Keeps updatedAt current when a user is changed through:
 *
 * - findOneAndUpdate
 * - updateOne
 * - updateMany
 */

schema.pre(
  [
    'findOneAndUpdate',
    'updateOne',
    'updateMany',
  ],
  async function () {
    this.set({
      updatedAt: new Date(),
    });
  }
);

/*
 * =========================================================
 * MODEL
 * =========================================================
 */

export const User = model<UserDocument>(
  'User',
  schema
);