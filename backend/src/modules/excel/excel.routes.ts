import { Router } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';

import {
  requireAuth,
  requireAdmin,
  AuthRequest,
} from '../../middleware/auth.js';

import { Equipment } from '../../models/Equipment.js';
import { Location } from '../../models/Location.js';
import { ExcelImport } from '../../models/ExcelImport.js';
import { LoanRequest } from '../../models/LoanRequest.js';
import { Loan } from '../../models/Loan.js';
import { Member } from '../../models/Member.js';
import { Customer } from '../../models/Customer.js';
import { User } from '../../models/User.js';

import { audit } from '../../utils/audit.js';
import { emitDashboardChanged } from '../../websocket/socket.js';

const router = Router();

/* =========================================================
   MULTER
========================================================= */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

/* =========================================================
   REQUIRED EXCEL COLUMNS
========================================================= */

const REQUIRED_COLUMNS = [
  's_no',
  'acquisition_year',
  'material',
  'serial_number',
  'model',
  'description',
  'acquis_val',
  'accum_dep',
  'book_val',
  'currency',
  'cost_center',
  'bal_sh_acct_apc',
  'location',
  'fine_location',
  'loan_status',
  'operational_status',
  'requester',
  'customer',
  'loan_dated',
  'return_due',
];

/* =========================================================
   EMPTY VALUE
========================================================= */

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }

  const text = String(value).trim().toLowerCase();

  return (
    text === '' ||
    text === '-' ||
    text === '--' ||
    text === 'n/a' ||
    text === 'na' ||
    text === 'null' ||
    text === 'none' ||
    text === 'n.a.'
  );
}

/* =========================================================
   NORMALIZE EXCEL HEADER
========================================================= */

