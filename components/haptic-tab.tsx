import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";

import { hapticSelection } from "@/lib/haptics";

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      pressOpacity={0.55}
      onPressIn={(ev) => {
        hapticSelection();
        props.onPressIn?.(ev);
      }}
    />
  );
}
