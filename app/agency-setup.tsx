import React from "react";
import { View, Text } from "react-native";

export default function AgencySetupFallback() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#f8fafc",
      }}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: "#0f172a",
          marginBottom: 8,
          textAlign: "center",
        }}
      >
        Agency setup is available on web only.
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: "#475569",
          textAlign: "center",
          lineHeight: 20,
        }}
      >
        Open the web app to complete agency onboarding.
      </Text>
    </View>
  );
}
