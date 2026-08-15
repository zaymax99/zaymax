import { ReactNode, useEffect, useRef } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { usePathname, useRouter } from "expo-router";

const tabs = ["/", "/history", "/settings"] as const;

export function TabSwipeContainer({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const current = tabs.indexOf(pathname === "/" ? "/" : pathname as (typeof tabs)[number]);
  const directionRef = useRef(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const goToTab = (direction: number) => { const next = Math.max(0, Math.min(tabs.length - 1, current + direction)); if (next !== current) { directionRef.current = direction; router.navigate(tabs[next]); } };
  useEffect(() => { const incoming = directionRef.current < 0 ? -35 : 35; translateX.value = incoming; opacity.value = 0; translateX.value = withTiming(0, { duration: 260 }); opacity.value = withTiming(1, { duration: 220 }); }, [pathname, opacity, translateX]);
  const gesture = Gesture.Pan().activeOffsetX([-32, 32]).failOffsetY([-20, 20]).onEnd((event) => { if (Math.abs(event.translationX) <= 80) return; const direction = event.translationX < 0 ? 1 : -1; translateX.value = withTiming(direction > 0 ? -35 : 35, { duration: 140 }); opacity.value = withTiming(0.2, { duration: 140 }, (finished) => { if (finished) runOnJS(goToTab)(direction); }); });
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateX: translateX.value }] }));
  return <GestureDetector gesture={gesture}><Animated.View style={[{ flex: 1 }, animatedStyle]}>{children}</Animated.View></GestureDetector>;
}
