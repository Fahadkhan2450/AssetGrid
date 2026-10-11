import {
  Schema,
  model,
  type Types,
} from 'mongoose';

/*
|--------------------------------------------------------------------------
| ADMIN DUTY TYPES
|--------------------------------------------------------------------------
*/

export const adminDutyTypes = [
  'APPROVER',
  'ISSUER',
] as const;

export type AdminDutyType =
  (typeof adminDutyTypes)[number];

/*
|--------------------------------------------------------------------------
| REQUEST STATUS
|--------------------------------------------------------------------------
*/

export const adminDutyChangeStatuses = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const;

export type AdminDutyChangeStatus =
  (typeof adminDutyChangeStatuses)[number];

/*
|--------------------------------------------------------------------------
| DOCUMENT TYPE
|--------------------------------------------------------------------------
*/

export type AdminDutyChangeRequestDocument = {
  /*
   * User who submitted the duty assignment request.
   */
  requestedBy: Types.ObjectId;

  /*
   * KEPT FOR DATABASE COMPATIBILITY
   *
   * Older records may contain the administrator who previously
   * held the requested duty.
   *
   * IMPORTANT:
   *
   * In the new system this field is NOT used to replace,
   * demote, or remove an existing administrator.
   *
   * New requests should normally store null here.
   */
  currentAdminUser: Types.ObjectId | null;

  /*
   * Employee who will receive the new administrative duty.
   */
  targetUser: Types.ObjectId;

  /*
   * KEPT FOR DATABASE COMPATIBILITY
   *
   * Older requests may contain the previous duty of the
   * target user.
   *
   * New assignment requests should normally store null.
   */
  previousAdminType:
    | AdminDutyType
    | null;

  /*
   * Administrative duty being assigned.
   *
   * Multiple users can have the same duty.
   *
   * Example:
   *
   * APPROVER:
   *   Fahad
   *   Ali
   *   Sara
   *
   * ISSUER:
   *   Amir
   *   Hamza
   *   Bilal
   */
  requestedAdminType: AdminDutyType;

  /*
   * Reason for assigning the administrative duty.
   */
  reason: string;

  /*
   * Current request status.
   */
  status: AdminDutyChangeStatus;

  /*
   * APPROVER who approved the request.
   */
  approvedBy:
    | Types.ObjectId
    | null;

  approvedAt:
    | Date
    | null;

  /*
   * APPROVER who rejected the request.
   */
  rejectedBy:
    | Types.ObjectId
    | null;

  rejectedAt:
    | Date
    | null;

  rejectionReason:
    | string
    | null;

  createdAt: Date;
  updatedAt: Date;
};

/*
|--------------------------------------------------------------------------
| SCHEMA
|--------------------------------------------------------------------------
*/

const schema =
  new Schema<AdminDutyChangeRequestDocument>(
    {
      /*
       * ------------------------------------------------------
       * REQUESTED BY
       * ------------------------------------------------------
       */

      requestedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },

      /*
       * ------------------------------------------------------
       * CURRENT ADMINISTRATOR
       * ------------------------------------------------------
       *
       * Kept for compatibility with existing records.
       *
       * New requests do NOT need a current administrator
       * because multiple administrators are allowed.
       */

      currentAdminUser: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true,
      },

      /*
       * ------------------------------------------------------
       * TARGET USER
       * ------------------------------------------------------
       *
       * The employee receiving the administrative duty.
       */

      targetUser: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },

      /*
       * ------------------------------------------------------
       * PREVIOUS ADMIN TYPE
       * ------------------------------------------------------
       *
       * Kept for compatibility with existing records.
       *
       * New assignment requests should normally be null.
       */

      previousAdminType: {
        type: String,
        enum: [
          ...adminDutyTypes,
          null,
        ],
        default: null,
      },

      /*
       * ------------------------------------------------------
       * REQUESTED ADMIN DUTY
       * ------------------------------------------------------
       */

      requestedAdminType: {
        type: String,
        enum: adminDutyTypes,
        required: true,
        index: true,
      },

      /*
       * ------------------------------------------------------
       * REASON
       * ------------------------------------------------------
       */

      reason: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 1000,
      },

      /*
       * ------------------------------------------------------
       * STATUS
       * ------------------------------------------------------
       */

      status: {
        type: String,
        enum: adminDutyChangeStatuses,
        default: 'PENDING',
        required: true,
        index: true,
      },

      /*
       * ------------------------------------------------------
       * APPROVAL INFORMATION
       * ------------------------------------------------------
       */

      approvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },

      approvedAt: {
        type: Date,
        default: null,
      },

      /*
       * ------------------------------------------------------
       * REJECTION INFORMATION
       * ------------------------------------------------------
       */

      rejectedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },

      rejectedAt: {
        type: Date,
        default: null,
      },

      rejectionReason: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: null,
      },

      /*
       * ------------------------------------------------------
       * TIMESTAMPS
       * ------------------------------------------------------
       */

      createdAt: {
        type: Date,
        default: Date.now,
        index: true,
      },

      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      collection: 'adminDutyChangeRequests',
      versionKey: false,
    }
  );

/*
|--------------------------------------------------------------------------
| UPDATED AT
|--------------------------------------------------------------------------
|
| IMPORTANT:
| These hooks intentionally do not use next().
|
| This avoids:
|
|   TypeError: next is not a function
|
|--------------------------------------------------------------------------
*/

/*
 * Document middleware.
 */
schema.pre(
  'save',
  async function () {
    this.updatedAt = new Date();
  }
);

/*
 * Query middleware.
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
|--------------------------------------------------------------------------
| INDEXES
|--------------------------------------------------------------------------
*/

/*
 * Fast lookup of pending and historical requests.
 */
schema.index({
  status: 1,
  createdAt: -1,
});

/*
 * Useful for finding pending requests for a particular
 * employee and duty.
 *
 * NOTE:
 *
 * This is NOT a unique index.
 *
 * Multiple employees can request the same duty and
 * multiple APPROVER administrators can process requests.
 */
schema.index({
  targetUser: 1,
  requestedAdminType: 1,
  status: 1,
});

/*
 * Useful for historical compatibility with old records
 * that contain currentAdminUser.
 */
schema.index({
  currentAdminUser: 1,
  createdAt: -1,
});

/*
 * Useful for finding all requests for a particular target.
 */
schema.index({
  targetUser: 1,
  createdAt: -1,
});

/*
|--------------------------------------------------------------------------
| MODEL
|--------------------------------------------------------------------------
*/

export const AdminDutyChangeRequest =
  model<AdminDutyChangeRequestDocument>(
    'AdminDutyChangeRequest',
    schema
  );