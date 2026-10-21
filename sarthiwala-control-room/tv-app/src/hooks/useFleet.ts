import { useEffect, useState } from 'react';
import { initialTrucks, Truck } from '../data/fleet';

// Simulates live movement: moving trucks creep forward, ETAs shrink, check-in age grows.
export function useFleet(tickMs = 3000) {
  const [trucks, setTrucks] = useState<Truck[]>(initialTrucks);
  useEffect(() => {
    const id = setInterval(() => {
      setTrucks(ts => ts.map(t => t.status === 'idle' ? { ...t, checkInMinAgo: t.checkInMinAgo + 1 } : {
        ...t,
        progress: Math.min(99, t.progress + 1),
        etaHours: Math.max(0.1, +(t.etaHours - 0.05).toFixed(2)),
        checkInMinAgo: t.checkInMinAgo + 1,
      }));
    }, tickMs);
    return () => clearInterval(id);
  }, [tickMs]);
  return trucks;
}
