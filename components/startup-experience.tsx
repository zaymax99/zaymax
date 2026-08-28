import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRootNavigationState, useRouter } from "expo-router";
import { AppState, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";
import {
  clearActiveSession,
  loadActiveSession,
  loadWorkouts,
} from "@/lib/workouts";

const wordmark = require("../assets/images/zaymax-wordmark.png");

type StartupPhase = "checking" | "intro" | "done";

export function StartupExperience() {
  const router = useRouter();
  const pathname = usePathname();
  const navigationState = useRootNavigationState();
  const pathnameRef = useRef(pathname);
  const initialCheckStarted = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const [phase, setPhase] = useState<StartupPhase>("checking");
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.96);
  const glowOpacity = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const restoreActiveWorkout = useCallback(async () => {
    const [activeSession, workouts] = await Promise.all([
      loadActiveSession(),
      loadWorkouts(),
    ]);
    if (!activeSession?.workoutId) return false;
    if (!workouts.some((workout) => workout.id === activeSession.workoutId)) {
      await clearActiveSession();
      return false;
    }

    if (!pathnameRef.current.startsWith("/workout/active/")) {
      router.replace({
        pathname: "/workout/active/[id]",
        params: { id: activeSession.workoutId },
      });
    }
    return true;
  }, [router]);

  useEffect(() => {
    if (!navigationState?.key || initialCheckStarted.current) return;
    initialCheckStarted.current = true;
    let cancelled = false;

    void restoreActiveWorkout()
      .then((restored) => {
        if (cancelled) return;
        setPhase(restored ? "done" : "intro");
      })
      .catch(() => {
        if (!cancelled) setPhase("intro");
      });

    return () => {
      cancelled = true;
    };
  }, [navigationState?.key, restoreActiveWorkout]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const returnedToForeground =
        appStateRef.current !== "active" && nextState === "active";
      appStateRef.current = nextState;
      if (!returnedToForeground) return;

      void restoreActiveWorkout().catch(() => {
        // Returning to the app must stay usable when local storage is busy.
      });
    });
    return () => subscription.remove();
  }, [restoreActiveWorkout]);

  useEffect(() => {
    if (phase !== "intro") return;

    logoOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
    logoScale.value = withDelay(100, withTiming(1, { duration: 400 }));
    glowOpacity.value = withDelay(
      500,
      withSequence(
        withTiming(0.32, { duration: 130 }),
        withTiming(0, { duration: 170 }),
      ),
    );
    overlayOpacity.value = withDelay(
      800,
      withTiming(0, { duration: 200 }, (finished) => {
        if (finished) runOnJS(setPhase)("done");
      }),
    );

    return () => {
      cancelAnimation(logoOpacity);
      cancelAnimation(logoScale);
      cancelAnimation(glowOpacity);
      cancelAnimation(overlayOpacity);
    };
  }, [glowOpacity, logoOpacity, logoScale, overlayOpacity, phase]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: 1.025 }],
  }));
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (phase === "done") return null;

  return (
    <Animated.View
      pointerEvents="auto"
      style={[styles.overlay, overlayStyle]}
      testID="cold-start-intro"
    >
      {phase === "intro" ? (
        <View style={styles.logoFrame}>
          <Animated.Image
            source={wordmark}
            resizeMode="contain"
            style={[styles.wordmark, styles.glow, glowStyle]}
          />
          <Animated.Image
            source={wordmark}
            resizeMode="contain"
            style={[styles.wordmark, logoStyle]}
          />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10_000,
    elevation: 100,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ZAYMAX_DESIGN.colors.background,
  },
  logoFrame: {
    width: "72%",
    maxWidth: 360,
    aspectRatio: 570 / 88,
    alignItems: "center",
    justifyContent: "center",
  },
  wordmark: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  glow: {
    tintColor: ZAYMAX_DESIGN.colors.gold,
  },
});