function norm(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/* =========================================================
   ESCAPE REGEX
========================================================= */

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* =========================================================
   READ EXCEL / CSV
========================================================= */

function rowsFrom(
  file: Express.Multer.File,
  sheet?: string
): Record<string, unknown>[] {
  const workbook = XLSX.read(file.buffer, {
    type: 'buffer',
    cellDates: true,
  });

  if (!workbook.SheetNames.length) {
    throw new Error(
      'Excel file does not contain any sheets.'
    );
  }

  const sheetName =
    sheet || workbook.SheetNames[0];

  if (!workbook.SheetNames.includes(sheetName)) {
    throw new Error(
      `Sheet "${sheetName}" not found.`
    );
  }

  const worksheet =
    workbook.Sheets[sheetName];

  return XLSX.utils
    .sheet_to_json<Record<string, unknown>>(
      worksheet,
      {
        defval: '',
        raw: false,
      }
    )
    .map((row) =>
      Object.fromEntries(
        Object.entries(row).map(
          ([key, value]) => [
            norm(key),
            typeof value === 'string'
              ? value.trim()
              : value,
          ]
        )
      )
    );
}

/* =========================================================
   VALIDATE HEADERS
========================================================= */

function validateHeaders(
  rows: Record<string, unknown>[]
) {
  if (!rows.length) {
    throw new Error(
      'The uploaded file contains no data rows.'
    );
  }

  const headers = Object.keys(rows[0]);

  const missing =
    REQUIRED_COLUMNS.filter(
      (column) =>
        !headers.includes(column)
    );

  if (missing.length) {
    throw new Error(
      `Missing required columns: ${missing.join(', ')}`
    );
  }

  return headers;
}

/* =========================================================
   STRING VALUE
========================================================= */

function stringValue(
  value: unknown
): string {
  if (isEmptyValue(value)) {
    return '';
  }

  return String(value).trim();
}

/* =========================================================
   NUMBER VALUE
========================================================= */

function numberValue(
  value: unknown
): number | undefined {
  if (isEmptyValue(value)) {
    return undefined;
  }

  const original =
    String(value).trim();

  let cleaned = original;

  const parenthesesNegative =
    cleaned.startsWith('(') &&
    cleaned.endsWith(')');

  if (parenthesesNegative) {
    cleaned = cleaned.slice(1, -1);
  }

  cleaned = cleaned
    .replace(/[$€£¥₹]/g, '')
    .replace(/,/g, '')
    .replace(/\s/g, '')
    .trim();

  if (
    parenthesesNegative &&
    !cleaned.startsWith('-')
  ) {
    cleaned = `-${cleaned}`;
  }

  const parsed = Number(cleaned);

  if (Number.isNaN(parsed)) {
    throw new Error(
      `Invalid number: ${original}`
    );
  }

  return parsed;
}

/* =========================================================
   YEAR VALUE
========================================================= */

function yearValue(
  value: unknown
): number | undefined {
  if (isEmptyValue(value)) {
    return undefined;
  }

  const year = Number(
    String(value).trim()
  );

  if (
    !Number.isInteger(year) ||
    year < 1900 ||
    year > 2100
  ) {
    throw new Error(
      `Invalid acquisition year: ${value}`
    );
  }

  return year;
}

/* =========================================================
   DATE VALUE
========================================================= */

function dateValue(
  value: unknown
): Date | undefined {
  if (isEmptyValue(value)) {
    return undefined;
  }

  /* Excel serial date */
  if (
    typeof value === 'number' &&
    Number.isFinite(value)
  ) {
    const excelDate =
      XLSX.SSF.parse_date_code(
        value
      );

    if (excelDate) {
      return new Date(
        Date.UTC(
          excelDate.y,
          excelDate.m - 1,
          excelDate.d
        )
      );
    }
  }

  const text =
    String(value).trim();

  /* Normal JavaScript date */
  let date = new Date(text);

  if (!Number.isNaN(date.getTime())) {
    return date;
  }

  /*
   * DD/MM/YYYY or MM/DD/YYYY
   */
  const match = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
  );

  if (match) {
    const first =
      Number(match[1]);

    const second =
      Number(match[2]);

    const year =
      Number(match[3]);

    if (first > 12) {
      date = new Date(
        year,
        second - 1,
        first
      );
    } else {
      date = new Date(
        year,
        first - 1,
        second
      );
    }

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  throw new Error(
    `Invalid date: ${text}`
  );
}

/* =========================================================
   LOAN STATUS
========================================================= */

function normalizeLoanStatus(
  value: unknown
):
  | 'AVAILABLE'
  | 'ON_LOAN'
  | 'MAINTENANCE'
  | 'RETIRED' {
  if (isEmptyValue(value)) {
    return 'AVAILABLE';
  }

  const text =
    String(value)
      .trim()
      .toUpperCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ');

  switch (text) {
    case 'IN STOCK':
    case 'AVAILABLE':
      return 'AVAILABLE';

    case 'ON LOAN':
      return 'ON_LOAN';

    case 'MAINTENANCE':
    case 'UNDER MAINTENANCE':
      return 'MAINTENANCE';

    case 'RETIRED':
      return 'RETIRED';

    default:
      throw new Error(
        `Invalid loan status: ${value}`
      );
  }
}

/* =========================================================
   OPERATIONAL STATUS
========================================================= */

function normalizeOperationalStatus(
  value: unknown
):
  | 'OPERATIONAL'
  | 'NON_OPERATIONAL'
  | 'UNDER_MAINTENANCE' {
  if (isEmptyValue(value)) {
    return 'OPERATIONAL';
  }

  const text =
    String(value)
      .trim()
      .toUpperCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ');

  switch (text) {
    case 'ACTIVE':
    case 'OPERATIONAL':
      return 'OPERATIONAL';

    case 'MAINTENANCE':
    case 'UNDER MAINTENANCE':
      return 'UNDER_MAINTENANCE';

    case 'RETIRED':
    case 'NON OPERATIONAL':
      return 'NON_OPERATIONAL';

    default:
      throw new Error(
        `Invalid operational status: ${value}`
      );
  }
}

/* =========================================================
   GENERATE EQUIPMENT CODE
========================================================= */

function generateEquipmentCode(
  row: Record<string, unknown>,
  rowNumber: number
): string {
  const serialNumber =
    stringValue(
      row.serial_number
    );

  const sNo =
    numberValue(row.s_no);

  if (sNo !== undefined) {
    return `EQ-${sNo}`;
  }

  if (serialNumber) {
    const cleaned =
      serialNumber
        .replace(
          /[^a-zA-Z0-9]/g,
          ''
        )
        .toUpperCase();

    return `EQ-${cleaned}`;
  }

  return `EQ-IMPORT-${rowNumber}`;
}

/* =========================================================
   EQUIPMENT DATA
========================================================= */

function equipmentData(
  row: Record<string, unknown>,
  filename: string,
  rowNumber: number
) {
  const serialNumber =
    stringValue(
      row.serial_number
    );

  const material =
    stringValue(
      row.material
    );

  const equipmentCode =
    generateEquipmentCode(
      row,
      rowNumber
    );

  return {
    equipmentCode,

    sNo:
      numberValue(row.s_no),

    acquisitionYear:
      yearValue(
        row.acquisition_year
      ),

    material:
      material ||
      `IMPORT-MATERIAL-${rowNumber}`,

    serialNumber:
      serialNumber ||
      `IMPORT-SERIAL-${rowNumber}`,

    model:
      stringValue(row.model),

    description:
      stringValue(
        row.description
      ),

    acquisitionValue:
      numberValue(
        row.acquis_val
      ),

    accumulatedDepreciation:
      numberValue(
        row.accum_dep
      ),

    bookValue:
      numberValue(
        row.book_val
      ),

    currency:
      stringValue(
        row.currency
      ),

    costCenter:
      stringValue(
        row.cost_center
      ),

    balanceSheetAccountAPC:
      stringValue(
        row.bal_sh_acct_apc
      ),

    location:
      stringValue(
        row.location
      ),

    fineLocation:
      stringValue(
        row.fine_location
      ),

    loanStatus:
      normalizeLoanStatus(
        row.loan_status
      ),

    operationalStatus:
      normalizeOperationalStatus(
        row.operational_status
      ),

    requester:
      stringValue(
        row.requester
      ),

    /*
     * Keep the customer name on Equipment
     * for compatibility with the existing
     * inventory screen.
     */
    customer:
      stringValue(
        row.customer
      ),

    loanDate:
      dateValue(
        row.loan_dated
      ),

    returnDue:
      dateValue(
        row.return_due
      ),

    extra: {
      sourceFile: filename,
    },
  };
}

/* =========================================================
   FIND EXISTING EQUIPMENT
========================================================= */

async function findExistingEquipment(
  data: ReturnType<
    typeof equipmentData
  >
) {
  if (data.equipmentCode) {
    const byCode =
      await Equipment.findOne({
        equipmentCode:
          data.equipmentCode,
      });

    if (byCode) {
      return byCode;
    }
  }

  if (data.serialNumber) {
    const bySerial =
      await Equipment.findOne({
        serialNumber:
          data.serialNumber,
      });

    if (bySerial) {
      return bySerial;
    }
  }

  if (
    data.material &&
    data.model
  ) {
    const byMaterialModel =
      await Equipment.findOne({
        material:
          data.material,
        model:
          data.model,
      });

    if (byMaterialModel) {
      return byMaterialModel;
    }
  }

  if (
    data.sNo !== undefined
  ) {
    const bySNo =
      await Equipment.findOne({
        sNo: data.sNo,
      });

    if (bySNo) {
      return bySNo;
    }
  }

  return null;
}

/* =========================================================
   CREATE / UPDATE LOCATION
========================================================= */

async function syncLocationFromExcel(
  row: Record<string, unknown>
) {
  const location =
    stringValue(
      row.location
    );

  const fineLocation =
    stringValue(
      row.fine_location
    );

  if (!location) {
    return null;
  }

  const code = location;

  let existing =
    await Location.findOne({
      code,
    });

  if (!existing) {
    existing =
      await Location.create({
        code,
        name: location,
        address: '',
        fineLocations: [],
      });
  }

  if (fineLocation) {
    const alreadyExists =
      existing.fineLocations.some(
        (item: {
          code: string;
          name: string;
        }) =>
          item.code
            .trim()
            .toLowerCase() ===
          fineLocation
            .trim()
            .toLowerCase()
      );

    if (!alreadyExists) {
      existing.fineLocations.push({
        code: fineLocation,
        name: fineLocation,
      });

      await existing.save();
    }
  }

  return existing;
}

/* =========================================================
   FIND MEMBER
========================================================= */

async function findMember(
  requester: string
) {
  if (!requester) {
    return null;
  }

  const normalized =
    requester.trim();

  let member =
    await Member.findOne({
      memberCode:
        normalized,
    });

  if (member) {
    return member;
  }

  member =
    await Member.findOne({
      employeeId:
        normalized,
    });

  if (member) {
    return member;
  }

  member =
    await Member.findOne({
      email:
        normalized.toLowerCase(),
    });

  if (member) {
    return member;
  }

  member =
    await Member.findOne({
      name: normalized,
    });

  return member;
}

/* =========================================================
   GENERATE CUSTOMER CODE
========================================================= */

function generateCustomerCode(
  customerName: string
): string {
  const cleaned =
    customerName
      .trim()
      .toUpperCase()
      .replace(/&/g, ' AND ')
      .replace(
        /[^A-Z0-9]+/g,
        '-'
      )
      .replace(
        /^-+|-+$/g,
        ''
      );

  if (!cleaned) {
    return 'CUST-UNKNOWN';
  }

  return `CUST-${cleaned}`.slice(
    0,
    90
  );
}

/* =========================================================
   FIND CUSTOMER
========================================================= */

async function findCustomer(
  customerValue: string
) {
  if (!customerValue) {
    return null;
  }

  const normalized =
    customerValue.trim();

  /*
   * First check customerCode.
   */
  let customer =
    await Customer.findOne({
      customerCode:
        normalized,
    });

  if (customer) {
    return customer;
  }

  /*
   * Then exact name.
   */
  customer =
    await Customer.findOne({
      name: normalized,
    });

  if (customer) {
    return customer;
  }

  /*
   * Finally case-insensitive name.
   */
  customer =
    await Customer.findOne({
      name: {
        $regex:
          `^${escapeRegex(
            normalized
          )}$`,
        $options: 'i',
      },
    });

  return customer;
}

/* =========================================================
   SYNCHRONIZE CUSTOMER FROM EXCEL
========================================================= */

async function syncCustomerFromExcel(
  customerValue: string
) {
  const normalized =
    customerValue.trim();

  if (!normalized) {
    return null;
  }

  /*
   * Reuse existing customer.
   */
  const existing =
    await findCustomer(
      normalized
    );

  if (existing) {
    /*
     * If an old customer exists but
     * was inactive, make it active
     * because it is present in the
     * current Excel master file.
     */
    if (!existing.isActive) {
      existing.isActive = true;
      await existing.save();
    }

    return existing;
  }

  /*
   * Generate customer code.
   */
  const baseCode =
    generateCustomerCode(
      normalized
    );

  let customerCode =
    baseCode;

  /*
   * Avoid customerCode collision.
   */
  let existingByCode =
    await Customer.findOne({
      customerCode,
    });

  let suffix = 2;

  while (
    existingByCode &&
    existingByCode.name
      .trim()
      .toLowerCase() !==
      normalized.toLowerCase()
  ) {
    customerCode =
      `${baseCode}-${suffix}`;

    existingByCode =
      await Customer.findOne({
        customerCode,
      });

    suffix++;
  }

  /*
   * Create real customer.
   */
  const customer =
    await Customer.create({
      customerCode,
      name: normalized,
      isActive: true,
    });

  console.log(
    `Excel customer synchronized: ${customer.name} (${customer.customerCode})`
  );

  return customer;
}

/* =========================================================
   CUSTOMER CACHE
========================================================= */

/*
 * The same customer can appear on hundreds
 * of Excel rows. This cache prevents repeated
 * database queries during one import.
 */
const customerCache =
  new Map<
    string,
    Awaited<
      ReturnType<
        typeof syncCustomerFromExcel
      >
    >
  >();

async function getCachedCustomer(
  customerValue: string
) {
  const normalized =
    customerValue
      .trim()
      .toLowerCase();

  if (!normalized) {
    return null;
  }

  if (
    customerCache.has(
      normalized
    )
  ) {
    return (
      customerCache.get(
        normalized
      ) || null
    );
  }

  const customer =
    await syncCustomerFromExcel(
      customerValue
    );

  customerCache.set(
    normalized,
    customer
  );

  return customer;
}

/* =========================================================
   FIND REQUESTER USER
========================================================= */

async function findRequesterUser(
  member: any
) {
  if (!member) {
    return null;
  }

  if (member.employeeId) {
    const user =
      await User.findOne({
        employeeId:
          member.employeeId,
        isActive: true,
      });

    if (user) {
      return user;
    }
  }

  if (member.email) {
    const user =
      await User.findOne({
        email:
          String(
            member.email
          )
            .trim()
            .toLowerCase(),
        isActive: true,
      });

    if (user) {
      return user;
    }
  }

  const user =
    await User.findOne({
      name: member.name,
      isActive: true,
    });

  return user;
}

/* =========================================================
   CHECK LOAN INFORMATION
========================================================= */

function hasLoanInformation(
  row: Record<string, unknown>
): boolean {
  const requester =
    stringValue(
      row.requester
    );

  const customer =
    stringValue(
      row.customer
    );

  const loanDate =
    dateValue(
      row.loan_dated
    );

  const returnDue =
    dateValue(
      row.return_due
    );

  return Boolean(
    requester &&
      customer &&
      loanDate &&
      returnDue
  );
}

/* =========================================================
   GENERATE IMPORTED LOAN NUMBER
========================================================= */

function generateImportedLoanNumber(
  row: Record<string, unknown>,
  equipmentCode: string,
  rowNumber: number
): string {
  const sNo =
    numberValue(row.s_no);

  const loanDate =
    dateValue(
      row.loan_dated
    );

  const datePart =
    loanDate
      ? loanDate
          .toISOString()
          .slice(0, 10)
          .replace(/-/g, '')
      : 'NODATE';

  if (sNo !== undefined) {
    return `IMP-LOAN-${sNo}-${datePart}`;
  }

  return `IMP-LOAN-${equipmentCode}-${datePart}-${rowNumber}`;
}

/* =========================================================
   IMPORT LOAN
========================================================= */

async function importLoan(
  row: Record<string, unknown>,
  equipment: any,
  adminUserId: string,
  rowNumber: number
) {
  if (
    !hasLoanInformation(row)
  ) {
    return {
      imported: false,
      reason:
        'No complete loan information.',
    };
  }

  const requester =
    stringValue(
      row.requester
    );

  const customerValue =
    stringValue(
      row.customer
    );

  const loanDate =
    dateValue(
      row.loan_dated
    );

  const returnDue =
    dateValue(
      row.return_due
    );

  if (
    !loanDate ||
    !returnDue
  ) {
    return {
      imported: false,
      reason:
        'Loan date or return due date is missing.',
    };
  }

  /*
   * Find requester.
   */
  const member =
    await findMember(
      requester
    );

  if (!member) {
    throw new Error(
      `Requester "${requester}" was not found in Members.`
    );
  }

  /*
   * IMPORTANT:
   *
   * The customer comes from the
   * Excel CUSTOMER column.
   */
  const customer =
    await getCachedCustomer(
      customerValue
    );

  if (!customer) {
    throw new Error(
      `Customer "${customerValue}" could not be synchronized.`
    );
  }

  /*
   * Find corresponding User.
   */
  const requesterUser =
    await findRequesterUser(
      member
    );

  if (!requesterUser) {
    throw new Error(
      `No active User account found for requester "${requester}".`
    );
  }

  /*
   * Generate stable numbers.
   */
  const loanNumber =
    generateImportedLoanNumber(
      row,
      equipment.equipmentCode,
      rowNumber
    );

  const requestNumber =
    `REQ-${loanNumber}`;

  /*
   * IMPORTANT:
   *
   * These snapshots are generated
   * from the actual Customer document,
   * not from a demo value.
   */
  const requesterSnapshot = {
    name: member.name,
    code: member.memberCode,
    serialNumber: '',
  };

  const customerSnapshot = {
    name: customer.name,
    code: customer.customerCode,
    serialNumber: '',
  };

  const equipmentSnapshot = {
    name:
      equipment.description ||
      equipment.material ||
      equipment.model ||
      equipment.equipmentCode,

    code:
      equipment.equipmentCode,

    serialNumber:
      equipment.serialNumber,
  };

  /*
   * Existing request.
   */
  let loanRequest =
    await LoanRequest.findOne({
      requestNumber,
    });

  if (!loanRequest) {
    loanRequest =
      await LoanRequest.create({
        requestNumber,

        requesterId:
          requesterUser._id,

        requester:
          member.name,

        memberId:
          member._id,

        customerId:
          customer._id,

        requestedEquipmentId:
          equipment._id,

        requesterSnapshot,

        customerSnapshot,

        requestedEquipmentSnapshot:
          equipmentSnapshot,

        loanDate,

        requestedReturnDate:
          returnDue,

        reason:
          'Imported from Excel',

        status:
          'ISSUED',
      });
  } else {
    loanRequest.requesterId =
      requesterUser._id;

    loanRequest.requester =
      member.name;

    loanRequest.memberId =
      member._id;

    loanRequest.customerId =
      customer._id;

    loanRequest.requestedEquipmentId =
      equipment._id;

    loanRequest.requesterSnapshot =
      requesterSnapshot;

    loanRequest.customerSnapshot =
      customerSnapshot;

    loanRequest.requestedEquipmentSnapshot =
      equipmentSnapshot;

    loanRequest.loanDate =
      loanDate;

    loanRequest.requestedReturnDate =
      returnDue;

    loanRequest.status =
      'ISSUED';

    await loanRequest.save();
  }

  /*
   * Existing loan.
   */
  let loan =
    await Loan.findOne({
      loanNumber,
    });

  if (!loan) {
    loan =
      await Loan.create({
        loanNumber,

        requestId:
          loanRequest._id,

        equipmentId:
          equipment._id,

        memberId:
          member._id,

        customerId:
          customer._id,

        requester:
          member.name,

        equipmentSnapshot,

        requesterSnapshot,

        customerSnapshot,

        loanDate,

        expectedReturnDate:
          returnDue,

        actualReturnDate:
          null,

        status:
          'ISSUED',

        issuedBy:
          adminUserId,

        returnedBy:
          null,
      });

    return {
      imported: true,
      created: true,
      loanNumber,
    };
  }

  /*
   * Update existing loan.
   */
  loan.requestId =
    loanRequest._id;

  loan.equipmentId =
    equipment._id;

  loan.memberId =
    member._id;

  loan.customerId =
    customer._id;

  loan.requester =
    member.name;

  loan.equipmentSnapshot =
    equipmentSnapshot;

  loan.requesterSnapshot =
    requesterSnapshot;

  loan.customerSnapshot =
    customerSnapshot;

  loan.loanDate =
    loanDate;

  loan.expectedReturnDate =
    returnDue;

  /*
   * Keep returned loans returned.
   */
  if (
    loan.status !==
    'RETURNED'
  ) {
    loan.status =
      'ISSUED';

    loan.actualReturnDate =
      null;

    loan.returnedBy =
      null;
  }

  await loan.save();

  return {
    imported: true,
    created: false,
    loanNumber,
  };
}

/* =========================================================
   PREVIEW
========================================================= */

router.post(
  '/preview',
  requireAuth,
  requireAdmin,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message:
            'File required. Please select a CSV or Excel file.',
        });
      }

      const rows =
        rowsFrom(
          req.file,
          req.body?.sheet
        );

      const headers =
        validateHeaders(rows);

      const errors: Array<{
        rowNumber: number;
        message: string;
      }> = [];

      let potentialLoans = 0;

      for (
        let i = 0;
        i < rows.length;
        i++
      ) {
        try {
          equipmentData(
            rows[i],
            req.file.originalname,
            i + 2
          );

          if (
            hasLoanInformation(
              rows[i]
            )
          ) {
            potentialLoans++;
          }
        } catch (
          error: any
        ) {
          errors.push({
            rowNumber: i + 2,
            message:
              error?.message ||
              'Invalid row.',
          });
        }
      }

      return res.json({
        filename:
          req.file.originalname,

        totalRows:
          rows.length,

        validRows:
          rows.length -
          errors.length,

        invalidRows:
          errors.length,

        potentialLoans,

        headers,

        requiredColumns:
          REQUIRED_COLUMNS,

        errors:
          errors.slice(
            0,
            100
          ),

        preview:
          rows.slice(
            0,
            20
          ),
      });
    } catch (
      error: any
    ) {
      return res.status(400).json({
        message:
          error?.message ||
          'Could not read the uploaded file.',
      });
    }
  }
);

