// Palette taken from Indian highway signage and truck-back amber, tuned for a TV viewed from across a room.
export const c = {
  bg: '#0E2229', panel: '#163540', panelHi: '#1F4755', text: '#EEF3F1', sub: '#9DB4B8',
  moving: '#5CBF8F', late: '#F5A524', idle: '#8CA2AA', due: '#E9705F', focus: '#FFD166',
};
export const statusColor = (s: string) => (s === 'on_trip' ? c.moving : s === 'delayed' ? c.late : c.idle);
export const statusLabel = (s: string) => (s === 'on_trip' ? 'On time' : s === 'delayed' ? 'Delayed' : 'Idle');
export const inr = (n: number) => '₹' + n.toLocaleString('en-IN');
