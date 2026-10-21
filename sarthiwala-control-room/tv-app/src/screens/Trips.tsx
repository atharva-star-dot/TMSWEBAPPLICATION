import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Focusable } from '../components/Focusable';
import { Truck } from '../data/fleet';
import { c, statusColor, statusLabel } from '../theme';

const order = { delayed: 0, on_trip: 1, idle: 2 } as const;
const eta = (h: number) => (h === 0 ? '-' : h < 1 ? `${Math.round(h * 60)} min` : `${h.toFixed(1)} h`);

export function Trips({ trucks, highlight, onOpen }: { trucks: Truck[]; highlight: number | null; onOpen: (id: number) => void }) {
  const rows = [...trucks].sort((a, b) => order[a.status] - order[b.status] || a.id - b.id);
  return (
    <ScrollView>
      {rows.map(t => (
        <Focusable key={t.id} onPress={() => onOpen(t.id)} marked={highlight === t.id} style={s.wrap}>
          <View style={s.row}>
            <View style={[s.pill, { backgroundColor: statusColor(t.status) }]}><Text style={s.pillText}>{statusLabel(t.status)}</Text></View>
            <Text style={s.truck}>Truck {t.id}</Text>
            <Text style={s.route}>{t.from} to {t.to}</Text>
            <Text style={s.driver}>{t.driver}</Text>
            <Text style={s.eta}>{eta(t.etaHours)}</Text>
          </View>
        </Focusable>
      ))}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.panel, borderRadius: 10, padding: 16 },
  pill: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 4, width: 130, alignItems: 'center' },
  pillText: { color: c.bg, fontSize: 20, fontWeight: '700' },
  truck: { color: c.text, fontSize: 26, fontWeight: '700', width: 150, marginLeft: 16 },
  route: { color: c.text, fontSize: 24, flex: 1 },
  driver: { color: c.sub, fontSize: 22, width: 260 },
  eta: { color: c.text, fontSize: 24, width: 110, textAlign: 'right' },
});
