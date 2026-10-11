import { AuditLog } from '../models/AuditLog.js';

export async function audit(input: {
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
  session?: any;
}) {
  return AuditLog.create([input], { session: input.session });
}