/* =========================================================
   IMPORT
========================================================= */

router.post(
  '/import',
  requireAuth,
  requireAdmin,
  upload.single('file'),
  async (
    req: AuthRequest,
    res,
    next
  ) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message:
            'File required. Please select a CSV or Excel file.',
        });
      }

      let rows:
        Record<string, unknown>[];

      try {
        rows =
          rowsFrom(
            req.file,
            req.body?.sheet
          );

        validateHeaders(rows);
      } catch (
        error: any
      ) {
        return res.status(400).json({
          message:
            error?.message ||
            'Could not read the uploaded file.',
        });
      }

      /*
       * Clear customer cache for
       * this import operation.
       */
      customerCache.clear();

      /*
       * Create import history.
       */
      const job =
        new ExcelImport({
          filename:
            req.file.originalname,

          importedBy:
            req.user!.id,

          totalRows:
            rows.length,

          inserted: 0,

          updated: 0,

          failed: 0,

          status:
            'PROCESSING',

          errors: [],
        });

      await job.save();

      let loansInserted = 0;
      let loansUpdated = 0;
      let loansFailed = 0;

      let customersCreated = 0;
      let customersFound = 0;
      let customersFailed = 0;

      const loanErrors: Array<{
        rowNumber: number;
        message: string;
      }> = [];

      const customerErrors: Array<{
        rowNumber: number;
        message: string;
      }> = [];

      /*
       * Track customers already processed
       * during this import.
       */
      const processedCustomerNames =
        new Set<string>();

      /*
       * Process every row.
       */
      for (
        let i = 0;
        i < rows.length;
        i++
      ) {
        const row =
          rows[i];

        try {
          /*
           * Equipment data.
           */
          const data =
            equipmentData(
              row,
              req.file.originalname,
              i + 2
            );

          /*
           * Location.
           */
          await syncLocationFromExcel(
            row
          );

          /*
           * CUSTOMER MASTER DATA
           *
           * The CUSTOMER column is now
           * always synchronized with the
           * Customer collection.
           */
          const customerValue =
            stringValue(
              row.customer
            );

          let customer = null;

          if (customerValue) {
            const customerKey =
              customerValue
                .trim()
                .toLowerCase();

            const wasProcessed =
              processedCustomerNames.has(
                customerKey
              );

            try {
              customer =
                await getCachedCustomer(
                  customerValue
                );

              if (!wasProcessed) {
                processedCustomerNames.add(
                  customerKey
                );

                if (
                  customer?.createdAt &&
                  Math.abs(
                    new Date(
                      customer.createdAt
                    ).getTime() -
                      Date.now()
                  ) <
                    5000
                ) {
                  customersCreated++;
                } else {
                  customersFound++;
                }
              }
            } catch (
              customerError: any
            ) {
              customersFailed++;

              customerErrors.push({
                rowNumber:
                  i + 2,

                message:
                  customerError?.message ||
                  `Could not synchronize customer "${customerValue}".`,
              });

              console.error(
                `Excel customer sync row ${i + 2} error:`,
                customerError
              );

              /*
               * Do not stop equipment
               * import because of a
               * customer problem.
               */
            }
          }

          /*
           * Find existing equipment.
           */
          const existing =
            await findExistingEquipment(
              data
            );

          let equipment;

          /*
           * UPDATE EQUIPMENT
           */
          if (existing) {
            equipment =
              await Equipment.findByIdAndUpdate(
                existing._id,
                {
                  $set: data,
                },
                {
                  new: true,
                  runValidators: true,
                }
              );

            job.updated += 1;
          }

          /*
           * INSERT EQUIPMENT
           */
          else {
            equipment =
              await Equipment.create(
                data
              );

            job.inserted += 1;
          }

          /*
           * IMPORT LOAN
           */
          if (equipment) {
            try {
              const result =
                await importLoan(
                  row,
                  equipment,
                  req.user!.id,
                  i + 2
                );

              if (
                result.imported
              ) {
                if (
                  result.created
                ) {
                  loansInserted++;
                } else {
                  loansUpdated++;
                }
              }
            } catch (
              loanError: any
            ) {
              loansFailed++;

              loanErrors.push({
                rowNumber:
                  i + 2,

                message:
                  loanError?.message ||
                  'Failed to import loan.',
              });

              console.error(
                `Excel loan import row ${i + 2} error:`,
                loanError
              );
            }
          }
        } catch (
          error: any
        ) {
          console.error(
            `Excel import row ${i + 2} error:`,
            error
          );

          job.failed += 1;

          job.errors.push({
            rowNumber:
              i + 2,

            message:
              error?.message ||
              'Failed to import row.',

            data: row,
          });
        }
      }

      /*
       * Import status.
       */
      if (
        job.failed === 0 &&
        loansFailed === 0 &&
        customersFailed === 0
      ) {
        job.status =
          'COMPLETED';
      } else if (
        job.inserted > 0 ||
        job.updated > 0
      ) {
        job.status =
          'COMPLETED_WITH_ERRORS';
      } else {
        job.status =
          'FAILED';
      }

      await job.save();

      /*
       * Audit.
       */
      await audit({
        actorId:
          req.user!.id,

        action:
          'EXCEL_IMPORT',

        entityType:
          'ExcelImport',

        entityId:
          job.id,

        newValue: {
          ...job.toObject(),

          loansInserted,
          loansUpdated,
          loansFailed,

          customersCreated,
          customersFound,
          customersFailed,

          loanErrors,
          customerErrors,
        },
      });

      /*
       * Dashboard refresh.
       */
      emitDashboardChanged();

      /*
       * Response.
       */
      return res.json({
        message:
          job.failed === 0 &&
          loansFailed === 0 &&
          customersFailed === 0
            ? 'Equipment, customers and loan data imported successfully.'
            : 'Excel imported with some errors.',

        importId:
          job.id,

        filename:
          job.filename,

        totalRows:
          job.totalRows,

        inserted:
          job.inserted,

        updated:
          job.updated,

        failed:
          job.failed,

        /*
         * Customer information.
         */
        customersCreated,
        customersFound,
        customersFailed,

        /*
         * Loan information.
         */
        loansInserted,
        loansUpdated,
        loansFailed,

        status:
          job.status,

        errors:
          job.errors,

        loanErrors,

        customerErrors,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   IMPORT HISTORY
========================================================= */

router.get(
  '/imports',
  requireAuth,
  requireAdmin,
  async (
    _req,
    res,
    next
  ) => {
    try {
      const imports =
        await ExcelImport.find()
          .sort({
            createdAt: -1,
          })
          .limit(100)
          .lean();

      res.json(imports);
    } catch (error) {
      next(error);
    }
  }
);

export default router;

