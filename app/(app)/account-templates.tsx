import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function AccountTemplates() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Account Templates are available on the web app.
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
    textAlign: "center",
    color: "#666",
  },
});
