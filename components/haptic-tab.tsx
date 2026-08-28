import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import { useRef } from "react";
import { Animated } from "react-native";

import { hapticSelection } from "@/lib/haptics";

export function HapticTab(props: BottomTabBarButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  function animateTo(value: number) {
    Animated.timing(scale, {
      toValue: value,
      duration: 90,
      useNativeDriver: true,
    }).start();
  }

  return (
    <Animated.View style={[props.style, { transform: [{ scale }] }]}>
      <PlatformPressable
        {...props}
        style={{ flex: 1 }}
        pressOpacity={0.7}
        onPressIn={(ev) => {
          animateTo(0.965);
          hapticSelection();
          props.onPressIn?.(ev);
        }}
        onPressOut={(ev) => {
          animateTo(1);
          props.onPressOut?.(ev);
        }}
      />
    </Animated.View>
  );
}
