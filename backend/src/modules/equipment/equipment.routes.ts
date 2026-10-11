import { Router } from 'express';
import { z } from 'zod';

import { Equipment } from '../../models/Equipment.js';
import {
  requireAuth,
  requireAdmin,
  AuthRequest,
} from '../../middleware/auth.js';
import { audit } from '../../utils/audit.js';
import { emitDashboardChanged } from '../../websocket/socket.js';

const router = Router();

/*
|--------------------------------------------------------------------------
| Equipment validation schema
|--------------------------------------------------------------------------
|
| Matches the Company Instrument Management inventory structure.
|
*/

const optionalString = z.string().optional().nullable();

const optionalNumberLike = z
  .union([z.string(), z.number()])
  .optional()
  .nullable();

const optionalDateLike = z
  .union([z.string(), z.date()])
  .optional()
  .nullable();

const equipmentSchema = z.object({
  /* Equipment Code */
  equipmentCode: optionalString,

  /* Basic Information */
  sNo: optionalNumberLike,
  acquisitionYear: optionalNumberLike,
  material: optionalString,
  serialNumber: optionalString,
  model: optionalString,
  description: optionalString,

  /* Financial Information */
  acquisitionValue: optionalNumberLike,
  accumulatedDepreciation: optionalNumberLike,
  bookValue: optionalNumberLike,
  currency: optionalString,
  costCenter: optionalString,
  balanceSheetAccountAPC: optionalString,

  /* Location */
  location: optionalString,
  fineLocation: optionalString,

  /* Status */
  loanStatus: z
    .enum(['AVAILABLE', 'ON_LOAN', 'MAINTENANCE', 'RETIRED'])
    .optional(),

  operationalStatus: z
    .enum(['OPERATIONAL', 'NON_OPERATIONAL', 'UNDER_MAINTENANCE'])
    .optional(),

  /* Loan Information */
  requester: optionalString,
  customer: optionalString,
  loanDate: optionalDateLike,
  returnDue: optionalDateLike,
});

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

/**
 * Removes null values.
 *
 * The zod schema allows `null`, but the Mongoose model only accepts a
 * value or `undefined`. Dropping nulls lets the model apply its defaults.
 */
function withoutNulls(
  source: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== null)
  );
}

/*
|--------------------------------------------------------------------------
| GET /api/equipment
|--------------------------------------------------------------------------
|
| Returns all equipment.
|
| Optional: /api/equipment?availableOnly=true
| Returns only equipment that is available and operational.
|
*/

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const filter =
      req.query.availableOnly === 'true'
        ? {
            loanStatus: 'AVAILABLE' as const,
            operationalStatus: 'OPERATIONAL' as const,
          }
        : {};

    const instruments = await Equipment.find(filter)
      .sort({
        material: 1,
        sNo: 1,
      })
      .lean();

    return res.status(200).json(instruments);
  } catch (error) {
    next(error);
  }
});

/*
|--------------------------------------------------------------------------
| GET /api/equipment/:id
|--------------------------------------------------------------------------
*/

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const instrument = await Equipment.findById(req.params.id).lean();

    if (!instrument) {
      return res.status(404).json({
        message: 'Equipment not found',
      });
    }

    return res.status(200).json(instrument);
  } catch (error) {
    next(error);
  }
});

/*
|--------------------------------------------------------------------------
| POST /api/equipment
|--------------------------------------------------------------------------
|
| Admin creates a new equipment record.
|
*/

