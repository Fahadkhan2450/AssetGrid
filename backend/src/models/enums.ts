export type Role = 'ADMIN' | 'EMPLOYEE';
export const EQUIPMENT_STATUS = ['AVAILABLE','ON_LOAN','MAINTENANCE','RETIRED'] as const;
export const REQUEST_STATUS = ['PENDING','APPROVED','REJECTED','ISSUED','RETURNED'] as const;
export type EquipmentStatus = typeof EQUIPMENT_STATUS[number];
export type RequestStatus = typeof REQUEST_STATUS[number];
