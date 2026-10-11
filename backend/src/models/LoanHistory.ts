import { Schema, model } from 'mongoose';

const loanHistorySchema = new Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | LOAN
    |--------------------------------------------------------------------------
    */

    loanId: {
      type: Schema.Types.ObjectId,
      ref: 'Loan',
      required: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | ACTION
    |--------------------------------------------------------------------------
    |
    | DIRECT_ISSUE:
    | An ISSUER administrator approved and issued a PENDING request
    | in one operation.
    |
    */

    action: {
      type: String,

      enum: [
        'CREATED',
        'ISSUED',
        'DIRECT_ISSUE',
        'RETURNED',
        'STATUS_CHANGED',
        'UPDATED',
      ],

      required: true,

      index: true,

      trim: true,
    },

    /*
    |--------------------------------------------------------------------------
    | OLD STATUS
    |--------------------------------------------------------------------------
    */

    oldStatus: {
      type: String,

      enum: [
        'PENDING',
        'APPROVED',
        'REJECTED',
        'ISSUED',
        'RETURNED',
        null,
      ],

      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | NEW STATUS
    |--------------------------------------------------------------------------
    */

    newStatus: {
      type: String,

      enum: [
        'PENDING',
        'APPROVED',
        'REJECTED',
        'ISSUED',
        'RETURNED',
        null,
      ],

      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | PERFORMED BY
    |--------------------------------------------------------------------------
    */

    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | NOTES
    |--------------------------------------------------------------------------
    */

    notes: {
      type: String,
      trim: true,
      default: '',
    },

    /*
    |--------------------------------------------------------------------------
    | METADATA
    |--------------------------------------------------------------------------
    |
    | Can store additional audit information such as:
    |
    | approvalMethod
    | approvalBypassReason
    | requestId
    | equipmentId
    | loanNumber
    | requester
    | approvedBy
    | approvedAt
    | issuedBy
    | issuedAt
    |
    */

    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | CREATED AT
    |--------------------------------------------------------------------------
    */

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: 'loanHistory',
    versionKey: false,
  }
);

/*
|--------------------------------------------------------------------------
| INDEXES
|--------------------------------------------------------------------------
*/

loanHistorySchema.index({
  loanId: 1,
  createdAt: -1,
});

loanHistorySchema.index({
  performedBy: 1,
  createdAt: -1,
});

loanHistorySchema.index({
  action: 1,
  createdAt: -1,
});

/*
|--------------------------------------------------------------------------
| MODEL
|--------------------------------------------------------------------------
*/

export const LoanHistory = model(
  'LoanHistory',
  loanHistorySchema
);