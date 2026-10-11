
import { Schema, model } from 'mongoose';

const customerSchema = new Schema(
  {
    customerCode: {
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

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'customers',
  }
);

/*
|--------------------------------------------------------------------------
| UPDATE TIMESTAMP
|--------------------------------------------------------------------------
|
| Uses the current Mongoose middleware style.
| Do not use function(next).
|
|--------------------------------------------------------------------------
*/

// Runs before Customer.create() / document.save()
customerSchema.pre('save', async function () {
  this.updatedAt = new Date();
});

// Runs before update queries
customerSchema.pre(
  ['findOneAndUpdate', 'updateOne', 'updateMany'],
  async function () {
    this.set({
      updatedAt: new Date(),
    });
  }
);

export const Customer = model(
  'Customer',
  customerSchema
);

