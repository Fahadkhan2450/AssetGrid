import { Counter } from '../models/Counter.js';

export async function nextNumber(key: string, prefix: string) {
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { value: 1 } },
    { upsert: true, new: true }
  ).lean();
  return `${prefix}-${String(counter!.value).padStart(6, '0')}`;
}
