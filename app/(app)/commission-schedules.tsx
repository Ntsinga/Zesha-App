import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function CommissionSchedules() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Commission Structures are available on the web app.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  text: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
});
