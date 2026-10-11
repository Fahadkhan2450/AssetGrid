import { Router } from 'express';

import {
  requireAuth,
  AuthRequest,
} from '../../middleware/auth.js';

import { Notification } from '../../models/Notification.js';

const router = Router();

/*
|--------------------------------------------------------------------------
| GET MY NOTIFICATIONS
|--------------------------------------------------------------------------
|
| Returns the notifications belonging to the
| currently authenticated user.
|
| Admin:
|   Gets loan request notifications.
|
| Employee:
|   Gets approval / rejection / issue / return
|   notifications.
|--------------------------------------------------------------------------
*/

router.get(
  '/',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const notifications =
        await Notification.find({
          userId: req.user!.id,
        })
          .sort({
            createdAt: -1,
          })
          .limit(100)
          .lean();

      const unreadCount =
        await Notification.countDocuments({
          userId: req.user!.id,
          isRead: false,
        });

      return res.json({
        notifications,
        unreadCount,
      });
    } catch (error) {
      console.error(
        'Get notifications error:',
        error
      );

      return res.status(500).json({
        message: 'Could not load notifications',
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| MARK NOTIFICATION AS READ
|--------------------------------------------------------------------------
|
| Only the owner of the notification can mark it
| as read.
|--------------------------------------------------------------------------
*/

router.post(
  '/:id/read',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const notification =
        await Notification.findOneAndUpdate(
          {
            _id: req.params.id,

            userId: req.user!.id,
          },
          {
            $set: {
              isRead: true,

              readAt: new Date(),
            },
          },
          {
            new: true,
          }
        ).lean();

      if (!notification) {
        return res.status(404).json({
          message:
            'Notification not found',
        });
      }

      return res.json({
        ok: true,

        notification,
      });
    } catch (error) {
      console.error(
        'Mark notification as read error:',
        error
      );

      return res.status(500).json({
        message:
          'Could not update notification',
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| MARK ALL NOTIFICATIONS AS READ
|--------------------------------------------------------------------------
|
| Useful for an admin/employee notification
| dropdown with a "Mark all as read" button.
|--------------------------------------------------------------------------
*/

router.post(
  '/read-all',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const result =
        await Notification.updateMany(
          {
            userId: req.user!.id,

            isRead: false,
          },
          {
            $set: {
              isRead: true,

              readAt: new Date(),
            },
          }
        );

      return res.json({
        ok: true,

        modifiedCount:
          result.modifiedCount,
      });
    } catch (error) {
      console.error(
        'Mark all notifications as read error:',
        error
      );

      return res.status(500).json({
        message:
          'Could not update notifications',
      });
    }
  }
);

export default router;