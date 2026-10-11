import { Schema, model } from 'mongoose';

const errorSchema = new Schema(
  {
    rowNumber: {
      type: Number,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    data: {
      type: Schema.Types.Mixed,
    },
  },
  {
    _id: false,
  }
);

const schema = new Schema(
  {
    filename: {
      type: String,
      required: true,
      trim: true,
    },

    importedBy: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    totalRows: {
      type: Number,
      default: 0,
      min: 0,
    },

    inserted: {
      type: Number,
      default: 0,
      min: 0,
    },

    updated: {
      type: Number,
      default: 0,
      min: 0,
    },

    failed: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        'PROCESSING',
        'COMPLETED',
        'COMPLETED_WITH_ERRORS',
        'FAILED',
      ],
      default: 'PROCESSING',
    },

    errors: {
      type: [errorSchema],
      default: [],
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },

  {
    collection: 'excelImports',
  }
);

export const ExcelImport = model('ExcelImport', schema);