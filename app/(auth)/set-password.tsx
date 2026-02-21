import React, { useState, useEffect } from "react";
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
import { useUser, useSignUp } from "@clerk/clerk-expo";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Set Password Page (Native) - For invited users to set their password
 * This page handles two flows:
 * 1. Invite flow: User arrives with __clerk_ticket, needs to accept invitation and set password
 * 2. Existing user: User is already authenticated but needs to set a password
 */
export default function SetPasswordPage() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { signUp, setActive, isLoaded: isSignUpLoaded } = useSignUp();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
  const [isProcessingInvite, setIsProcessingInvite] = useState(false);
  const [requiresUsername, setRequiresUsername] = useState(false);
  const [ticketProcessed, setTicketProcessed] = useState(false);

  // Check for invite ticket and process it
  useEffect(() => {
    if (!isSignUpLoaded || isProcessingInvite || ticketProcessed) return;

    const ticket = params.__clerk_ticket as string | undefined;

    // If user is already authenticated, skip ticket processing
    if (user) {
      return;
    }

    // If signUp already has an email, we're ready
    if (signUp?.emailAddress) {
      setInviteEmail(signUp.emailAddress);
      setTicketProcessed(true);
      // Check if username is required from existing signUp state
      if (signUp.missingFields?.includes("username")) {
        setRequiresUsername(true);
      }
      return;
    }

    if (ticket) {
      setIsProcessingInvite(true);

      // Create a sign-up with the ticket - Clerk will auto-populate user info
      signUp
        ?.create({
          strategy: "ticket",
          ticket,
        })
        .then((result) => {
          if (result.emailAddress) {
            setInviteEmail(result.emailAddress);
          }

          // Check if username is required - also set true if status is missing_requirements
          // since Clerk instance requires username for all users
          if (
            result.missingFields?.includes("username") ||
            result.status === "missing_requirements"
          ) {
            setRequiresUsername(true);
          }

          setTicketProcessed(true);

          // If status is complete, the user might already be signed in
          if (result.status === "complete" && result.createdSessionId) {
            setActive?.({ session: result.createdSessionId });
          }
        })
        .catch((err) => {
          console.error("[SetPassword] Failed to process invite:", err);

          const errorCode = err.errors?.[0]?.code;
          if (
            errorCode === "form_identifier_exists" ||
            errorCode === "ticket_invalid"
          ) {
            Alert.alert(
              "Invitation Issue",
              "This invitation has already been used or expired. Please sign in.",
              [
                {
                  text: "Sign In",
                  onPress: () => router.replace("/(auth)/sign-in"),
                },
              ],
            );
          } else {
            Alert.alert(
              "Error",
              err.errors?.[0]?.message || "Failed to process invitation",
            );
          }
        })
        .finally(() => {
          setIsProcessingInvite(false);
        });
    }
  }, [
    isSignUpLoaded,
    signUp,
    user,
    isProcessingInvite,
    params.__clerk_ticket,
    setActive,
    ticketProcessed,
  ]);

  // Determine if we're ready to show the form
  // Check signUp object for email as well
  const signUpEmail = signUp?.emailAddress;
  const effectiveInviteEmail = inviteEmail || signUpEmail || null;
  const isInviteFlow = !!effectiveInviteEmail && !user;
  const isReady = (isUserLoaded && user) || isInviteFlow;
  const displayEmail =
    user?.primaryEmailAddress?.emailAddress || effectiveInviteEmail;
  const displayName =
    user?.firstName ||
    (effectiveInviteEmail ? effectiveInviteEmail.split("@")[0] : null);

  // If user already has password, redirect to app
  React.useEffect(() => {
    if (isUserLoaded && user?.passwordEnabled) {
      router.replace("/(app)");
    }
  }, [isUserLoaded, user, router]);

  const handleSetPassword = async () => {
    // For invite flow, we use signUp; for existing users, we use user
    const hasInviteData =
      (!!inviteEmail || !!signUp?.emailAddress) && signUp && !user;

    if (!hasInviteData && (!isUserLoaded || !user)) return;

    // Username validation for invite flow
    if (requiresUsername && !username.trim()) {
      Alert.alert("Error", "Please enter a username");
      return;
    }

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
      if (hasInviteData && signUp) {
        // Invite flow: Update signUp with password (and username if required) and complete registration
        const updatePayload: { password: string; username?: string } = {
          password,
        };
        if (requiresUsername && username.trim()) {
          updatePayload.username = username.trim();
        }
        const result = await signUp.update(updatePayload);

        if (result.status === "complete" && result.createdSessionId) {
          // Activate the session
          await setActive({ session: result.createdSessionId });
          Alert.alert("Success", "Password set successfully!", [
            { text: "Continue", onPress: () => router.replace("/(app)") },
          ]);
        } else {
          Alert.alert(
            "Error",
            `Registration incomplete. Status: ${result.status}. Please contact support.`,
          );
        }
      } else if (user) {
        // Existing user flow: Update password directly
        await user.updatePassword({
          newPassword: password,
        });

        // Reload user to ensure passwordEnabled is updated
        await user.reload();

        Alert.alert("Success", "Password set successfully!", [
          { text: "Continue", onPress: () => router.replace("/(app)") },
        ]);
      }
    } catch (err: any) {
      console.error("Set password error:", err);
      const errorMessage =
        err.errors?.[0]?.message || err.message || "Failed to set password";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isUserLoaded || !isSignUpLoaded || isProcessingInvite) {
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
        <Text style={{ color: "#94A3B8", marginTop: 16 }}>
          {isProcessingInvite ? "Processing invitation..." : "Loading..."}
        </Text>
      </View>
    );
  }

  if (!isReady) {
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
        <Text style={{ color: "#94A3B8", marginTop: 16 }}>
          Initializing your account...
        </Text>
      </View>
    );
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
              Welcome, {displayName || displayEmail}
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
            {/* Username - only shown for invite flow when required */}
            {requiresUsername && (
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#F1F5F9",
                    marginBottom: 8,
                  }}
                >
                  Username
                </Text>
                <View
                  style={{
                    backgroundColor: "#1E293B",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#334155",
                  }}
                >
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Choose a username"
                    placeholderTextColor="#64748B"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{
                      padding: 16,
                      fontSize: 16,
                      color: "#fff",
                    }}
                    editable={!isLoading}
                  />
                </View>
              </View>
            )}

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
