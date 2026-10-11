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

const loanSchema = new Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | LOAN NUMBER
    |--------------------------------------------------------------------------
    */

    loanNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    /*
    |--------------------------------------------------------------------------
    | LOAN REQUEST
    |--------------------------------------------------------------------------
    */

    requestId: {
      type: Schema.Types.ObjectId,
      ref: 'LoanRequest',
      required: true,
      unique: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | EQUIPMENT
    |--------------------------------------------------------------------------
    */

    equipmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Equipment',
      required: true,
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
    | REQUESTER
    |--------------------------------------------------------------------------
    */

    requester: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | SNAPSHOTS
    |--------------------------------------------------------------------------
    */

    equipmentSnapshot: {
      type: snapshotSchema,
      default: null,
    },

    requesterSnapshot: {
      type: snapshotSchema,
      default: null,
    },

    customerSnapshot: {
      type: snapshotSchema,
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | LOAN DATES
    |--------------------------------------------------------------------------
    */

    loanDate: {
      type: Date,
      required: true,
      index: true,
    },

    expectedReturnDate: {
      type: Date,
      required: true,
      index: true,
    },

    actualReturnDate: {
      type: Date,
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | STATUS
    |--------------------------------------------------------------------------
    */

    status: {
      type: String,
      enum: ['ISSUED', 'RETURNED'],
      required: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | ISSUED BY
    |--------------------------------------------------------------------------
    |
    | For both normal and direct issuance this stores the administrator
    | who actually issued the instrument.
    |
    */

    issuedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | RETURNED BY
    |--------------------------------------------------------------------------
    */

    returnedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
    collection: 'loans',
    versionKey: false,
  }
);

/*
|--------------------------------------------------------------------------
| INDEXES
|--------------------------------------------------------------------------
*/

loanSchema.index({
  status: 1,
  expectedReturnDate: 1,
});

loanSchema.index({
  memberId: 1,
  createdAt: -1,
});

loanSchema.index({
  customerId: 1,
  createdAt: -1,
});

loanSchema.index({
  equipmentId: 1,
  createdAt: -1,
});

loanSchema.index({
  requester: 1,
  createdAt: -1,
});

/*
|--------------------------------------------------------------------------
| UPDATED AT
|--------------------------------------------------------------------------
*/

loanSchema.pre('save', async function () {
  this.updatedAt = new Date();
});

loanSchema.pre(
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

export const Loan = model('Loan', loanSchema);