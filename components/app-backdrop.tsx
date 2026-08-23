import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

const CONTOURS = [
  "M250 18 C330 -18 430 10 442 88 C454 165 370 200 310 164 C248 127 208 62 250 18 Z",
  "M270 38 C330 8 399 24 411 79 C422 132 368 168 319 143 C271 119 236 67 270 38 Z",
  "M292 56 C334 35 376 43 386 80 C395 116 359 139 326 125 C292 109 266 77 292 56 Z",
  "M-70 520 C10 448 126 470 150 570 C174 670 88 754 -18 730 C-104 710 -142 584 -70 520 Z",
  "M-42 544 C24 490 102 506 119 578 C137 651 73 711 -8 696 C-81 682 -102 596 -42 544 Z",
  "M-17 568 C31 530 77 542 89 589 C101 636 57 671 6 662 C-43 653 -58 602 -17 568 Z",
] as const;

export function AppBackdrop() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.container]}>
      <View style={styles.topPlate} />
      <View style={styles.bottomPlate} />
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 390 844"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}
      >
        {CONTOURS.map((path, index) => (
          <Path
            key={path}
            d={path}
            fill="none"
            stroke={index % 3 === 0 ? "#3A3A3D" : "#29292C"}
            strokeWidth="1"
            opacity={0.38}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: "hidden", pointerEvents: "none" },
  topPlate: {
    position: "absolute",
    top: 86,
    right: -76,
    width: 210,
    height: 210,
    borderWidth: 1,
    borderColor: "#242427",
    transform: [{ rotate: "18deg" }],
  },
  bottomPlate: {
    position: "absolute",
    bottom: 34,
    left: -104,
    width: 230,
    height: 230,
    borderWidth: 1,
    borderColor: "#202023",
    transform: [{ rotate: "-12deg" }],
  },
});
