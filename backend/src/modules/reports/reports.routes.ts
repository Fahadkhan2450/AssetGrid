import { Router } from 'express';
import type { Response } from 'express';
import XLSX from 'xlsx';

import { requireAuth, requireAdmin } from '../../middleware/auth.js';
import { Loan } from '../../models/Loan.js';
import { Equipment } from '../../models/Equipment.js';

const router = Router();

/*
|--------------------------------------------------------------------------
| HELPER
|--------------------------------------------------------------------------
|
| Builds an .xlsx file from rows and sends it as a download.
|
*/

function sendWorkbook(
  res: Response,
  rows: Record<string, unknown>[],
  sheetName: string,
  fileName: string
) {
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(rows),
    sheetName
  );

  const buffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${fileName}"`
  );

  res.send(buffer);
}

/*
|--------------------------------------------------------------------------
| GET /api/reports/loans.xlsx
|--------------------------------------------------------------------------
*/

router.get(
  '/loans.xlsx',
  requireAuth,
  requireAdmin,
  async (_req, res, next) => {
    try {
      const loans = await Loan.find().sort({ loanDate: -1 }).lean();

      const rows = loans.map((loan) => ({
        Loan_Number: loan.loanNumber,
        Equipment: loan.equipmentSnapshot?.name || '',
        Serial_Number: loan.equipmentSnapshot?.serialNumber || '',
        Requester: loan.requesterSnapshot?.name || '',
        Customer: loan.customerSnapshot?.name || '',
        Loan_Date: loan.loanDate,
        Expected_Return_Date: loan.expectedReturnDate,
        Actual_Return_Date: loan.actualReturnDate || '',
        Status: loan.status,
      }));

      sendWorkbook(res, rows, 'Loans', 'loan-report.xlsx');
    } catch (error) {
      next(error);
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET /api/reports/inventory.xlsx
|--------------------------------------------------------------------------
|
| Uses the current Equipment model fields (material, loanStatus,
| operationalStatus, location, customer ...). The old fields
| name / status / locationId / customerId no longer exist.
|
*/

router.get(
  '/inventory.xlsx',
  requireAuth,
  requireAdmin,
  async (_req, res, next) => {
    try {
      const equipment = await Equipment.find()
        .sort({ material: 1, sNo: 1 })
        .lean();

      const rows = equipment.map((item) => ({
        Equipment_Code: item.equipmentCode,
        S_No: item.sNo ?? '',
        Material: item.material || '',
        Serial_Number: item.serialNumber || '',
        Model: item.model || '',
        Loan_Status: item.loanStatus,
        Operational_Status: item.operationalStatus,
        Location: item.location || '',
        Fine_Location: item.fineLocation || '',
        Requester: item.requester || '',
        Customer: item.customer || '',
        Loan_Date: item.loanDate || '',
        Return_Due: item.returnDue || '',
      }));

      sendWorkbook(res, rows, 'Inventory', 'inventory-report.xlsx');
    } catch (error) {
      next(error);
    }
  }
);

export default router;