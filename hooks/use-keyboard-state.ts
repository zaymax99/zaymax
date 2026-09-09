import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/** Shared by floating controls so they agree on the space above the keyboard. */
export function useKeyboardState() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      let blurTimeout: ReturnType<typeof setTimeout> | undefined;
      const isTextField = (target: EventTarget | null) => {
        const element = target as HTMLElement | null;
        return Boolean(
          element &&
          (element.tagName === "INPUT" || element.tagName === "TEXTAREA"),
        );
      };
      const handleFocusIn = (event: FocusEvent) => {
        if (blurTimeout) clearTimeout(blurTimeout);
        if (isTextField(event.target)) setIsVisible(true);
      };
      const handleFocusOut = () => {
        if (blurTimeout) clearTimeout(blurTimeout);
        blurTimeout = window.setTimeout(() => {
          setIsVisible(isTextField(document.activeElement));
        }, 120);
      };
      setIsVisible(isTextField(document.activeElement));
      window.addEventListener("focusin", handleFocusIn);
      window.addEventListener("focusout", handleFocusOut);
      return () => {
        if (blurTimeout) clearTimeout(blurTimeout);
        window.removeEventListener("focusin", handleFocusIn);
        window.removeEventListener("focusout", handleFocusOut);
      };
    }

    setIsVisible(Keyboard.isVisible());
    setKeyboardHeight(Keyboard.metrics()?.height ?? 0);
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        setKeyboardHeight(event.endCoordinates?.height ?? 0);
        setIsVisible(true);
      },
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setIsVisible(false);
        setKeyboardHeight(0);
      },
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return { keyboardHeight, isVisible };
}