router.post(
  '/',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res, next) => {
    try {
      /* Validate request body */

      const parsed = equipmentSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          message: 'Invalid equipment data',
          issues: parsed.error.issues,
        });
      }

      const data = parsed.data;

      /* Generate Equipment Code */

      let equipmentCode = data.equipmentCode || undefined;

      if (!equipmentCode) {
        if (
          data.sNo !== undefined &&
          data.sNo !== null &&
          String(data.sNo).trim() !== ''
        ) {
          /* Option 1: use S No */
          equipmentCode = `EQ-${String(data.sNo).trim()}`;
        } else if (
          data.serialNumber &&
          String(data.serialNumber).trim() !== ''
        ) {
          /* Option 2: use Serial Number */
          const cleanedSerial = String(data.serialNumber)
            .replace(/[^a-zA-Z0-9]/g, '')
            .toUpperCase();

          equipmentCode = `EQ-${cleanedSerial}`;
        } else {
          /* Option 3: timestamp fallback */
          equipmentCode = `EQ-${Date.now()}`;
        }
      }

      /* Default statuses */

      const equipmentData = {
        ...withoutNulls(data),

        equipmentCode,

        loanStatus: data.loanStatus || 'AVAILABLE',

        operationalStatus: data.operationalStatus || 'OPERATIONAL',
      };

      /* Create equipment (new + save keeps the document type intact) */

      const instrument = new Equipment(
        equipmentData as unknown as ConstructorParameters<
          typeof Equipment
        >[0]
      );

      await instrument.save();

      /* Audit log */

      await audit({
        actorId: req.user!.id,
        action: 'CREATE',
        entityType: 'Equipment',
        entityId: instrument.id,
        newValue: instrument.toObject(),
      });

      /* Notify dashboard */

      emitDashboardChanged();

      return res.status(201).json(instrument);
    } catch (error: any) {
      console.error('Equipment creation error:', error);

      /* Duplicate key */

      if (error?.code === 11000) {
        const duplicateField =
          Object.keys(error.keyPattern || {})[0] || 'equipment';

        return res.status(409).json({
          message: `An equipment record with the same ${duplicateField} already exists.`,
        });
      }

      /* Mongoose validation error */

      if (error?.name === 'ValidationError') {
        return res.status(400).json({
          message: 'Equipment validation failed.',
          errors: Object.values(error.errors || {}).map(
            (item: any) => item.message
          ),
        });
      }

      next(error);
    }
  }
);

/*
|--------------------------------------------------------------------------
| PUT /api/equipment/:id
|--------------------------------------------------------------------------
|
| Admin updates an existing equipment record.
|
*/

router.put(
  '/:id',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res, next) => {
    try {
      /* Validate request */

      const parsed = equipmentSchema.partial().safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          message: 'Invalid equipment data',
          issues: parsed.error.issues,
        });
      }

      /* Find existing equipment */

      const oldInstrument = await Equipment.findById(req.params.id);

      if (!oldInstrument) {
        return res.status(404).json({
          message: 'Equipment not found',
        });
      }

      /* Update equipment */

      const updatedInstrument = await Equipment.findByIdAndUpdate(
        req.params.id,
        {
          $set: parsed.data,
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedInstrument) {
        return res.status(404).json({
          message: 'Equipment not found',
        });
      }

      /* Audit log */

      await audit({
        actorId: req.user!.id,
        action: 'UPDATE',
        entityType: 'Equipment',
        entityId: updatedInstrument.id,
        oldValue: oldInstrument.toObject(),
        newValue: updatedInstrument.toObject(),
      });

      /* Notify dashboard */

      emitDashboardChanged();

      return res.status(200).json(updatedInstrument);
    } catch (error: any) {
      console.error('Equipment update error:', error);

      /* Duplicate key */

      if (error?.code === 11000) {
        const duplicateField =
          Object.keys(error.keyPattern || {})[0] || 'equipment';

        return res.status(409).json({
          message: `Another equipment record already uses this ${duplicateField}.`,
        });
      }

      /* Mongoose validation error */

      if (error?.name === 'ValidationError') {
        return res.status(400).json({
          message: 'Equipment validation failed.',
          errors: Object.values(error.errors || {}).map(
            (item: any) => item.message
          ),
        });
      }

      next(error);
    }
  }
);

/*
|--------------------------------------------------------------------------
| DELETE /api/equipment/:id
|--------------------------------------------------------------------------
|
| Admin deletes an equipment record.
|
*/

router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res, next) => {
    try {
      /* Find equipment */

      const instrument = await Equipment.findById(req.params.id);

      if (!instrument) {
        return res.status(404).json({
          message: 'Equipment not found',
        });
      }

      /* Prevent deletion while on loan */

      if (instrument.loanStatus === 'ON_LOAN') {
        return res.status(400).json({
          message: 'Equipment currently on loan cannot be deleted.',
        });
      }

      /* Delete equipment */

      await Equipment.findByIdAndDelete(req.params.id);

      /* Audit log */

      await audit({
        actorId: req.user!.id,
        action: 'DELETE',
        entityType: 'Equipment',
        entityId: instrument.id,
        oldValue: instrument.toObject(),
      });

      /* Notify dashboard */

      emitDashboardChanged();

      return res.status(200).json({
        message: 'Equipment deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
|--------------------------------------------------------------------------
| Export Router
|--------------------------------------------------------------------------
*/

export default router;