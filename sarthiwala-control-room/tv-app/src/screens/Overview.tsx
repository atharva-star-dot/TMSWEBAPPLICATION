import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Focusable } from '../components/Focusable';
import { Truck } from '../data/fleet';
import { c, statusColor, inr } from '../theme';

interface Props { trucks: Truck[]; highlight: number | null; onOpen: (id: number) => void }

export function Overview({ trucks, highlight, onOpen }: Props) {
  const n = (s: string) => trucks.filter(t => t.status === s).length;
  const due = trucks.filter(t => t.payment);
  const dueTotal = due.reduce((a, t) => a + t.payment!.amountInr, 0);
  const tiles = [
    { label: 'On time', value: String(n('on_trip')), color: c.moving },
    { label: 'Delayed', value: String(n('delayed')), color: c.late },
    { label: 'Idle', value: String(n('idle')), color: c.idle },
    { label: `${due.length} payments pending`, value: inr(dueTotal), color: c.due },
  ];
  return (
    <View>
      <View style={s.tiles}>
        {tiles.map(t => (
          <View key={t.label} style={[s.tile, { borderLeftColor: t.color }]}>
            <Text style={s.tileValue}>{t.value}</Text>
            <Text style={s.tileLabel}>{t.label}</Text>
          </View>
        ))}
      </View>
      <View style={s.grid}>
        {trucks.map(t => (
          <Focusable key={t.id} onPress={() => onOpen(t.id)} marked={highlight === t.id} style={s.card}>
            <View style={s.cardInner}>
              <View style={s.row}>
                <Text style={s.id}>Truck {t.id}</Text>
                <View style={[s.dot, { backgroundColor: statusColor(t.status) }]} />
              </View>
              <Text style={s.route} numberOfLines={1}>{t.from} to {t.to}</Text>
              <View style={s.bar}><View style={[s.fill, { width: `${t.progress}%`, backgroundColor: statusColor(t.status) }]} /></View>
              <Text style={s.sub}>{t.driver}</Text>
            </View>
          </Focusable>
        ))}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  tiles: { flexDirection: 'row', marginBottom: 28 },
  tile: { flex: 1, backgroundColor: c.panel, borderLeftWidth: 8, borderRadius: 10, padding: 20, marginRight: 16 },
  tileValue: { color: c.text, fontSize: 44, fontWeight: '700' },
  tileLabel: { color: c.sub, fontSize: 22, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  card: { width: '24%', margin: '0.5%' },
  cardInner: { backgroundColor: c.panel, borderRadius: 10, padding: 18 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  id: { color: c.text, fontSize: 28, fontWeight: '700' },
  dot: { width: 18, height: 18, borderRadius: 9 },
  route: { color: c.sub, fontSize: 22, marginVertical: 8 },
  bar: { height: 8, backgroundColor: c.bg, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8 },
  sub: { color: c.sub, fontSize: 20, marginTop: 8 },
});
