import { Image, View } from "react-native";

import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";

const logo = require("../assets/images/icon.png");

export function ZaymaxWatermark() {
  return (
    <View
      style={{
        width: 30,
        height: 30,
        borderRadius: 999,
        backgroundColor: ZAYMAX_DESIGN.colors.surfaceSoft,
        borderWidth: 1,
        borderColor: ZAYMAX_DESIGN.colors.border,
        overflow: "hidden",
        opacity: 1,
      }}
    >
      <Image
        source={logo}
        resizeMode="contain"
        style={{ width: "100%", height: "100%" }}
      />
    </View>
  );
}
