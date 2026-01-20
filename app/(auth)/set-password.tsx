import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Set Password Page (Native) - For invited users to set their password
 * This page is shown after accepting an invitation
 * The user is already authenticated but needs to set a password
 */
export default function SetPasswordPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // If user already has password, redirect to app
  React.useEffect(() => {
    if (isLoaded && user?.passwordEnabled) {
      router.replace("/(app)");
    }
  }, [isLoaded, user, router]);

  const handleSetPassword = async () => {
    if (!isLoaded || !user) return;

    if (!password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      // Update user with password using updatePassword method
      await user.updatePassword({
        newPassword: password,
      });

      Alert.alert("Success", "Password set successfully!", [
        {
          text: "Continue",
          onPress: () => router.replace("/(app)"),
        },
      ]);
    } catch (err: any) {
      console.error("Set password error:", err);
      const errorMessage =
        err.errors?.[0]?.message || err.message || "Failed to set password";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0F172A",
        }}
      >
        <ActivityIndicator size="large" color="#FDB022" />
        <Text style={{ color: "#94A3B8", marginTop: 16 }}>Loading...</Text>
      </View>
    );
  }

  // If no user (not authenticated), redirect to sign-in
  if (!user) {
    router.replace("/sign-in");
    return null;
  }

  return (
    <LinearGradient colors={["#0F172A", "#1E293B"]} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 20,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={{ alignItems: "center", marginBottom: 40 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 16,
                backgroundColor: "#FDB022",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 48, fontWeight: "bold", color: "#fff" }}>
                Z
              </Text>
            </View>
            <Text
              style={{
                fontSize: 28,
                fontWeight: "bold",
                color: "#fff",
                marginBottom: 8,
              }}
            >
              Set Your Password
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: "#94A3B8",
                textAlign: "center",
              }}
            >
              Welcome, {user.firstName || user.emailAddresses[0]?.emailAddress}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#64748B",
                textAlign: "center",
                marginTop: 8,
              }}
            >
              Create a secure password to access your account
            </Text>
          </View>

          {/* Form */}
          <View style={{ marginBottom: 24 }}>
            {/* Password */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#F1F5F9",
                  marginBottom: 8,
                }}
              >
                Password
              </Text>
              <View
                style={{
                  backgroundColor: "#1E293B",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#334155",
                  flexDirection: "row",
                  alignItems: "center",
                  paddingRight: 16,
                }}
              >
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password (min 8 characters)"
                  placeholderTextColor="#64748B"
                  secureTextEntry={!showPassword}
                  style={{
                    flex: 1,
                    padding: 16,
                    fontSize: 16,
                    color: "#fff",
                  }}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={24}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#F1F5F9",
                  marginBottom: 8,
                }}
              >
                Confirm Password
              </Text>
              <View
                style={{
                  backgroundColor: "#1E293B",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#334155",
                  flexDirection: "row",
                  alignItems: "center",
                  paddingRight: 16,
                }}
              >
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter password"
                  placeholderTextColor="#64748B"
                  secureTextEntry={!showConfirmPassword}
                  style={{
                    flex: 1,
                    padding: 16,
                    fontSize: 16,
                    color: "#fff",
                  }}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={24}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Set Password Button */}
          <TouchableOpacity
            onPress={handleSetPassword}
            disabled={isLoading || !password || !confirmPassword}
            style={{
              backgroundColor:
                isLoading || !password || !confirmPassword
                  ? "#64748B"
                  : "#FDB022",
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Set Password & Continue
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
