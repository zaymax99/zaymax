import {
  requireOptionalNativeModule,
  type NativeModule,
} from "expo-modules-core";

export type ZaymaxWidgetBridgeModule = NativeModule & {
  setString(key: string, value: string, suiteName: string): boolean;
  getString(key: string, suiteName: string): string | null;
  reloadWidget(kind: string): void;
};

export function getZaymaxWidgetBridge(): ZaymaxWidgetBridgeModule | null {
  return requireOptionalNativeModule<ZaymaxWidgetBridgeModule>(
    "ZaymaxWidgetBridge",
  );
}
