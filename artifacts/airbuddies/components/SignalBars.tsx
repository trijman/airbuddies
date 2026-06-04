import React from "react";
import { StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface SignalBarsProps {
  strength: number;
  size?: number;
}

export function SignalBars({ strength, size = 18 }: SignalBarsProps) {
  const colors = useColors();
  const level = strength >= 85 ? 4 : strength >= 70 ? 3 : strength >= 55 ? 2 : 1;
  const barWidth = size * 0.18;
  const gap = size * 0.1;

  return (
    <View style={[styles.container, { height: size, gap }]}>
      {[1, 2, 3, 4].map((i) => {
        const active = i <= level;
        const barHeight = (size / 4) * i;
        return (
          <View
            key={i}
            style={{
              width: barWidth,
              height: barHeight,
              borderRadius: barWidth / 2,
              backgroundColor: active ? colors.primary : colors.border,
              alignSelf: "flex-end",
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
});
