import raw from './fleet.json';

export type Status = 'on_trip' | 'delayed' | 'idle';
export interface Truck {
  id: number; regNo: string; driver: string; from: string; to: string; status: Status;
  progress: number; location: string; etaHours: number; checkInMinAgo: number; load: string;
  payment: { party: string; amountInr: number; dueInDays: number } | null;
}
export const initialTrucks = (raw as { trucks: Truck[] }).trucks;
export const operator = (raw as { operator: string }).operator;
