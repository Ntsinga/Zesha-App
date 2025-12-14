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
} from "react-native";
import { useSignUp, useOAuth } from "@clerk/clerk-expo";
import { useRouter, Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

export default function SignUpPage() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const router = useRouter();
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [usePhone, setUsePhone] = useState(false);

  const onSignUpPress = async () => {
    if (!isLoaded) return;

    setLoading(true);
    try {
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
        router.replace("/");
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
      const { createdSessionId, setActive: oAuthSetActive } =
        await startOAuthFlow();

      if (createdSessionId) {
        await oAuthSetActive!({ session: createdSessionId });
        router.replace("/");
      }
    } catch (err: any) {
      console.error("OAuth error", err);
      Alert.alert("Error", "Google sign up failed");
    }
  };

  if (pendingVerification) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-gray-50"
      >
        <View className="flex-1 justify-center px-6">
          <View className="mb-8">
            <Text className="text-3xl font-bold text-gray-900 mb-2">
              Verify {usePhone ? "Phone Number" : "Email"}
            </Text>
            <Text className="text-gray-600 text-base">
              Enter the verification code sent to {emailOrPhone}
            </Text>
          </View>

          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Verification Code
            </Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              keyboardType="number-pad"
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-center text-2xl tracking-widest"
            />
          </View>

          <TouchableOpacity
            onPress={onVerifyPress}
            disabled={loading}
            className={`bg-brand-red rounded-lg py-4 ${
              loading ? "opacity-50" : ""
            }`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-bold text-lg">
                Verify {usePhone ? "Phone" : "Email"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50"
    >
      <View className="flex-1 justify-center px-6">
        <View className="mb-8">
          <Text className="text-4xl font-bold text-brand-red mb-2">
            Create Account
          </Text>
          <Text className="text-gray-600 text-lg">Sign up to get started</Text>
        </View>

        {/* Google Sign Up Button */}
        <TouchableOpacity
          onPress={onGoogleSignUp}
          className="bg-white border border-gray-300 rounded-lg py-4 mb-4 flex-row items-center justify-center"
        >
          <Text className="text-gray-700 font-semibold text-base ml-2">
            Continue with Google
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View className="flex-row items-center mb-6">
          <View className="flex-1 h-px bg-gray-300" />
          <Text className="mx-4 text-gray-500">or</Text>
          <View className="flex-1 h-px bg-gray-300" />
        </View>

        {/* Toggle Email/Phone */}
        <View className="flex-row mb-4">
          <TouchableOpacity
            onPress={() => setUsePhone(false)}
            className={`flex-1 py-2 border-b-2 ${
              !usePhone ? "border-brand-red" : "border-gray-300"
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                !usePhone ? "text-brand-red" : "text-gray-500"
              }`}
            >
              Email
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setUsePhone(true)}
            className={`flex-1 py-2 border-b-2 ${
              usePhone ? "border-brand-red" : "border-gray-300"
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                usePhone ? "text-brand-red" : "text-gray-500"
              }`}
            >
              Phone
            </Text>
          </TouchableOpacity>
        </View>

        {/* Email/Phone Input */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            {usePhone ? "Phone Number" : "Email Address"}
          </Text>
          <TextInput
            value={emailOrPhone}
            onChangeText={setEmailOrPhone}
            placeholder={usePhone ? "+1 234 567 8900" : "you@example.com"}
            autoCapitalize="none"
            keyboardType={usePhone ? "phone-pad" : "email-address"}
            className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base"
          />
        </View>

        {/* Password Input */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Password
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base"
          />
        </View>

        <TouchableOpacity
          onPress={onSignUpPress}
          disabled={loading}
          className={`bg-brand-red rounded-lg py-4 mb-4 ${
            loading ? "opacity-50" : ""
          }`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-bold text-lg">
              Sign Up
            </Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center">
          <Text className="text-gray-600">Already have an account? </Text>
          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity>
              <Text className="text-brand-red font-semibold">Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
