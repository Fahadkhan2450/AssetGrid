/* =========================================================
   SHARED HELPERS
========================================================= */

/**
 * A person reference. The backend may return either a plain
 * ID string or a populated user object, depending on the route.
 */
export type UserRef = {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  employeeId?: string;
};

export type PersonField = string | UserRef | null;

/* =========================================================
   USER
========================================================= */

export type User = {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  role: 'ADMIN' | 'EMPLOYEE';
};

/* =========================================================
   EQUIPMENT / INSTRUMENT
========================================================= */

export type Instrument = {
  _id: string;

  sNo: number | string;
  acquisitionYear?: number | null;

  material: string;
  serialNumber: string;
  model?: string;
  description?: string;

  acquisitionValue?: number | null;
  accumulatedDepreciation?: number | null;
  bookValue?: number | null;

  currency?: string;
  costCenter?: string;
  balanceSheetAccountAPC?: string;

  location?: string;
  fineLocation?: string;

  /* Instrument loan state used by the equipment system. */
  loanStatus: 'AVAILABLE' | 'ON_LOAN' | 'MAINTENANCE' | 'RETIRED';

  operationalStatus:
    | 'OPERATIONAL'
    | 'NON_OPERATIONAL'
    | 'UNDER_MAINTENANCE';

  requester?: string;
  customer?: string;

  loanDate?: string | null;
  returnDue?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

/** Backward-compatible alias. */
export type Equipment = Instrument;

/* =========================================================
   MEMBERS
========================================================= */

export type Member = {
  _id: string;

  memberCode: string;
  name: string;

  email?: string;
  department?: string;
  employeeId?: string;
  isActive?: boolean;
};

/* =========================================================
   CUSTOMERS
========================================================= */

export type Customer = {
  _id: string;

  customerCode: string;
  name: string;

  isActive?: boolean;
};

/* =========================================================
   LOCATIONS
========================================================= */

export type FineLocation = {
  code: string;
  name: string;
};

export type Location = {
  _id: string;

  code: string;
  name: string;

  address?: string;

  fineLocations: FineLocation[];

  createdAt?: string;
  updatedAt?: string;
};

/* =========================================================
   SNAPSHOTS
========================================================= */

/**
 * Snapshots stored with a loan request / loan. Fields vary
 * depending on whether the snapshot is for equipment,
 * requester/member, or customer.
 */

export type EquipmentSnapshot = {
  name?: string;
  code?: string;

  sNo?: number | string;
  material?: string;
  serialNumber?: string;
  model?: string;
  description?: string;
};

export type RequesterSnapshot = {
  name?: string;
  email?: string;
  employeeId?: string;
};

export type CustomerSnapshot = {
  name?: string;
  customerCode?: string;
};

/* =========================================================
   LOAN REQUEST
========================================================= */

export type LoanRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ISSUED'
  | 'RETURNED'
  | 'CANCELLED';

export type LoanRequest = {
  _id: string;

  requestNumber: string;

  requesterId: string;
  memberId: string;
  customerId: string;

  /* Display name of the requester, when the API provides it. */
  requester?: string;

  requestedEquipmentId?: string | null;

  requesterSnapshot?: RequesterSnapshot | null;
  customerSnapshot?: CustomerSnapshot | null;
  requestedEquipmentSnapshot?: EquipmentSnapshot | null;

  loanDate?: string | null;
  requestedReturnDate?: string | null;

  reason?: string;

  status: LoanRequestStatus;

  /* Approval / issue workflow */
  approvedBy?: PersonField;
  issuedBy?: PersonField;
  approvalMethod?: string;
  approvalBypassReason?: string;

  createdAt: string;
  updatedAt?: string;
};

/* =========================================================
   LOAN
========================================================= */

export type LoanStatus = 'ISSUED' | 'RETURNED';

export type Loan = {
  _id: string;

  loanNumber: string;

  requestId: string;
  equipmentId: string;
  memberId: string;
  customerId: string;

  /* Snapshots preserve the data as it was when issued. */
  equipmentSnapshot?: EquipmentSnapshot | null;
  requesterSnapshot?: RequesterSnapshot | null;
  customerSnapshot?: CustomerSnapshot | null;

  loanDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string | null;

  status: LoanStatus;

  approvedBy?: PersonField;
  issuedBy?: PersonField;
  returnedBy?: PersonField;

  createdAt?: string;
  updatedAt?: string;
};

/* =========================================================
   LOAN HISTORY
========================================================= */

export type LoanHistoryAction =
  | 'CREATED'
  | 'ISSUED'
  | 'RETURNED'
  | 'STATUS_CHANGED'
  | 'UPDATED';

export type LoanHistoryStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ISSUED'
  | 'RETURNED'
  | null;

export type LoanHistory = {
  _id: string;

  loanId: string;

  action: LoanHistoryAction;

  oldStatus?: LoanHistoryStatus;
  newStatus?: LoanHistoryStatus;

  performedBy: PersonField;

  notes?: string;

  metadata?: Record<string, unknown> | null;

  createdAt: string;
};

/* =========================================================
   NOTIFICATIONS
========================================================= */

export type NotificationType =
  | 'LOAN_REQUEST'
  | 'LOAN_APPROVED'
  | 'LOAN_REJECTED'
  | 'INSTRUMENT_ISSUED'
  | 'INSTRUMENT_RETURNED'
  | 'SYSTEM';

export type Notification = {
  _id: string;

  type?: NotificationType;

  title: string;
  message: string;

  isRead: boolean;

  referenceType?: string;
  referenceId?: string;

  createdAt: string;
  readAt?: string | null;
};

/** Notification endpoint response. */
export type NotificationsResponse = {
  notifications: Notification[];
  unreadCount: number;
};

/* =========================================================
   DASHBOARD
========================================================= */

export type DashboardStats = {
  totalEquipment: number;
  availableEquipment: number;
  onLoanEquipment: number;
  pendingRequests: number;
  totalLoans: number;
};

export type DashboardResponse = {
  stats: DashboardStats;
  recent: Loan[];
  locations: Location[];
};

/* =========================================================
   API RESPONSE HELPERS
========================================================= */

export type ApiMessageResponse = {
  message: string;
};

export type ApiErrorResponse = {
  message?: string;
  error?: string;
  details?: unknown;
};
