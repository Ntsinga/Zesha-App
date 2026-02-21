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
import { useSignIn } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { validateEmail } from "../../utils/validators";

export default function SignInPage() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [usePhone, setUsePhone] = useState(false);
  const [step, setStep] = useState<"identifier" | "password" | "2fa">(
    "identifier",
  );

  const onContinuePress = async () => {
    if (!emailOrPhone.trim()) {
      Alert.alert(
        "Error",
        usePhone
          ? "Please enter your phone number"
          : "Please enter your email address",
      );
      return;
    }

    // Validate email format if using email
    if (!usePhone) {
      const validation = validateEmail(emailOrPhone.trim());
      if (!validation.isValid) {
        Alert.alert("Error", validation.error || "Invalid email format");
        return;
      }
    }

    setStep("password");
  };

  const onSignInPress = async () => {
    if (!isLoaded) return;

    setLoading(true);
    try {
      const signInAttempt = await signIn.create({
        identifier: emailOrPhone,
        password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/(app)");
      } else if (signInAttempt.status === "needs_second_factor") {
        // Prepare 2FA - send email code
        await signInAttempt.prepareSecondFactor({
          strategy: "email_code",
        });
        setStep("2fa");
      } else {
        Alert.alert("Error", "Sign in failed. Please try again.");
      }
    } catch (err: any) {
      // Handle session_exists error - user is already signed in
      if (err.errors?.[0]?.code === "session_exists") {
        Alert.alert(
          "Already Signed In",
          "You're already signed in. Redirecting to app...",
          [{ text: "OK", onPress: () => router.replace("/(app)") }],
        );
        return;
      }

      Alert.alert("Error", err.errors?.[0]?.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const onVerify2FAPress = async () => {
    if (!isLoaded || !code.trim()) {
      Alert.alert("Error", "Please enter the verification code");
      return;
    }

    setLoading(true);
    try {
      const signInAttempt = await signIn.attemptSecondFactor({
        strategy: "email_code",
        code: code.trim(),
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/(app)");
      } else {
        Alert.alert("Error", "Verification failed. Please try again.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.errors?.[0]?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1">
      <StatusBar barStyle="light-content" />

      {/* Red Gradient Header */}
      <LinearGradient
        colors={["#DC2626", "#B91C1C", "#991B1B"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="pt-16 pb-32 px-6"
      >
        <View className="items-center pt-12">
          <Text className="text-4xl font-bold text-white mb-2">
            Zesha Agent
          </Text>
          <Text className="text-white/90 text-lg">
            Sign in to manage your account
          </Text>
        </View>
      </LinearGradient>

      {/* White Card Container */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 -mt-20"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-6 shadow-lg">
            {step === "identifier" ? (
              <>
                {/* Email/Phone Label Row */}
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-sm font-semibold text-gray-800">
                    {usePhone ? "Phone number" : "Email address"}
                  </Text>
                  <TouchableOpacity onPress={() => setUsePhone(!usePhone)}>
                    <Text className="text-sm font-semibold text-red-500">
                      {usePhone ? "Use email" : "Use phone"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Email/Phone Input */}
                <View className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-1 mb-6 flex-row items-center">
                  <Ionicons
                    name={usePhone ? "call-outline" : "mail-outline"}
                    size={20}
                    color="#9CA3AF"
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    value={emailOrPhone}
                    onChangeText={setEmailOrPhone}
                    placeholder={
                      usePhone
                        ? "Enter your phone number"
                        : "Enter your email address"
                    }
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    keyboardType={usePhone ? "phone-pad" : "email-address"}
                    className="flex-1 py-3 text-base text-gray-800"
                  />
                </View>

                {/* Continue Button */}
                <TouchableOpacity
                  onPress={onContinuePress}
                  className="bg-red-600 rounded-2xl py-4 mb-6 flex-row items-center justify-center"
                  activeOpacity={0.8}
                >
                  <Text className="text-white font-bold text-lg mr-2">
                    Continue
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="white" />
                </TouchableOpacity>

                {/* Terms Text */}
                <Text className="text-center text-gray-500 text-sm leading-5">
                  By continuing, you agree to our{" "}
                  <Text className="text-red-500 font-medium">
                    Terms of Service
                  </Text>{" "}
                  and{" "}
                  <Text className="text-red-500 font-medium">
                    Privacy Policy
                  </Text>
                  .
                </Text>
              </>
            ) : step === "password" ? (
              <>
                {/* Back Button */}
                <TouchableOpacity
                  onPress={() => setStep("identifier")}
                  className="flex-row items-center mb-6"
                >
                  <Ionicons name="chevron-back" size={24} color="#DC2626" />
                  <Text className="text-red-600 font-semibold ml-1">Back</Text>
                </TouchableOpacity>

                {/* Password Label */}
                <Text className="text-sm font-semibold text-gray-800 mb-3">
                  Password
                </Text>

                {/* Password Input */}
                <View className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-1 mb-6 flex-row items-center">
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#9CA3AF"
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    className="flex-1 py-3 text-base text-gray-800"
                  />
                </View>

                {/* Sign In Button */}
                <TouchableOpacity
                  onPress={onSignInPress}
                  disabled={loading}
                  className={`bg-red-600 rounded-2xl py-4 mb-6 flex-row items-center justify-center ${
                    loading ? "opacity-50" : ""
                  }`}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Text className="text-white font-bold text-lg mr-2">
                        Sign In
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="white"
                      />
                    </>
                  )}
                </TouchableOpacity>

                {/* Forgot Password */}
                <TouchableOpacity className="items-center">
                  <Text className="text-red-500 font-medium text-sm">
                    Forgot password?
                  </Text>
                </TouchableOpacity>
              </>
            ) : step === "2fa" ? (
              <>
                {/* Back Button */}
                <TouchableOpacity
                  onPress={() => setStep("password")}
                  className="flex-row items-center mb-6"
                >
                  <Ionicons name="chevron-back" size={24} color="#DC2626" />
                  <Text className="text-red-600 font-semibold ml-1">Back</Text>
                </TouchableOpacity>

                {/* 2FA Instructions */}
                <View className="mb-6">
                  <Text className="text-2xl font-bold text-gray-800 mb-2">
                    Verify your identity
                  </Text>
                  <Text className="text-gray-600">
                    We've sent a verification code to{" "}
                    <Text className="font-semibold">{emailOrPhone}</Text>
                  </Text>
                </View>

                {/* Code Label */}
                <Text className="text-sm font-semibold text-gray-800 mb-3">
                  Verification Code
                </Text>

                {/* Code Input */}
                <View className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-1 mb-6 flex-row items-center">
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color="#9CA3AF"
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    value={code}
                    onChangeText={setCode}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    maxLength={6}
                    className="flex-1 py-3 text-base text-gray-800"
                  />
                </View>

                {/* Verify Button */}
                <TouchableOpacity
                  onPress={onVerify2FAPress}
                  disabled={loading}
                  className={`bg-red-600 rounded-2xl py-4 mb-6 flex-row items-center justify-center ${
                    loading ? "opacity-50" : ""
                  }`}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Text className="text-white font-bold text-lg mr-2">
                        Verify
                      </Text>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="white"
                      />
                    </>
                  )}
                </TouchableOpacity>

                {/* Resend Code */}
                <TouchableOpacity
                  className="items-center"
                  onPress={async () => {
                    if (!signIn) return;
                    try {
                      await signIn.prepareSecondFactor({
                        strategy: "email_code",
                      });
                      Alert.alert("Success", "Verification code sent!");
                    } catch (err: any) {
                      Alert.alert("Error", "Failed to resend code");
                    }
                  }}
                >
                  <Text className="text-red-500 font-medium text-sm">
                    Resend code
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}

            {/* Spacer */}
            <View className="flex-1" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
