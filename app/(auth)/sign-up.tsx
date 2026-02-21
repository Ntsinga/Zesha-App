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
import { useSignUp, useOAuth } from "@clerk/clerk-expo";
import { useRouter, Link, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { Colors, Gradients } from "../../constants/theme";

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

export default function SignUpPage() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const redirectUrl = Linking.createURL("/");
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const router = useRouter();
  const params = useLocalSearchParams();
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [usePhone, setUsePhone] = useState(false);
  const [step, setStep] = useState<"identifier" | "password">("identifier");

  // Check if this is an invite flow
  React.useEffect(() => {
    if (!isLoaded) return;

    // If email is pre-populated from invite, show it
    if (signUp?.emailAddress) {
      setEmailOrPhone(signUp.emailAddress);
      setStep("password");
    }
  }, [isLoaded, signUp]);

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

  const onSignUpPress = async () => {
    if (!isLoaded) return;

    if (!password.trim()) {
      Alert.alert("Error", "Please enter a password");
      return;
    }

    setLoading(true);
    try {
      // Check if this is an invite flow (email is pre-populated from ticket)
      const isInviteFlow =
        signUp?.emailAddress && emailOrPhone === signUp.emailAddress;

      if (isInviteFlow) {
        // For invites, just update with password - Clerk handles the ticket automatically
        const result = await signUp.update({
          password,
        });

        if (result.status === "complete") {
          await setActive({ session: result.createdSessionId });
          router.replace("/(app)");
          return;
        }

        // If update didn't complete, try standard verification
        const verifyResult = await signUp.attemptEmailAddressVerification({
          code: "",
        });

        if (verifyResult.status === "complete") {
          await setActive({ session: verifyResult.createdSessionId });
          router.replace("/(app)");
          return;
        }
      }

      // Regular signup flow
      if (usePhone) {
        // Phone number signup
        await signUp.create({
          phoneNumber: emailOrPhone,
          password,
        });
        await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });
      } else {
        // Email signup
        await signUp.create({
          emailAddress: emailOrPhone,
          password,
        });
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });
      }

      setPendingVerification(true);
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert("Error", err.errors?.[0]?.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;

    setLoading(true);
    try {
      const signUpAttempt = usePhone
        ? await signUp.attemptPhoneNumberVerification({ code })
        : await signUp.attemptEmailAddressVerification({ code });

      if (signUpAttempt.status === "complete") {
        await setActive({ session: signUpAttempt.createdSessionId });
        router.replace("/(app)");
      } else {
        console.error(JSON.stringify(signUpAttempt, null, 2));
        Alert.alert("Error", "Verification failed");
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert("Error", err.errors?.[0]?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const onGoogleSignUp = async () => {
    try {
      console.log("OAuth Redirect URL:", redirectUrl);
      const { createdSessionId, setActive: oAuthSetActive } =
        await startOAuthFlow({ redirectUrl });

      console.log("OAuth Response:", { createdSessionId });

      if (createdSessionId) {
        console.log("Setting active session...");
        await oAuthSetActive!({ session: createdSessionId });
        console.log("Session set, navigating to home...");
        router.replace("/(app)");
      } else {
        console.log("No session created");
        Alert.alert("Error", "No session was created. Please try again.");
      }
    } catch (err: any) {
      console.error("OAuth error:", err);
      console.error("OAuth error details:", JSON.stringify(err, null, 2));
      Alert.alert("Error", err.message || "Google sign up failed");
    }
  };

  // Verification Screen
  if (pendingVerification) {
    return (
      <View className="flex-1">
        <StatusBar barStyle="light-content" />

        {/* Teleba Blue→Teal Gradient Header */}
        <LinearGradient
          colors={Gradients.primaryExtended}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="pt-16 pb-32 px-6"
        >
          <View className="items-center pt-12">
            <Text className="text-4xl font-bold text-white mb-2">
              Verify {usePhone ? "Phone" : "Email"}
            </Text>
            <Text className="text-white/90 text-lg">
              Enter the code sent to {emailOrPhone}
            </Text>
          </View>
        </LinearGradient>

        {/* White Card Container */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 -mt-20"
        >
          <View className="flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-6 shadow-lg">
            {/* Code Input */}
            <Text className="text-sm font-semibold text-gray-800 mb-3">
              Verification Code
            </Text>
            <View className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-1 mb-6 flex-row items-center">
              <Ionicons
                name="keypad-outline"
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
                className="flex-1 py-3 text-base text-gray-800 text-center tracking-widest"
                maxLength={6}
              />
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              onPress={onVerifyPress}
              disabled={loading}
              className={`bg-brand-primary rounded-2xl py-4 mb-6 flex-row items-center justify-center ${
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
                  <Ionicons name="checkmark" size={20} color="white" />
                </>
              )}
            </TouchableOpacity>

            {/* Back Button */}
            <TouchableOpacity
              onPress={() => {
                setPendingVerification(false);
                setStep("identifier");
              }}
              className="items-center"
            >
              <Text className="text-brand-secondary font-medium text-sm">Go back</Text>
            </TouchableOpacity>

            {/* Spacer */}
            <View className="flex-1" />
          </View>
        </KeyboardAvoidingView>

        {/* Footer */}
        <View style={{ backgroundColor: Colors.primary.main }} className="py-4">
          <View className="flex-row justify-center items-center">
            <Text className="text-brand-secondary-light text-sm">Need help? </Text>
            <TouchableOpacity>
              <Text className="text-white text-sm font-medium underline">
                Contact Support
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Main Sign Up Screen
  return (
    <View className="flex-1">
      <StatusBar barStyle="light-content" />

      {/* Teleba Blue→Teal Gradient Header */}
      <LinearGradient
        colors={Gradients.primaryExtended}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="pt-16 pb-32 px-6"
      >
        <View className="items-center pt-12">
          <Text className="text-4xl font-bold text-white mb-2">
            Create Account
          </Text>
          <Text className="text-white/90 text-lg">Sign up to get started</Text>
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
                {/* Google Sign Up Button */}
                <TouchableOpacity
                  onPress={onGoogleSignUp}
                  className="bg-slate-50 border border-slate-200 rounded-2xl py-4 mb-6 flex-row items-center justify-center"
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
                    <Text className="text-sm font-semibold text-brand-secondary">
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
                  className="bg-brand-primary rounded-2xl py-4 mb-6 flex-row items-center justify-center"
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
                  <Text className="text-brand-secondary font-medium">
                    Terms of Service
                  </Text>{" "}
                  and{" "}
                  <Text className="text-brand-secondary font-medium">
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
                  <Ionicons name="chevron-back" size={24} color={Colors.primary.main} />
                  <Text className="text-brand-primary font-semibold ml-1">Back</Text>
                </TouchableOpacity>

                {/* Password Label */}
                <Text className="text-sm font-semibold text-gray-800 mb-3">
                  Create Password
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

                {/* Sign Up Button */}
                <TouchableOpacity
                  onPress={onSignUpPress}
                  disabled={loading}
                  className={`bg-brand-primary rounded-2xl py-4 mb-6 flex-row items-center justify-center ${
                    loading ? "opacity-50" : ""
                  }`}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Text className="text-white font-bold text-lg mr-2">
                        Sign Up
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="white"
                      />
                    </>
                  )}
                </TouchableOpacity>

                {/* Already have account */}
                <View className="flex-row justify-center">
                  <Text className="text-gray-500 text-sm">
                    Already have an account?{" "}
                  </Text>
                  <Link href="/(auth)/sign-in" asChild>
                    <TouchableOpacity>
                      <Text className="text-brand-secondary font-medium text-sm">
                        Sign In
                      </Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              </>
            )}

            {/* Spacer */}
            <View className="flex-1" />

            {/* Footer - Inside white card to avoid being covered */}
            <View className="pt-6 pb-4">
              <View className="flex-row justify-center items-center">
                <Text className="text-gray-500 text-sm">Need help? </Text>
                <TouchableOpacity>
                  <Text className="text-brand-secondary font-medium text-sm underline">
                    Contact Support
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
