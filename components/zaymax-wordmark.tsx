import { Image, type ImageStyle, type StyleProp } from "react-native";

const wordmark = require("../assets/images/zaymax-wordmark.png");

type ZaymaxWordmarkProps = {
  style?: StyleProp<ImageStyle>;
  width?: number;
};

export function ZaymaxWordmark({ style, width = 112 }: ZaymaxWordmarkProps) {
  return (
    <Image
      accessibilityLabel="ZAYMAX"
      resizeMode="contain"
      source={wordmark}
      style={[{ width, height: 18 }, style]}
    />
  );
}
