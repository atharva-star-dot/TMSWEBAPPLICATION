import { useEffect, useState } from 'react';
import { BRIDGE_URL } from '../config';

export interface Voice { highlight: number | null; text: string; at: number }
// Polls the voice server so an Alexa question highlights the truck on the TV. Fails silently.
export function useVoiceBridge(): Voice {
  const [v, setV] = useState<Voice>({ highlight: null, text: '', at: 0 });
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch(BRIDGE_URL);
        const j = await r.json();
        if (alive && j.at && j.at !== v.at) setV(j);
      } catch (e) { /* bridge not running: dashboard still works */ }
    };
    const id = setInterval(poll, 1500);
    return () => { alive = false; clearInterval(id); };
  }, [v.at]);
  return v;
}
