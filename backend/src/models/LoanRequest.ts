import { Schema, model } from 'mongoose';

const snapshotSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
    },

    code: {
      type: String,
      trim: true,
    },

    serialNumber: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const loanRequestSchema = new Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | REQUEST NUMBER
    |--------------------------------------------------------------------------
    */

    requestNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    /*
    |--------------------------------------------------------------------------
    | REQUESTER
    |--------------------------------------------------------------------------
    */

    requesterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    requester: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | MEMBER
    |--------------------------------------------------------------------------
    */

    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | CUSTOMER
    |--------------------------------------------------------------------------
    */

    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | REQUESTED EQUIPMENT
    |--------------------------------------------------------------------------
    */

    requestedEquipmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Equipment',
      index: true,
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | SNAPSHOTS
    |--------------------------------------------------------------------------
    */

    requesterSnapshot: {
      type: snapshotSchema,
      default: null,
    },

    customerSnapshot: {
      type: snapshotSchema,
      default: null,
    },

    requestedEquipmentSnapshot: {
      type: snapshotSchema,
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | DATES
    |--------------------------------------------------------------------------
    */

    loanDate: {
      type: Date,
      default: null,
      index: true,
    },

    requestedReturnDate: {
      type: Date,
      default: null,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | REASON
    |--------------------------------------------------------------------------
    */

    reason: {
      type: String,
      trim: true,
      default: '',
    },

    /*
    |--------------------------------------------------------------------------
    | STATUS
    |--------------------------------------------------------------------------
    |
    | PENDING  -> Waiting for approval
    | APPROVED -> Approved by an APPROVER administrator
    | REJECTED -> Rejected by an APPROVER administrator
    | ISSUED   -> Instrument issued
    | RETURNED -> Instrument returned
    |
    | Normal workflow:
    |
    | PENDING -> APPROVED -> ISSUED -> RETURNED
    |
    | Direct issuer workflow:
    |
    | PENDING -> ISSUED -> RETURNED
    |
    */

    status: {
      type: String,
      enum: [
        'PENDING',
        'APPROVED',
        'REJECTED',
        'ISSUED',
        'RETURNED',
      ],
      default: 'PENDING',
      required: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | APPROVAL METHOD
    |--------------------------------------------------------------------------
    |
    | APPROVER
    |   Normal approval performed by an APPROVER administrator.
    |
    | DIRECT_ISSUE
    |   An ISSUER administrator approved and issued the request
    |   directly in a single operation.
    |
    | IMPORTANT:
    | DIRECT_ISSUE is NOT dependent on whether an APPROVER exists.
    |
    */

    approvalMethod: {
      type: String,
      enum: ['APPROVER', 'DIRECT_ISSUE'],
      default: null,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | APPROVAL BYPASS REASON
    |--------------------------------------------------------------------------
    |
    | Used when an ISSUER performs direct approval + issuance.
    |
    | This field provides an explicit audit explanation for why the
    | normal PENDING -> APPROVED -> ISSUED workflow was bypassed.
    |
    */

    approvalBypassReason: {
      type: String,
      trim: true,
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | APPROVAL AUDIT
    |--------------------------------------------------------------------------
    */

    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    approvedAt: {
      type: Date,
      default: null,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | REJECTION AUDIT
    |--------------------------------------------------------------------------
    */

    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    rejectedAt: {
      type: Date,
      default: null,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | ISSUANCE AUDIT
    |--------------------------------------------------------------------------
    */

    issuedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    issuedAt: {
      type: Date,
      default: null,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | TIMESTAMPS
    |--------------------------------------------------------------------------
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
    collection: 'loanRequests',
    versionKey: false,
  }
);

/*
|--------------------------------------------------------------------------
| INDEXES
|--------------------------------------------------------------------------
*/

loanRequestSchema.index({
  status: 1,
  createdAt: -1,
});

loanRequestSchema.index({
  requesterId: 1,
  createdAt: -1,
});

loanRequestSchema.index({
  requester: 1,
  createdAt: -1,
});

loanRequestSchema.index({
  memberId: 1,
  createdAt: -1,
});

loanRequestSchema.index({
  customerId: 1,
  createdAt: -1,
});

loanRequestSchema.index({
  requestedEquipmentId: 1,
  createdAt: -1,
});

loanRequestSchema.index({
  status: 1,
  requestedReturnDate: 1,
});

/*
|--------------------------------------------------------------------------
| APPROVAL / DIRECT-ISSUE INDEXES
|--------------------------------------------------------------------------
*/

loanRequestSchema.index({
  approvalMethod: 1,
  createdAt: -1,
});

loanRequestSchema.index({
  approvedBy: 1,
  approvedAt: -1,
});

loanRequestSchema.index({
  rejectedBy: 1,
  rejectedAt: -1,
});

loanRequestSchema.index({
  issuedBy: 1,
  issuedAt: -1,
});

/*
|--------------------------------------------------------------------------
| UPDATED AT
|--------------------------------------------------------------------------
*/

loanRequestSchema.pre('save', async function () {
  this.updatedAt = new Date();
});

loanRequestSchema.pre(
  ['findOneAndUpdate', 'updateOne', 'updateMany'],
  async function () {
    this.set({
      updatedAt: new Date(),
    });
  }
);

/*
|--------------------------------------------------------------------------
| MODEL
|--------------------------------------------------------------------------
*/

export const LoanRequest = model(
  'LoanRequest',
  loanRequestSchema
);