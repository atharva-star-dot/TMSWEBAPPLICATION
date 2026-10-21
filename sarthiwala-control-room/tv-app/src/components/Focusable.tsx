import React, { useState } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { c } from '../theme';

interface Props { onPress: () => void; style?: ViewStyle; children: React.ReactNode; preferred?: boolean; marked?: boolean }
// Every interactive element shows a thick amber ring when focused, which is what makes a TV app usable from a couch.
export function Focusable({ onPress, style, children, preferred, marked }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      hasTVPreferredFocus={preferred}
      style={[s.base, style, marked && s.marked, focused && s.focused]}>
      {children}
    </Pressable>
  );
}
const s = StyleSheet.create({
  base: { borderWidth: 4, borderColor: 'transparent', borderRadius: 14 },
  focused: { borderColor: c.focus, transform: [{ scale: 1.04 }] },
  marked: { borderColor: c.late, borderStyle: 'dashed' },
});
