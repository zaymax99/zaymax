import { Image, View, type ImageStyle, type StyleProp } from "react-native";

import { GoldAccent } from "@/components/gold-accent";

const wordmark = require("../assets/images/zaymax-wordmark.png");

const WORDMARK_SOURCE_WIDTH = 588;
const WORDMARK_SOURCE_HEIGHT = 111;
const WORDMARK_LEFT_INSET = 26;

type ZaymaxWordmarkProps = {
  style?: StyleProp<ImageStyle>;
  width?: number;
};

export function ZaymaxWordmark({ style, width = 95 }: ZaymaxWordmarkProps) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
      <Image
        accessibilityLabel="ZAYMAX"
        resizeMode="contain"
        source={wordmark}
        style={[
          {
            width,
            height: (width * WORDMARK_SOURCE_HEIGHT) / WORDMARK_SOURCE_WIDTH,
            marginLeft: -(width * WORDMARK_LEFT_INSET) / WORDMARK_SOURCE_WIDTH,
          },
          style,
        ]}
      />
      <GoldAccent />
    </View>
  );
}
