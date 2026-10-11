import { Schema, model } from 'mongoose';

const fineLocationSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const locationSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      default: '',
      trim: true,
    },

    fineLocations: {
      type: [fineLocationSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'locations',
  }
);

export const Location = model(
  'Location',
  locationSchema
);