import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  Animated,
  Dimensions,
  StyleSheet,
  StatusBar,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width: W, height: H } = Dimensions.get("window");

interface AnimatedSplashProps {
  onFinish: () => void;
}

export default function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.7)).current;
  const iconY = useRef(new Animated.Value(-20)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandY = useRef(new Animated.Value(30)).current;
  const dividerOpacity = useRef(new Animated.Value(0)).current;
  const dividerY = useRef(new Animated.Value(30)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(30)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;
  const loaderY = useRef(new Animated.Value(30)).current;
  const barWidth = useRef(new Animated.Value(0)).current;

  const ring1Scale = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0.5)).current;
  const ring2Scale = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(0.5)).current;
  const ring3Scale = useRef(new Animated.Value(1)).current;
  const ring3Opacity = useRef(new Animated.Value(0.5)).current;
  const haloScale = useRef(new Animated.Value(1)).current;
  const haloOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Ring pulse loops
    const ringPulse = (s: Animated.Value, o: Animated.Value, delay: number) => {
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(s, {
                toValue: 1.015,
                duration: 2000,
                useNativeDriver: true,
              }),
              Animated.timing(o, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(s, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
              }),
              Animated.timing(o, {
                toValue: 0.5,
                duration: 2000,
                useNativeDriver: true,
              }),
            ]),
          ]),
        ).start();
      }, delay);
    };

    ringPulse(ring1Scale, ring1Opacity, 0);
    ringPulse(ring2Scale, ring2Opacity, 400);
    ringPulse(ring3Scale, ring3Opacity, 800);

    // Icon halo breath
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(haloScale, {
            toValue: 1.12,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(haloOpacity, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(haloScale, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(haloOpacity, {
            toValue: 0.6,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();

    // Icon drop in
    Animated.parallel([
      Animated.timing(iconOpacity, {
        toValue: 1,
        duration: 900,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.timing(iconScale, {
        toValue: 1,
        duration: 900,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.timing(iconY, {
        toValue: 0,
        duration: 900,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Staggered fade-up elements
    const fadeUp = (o: Animated.Value, y: Animated.Value, delay: number) =>
      Animated.parallel([
        Animated.timing(o, {
          toValue: 1,
          duration: 1000,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(y, {
          toValue: 0,
          duration: 1000,
          delay,
          useNativeDriver: true,
        }),
      ]).start();

    fadeUp(brandOpacity, brandY, 450);
    fadeUp(dividerOpacity, dividerY, 600);
    fadeUp(taglineOpacity, taglineY, 700);
    fadeUp(loaderOpacity, loaderY, 900);

    // Loading bar fill (width — cannot use native driver)
    const barTimer = setTimeout(() => {
      Animated.timing(barWidth, {
        toValue: 180,
        duration: 2200,
        useNativeDriver: false,
      }).start();
    }, 1100);

    // Fade out the whole screen and signal completion
    const exitTimer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(() => onFinish());
    }, 3800);

    return () => {
      clearTimeout(barTimer);
      clearTimeout(exitTimer);
    };
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Background gradient */}
      <LinearGradient
        colors={["#C8162D", "#8E0C1A", "#520610"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative rings */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: 900,
            height: 900,
            borderRadius: 450,
            top: H / 2 - 450,
            left: W / 2 - 450,
            opacity: ring1Opacity,
            transform: [{ scale: ring1Scale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          {
            width: 700,
            height: 700,
            borderRadius: 350,
            top: H / 2 - 350,
            left: W / 2 - 350,
            borderColor: "rgba(255,215,0,0.08)",
            opacity: ring2Opacity,
            transform: [{ scale: ring2Scale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          {
            width: 520,
            height: 520,
            borderRadius: 260,
            top: H / 2 - 260,
            left: W / 2 - 260,
            opacity: ring3Opacity,
            transform: [{ scale: ring3Scale }],
          },
        ]}
      />

      {/* Corner accent circles */}
      <View style={styles.cornerTL} />
      <View style={styles.cornerBR} />

      {/* Main content */}
      <View style={styles.content}>
        {/* App icon */}
        <Animated.View
          style={[
            styles.iconBox,
            {
              opacity: iconOpacity,
              transform: [{ scale: iconScale }, { translateY: iconY }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.iconHalo,
              {
                opacity: haloOpacity,
                transform: [{ scale: haloScale }],
              },
            ]}
          />
          <Image
            source={require("../assets/icon.png")}
            style={styles.iconImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Brand name */}
        <Animated.Text
          style={[
            styles.brandName,
            {
              opacity: brandOpacity,
              transform: [{ translateY: brandY }],
            },
          ]}
        >
          TELEBA
        </Animated.Text>

        {/* Gold divider */}
        <Animated.View
          style={[
            styles.dividerRow,
            {
              opacity: dividerOpacity,
              transform: [{ translateY: dividerY }],
            },
          ]}
        >
          <View style={styles.dividerLine} />
          <View style={styles.dividerDiamond} />
          <View style={styles.dividerLine} />
        </Animated.View>

        {/* Tagline */}
        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineY }],
            },
          ]}
        >
          TELECOM &amp; AGENCY BANKING
        </Animated.Text>
      </View>

      {/* Loading bar */}
      <Animated.View
        style={[
          styles.loaderWrap,
          {
            opacity: loaderOpacity,
            transform: [{ translateY: loaderY }],
          },
        ]}
      >
        <View style={styles.loaderTrack}>
          <Animated.View style={{ width: barWidth, height: "100%" }}>
            <LinearGradient
              colors={["#B8860B", "#FFD700", "#FFE566"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1, borderRadius: 2 }}
            />
          </Animated.View>
        </View>
        <Text style={styles.loaderLabel}>INITIALIZING</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: W,
    height: H,
    overflow: "hidden",
    backgroundColor: "#520610",
  },
  ring: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  cornerTL: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 210,
    top: -140,
    left: -140,
    borderWidth: 1.2,
    borderColor: "rgba(255,255,255,0.05)",
  },
  cornerBR: {
    position: "absolute",
    width: 460,
    height: 460,
    borderRadius: 230,
    bottom: -160,
    right: -160,
    borderWidth: 1.2,
    borderColor: "rgba(255,255,255,0.05)",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
  },
  iconBox: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  iconHalo: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,215,0,0.15)",
  },
  iconImage: {
    width: 140,
    height: 140,
    borderRadius: 32,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.45,
        shadowRadius: 36,
      },
      android: { elevation: 12 },
    }),
  },
  brandName: {
    fontFamily: Platform.select({
      ios: "Georgia",
      android: "serif",
      default: "serif",
    }),
    fontSize: 64,
    fontWeight: "700",
    letterSpacing: 8,
    color: "#FFD700",
    textShadowColor: "rgba(255,215,0,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  dividerLine: {
    width: 60,
    height: 1,
    backgroundColor: "rgba(255,215,0,0.6)",
  },
  dividerDiamond: {
    width: 7,
    height: 7,
    backgroundColor: "#FFD700",
    transform: [{ rotate: "45deg" }],
    opacity: 0.85,
  },
  tagline: {
    fontSize: 12,
    fontWeight: "300",
    letterSpacing: 3.5,
    color: "rgba(255,255,255,0.55)",
  },
  loaderWrap: {
    position: "absolute",
    bottom: 72,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 12,
  },
  loaderTrack: {
    width: 180,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  loaderLabel: {
    fontSize: 10,
    letterSpacing: 2.5,
    color: "rgba(255,255,255,0.3)",
  },
});
