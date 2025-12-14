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
import { useSignIn, useOAuth } from "@clerk/clerk-expo";
import { useRouter, Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

export default function SignInPage() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const router = useRouter();
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [usePhone, setUsePhone] = useState(false);

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
        router.replace("/");
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
      const { createdSessionId, setActive: oAuthSetActive } =
        await startOAuthFlow();

      if (createdSessionId) {
        await oAuthSetActive!({ session: createdSessionId });
        router.replace("/");
      }
    } catch (err: any) {
      console.error("OAuth error", err);
      Alert.alert("Error", "Google sign in failed");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50"
    >
      <View className="flex-1 justify-center px-6">
        {/* Logo/Header */}
        <View className="mb-8">
          <Text className="text-4xl font-bold text-brand-red mb-2">
            Zesha Agent
          </Text>
          <Text className="text-gray-600 text-lg">Sign in to your account</Text>
        </View>

        {/* Google Sign In Button */}
        <TouchableOpacity
          onPress={onGoogleSignIn}
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

        {/* Sign In Button */}
        <TouchableOpacity
          onPress={onSignInPress}
          disabled={loading}
          className={`bg-brand-red rounded-lg py-4 mb-4 ${
            loading ? "opacity-50" : ""
          }`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-bold text-lg">
              Sign In
            </Text>
          )}
        </TouchableOpacity>

        {/* Sign Up Link */}
        <View className="flex-row justify-center">
          <Text className="text-gray-600">Don't have an account? </Text>
          <Link href="/(auth)/sign-up" asChild>
            <TouchableOpacity>
              <Text className="text-brand-red font-semibold">Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
