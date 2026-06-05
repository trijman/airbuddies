import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useColors } from "@/hooks/useColors";

interface InterestChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  small?: boolean;
}

export function InterestChip({ label, selected = false, onPress, small = false }: InterestChipProps) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.muted,
          borderColor: selected ? colors.primary : colors.border,
          paddingHorizontal: small ? 10 : 14,
          paddingVertical: small ? 4 : 7,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: selected ? colors.primaryForeground : colors.mutedForeground,
            fontSize: small ? 12 : 14,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  label: {
    fontFamily: "Inter_500Medium",
  },
});
