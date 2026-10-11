import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';

import { User } from '../../models/User.js';
import { AdminDutyChangeRequest } from '../../models/AdminDutyChangeRequest.js';
import { Notification } from '../../models/Notification.js';

import {
  requireAuth,
  requireAdmin,
  requireApprover,
} from '../../middleware/auth.js';
import type { AuthUser } from '../../middleware/auth.js';

import { sendEmail } from '../../utils/email.js';
import { audit } from '../../utils/audit.js';

import {
  emitUserNotification as emitNotification,
  emitDashboardChanged,
} from '../../websocket/socket.js';

/*
 * Makes `req.user` available on every Express request.
 * (Set by requireAuth in middleware/auth.ts.)
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const router = Router();

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type AdminDuty = 'APPROVER' | 'ISSUER';

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function isAdminDuty(value: unknown): value is AdminDuty {
  return value === 'APPROVER' || value === 'ISSUER';
}

/**
 * Express 5 types route params as string | string[].
 * This always returns a single string.
 */
function getParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Builds the HTML used by all admin-duty emails.
 * Every value is escaped.
 */
function emailHtml(
  title: string,
  intro: string,
  rows: Array<[string, unknown]>,
  footer: string[] = []
): string {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(intro)}</p>
      ${rows
        .map(
          ([label, value]) =>
            `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`
        )
        .join('')}
      ${footer.map((text) => `<p>${escapeHtml(text)}</p>`).join('')}
    </div>
  `;
}

/**
 * Plain-text version of an email body.
 * utils/email.ts requires a `text` field next to `html`.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<\/(p|h2|div)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

/*
|--------------------------------------------------------------------------
| EMAIL HELPER
|--------------------------------------------------------------------------
|
| Email errors never roll back successful database operations.
|
| NOTE: `sender` is kept in the options so existing call sites keep
| working, but it is NOT passed to sendEmail because SendEmailOptions
| in utils/email.ts has no `sender` field.
|
*/

async function sendAdminDutyEmail(options: {
  to: string;
  subject: string;
  html: string;
  sender?: {
    name?: string | null;
    email?: string | null;
  };
}) {
  try {
    await sendEmail({
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: htmlToText(options.html),
    });
  } catch (error) {
    console.error('Admin duty email error:', error);
  }
}

/*
|--------------------------------------------------------------------------
| AUDIT / SOCKET HELPERS (never break the request)
|--------------------------------------------------------------------------
*/

async function safeAudit(
  label: string,
  payload: Parameters<typeof audit>[0]
) {
  try {
    await audit(payload);
  } catch (auditError) {
    console.error(`${label}:`, auditError);
  }
}

function safeEmitDashboard() {
  try {
    emitDashboardChanged();
  } catch (socketError) {
    console.error('Dashboard socket error:', socketError);
  }
}

/*
|--------------------------------------------------------------------------
| NOTIFICATION HELPER
|--------------------------------------------------------------------------
*/

async function createAdminNotification(options: {
  userId: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  referenceId: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const notification = await Notification.create({
      userId: options.userId,
      actorId: options.actorId,
      type: 'SYSTEM',
      title: options.title,
      message: options.message,
      referenceType: 'ADMIN_DUTY_CHANGE',
      referenceId: options.referenceId,
      entityId: options.entityId,
      metadata: options.metadata || {},
      isRead: false,
      readAt: null,
    });

    try {
      // NotificationPayload does not allow null values
      // (e.g. referenceId), so convert null -> undefined.
      const plain = notification.toObject();

      emitNotification(options.userId.toString(), {
        ...plain,
        referenceId: plain.referenceId ?? undefined,
      } as unknown as Parameters<typeof emitNotification>[1]);
    } catch (socketError) {
      console.error('Admin notification socket error:', socketError);
    }

    return notification;
  } catch (error) {
    console.error('Admin notification error:', error);

    return null;
  }
}

/*
|--------------------------------------------------------------------------
| VALIDATION
|--------------------------------------------------------------------------
*/

const reasonSchema = z
  .string()
  .trim()
  .min(3, 'Reason must be at least 3 characters.')
  .max(1000, 'Reason cannot exceed 1000 characters.');

const createRequestSchema = z.object({
  targetUserId: z.string().trim().min(1, 'Target user is required.'),
  requestedAdminType: z.enum(['APPROVER', 'ISSUER']),
  reason: reasonSchema,
});

const directAssignSchema = z.object({
  targetUserId: z.string().trim().min(1, 'Target user is required.'),
  adminType: z.enum(['APPROVER', 'ISSUER']),
  reason: reasonSchema,
});

const handoverSchema = z.object({
  targetUserId: z
    .string()
    .trim()
    .min(1, 'Replacement APPROVER is required.'),
  reason: reasonSchema,
});

const rejectRequestSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(3, 'Rejection reason must be at least 3 characters.')
    .max(1000, 'Rejection reason cannot exceed 1000 characters.')
    .optional(),
});

/*
|--------------------------------------------------------------------------
| GET /api/admin/users
|--------------------------------------------------------------------------
*/

router.get('/users', requireAuth, async (_req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select(
        [
          'employeeId',
          'name',
          'email',
          'department',
          'role',
          'adminType',
          'isActive',
          'createdAt',
          'updatedAt',
        ].join(' ')
      )
      .sort({
        role: 1,
        adminType: 1,
        department: 1,
        name: 1,
      })
      .lean();

    return res.json({ users });
  } catch (error) {
    console.error('Get admin users error:', error);

    return res.status(500).json({
      message: 'Could not load users.',
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET /api/admin/duty-summary
|--------------------------------------------------------------------------
*/

router.get('/duty-summary', requireAuth, async (_req, res) => {
  try {
    const [approvers, issuers] = await Promise.all([
      User.find({
        isActive: true,
        role: 'ADMIN',
        adminType: 'APPROVER',
      })
        .select('employeeId name email department role adminType')
        .sort({ department: 1, name: 1 })
        .lean(),

      User.find({
        isActive: true,
        role: 'ADMIN',
        adminType: 'ISSUER',
      })
        .select('employeeId name email department role adminType')
        .sort({ department: 1, name: 1 })
        .lean(),
    ]);

    return res.json({
      approvers,
      issuers,
      counts: {
        approvers: approvers.length,
        issuers: issuers.length,
      },
    });
  } catch (error) {
    console.error('Get admin duty summary error:', error);

    return res.status(500).json({
      message: 'Could not load administrator duty summary.',
    });
  }
});

/*
|--------------------------------------------------------------------------
| POST /api/admin/admins/assign
|--------------------------------------------------------------------------
|
| DIRECT ADMIN ASSIGNMENT
|
| An APPROVER can directly assign an administrative duty.
| Existing administrators are NOT changed.
| Multiple APPROVERs and ISSUERs are allowed.
|
*/

router.post(
  '/admins/assign',
  requireAuth,
  requireApprover,
  async (req, res) => {
    const session = await mongoose.startSession();

    try {
      if (!req.user) {
        return res.status(401).json({
          message: 'Authentication required.',
        });
      }

      const parsed = directAssignSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          message:
            parsed.error.issues[0]?.message ||
            'Invalid administrator assignment data.',
        });
      }

      const { targetUserId, adminType, reason } = parsed.data;

      if (!isAdminDuty(adminType)) {
        return res.status(400).json({
          message: 'Administrative duty must be APPROVER or ISSUER.',
        });
      }

      if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        return res.status(400).json({
          message: 'Invalid target user ID.',
        });
      }

      const approver = await User.findById(req.user.id);

      if (!approver) {
        return res.status(401).json({
          message: 'Approver account was not found.',
        });
      }

      if (
        !approver.isActive ||
        approver.role !== 'ADMIN' ||
        approver.adminType !== 'APPROVER'
      ) {
        return res.status(403).json({
          message:
            'Only an active APPROVER administrator can assign administrator duties.',
        });
      }

      const targetUser = await User.findById(targetUserId);

      if (!targetUser) {
        return res.status(404).json({
          message: 'Selected employee was not found.',
        });
      }

      if (!targetUser.isActive) {
        return res.status(400).json({
          message: 'The selected employee is inactive.',
        });
      }

      if (targetUser._id.toString() === approver._id.toString()) {
        return res.status(400).json({
          message:
            'You cannot assign administrator duty to yourself using this action. Use the duty handover action instead.',
        });
      }

      if (targetUser.role !== 'EMPLOYEE') {
        return res.status(400).json({
          message:
            'Only an active employee without administrator duty can be assigned a new administrator duty.',
        });
      }

      if (
        targetUser.adminType !== null &&
        targetUser.adminType !== undefined
      ) {
        return res.status(409).json({
          message: `This user already has the ${targetUser.adminType} administrator duty.`,
        });
      }

      session.startTransaction();

      const lockedTarget = await User.findOne({
        _id: targetUser._id,
        isActive: true,
        role: 'EMPLOYEE',
        $or: [{ adminType: null }, { adminType: { $exists: false } }],
      }).session(session);

      if (!lockedTarget) {
        await session.abortTransaction();

        return res.status(409).json({
          message:
            'The selected employee was changed by another administrator. Please refresh the users list and try again.',
        });
      }

      lockedTarget.role = 'ADMIN';
      lockedTarget.adminType = adminType;

      await lockedTarget.save({ session });

      await session.commitTransaction();

      await createAdminNotification({
        userId: lockedTarget._id,
        actorId: approver._id,
        title: 'Administrative Duty Assigned',
        message: `You have been assigned ${adminType} administrator duty by ${approver.name}.`,
        referenceId: lockedTarget._id.toString(),
        entityId: lockedTarget._id.toString(),
        metadata: {
          action: 'DIRECT_ADMIN_ASSIGNMENT',
          assignedDuty: adminType,
          assignedBy: approver._id.toString(),
          reason: reason.trim(),
        },
      });

      await sendAdminDutyEmail({
        to: lockedTarget.email,
        subject: `Administrative Duty Assigned - ${adminType}`,
        sender: { name: approver.name, email: approver.email },
        html: emailHtml(
          'Administrative Duty Assigned',
          'Your administrator duty has been updated in the internal Equipment Management System.',
          [
            ['Name', lockedTarget.name],
            ['Department', lockedTarget.department],
            ['Assigned duty', adminType],
            ['Assigned by', approver.name],
            ['Effective time', formatDate(new Date())],
            ['Reason', reason],
          ],
          [
            'Your existing account remains unchanged. You can sign in using your existing credentials.',
          ]
        ),
      });

      await safeAudit('Direct admin assignment audit error', {
        action: 'ADMIN_DUTY_DIRECTLY_ASSIGNED',
        actorId: approver._id.toString(),
        entityType: 'USER',
        entityId: lockedTarget._id.toString(),
        metadata: {
          targetUserId: lockedTarget._id.toString(),
          targetName: lockedTarget.name,
          targetDepartment: lockedTarget.department,
          assignedAdminType: adminType,
          assignedBy: approver._id.toString(),
          reason: reason.trim(),
          assignmentMethod: 'DIRECT_APPROVER_ASSIGNMENT',
        },
      });

      safeEmitDashboard();

      return res.status(201).json({
        message: `${lockedTarget.name} is now an ${adminType} administrator.`,
        user: {
          id: lockedTarget._id,
          employeeId: lockedTarget.employeeId,
          name: lockedTarget.name,
          email: lockedTarget.email,
          department: lockedTarget.department,
          role: lockedTarget.role,
          adminType: lockedTarget.adminType,
        },
      });
    } catch (error: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      console.error('Direct admin assignment error:', error);

      return res.status(500).json({
        message:
          error?.message || 'Could not assign administrator duty.',
      });
    } finally {
      await session.endSession();
    }
  }
);

/*
|--------------------------------------------------------------------------
| POST /api/admin/admins/handover
|--------------------------------------------------------------------------
|
| APPROVER DUTY HANDOVER
|
| The one operation that intentionally removes the current APPROVER
| duty from one user and gives it to another user.
|
*/

router.post(
  '/admins/handover',
  requireAuth,
  requireApprover,
  async (req, res) => {
    const session = await mongoose.startSession();

    try {
      if (!req.user) {
        return res.status(401).json({
          message: 'Authentication required.',
        });
      }

      const parsed = handoverSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          message:
            parsed.error.issues[0]?.message || 'Invalid handover data.',
        });
      }

      const { targetUserId, reason } = parsed.data;

      if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        return res.status(400).json({
          message: 'Invalid replacement user ID.',
        });
      }

      const currentApprover = await User.findById(req.user.id);

      if (!currentApprover) {
        return res.status(401).json({
          message: 'Current APPROVER account was not found.',
        });
      }

      if (
        !currentApprover.isActive ||
        currentApprover.role !== 'ADMIN' ||
        currentApprover.adminType !== 'APPROVER'
      ) {
        return res.status(403).json({
          message:
            'Only an active APPROVER administrator can handover APPROVER duty.',
        });
      }

      if (currentApprover._id.toString() === targetUserId) {
        return res.status(400).json({
          message: 'You cannot handover APPROVER duty to yourself.',
        });
      }

      const replacement = await User.findById(targetUserId);

      if (!replacement) {
        return res.status(404).json({
          message: 'Replacement user was not found.',
        });
      }

      if (!replacement.isActive) {
        return res.status(400).json({
          message: 'The replacement user is inactive.',
        });
      }

      if (replacement.role !== 'EMPLOYEE') {
        return res.status(400).json({
          message: 'The replacement must be an EMPLOYEE.',
        });
      }

      if (
        replacement.adminType !== null &&
        replacement.adminType !== undefined
      ) {
        return res.status(409).json({
          message: `The replacement user already has the ${replacement.adminType} administrator duty.`,
        });
      }

      const activeApproverCount = await User.countDocuments({
        isActive: true,
        role: 'ADMIN',
        adminType: 'APPROVER',
      });

      if (activeApproverCount <= 0) {
        return res.status(409).json({
          message: 'No active APPROVER was found for this handover.',
        });
      }

      session.startTransaction();

      const lockedCurrentApprover = await User.findOne({
        _id: currentApprover._id,
        isActive: true,
        role: 'ADMIN',
        adminType: 'APPROVER',
      }).session(session);

      if (!lockedCurrentApprover) {
        await session.abortTransaction();

        return res.status(409).json({
          message:
            'Your APPROVER duty has already changed. Refresh the page and try again.',
        });
      }

      const lockedReplacement = await User.findOne({
        _id: replacement._id,
        isActive: true,
        role: 'EMPLOYEE',
        $or: [{ adminType: null }, { adminType: { $exists: false } }],
      }).session(session);

      if (!lockedReplacement) {
        await session.abortTransaction();

        return res.status(409).json({
          message:
            'The replacement user has already been changed by another administrator. Please refresh the users list.',
        });
      }

      lockedCurrentApprover.role = 'EMPLOYEE';
      lockedCurrentApprover.adminType = null;

      await lockedCurrentApprover.save({ session });

      lockedReplacement.role = 'ADMIN';
      lockedReplacement.adminType = 'APPROVER';

      await lockedReplacement.save({ session });

      await session.commitTransaction();

      const effectiveTime = new Date();

      const handoverMetadata = {
        action: 'APPROVER_DUTY_HANDOVER',
        previousApprover: lockedCurrentApprover._id.toString(),
        newApprover: lockedReplacement._id.toString(),
        reason: reason.trim(),
      };

      await createAdminNotification({
        userId: lockedCurrentApprover._id,
        actorId: lockedReplacement._id,
        title: 'APPROVER Duty Handed Over',
        message: `Your APPROVER administrator duty has been handed over to ${lockedReplacement.name}. Your account remains active as an EMPLOYEE.`,
        referenceId: lockedReplacement._id.toString(),
        entityId: lockedCurrentApprover._id.toString(),
        metadata: handoverMetadata,
      });

      await createAdminNotification({
        userId: lockedReplacement._id,
        actorId: lockedCurrentApprover._id,
        title: 'APPROVER Duty Assigned',
        message: `You are now an APPROVER administrator. The previous APPROVER was ${lockedCurrentApprover.name}.`,
        referenceId: lockedReplacement._id.toString(),
        entityId: lockedReplacement._id.toString(),
        metadata: handoverMetadata,
      });

      await sendAdminDutyEmail({
        to: lockedCurrentApprover.email,
        subject: 'APPROVER Duty Handed Over',
        sender: {
          name: lockedReplacement.name,
          email: lockedReplacement.email,
        },
        html: emailHtml(
          'APPROVER Duty Handed Over',
          'Your APPROVER administrator duty has been handed over to another employee.',
          [
            ['Previous APPROVER', lockedCurrentApprover.name],
            ['New APPROVER', lockedReplacement.name],
            ['New APPROVER department', lockedReplacement.department],
            ['Effective time', formatDate(effectiveTime)],
            ['Reason', reason],
          ],
          [
            'Your account has NOT been deleted. Your account remains active as an EMPLOYEE.',
          ]
        ),
      });

      await sendAdminDutyEmail({
        to: lockedReplacement.email,
        subject: 'You Are Now an APPROVER Administrator',
        sender: {
          name: lockedCurrentApprover.name,
          email: lockedCurrentApprover.email,
        },
        html: emailHtml(
          'APPROVER Administrator Duty Assigned',
          'You have been assigned APPROVER administrator duty in the internal Equipment Management System.',
          [
            ['Name', lockedReplacement.name],
            ['Department', lockedReplacement.department],
            ['Previous APPROVER', lockedCurrentApprover.name],
            ['Effective time', formatDate(effectiveTime)],
            ['Reason', reason],
          ],
          [
            'You can use your existing account to access APPROVER administration functionality.',
          ]
        ),
      });

      await safeAudit('Approver handover audit error', {
        action: 'APPROVER_DUTY_HANDED_OVER',
        actorId: lockedCurrentApprover._id.toString(),
        entityType: 'USER',
        entityId: lockedReplacement._id.toString(),
        metadata: {
          previousApproverId: lockedCurrentApprover._id.toString(),
          previousApproverName: lockedCurrentApprover.name,
          previousApproverDepartment: lockedCurrentApprover.department,
          newApproverId: lockedReplacement._id.toString(),
          newApproverName: lockedReplacement.name,
          newApproverDepartment: lockedReplacement.department,
          reason: reason.trim(),
          previousRole: 'ADMIN',
          previousAdminType: 'APPROVER',
          newRole: 'ADMIN',
          newAdminType: 'APPROVER',
          replacementMethod: 'SELF_HANDOVER',
        },
      });

      safeEmitDashboard();

      return res.json({
        message: `${lockedReplacement.name} is now an APPROVER administrator. Your account remains active as an EMPLOYEE.`,
        previousApprover: {
          id: lockedCurrentApprover._id,
          name: lockedCurrentApprover.name,
          role: lockedCurrentApprover.role,
          adminType: lockedCurrentApprover.adminType,
        },
        newApprover: {
          id: lockedReplacement._id,
          employeeId: lockedReplacement.employeeId,
          name: lockedReplacement.name,
          email: lockedReplacement.email,
          department: lockedReplacement.department,
          role: lockedReplacement.role,
          adminType: lockedReplacement.adminType,
        },
      });
    } catch (error: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      console.error('Approver duty handover error:', error);

      return res.status(500).json({
        message:
          error?.message || 'Could not complete APPROVER duty handover.',
      });
    } finally {
      await session.endSession();
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET /api/admin/duty-requests
|--------------------------------------------------------------------------
*/

router.get('/duty-requests', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required.',
      });
    }

    const isApprover =
      req.user.role === 'ADMIN' && req.user.adminType === 'APPROVER';

    const filter = isApprover ? {} : { requestedBy: req.user.id };

    const populateFields =
      'employeeId name email department role adminType';

    const requests = await AdminDutyChangeRequest.find(filter)
      .populate('requestedBy', populateFields)
      .populate('currentAdminUser', populateFields)
      .populate('targetUser', populateFields)
      .populate('approvedBy', populateFields)
      .populate('rejectedBy', populateFields)
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ requests });
  } catch (error) {
    console.error('Get admin duty requests error:', error);

    return res.status(500).json({
      message: 'Could not load admin duty requests.',
    });
  }
});

/*
|--------------------------------------------------------------------------
| POST /api/admin/duty-requests
|--------------------------------------------------------------------------
|
| REQUEST-BASED ADMIN DUTY FLOW
| New requests never remove an existing administrator.
|
*/

router.post(
  '/duty-requests',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: 'Authentication required.',
        });
      }

      const parsed = createRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          message:
            parsed.error.issues[0]?.message || 'Invalid request data.',
        });
      }

      const { targetUserId, requestedAdminType, reason } = parsed.data;

      if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        return res.status(400).json({
          message: 'Invalid target user ID.',
        });
      }

      const requester = await User.findById(req.user.id);

      if (!requester) {
        return res.status(401).json({
          message: 'Requesting user was not found.',
        });
      }

      if (!requester.isActive) {
        return res.status(403).json({
          message: 'Your account is inactive.',
        });
      }

      if (requester.role !== 'ADMIN') {
        return res.status(403).json({
          message: 'Administrator access required.',
        });
      }

      const targetUser = await User.findById(targetUserId);

      if (!targetUser) {
        return res.status(404).json({
          message: 'Selected employee was not found.',
        });
      }

      if (!targetUser.isActive) {
        return res.status(400).json({
          message: 'The selected employee is not active.',
        });
      }

      if (targetUser._id.toString() === requester._id.toString()) {
        return res.status(400).json({
          message:
            'You cannot assign administrator duty to yourself using a duty request.',
        });
      }

      if (targetUser.role !== 'EMPLOYEE') {
        return res.status(400).json({
          message:
            'Only an active employee can be assigned an administrative duty.',
        });
      }

      if (
        targetUser.adminType !== null &&
        targetUser.adminType !== undefined
      ) {
        return res.status(400).json({
          message: `This user already has the ${targetUser.adminType} administrator duty.`,
        });
      }

      const approvers = await User.find({
        role: 'ADMIN',
        adminType: 'APPROVER',
        isActive: true,
      })
        .select('name email employeeId department')
        .lean();

      if (approvers.length === 0) {
        return res.status(409).json({
          message: 'No active APPROVER administrator is available.',
        });
      }

      const existingTargetRequest =
        await AdminDutyChangeRequest.findOne({
          targetUser: targetUser._id,
          status: 'PENDING',
        });

      if (existingTargetRequest) {
        return res.status(409).json({
          message:
            'This user already has a pending administrator duty request.',
        });
      }

      const request = await AdminDutyChangeRequest.create({
        requestedBy: requester._id,
        targetUser: targetUser._id,
        currentAdminUser: null,
        previousAdminType: null,
        requestedAdminType,
        reason: reason.trim(),
        status: 'PENDING',
        approvedBy: null,
        approvedAt: null,
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
      });

      for (const approver of approvers) {
        await createAdminNotification({
          userId: approver._id,
          actorId: requester._id,
          title: 'Admin Duty Change Request',
          message: `${requester.name} requested ${requestedAdminType} administrator duty for ${targetUser.name}.`,
          referenceId: request._id.toString(),
          entityId: targetUser._id.toString(),
          metadata: {
            requestId: request._id.toString(),
            requestedBy: requester._id.toString(),
            targetUser: targetUser._id.toString(),
            requestedAdminType,
          },
        });

        await sendAdminDutyEmail({
          to: approver.email,
          subject: `Admin Duty Change Approval Required - ${requestedAdminType}`,
          sender: { name: requester.name, email: requester.email },
          html: emailHtml(
            'Admin Duty Change Request',
            'A new administrator duty change request requires your review.',
            [
              ['Requested by', requester.name],
              ['Requester department', requester.department],
              ['New administrator', targetUser.name],
              ['Target department', targetUser.department],
              ['Requested duty', requestedAdminType],
              ['Reason', reason],
              ['Requested at', formatDate(request.createdAt)],
              ['Request ID', request._id.toString()],
            ]
          ),
        });
      }

      await safeAudit('Admin duty request audit error', {
        action: 'ADMIN_DUTY_CHANGE_REQUESTED',
        actorId: requester._id.toString(),
        entityType: 'ADMIN_DUTY_CHANGE',
        entityId: request._id.toString(),
        metadata: {
          targetUserId: targetUser._id.toString(),
          requestedAdminType,
          previousAdminType: null,
          reason: reason.trim(),
        },
      });

      safeEmitDashboard();

      return res.status(201).json({
        message:
          'Admin duty change request submitted successfully. All active APPROVER administrators have been notified.',
        request,
      });
    } catch (error: any) {
      console.error('Create admin duty request error:', error);

      if (error?.name === 'ValidationError') {
        console.error('Mongoose validation errors:', error.errors);
      }

      if (error?.code === 11000) {
        console.error('MongoDB duplicate key error:', error.keyValue);
      }

      return res.status(500).json({
        message:
          error?.message ||
          'Could not create admin duty change request.',
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| POST /api/admin/duty-requests/:id/approve
|--------------------------------------------------------------------------
|
| - Only an active APPROVER can approve.
| - An APPROVER cannot approve their own request.
| - Request must still be PENDING.
| - Target must still be an active EMPLOYEE.
| - Existing administrators are NOT demoted.
| - Multiple APPROVERs and ISSUERs are allowed.
|
*/

router.post(
  '/duty-requests/:id/approve',
  requireAuth,
  requireApprover,
  async (req, res) => {
    const session = await mongoose.startSession();

    try {
      const requestId = getParam(req.params.id);

      if (!mongoose.Types.ObjectId.isValid(requestId)) {
        return res.status(400).json({
          message: 'Invalid request ID.',
        });
      }

      if (!req.user) {
        return res.status(401).json({
          message: 'Authentication required.',
        });
      }

      const approver = await User.findById(req.user.id);

      if (!approver) {
        return res.status(401).json({
          message: 'Approver account was not found.',
        });
      }

      if (
        !approver.isActive ||
        approver.role !== 'ADMIN' ||
        approver.adminType !== 'APPROVER'
      ) {
        return res.status(403).json({
          message: 'Approver administrator access required.',
        });
      }

      session.startTransaction();

      /*
       * The model field is `targetUser`, NOT `targetUserId`.
       */
      const request = await AdminDutyChangeRequest.findOne({
        _id: new mongoose.Types.ObjectId(requestId),
        status: 'PENDING',
      }).session(session);

      if (!request) {
        await session.abortTransaction();

        return res.status(404).json({
          message:
            'Pending admin duty request was not found. It may already have been processed.',
        });
      }

      if (request.requestedBy.toString() === approver._id.toString()) {
        await session.abortTransaction();

        return res.status(403).json({
          message:
            'An APPROVER cannot approve their own admin duty change request.',
        });
      }

      if (!isAdminDuty(request.requestedAdminType)) {
        await session.abortTransaction();

        return res.status(400).json({
          message: 'The requested administrator duty is invalid.',
        });
      }

      const targetUser = await User.findById(request.targetUser).session(
        session
      );

      if (!targetUser) {
        await session.abortTransaction();

        return res.status(404).json({
          message: 'Target user no longer exists.',
        });
      }

      if (!targetUser.isActive) {
        await session.abortTransaction();

        return res.status(400).json({
          message: 'Target user is inactive.',
        });
      }

      if (targetUser.role !== 'EMPLOYEE') {
        await session.abortTransaction();

        return res.status(409).json({
          message:
            'The target user is no longer an EMPLOYEE. The request cannot be approved.',
        });
      }

      /*
       * adminType may be null OR undefined for old users.
       */
      if (
        targetUser.adminType !== null &&
        targetUser.adminType !== undefined
      ) {
        await session.abortTransaction();

        return res.status(409).json({
          message: `The target user already has the ${targetUser.adminType} administrator duty. The request cannot be approved.`,
        });
      }

      const requester = await User.findById(request.requestedBy)
        .select('name email employeeId department')
        .session(session)
        .lean();

      if (!requester) {
        await session.abortTransaction();

        return res.status(404).json({
          message: 'The user who created this request no longer exists.',
        });
      }

      /*
       * We do NOT search for an existing APPROVER, demote an ISSUER,
       * or replace another administrator.
       */
      targetUser.role = 'ADMIN';
      targetUser.adminType = request.requestedAdminType;

      await targetUser.save({ session });

      request.status = 'APPROVED';
      request.approvedBy = approver._id;
      request.approvedAt = new Date();
      request.currentAdminUser = null;
      request.previousAdminType = null;

      await request.save({ session });

      await session.commitTransaction();

      const effectiveTime = request.approvedAt || new Date();

      await createAdminNotification({
        userId: requester._id,
        actorId: approver._id,
        title: 'Admin Duty Change Approved',
        message: `${targetUser.name} has been assigned ${request.requestedAdminType} administrator duty.`,
        referenceId: request._id.toString(),
        entityId: targetUser._id.toString(),
        metadata: {
          requestId: request._id.toString(),
          targetUser: targetUser._id.toString(),
          targetUserName: targetUser.name,
          requestedAdminType: request.requestedAdminType,
          approvedBy: approver._id.toString(),
          approvedByName: approver.name,
        },
      });

      await createAdminNotification({
        userId: targetUser._id,
        actorId: approver._id,
        title: 'Administrative Duty Assigned',
        message: `You have been assigned ${request.requestedAdminType} administrator duty.`,
        referenceId: request._id.toString(),
        entityId: targetUser._id.toString(),
        metadata: {
          requestId: request._id.toString(),
          requestedAdminType: request.requestedAdminType,
          approvedBy: approver._id.toString(),
          approvedByName: approver.name,
        },
      });

      await sendAdminDutyEmail({
        to: requester.email,
        subject: 'Admin Duty Change Approved',
        sender: { name: approver.name, email: approver.email },
        html: emailHtml(
          'Admin Duty Change Approved',
          'The administrator duty change request has been approved.',
          [
            ['User', targetUser.name],
            ['Department', targetUser.department],
            ['Assigned duty', request.requestedAdminType],
            ['Approved by', approver.name],
            ['Approved at', formatDate(effectiveTime)],
            ['Request ID', request._id.toString()],
          ]
        ),
      });

      await sendAdminDutyEmail({
        to: targetUser.email,
        subject: `Administrative Duty Assigned - ${request.requestedAdminType}`,
        sender: { name: approver.name, email: approver.email },
        html: emailHtml(
          'Administrative Duty Assigned',
          'Your administrator duty has been updated in the internal Equipment Management System.',
          [
            ['Name', targetUser.name],
            ['Department', targetUser.department],
            ['Assigned duty', request.requestedAdminType],
            ['Approved by', approver.name],
            ['Effective time', formatDate(effectiveTime)],
            ['Request ID', request._id.toString()],
          ],
          ['You can sign in using your existing account.']
        ),
      });

      await safeAudit('Admin duty approval audit error', {
        action: 'ADMIN_DUTY_CHANGE_APPROVED',
        actorId: approver._id.toString(),
        entityType: 'ADMIN_DUTY_CHANGE',
        entityId: request._id.toString(),
        metadata: {
          targetUserId: targetUser._id.toString(),
          targetUserName: targetUser.name,
          targetDepartment: targetUser.department,
          requestedAdminType: request.requestedAdminType,
          approvedBy: approver._id.toString(),
          approvedByName: approver.name,
          approvalMethod: 'APPROVER_REQUEST_APPROVAL',
        },
      });

      safeEmitDashboard();

      return res.json({
        message: `${targetUser.name} is now an ${request.requestedAdminType} administrator.`,
        request: {
          id: request._id,
          status: request.status,
          requestedBy: request.requestedBy,
          targetUser: targetUser._id,
          requestedAdminType: request.requestedAdminType,
          approvedBy: request.approvedBy,
          approvedAt: request.approvedAt,
        },
        user: {
          id: targetUser._id,
          employeeId: targetUser.employeeId,
          name: targetUser.name,
          email: targetUser.email,
          department: targetUser.department,
          role: targetUser.role,
          adminType: targetUser.adminType,
        },
      });
    } catch (error: any) {
      if (session.inTransaction()) {
        try {
          await session.abortTransaction();
        } catch (abortError) {
          console.error('Transaction abort error:', abortError);
        }
      }

      console.error('APPROVE ADMIN DUTY REQUEST ERROR');
      console.error('Message:', error?.message);
      console.error('Name:', error?.name);
      console.error('Code:', error?.code);
      console.error('CodeName:', error?.codeName);
      console.error('Error:', error);

      const isProduction = process.env.NODE_ENV === 'production';

      return res.status(500).json({
        message: isProduction
          ? 'Could not approve admin duty request.'
          : error?.message || 'Could not approve admin duty request.',
        error: isProduction
          ? undefined
          : {
              name: error?.name,
              code: error?.code,
              codeName: error?.codeName,
            },
      });
    } finally {
      await session.endSession();
    }
  }
);

/*
|--------------------------------------------------------------------------
| POST /api/admin/duty-requests/:id/reject
|--------------------------------------------------------------------------
*/

router.post(
  '/duty-requests/:id/reject',
  requireAuth,
  requireApprover,
  async (req, res) => {
    try {
      const requestId = getParam(req.params.id);

      if (!mongoose.Types.ObjectId.isValid(requestId)) {
        return res.status(400).json({
          message: 'Invalid request ID.',
        });
      }

      const parsed = rejectRequestSchema.safeParse(req.body || {});

      if (!parsed.success) {
        return res.status(400).json({
          message:
            parsed.error.issues[0]?.message || 'Invalid rejection data.',
        });
      }

      if (!req.user) {
        return res.status(401).json({
          message: 'Authentication required.',
        });
      }

      const approver = await User.findById(req.user.id);

      if (!approver) {
        return res.status(401).json({
          message: 'Approver account was not found.',
        });
      }

      if (
        !approver.isActive ||
        approver.role !== 'ADMIN' ||
        approver.adminType !== 'APPROVER'
      ) {
        return res.status(403).json({
          message: 'Approver administrator access required.',
        });
      }

      const request = await AdminDutyChangeRequest.findOne({
        _id: requestId,
        status: 'PENDING',
      });

      if (!request) {
        return res.status(404).json({
          message:
            'Pending admin duty request was not found. It may already have been processed.',
        });
      }

      if (request.requestedBy.toString() === approver._id.toString()) {
        return res.status(403).json({
          message:
            'An APPROVER cannot reject their own admin duty change request.',
        });
      }

      const targetUser = await User.findById(request.targetUser)
        .select('name email employeeId department role adminType')
        .lean();

      request.status = 'REJECTED';
      request.rejectedBy = approver._id;
      request.rejectedAt = new Date();
      request.rejectionReason = parsed.data.rejectionReason || null;

      await request.save();

      const requester = await User.findById(request.requestedBy)
        .select('name email employeeId department')
        .lean();

      if (requester) {
        await createAdminNotification({
          userId: requester._id,
          actorId: approver._id,
          title: 'Admin Duty Change Rejected',
          message: `${targetUser?.name || 'The requested user'} was not assigned ${request.requestedAdminType} administrator duty.`,
          referenceId: request._id.toString(),
          entityId: request.targetUser.toString(),
          metadata: {
            requestId: request._id.toString(),
            requestedAdminType: request.requestedAdminType,
            rejectedBy: approver._id.toString(),
            rejectionReason: request.rejectionReason,
          },
        });

        const rejectionRows: Array<[string, unknown]> = [
          ['User', targetUser?.name || 'Unknown'],
          ['Requested duty', request.requestedAdminType],
          ['Rejected by', approver.name],
          ['Rejected at', formatDate(request.rejectedAt)],
        ];

        if (request.rejectionReason) {
          rejectionRows.push(['Reason', request.rejectionReason]);
        }

        rejectionRows.push(['Request ID', request._id.toString()]);

        await sendAdminDutyEmail({
          to: requester.email,
          subject: 'Admin Duty Change Rejected',
          sender: { name: approver.name, email: approver.email },
          html: emailHtml(
            'Admin Duty Change Rejected',
            'The administrator duty change request was rejected.',
            rejectionRows
          ),
        });
      }

      await safeAudit('Admin duty rejection audit error', {
        action: 'ADMIN_DUTY_CHANGE_REJECTED',
        actorId: approver._id.toString(),
        entityType: 'ADMIN_DUTY_CHANGE',
        entityId: request._id.toString(),
        metadata: {
          targetUserId: request.targetUser.toString(),
          requestedAdminType: request.requestedAdminType,
          rejectionReason: request.rejectionReason,
          rejectedBy: approver._id.toString(),
        },
      });

      safeEmitDashboard();

      return res.json({
        message: 'Admin duty change request rejected.',
        request,
      });
    } catch (error: any) {
      console.error('Reject admin duty request error:', error);

      return res.status(500).json({
        message:
          error?.message || 'Could not reject admin duty request.',
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| POST /api/admin/duty-requests/:id/cancel
|--------------------------------------------------------------------------
|
| Requester can cancel their own PENDING request.
|
*/

router.post('/duty-requests/:id/cancel', requireAuth, async (req, res) => {
  try {
    const requestId = getParam(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        message: 'Invalid request ID.',
      });
    }

    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required.',
      });
    }

    const request = await AdminDutyChangeRequest.findOne({
      _id: requestId,
      requestedBy: req.user.id,
      status: 'PENDING',
    });

    if (!request) {
      return res.status(404).json({
        message: 'Pending request was not found.',
      });
    }

    request.status = 'CANCELLED';

    await request.save();

    safeEmitDashboard();

    await safeAudit('Admin duty cancellation audit error', {
      action: 'ADMIN_DUTY_CHANGE_CANCELLED',
      actorId: req.user.id,
      entityType: 'ADMIN_DUTY_CHANGE',
      entityId: request._id.toString(),
      metadata: {
        targetUserId: request.targetUser.toString(),
        requestedAdminType: request.requestedAdminType,
      },
    });

    return res.json({
      message: 'Admin duty change request cancelled.',
      request,
    });
  } catch (error: any) {
    console.error('Cancel admin duty request error:', error);

    return res.status(500).json({
      message:
        error?.message || 'Could not cancel admin duty change request.',
    });
  }
});

export default router;