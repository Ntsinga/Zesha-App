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
import { useSignIn, useOAuth } from "@clerk/clerk-expo";
import { useRouter, Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";

WebBrowser.maybeCompleteAuthSession();

// Google Logo Component
const GoogleLogo = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
);

export default function SignInPage() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const redirectUrl = Linking.createURL("/");
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const router = useRouter();
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [usePhone, setUsePhone] = useState(false);
  const [step, setStep] = useState<"identifier" | "password">("identifier");

  const onContinuePress = async () => {
    if (!emailOrPhone.trim()) {
      Alert.alert(
        "Error",
        usePhone
          ? "Please enter your phone number"
          : "Please enter your email address"
      );
      return;
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
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
        Alert.alert("Error", "Sign in failed. Please try again.");
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert("Error", err.errors?.[0]?.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const onGoogleSignIn = async () => {
    try {
      console.log("OAuth Redirect URL:", redirectUrl);
      const oAuthResponse = await startOAuthFlow({ redirectUrl });

      console.log(
        "Full OAuth Response:",
        JSON.stringify(oAuthResponse, null, 2)
      );

      const { createdSessionId, signIn, signUp, setActive } = oAuthResponse;

      if (createdSessionId) {
        console.log("Setting active session...");
        await setActive!({ session: createdSessionId });
        console.log("Session set, navigating to home...");
        router.replace("/(app)");
      } else {
        console.log("No session created - checking signIn/signUp status");
        console.log("SignIn status:", signIn?.status);
        console.log("SignUp status:", signUp?.status);
        Alert.alert(
          "Error",
          "Authentication was not completed. Please try again."
        );
      }
    } catch (err: any) {
      console.error("OAuth error:", err);
      console.error("OAuth error details:", JSON.stringify(err, null, 2));
      Alert.alert("Error", err.message || "Google sign in failed");
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
                {/* Google Sign In Button */}
                <TouchableOpacity
                  onPress={onGoogleSignIn}
                  className="bg-red-50 border border-red-100 rounded-2xl py-4 mb-6 flex-row items-center justify-center"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center justify-center">
                    <View className="mr-3">
                      <GoogleLogo size={24} />
                    </View>
                    <Text className="text-gray-700 font-semibold text-base">
                      Continue with Google
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Divider */}
                <View className="flex-row items-center mb-6">
                  <View className="flex-1 h-px bg-gray-200" />
                  <Text className="mx-4 text-gray-400 text-sm">or</Text>
                  <View className="flex-1 h-px bg-gray-200" />
                </View>

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
            ) : (
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
            )}

            {/* Spacer */}
            <View className="flex-1" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View className="bg-red-600 py-4">
        <View className="flex-row justify-center items-center">
          <Text className="text-red-200 text-sm">Don't have an account? </Text>
          <Link href="/(auth)/sign-up" asChild>
            <TouchableOpacity>
              <Text className="text-white text-sm font-medium underline">
                Sign Up
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </View>
  );
}
