import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.js';

import { Equipment } from '../../models/Equipment.js';
import { LoanRequest } from '../../models/LoanRequest.js';
import { Loan } from '../../models/Loan.js';
import { Location } from '../../models/Location.js';

const router = Router();

/*
|--------------------------------------------------------------------------
| GET /api/dashboard
|--------------------------------------------------------------------------
*/

router.get(
  '/',
  requireAuth,
  async (_req, res) => {
    try {
      console.log(
        '================================='
      );
      console.log(
        'DASHBOARD REQUEST RECEIVED'
      );
      console.log(
        '================================='
      );

      const now = new Date();

      /*
      |--------------------------------------------------------------------------
      | Equipment
      |--------------------------------------------------------------------------
      */

      console.log(
        '1. Counting equipment...'
      );

      const equipment =
        await Equipment.countDocuments();

      console.log(
        'Equipment:',
        equipment
      );

      /*
      |--------------------------------------------------------------------------
      | Available Equipment
      |--------------------------------------------------------------------------
      */

      console.log(
        '2. Counting available equipment...'
      );

      const available =
        await Equipment.countDocuments({
          loanStatus: 'AVAILABLE',
        });

      console.log(
        'Available:',
        available
      );

      /*
      |--------------------------------------------------------------------------
      | Equipment On Loan
      |--------------------------------------------------------------------------
      */

      console.log(
        '3. Counting equipment on loan...'
      );

      const onLoan =
        await Equipment.countDocuments({
          loanStatus: 'ON_LOAN',
        });

      console.log(
        'On Loan:',
        onLoan
      );

      /*
      |--------------------------------------------------------------------------
      | Pending Requests
      |--------------------------------------------------------------------------
      */

      console.log(
        '4. Counting pending requests...'
      );

      const pending =
        await LoanRequest.countDocuments({
          status: 'PENDING',
        });

      console.log(
        'Pending:',
        pending
      );

      /*
      |--------------------------------------------------------------------------
      | Active Loans
      |--------------------------------------------------------------------------
      */

      console.log(
        '5. Counting active loans...'
      );

      const activeLoans =
        await Loan.countDocuments({
          status: 'ISSUED',
        });

      console.log(
        'Active Loans:',
        activeLoans
      );

      /*
      |--------------------------------------------------------------------------
      | Overdue Loans
      |--------------------------------------------------------------------------
      */

      console.log(
        '6. Counting overdue loans...'
      );

      const overdue =
        await Loan.countDocuments({
          status: 'ISSUED',
          expectedReturnDate: {
            $lt: now,
          },
        });

      console.log(
        'Overdue:',
        overdue
      );

      /*
      |--------------------------------------------------------------------------
      | Recent Requests
      |--------------------------------------------------------------------------
      */

      console.log(
        '7. Loading recent requests...'
      );

      const recent =
        await LoanRequest.find()
          .sort({
            createdAt: -1,
          })
          .limit(12)
          .lean();

      console.log(
        'Recent requests:',
        recent.length
      );

      /*
      |--------------------------------------------------------------------------
      | Locations
      |--------------------------------------------------------------------------
      */

      console.log(
        '8. Loading locations...'
      );

      const locations =
        await Location.find()
          .sort({
            name: 1,
          })
          .lean();

      console.log(
        'Locations:',
        locations.length
      );

      /*
      |--------------------------------------------------------------------------
      | Final response
      |--------------------------------------------------------------------------
      */

      const dashboardData = {
        stats: {
          equipment,
          available,
          onLoan,
          pending,
          activeLoans,
          overdue,
        },

        recent,

        locations,
      };

      console.log(
        '================================='
      );

      console.log(
        'DASHBOARD DATA:'
      );

      console.log(
        JSON.stringify(
          dashboardData.stats,
          null,
          2
        )
      );

      console.log(
        '================================='
      );

      return res.status(200).json(
        dashboardData
      );
    } catch (error: any) {
      console.error(
        '================================='
      );

      console.error(
        'DASHBOARD ERROR'
      );

      console.error(
        '================================='
      );

      console.error(
        'Message:',
        error?.message
      );

      console.error(
        'Name:',
        error?.name
      );

      console.error(
        'Code:',
        error?.code
      );

      console.error(
        'Stack:',
        error?.stack
      );

      console.error(
        'Full error:',
        error
      );

      console.error(
        '================================='
      );

      return res.status(500).json({
        message:
          'Failed to load dashboard data',

        error:
          process.env.NODE_ENV ===
          'development'
            ? error?.message
            : undefined,
      });
    }
  }
);

export default router;