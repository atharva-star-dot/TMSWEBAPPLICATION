import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { Focusable } from './components/Focusable';
import { useFleet } from './hooks/useFleet';
import { useVoiceBridge } from './hooks/useVoiceBridge';
import { operator } from './data/fleet';
import { Overview } from './screens/Overview';
import { Trips } from './screens/Trips';
import { Detail } from './screens/Detail';
import { c } from './theme';

type Tab = 'overview' | 'trips';

export default function App() {
  const trucks = useFleet();
  const voice = useVoiceBridge();
  const [tab, setTab] = useState<Tab>('overview');
  const [openId, setOpenId] = useState<number | null>(null);

  // A voice answer about a truck opens that truck's detail on the TV.
  useEffect(() => { if (voice.highlight) setOpenId(voice.highlight); }, [voice.at]);

  // Remote's Back button closes the detail view first, and only then leaves the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (openId !== null) { setOpenId(null); return true; }
      return false;
    });
    return () => sub.remove();
  }, [openId]);

  const truck = trucks.find(t => t.id === openId);
  return (
    <View style={s.root}>
      <View style={s.top}>
        <View>
          <Text style={s.brand}>Sarthiwala Control Room</Text>
          <Text style={s.operator}>{operator}</Text>
        </View>
        <View style={s.tabs}>
          <Focusable onPress={() => { setOpenId(null); setTab('overview'); }} preferred style={s.tab}>
            <Text style={[s.tabText, tab === 'overview' && s.tabOn]}>Fleet</Text>
          </Focusable>
          <Focusable onPress={() => { setOpenId(null); setTab('trips'); }} style={s.tab}>
            <Text style={[s.tabText, tab === 'trips' && s.tabOn]}>Live trips</Text>
          </Focusable>
        </View>
      </View>
      {voice.text ? <View style={s.voice}><Text style={s.voiceText}>Alexa: {voice.text}</Text></View> : null}
      {truck ? <Detail truck={truck} onBack={() => setOpenId(null)} />
        : tab === 'overview' ? <Overview trucks={trucks} highlight={voice.highlight} onOpen={setOpenId} />
        : <Trips trucks={trucks} highlight={voice.highlight} onOpen={setOpenId} />}
    </View>
  );
}
// 48px side padding keeps content inside the TV-safe area.
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 48, paddingVertical: 32 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  brand: { color: c.text, fontSize: 40, fontWeight: '700' },
  operator: { color: c.sub, fontSize: 22 },
  tabs: { flexDirection: 'row' },
  tab: { marginLeft: 12 },
  tabText: { color: c.sub, fontSize: 28, paddingHorizontal: 22, paddingVertical: 10 },
  tabOn: { color: c.text, fontWeight: '700' },
  voice: { backgroundColor: c.panelHi, borderRadius: 10, padding: 14, marginBottom: 18 },
  voiceText: { color: c.text, fontSize: 24 },
});
