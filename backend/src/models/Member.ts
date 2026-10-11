
import { Schema, model } from 'mongoose';

const memberSchema = new Schema(
  {
    memberCode: {
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

    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },

    department: {
      type: String,
      trim: true,
      default: '',
    },

    employeeId: {
      type: String,
      trim: true,
      index: true,
      default: '',
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
    collection: 'members',
  }
);

/*
|--------------------------------------------------------------------------
| UPDATE TIMESTAMP
|--------------------------------------------------------------------------
|
| Uses the current Mongoose middleware style.
| Do not use function(next) here.
|
|--------------------------------------------------------------------------
*/

// Runs before Member.create() / document.save()
memberSchema.pre('save', async function () {
  this.updatedAt = new Date();
});

// Runs before update queries
memberSchema.pre(
  ['findOneAndUpdate', 'updateOne', 'updateMany'],
  async function () {
    this.set({
      updatedAt: new Date(),
    });
  }
);

export const Member = model('Member', memberSchema);

