import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Focusable } from '../components/Focusable';
import { Truck } from '../data/fleet';
import { c, inr, statusColor, statusLabel } from '../theme';

function alerts(t: Truck) {
  const a: { text: string; color: string }[] = [];
  if (t.status === 'delayed') a.push({ text: 'Running behind schedule. Call the customer with a new ETA.', color: c.late });
  if (t.payment && t.payment.dueInDays <= 2) a.push({ text: `${inr(t.payment.amountInr)} from ${t.payment.party} is due ${t.payment.dueInDays === 0 ? 'today' : `in ${t.payment.dueInDays} day${t.payment.dueInDays === 1 ? '' : 's'}`}.`, color: c.due });
  if (t.checkInMinAgo > 120) a.push({ text: `No driver check-in for ${Math.floor(t.checkInMinAgo / 60)} hours.`, color: c.due });
  return a;
}

export function Detail({ truck, onBack }: { truck: Truck; onBack: () => void }) {
  const list = alerts(truck);
  const rows: [string, string][] = [
    ['Vehicle', truck.regNo], ['Driver', truck.driver], ['Load', truck.load], ['Location', truck.location],
    ['Progress', `${truck.progress}%`], ['Last check-in', `${truck.checkInMinAgo} min ago`],
  ];
  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Text style={s.title}>Truck {truck.id}: {truck.from} to {truck.to}</Text>
        <View style={[s.pill, { backgroundColor: statusColor(truck.status) }]}><Text style={s.pillText}>{statusLabel(truck.status)}</Text></View>
      </View>
      <View style={s.body}>
        <View style={s.facts}>
          {rows.map(([k, v]) => (
            <View key={k} style={s.fact}><Text style={s.k}>{k}</Text><Text style={s.v}>{v}</Text></View>
          ))}
        </View>
        <View style={s.alerts}>
          <Text style={s.alertsTitle}>{list.length ? 'Needs attention' : 'All clear'}</Text>
          {list.map(a => <View key={a.text} style={[s.alert, { borderLeftColor: a.color }]}><Text style={s.alertText}>{a.text}</Text></View>)}
        </View>
      </View>
      <Focusable onPress={onBack} preferred style={s.back}><Text style={s.backText}>Back to fleet</Text></Focusable>
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  title: { color: c.text, fontSize: 44, fontWeight: '700', marginRight: 24 },
  pill: { borderRadius: 18, paddingHorizontal: 18, paddingVertical: 6 },
  pillText: { color: c.bg, fontSize: 24, fontWeight: '700' },
  body: { flexDirection: 'row' },
  facts: { flex: 1, backgroundColor: c.panel, borderRadius: 12, padding: 24, marginRight: 24 },
  fact: { flexDirection: 'row', paddingVertical: 10 },
  k: { color: c.sub, fontSize: 26, width: 220 },
  v: { color: c.text, fontSize: 26, flex: 1 },
  alerts: { flex: 1 },
  alertsTitle: { color: c.text, fontSize: 30, fontWeight: '700', marginBottom: 12 },
  alert: { backgroundColor: c.panel, borderLeftWidth: 8, borderRadius: 8, padding: 18, marginBottom: 12 },
  alertText: { color: c.text, fontSize: 24 },
  back: { alignSelf: 'flex-start', marginTop: 28 },
  backText: { color: c.bg, backgroundColor: c.focus, fontSize: 26, fontWeight: '700', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 10, overflow: 'hidden' },
});
