import { Image, View } from "react-native";

const logo = require("../assets/images/icon.png");

export function ZaymaxWatermark() {
  return <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: "#000", overflow: "hidden", opacity: 0.72 }}><Image source={logo} resizeMode="contain" style={{ width: "100%", height: "100%" }} /></View>;
}
