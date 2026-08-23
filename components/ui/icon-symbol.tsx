import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  "house.fill": "home",
  "bell.fill": "notifications-none",
  "plus.circle.fill": "add-circle",
  "gearshape.fill": "settings",
  "chevron.right": "chevron-right",
  "trash.fill": "delete-outline",
  "pencil": "edit",
  "figure.strengthtraining.traditional": "fitness-center",
  "calendar": "calendar-today",
  "timer": "timer",
  "scalemass.fill": "monitor-weight",
  "checkmark.circle.fill": "check-circle",
  "pause.fill": "pause",
  "play.fill": "play-arrow",
  "arrow.counterclockwise": "refresh",
  "book.closed.fill": "menu-book",
  "lock.fill": "lock",
  "lock.open.fill": "lock-open",
  "medal.fill": "workspace-premium",
  "dumbbell.fill": "fitness-center",
  "plus": "add",
  "minus": "remove",
  "circle": "radio-button-unchecked",
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
