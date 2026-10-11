
import { Schema, model } from 'mongoose';

export const notificationTypes = [
  'LOAN_REQUEST',
  'LOAN_APPROVED',
  'LOAN_REJECTED',
  'INSTRUMENT_ISSUED',
  'INSTRUMENT_RETURNED',
  'SYSTEM',
] as const;

export type NotificationType = (typeof notificationTypes)[number];

const notificationSchema = new Schema(
  {
    /*
     * The specific user who should receive this notification.
     *
     * Example:
     * - Employee submits request -> ADMIN receives notification
     * - Admin approves request -> EMPLOYEE receives notification
     * - Admin rejects request -> EMPLOYEE receives notification
     * - Instrument is issued -> EMPLOYEE receives notification
     * - Instrument is returned -> ADMIN/EMPLOYEE can receive notification
     */
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /*
     * User who performed the action.
     *
     * Example:
     * Admin approves a request:
     *   actorId = admin's User._id
     *
     * Employee creates a request:
     *   actorId = employee's User._id
     *
     * This makes it clear who caused the notification.
     */
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    /*
     * Notification type.
     */
    type: {
      type: String,
      enum: notificationTypes,
      required: true,
      index: true,
    },

    /*
     * Short heading shown in notification list.
     *
     * Examples:
     * "New Loan Request"
     * "Loan Request Approved"
     * "Loan Request Rejected"
     * "Instrument Issued"
     * "Instrument Returned"
     */
    title: {
      type: String,
      required: true,
      trim: true,
    },

    /*
     * Exact message shown to the user.
     *
     * Example:
     * "Ali requested instrument FSW-001 for customer Rohde & Schwarz."
     */
    message: {
      type: String,
      required: true,
      trim: true,
    },

    /*
     * Type of entity this notification belongs to.
     *
     * Examples:
     * LoanRequest
     * Loan
     * Equipment
     * User
     */
    referenceType: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },

    /*
     * ID of the exact related record.
     *
     * Example:
     * LoanRequest._id
     * Loan._id
     * Equipment._id
     */
    referenceId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },

    /*
     * Optional direct entity ID.
     *
     * This is useful when one notification is related
     * to a loan request but also needs the equipment ID.
     */
    entityId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    /*
     * Additional information required by the frontend.
     *
     * Example:
     * {
     *   requestNumber: "REQ-00012",
     *   loanNumber: "LOAN-00008",
     *   equipmentCode: "EQ-001",
     *   equipmentName: "Spectrum Analyzer",
     *   serialNumber: "SN12345",
     *   customerName: "Customer A"
     * }
     *
     * This avoids making another database query just to
     * display basic notification information.
     */
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    /*
     * Whether this individual notification has been read.
     */
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    /*
     * Exact time when the notification was read.
     */
    readAt: {
      type: Date,
      default: null,
    },

    /*
     * Notification creation time.
     */
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    /*
     * Updated time.
     */
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'notifications',
    versionKey: false,
  }
);

/*
 * Keep updatedAt correct when a notification is modified.
 */
notificationSchema.pre('save', async function () {
  this.updatedAt = new Date();
});

notificationSchema.pre(
  ['findOneAndUpdate', 'updateOne', 'updateMany'],
  async function () {
    this.set({
      updatedAt: new Date(),
    });
  }
);

/*
 * Get one user's notifications, newest first.
 */
notificationSchema.index({
  userId: 1,
  createdAt: -1,
});

/*
 * Get unread notifications for one user.
 */
notificationSchema.index({
  userId: 1,
  isRead: 1,
  createdAt: -1,
});

/*
 * Find notifications related to a specific entity.
 */
notificationSchema.index({
  referenceType: 1,
  referenceId: 1,
  createdAt: -1,
});

/*
 * Prevent the same event from creating duplicate notifications
 * for the same user.
 *
 * Example:
 * userId + type + referenceId
 *
 * This is useful if an API request is accidentally repeated.
 */
notificationSchema.index(
  {
    userId: 1,
    type: 1,
    referenceId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      referenceId: {
        $type: 'string',
      },
    },
  }
);

export const Notification = model('Notification', notificationSchema);

