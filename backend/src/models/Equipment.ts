import { Schema, model } from 'mongoose';

const equipmentSchema = new Schema(
  {
    equipmentCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    sNo: {
      type: Number,
    },

    acquisitionYear: {
      type: Number,
    },

    material: {
      type: String,
      required: true,
      trim: true,
    },

    serialNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    model: {
      type: String,
      default: '',
      trim: true,
    },

    description: {
      type: String,
      default: '',
    },

    acquisitionValue: {
      type: Number,
    },

    accumulatedDepreciation: {
      type: Number,
    },

    bookValue: {
      type: Number,
    },

    currency: {
      type: String,
      default: '',
    },

    costCenter: {
      type: String,
      default: '',
    },

    balanceSheetAccountAPC: {
      type: String,
      default: '',
    },

    location: {
      type: String,
      default: '',
    },

    fineLocation: {
      type: String,
      default: '',
    },

    loanStatus: {
      type: String,
      enum: [
        'AVAILABLE',
        'ON_LOAN',
        'MAINTENANCE',
        'RETIRED',
      ],
      default: 'AVAILABLE',
      index: true,
    },

    operationalStatus: {
      type: String,
      enum: [
        'OPERATIONAL',
        'NON_OPERATIONAL',
        'UNDER_MAINTENANCE',
      ],
      default: 'OPERATIONAL',
      index: true,
    },

    requester: {
      type: String,
      default: '',
    },

    customer: {
      type: String,
      default: '',
    },

    loanDate: {
      type: Date,
      default: null,
    },

    returnDue: {
      type: Date,
      default: null,
    },

    extra: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export const Equipment = model(
  'Equipment',
  equipmentSchema
);

