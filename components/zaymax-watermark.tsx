import { Image, View } from "react-native";

import { ZAYMAX_DESIGN } from "@/constants/zaymax-design";

const logo = require("../assets/images/icon.png");

export function ZaymaxWatermark() {
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 999,
        backgroundColor: "#000",
        borderWidth: 1,
        borderColor: `${ZAYMAX_DESIGN.colors.gold}80`,
        overflow: "hidden",
        opacity: 0.92,
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
