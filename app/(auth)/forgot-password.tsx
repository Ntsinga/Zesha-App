import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth, useSignIn } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { validateEmail, validatePhoneNumber } from "../../utils/validators";

type Step = "request" | "reset" | "mfa";
type ResetStrategy = "reset_password_email_code" | "reset_password_phone_code";
type SecondFactorStrategy =
  | "email_code"
  | "phone_code"
  | "totp"
  | "backup_code";

interface SecondFactorState {
  strategy: SecondFactorStrategy;
  emailAddressId?: string;
  phoneNumberId?: string;
  safeIdentifier?: string | null;
}

interface SecondFactorCandidate {
  strategy: string;
  emailAddressId?: string;
  phoneNumberId?: string;
  safeIdentifier?: string | null;
}

export default function ForgotPasswordPage() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("request");
  const [identifier, setIdentifier] = useState("");
  const [usePhone, setUsePhone] = useState(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [secondFactor, setSecondFactor] = useState<SecondFactorState | null>(
    null,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const resetStrategy: ResetStrategy = usePhone
    ? "reset_password_phone_code"
    : "reset_password_email_code";
  const normalizedIdentifier = usePhone
    ? identifier.trim()
    : identifier.trim().toLowerCase();
  const canResendSecondFactor =
    secondFactor?.strategy === "email_code" ||
    secondFactor?.strategy === "phone_code";

  useEffect(() => {
    if (isSignedIn) {
      router.replace("/(app)");
    }
  }, [isSignedIn, router]);

  const getPreferredSecondFactor = (signInAttempt: {
    supportedSecondFactors?: Array<SecondFactorCandidate> | null;
  }): SecondFactorState | null => {
    const secondFactors = signInAttempt.supportedSecondFactors ?? [];
    const priority: SecondFactorStrategy[] = [
      "email_code",
      "phone_code",
      "totp",
      "backup_code",
    ];

    for (const strategy of priority) {
      const factor = secondFactors.find((entry) => entry.strategy === strategy);
      if (factor) {
        return {
          strategy,
          emailAddressId: factor.emailAddressId,
          phoneNumberId: factor.phoneNumberId,
          safeIdentifier: factor.safeIdentifier ?? null,
        };
      }
    }

    return null;
  };

  const prepareSecondFactor = async (factor: SecondFactorState) => {
    if (!signIn) return;

    if (factor.strategy === "email_code") {
      await signIn.prepareSecondFactor({
        strategy: factor.strategy,
        ...(factor.emailAddressId
          ? { emailAddressId: factor.emailAddressId }
          : {}),
      });
      return;
    }

    if (factor.strategy === "phone_code") {
      await signIn.prepareSecondFactor({
        strategy: factor.strategy,
        ...(factor.phoneNumberId
          ? { phoneNumberId: factor.phoneNumberId }
          : {}),
      });
    }
  };

  const startSecondFactorStep = async (signInAttempt: {
    supportedSecondFactors?: Array<SecondFactorCandidate> | null;
  }) => {
    const factor = getPreferredSecondFactor(signInAttempt);

    if (!factor) {
      Alert.alert(
        "Additional verification required",
        "This account requires a second verification method that this screen does not support yet.",
      );
      return;
    }

    if (factor.strategy === "email_code" || factor.strategy === "phone_code") {
      await prepareSecondFactor(factor);
    }

    setSecondFactor(factor);
    setMfaCode("");
    setStep("mfa");
  };

  const resetFlowState = () => {
    setCode("");
    setPassword("");
    setConfirmPassword("");
    setMfaCode("");
    setSecondFactor(null);
    setStep("request");
  };

  const handleSendCode = async () => {
    if (!isLoaded || !signIn) return;

    const validation = usePhone
      ? validatePhoneNumber(normalizedIdentifier)
      : validateEmail(normalizedIdentifier);

    if (!validation.isValid) {
      Alert.alert(
        "Error",
        validation.error ||
          (usePhone
            ? "Please enter a valid phone number"
            : "Please enter a valid email address"),
      );
      return;
    }

    setLoading(true);
    try {
      await signIn.create({
        strategy: resetStrategy,
        identifier: normalizedIdentifier,
      });

      setIdentifier(normalizedIdentifier);
      setCode("");
      setPassword("");
      setConfirmPassword("");
      setMfaCode("");
      setSecondFactor(null);
      setStep("reset");
      Alert.alert(
        "Code sent",
        usePhone
          ? "We sent a verification code to your phone number."
          : "We sent a verification code to your email.",
      );
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.errors?.[0]?.message ||
          err.message ||
          "We could not start the password reset flow.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!isLoaded || !signIn) return;

    if (!code.trim()) {
      Alert.alert("Error", "Please enter the verification code");
      return;
    }

    if (!password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all password fields");
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

    setLoading(true);
    try {
      const verification = await signIn.attemptFirstFactor({
        strategy: resetStrategy,
        code: code.trim(),
      });

      if (verification.status !== "needs_new_password") {
        Alert.alert(
          "Error",
          "Verification failed. Please request a new code and try again.",
        );
        return;
      }

      const resetAttempt = await signIn.resetPassword({
        password,
        signOutOfOtherSessions: true,
      });

      if (resetAttempt.status === "complete" && resetAttempt.createdSessionId) {
        await setActive({ session: resetAttempt.createdSessionId });
        router.replace("/(app)");
        return;
      }

      if (resetAttempt.status === "needs_second_factor") {
        await startSecondFactorStep(resetAttempt);
        return;
      }

      Alert.alert(
        "Error",
        "Password reset could not be completed. Please try again.",
      );
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.errors?.[0]?.message ||
          err.message ||
          "Password reset failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!isLoaded || !signIn) return;

    setLoading(true);
    try {
      await signIn.create({
        strategy: resetStrategy,
        identifier: normalizedIdentifier,
      });

      Alert.alert(
        "Code sent",
        usePhone
          ? "A new verification code has been sent to your phone number."
          : "A new verification code has been sent.",
      );
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.errors?.[0]?.message ||
          err.message ||
          "Failed to resend the verification code.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySecondFactor = async () => {
    if (!isLoaded || !signIn || !secondFactor) return;

    if (!mfaCode.trim()) {
      Alert.alert(
        "Error",
        secondFactor.strategy === "backup_code"
          ? "Please enter a backup code"
          : "Please enter the verification code",
      );
      return;
    }

    setLoading(true);
    try {
      const signInAttempt = await signIn.attemptSecondFactor({
        strategy: secondFactor.strategy,
        code: mfaCode.trim(),
      });

      if (
        signInAttempt.status === "complete" &&
        signInAttempt.createdSessionId
      ) {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/(app)");
        return;
      }

      Alert.alert("Error", "Verification failed. Please try again.");
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.errors?.[0]?.message ||
          err.message ||
          "Verification failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendSecondFactor = async () => {
    if (!isLoaded || !signIn || !secondFactor || !canResendSecondFactor) return;

    setLoading(true);
    try {
      await prepareSecondFactor(secondFactor);
      setMfaCode("");
      Alert.alert("Code sent", "A new verification code has been sent.");
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.errors?.[0]?.message ||
          err.message ||
          "Failed to resend the verification code.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1">
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={["#8e0c1a", "#6b0714", "#3a050c"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="pt-16 pb-32 px-6"
        style={{ overflow: "hidden" }}
      >
        <View
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 200,
            height: 200,
            borderRadius: 100,
            borderWidth: 1.5,
            borderColor: "rgba(255,215,0,0.25)",
            backgroundColor: "transparent",
          }}
        />
        <View
          style={{
            position: "absolute",
            top: -20,
            right: -20,
            width: 120,
            height: 120,
            borderRadius: 60,
            borderWidth: 1,
            borderColor: "rgba(255,215,0,0.18)",
            backgroundColor: "transparent",
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -50,
            left: -50,
            width: 200,
            height: 200,
            borderRadius: 100,
            borderWidth: 1.5,
            borderColor: "rgba(255,215,0,0.20)",
            backgroundColor: "transparent",
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: 10,
            left: 60,
            width: 80,
            height: 80,
            borderRadius: 40,
            borderWidth: 1,
            borderColor: "rgba(255,215,0,0.15)",
            backgroundColor: "transparent",
          }}
        />

        <View className="items-center pt-12">
          <Text className="text-4xl font-bold text-white mb-2">Teleba</Text>
          <Text className="text-white/90 text-lg">Reset your password</Text>
        </View>
      </LinearGradient>

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
            <TouchableOpacity
              onPress={() => router.replace("/(auth)/sign-in")}
              className="flex-row items-center mb-6"
            >
              <Ionicons name="chevron-back" size={24} color="#DC2626" />
              <Text className="text-red-600 font-semibold ml-1">
                Back to sign in
              </Text>
            </TouchableOpacity>

            <View className="mb-6">
              <Text className="text-2xl font-bold text-gray-800 mb-2">
                {step === "request"
                  ? "Forgot your password?"
                  : step === "reset"
                    ? "Create a new password"
                    : "One more verification step"}
              </Text>
              <Text className="text-gray-600">
                {step === "request"
                  ? usePhone
                    ? "Enter your phone number and we will send you a verification code."
                    : "Enter your email address and we will send you a verification code."
                  : step === "reset"
                    ? `Enter the code from your ${usePhone ? "phone" : "email"} and choose a new password.`
                    : secondFactor?.strategy === "backup_code"
                      ? "Enter one of your backup codes to finish signing in after resetting your password."
                      : secondFactor?.strategy === "totp"
                        ? "Enter the code from your authenticator app to finish signing in after resetting your password."
                        : "Your password was updated. Complete the extra verification step to finish signing in."}
              </Text>
            </View>

            {step === "request" ? (
              <>
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-sm font-semibold text-gray-800">
                    {usePhone ? "Phone number" : "Email address"}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setUsePhone((value) => !value)}
                  >
                    <Text className="text-sm font-semibold text-red-500">
                      {usePhone ? "Use email" : "Use phone"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-1 mb-6 flex-row items-center">
                  <Ionicons
                    name={usePhone ? "call-outline" : "mail-outline"}
                    size={20}
                    color="#9CA3AF"
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    value={identifier}
                    onChangeText={setIdentifier}
                    placeholder={
                      usePhone
                        ? "Enter your phone number"
                        : "Enter your email address"
                    }
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    keyboardType={usePhone ? "phone-pad" : "email-address"}
                    className="flex-1 py-3 text-base text-gray-800"
                    returnKeyType="done"
                    onSubmitEditing={handleSendCode}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleSendCode}
                  disabled={loading}
                  className={`rounded-2xl py-4 mb-4 flex-row items-center justify-center ${
                    loading ? "opacity-50" : ""
                  }`}
                  style={{ backgroundColor: "#8e0c1a" }}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Text className="text-white font-bold text-lg mr-2">
                        Send reset code
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="white"
                      />
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : step === "reset" ? (
              <>
                <View className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-6">
                  <Text className="text-amber-900 text-sm text-center">
                    {identifier}
                  </Text>
                </View>

                <Text className="text-sm font-semibold text-gray-800 mb-3">
                  Verification code
                </Text>
                <View className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-1 mb-4 flex-row items-center">
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color="#9CA3AF"
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    value={code}
                    onChangeText={(value) =>
                      setCode(value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    maxLength={6}
                    className="flex-1 py-3 text-base text-gray-800"
                  />
                </View>

                <Text className="text-sm font-semibold text-gray-800 mb-3">
                  New password
                </Text>
                <View className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-1 mb-4 flex-row items-center">
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#9CA3AF"
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Create a new password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showPassword}
                    className="flex-1 py-3 text-base text-gray-800"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((value) => !value)}
                  >
                    <Text className="text-red-500 font-medium">
                      {showPassword ? "Hide" : "Show"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text className="text-sm font-semibold text-gray-800 mb-3">
                  Confirm new password
                </Text>
                <View className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-1 mb-6 flex-row items-center">
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#9CA3AF"
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm your new password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showConfirmPassword}
                    className="flex-1 py-3 text-base text-gray-800"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword((value) => !value)}
                  >
                    <Text className="text-red-500 font-medium">
                      {showConfirmPassword ? "Hide" : "Show"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleResetPassword}
                  disabled={loading}
                  className={`rounded-2xl py-4 mb-4 flex-row items-center justify-center ${
                    loading ? "opacity-50" : ""
                  }`}
                  style={{ backgroundColor: "#8e0c1a" }}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Text className="text-white font-bold text-lg mr-2">
                        Reset password
                      </Text>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="white"
                      />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  className="items-center mb-4"
                  onPress={handleResendCode}
                >
                  <Text className="text-red-500 font-medium text-sm">
                    Resend code
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="items-center"
                  onPress={() => {
                    resetFlowState();
                  }}
                >
                  <Text className="text-gray-500 font-medium text-sm">
                    Use another {usePhone ? "phone number" : "email address"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {secondFactor?.safeIdentifier ? (
                  <View className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-6">
                    <Text className="text-amber-900 text-sm text-center">
                      {secondFactor.safeIdentifier}
                    </Text>
                  </View>
                ) : null}

                <Text className="text-sm font-semibold text-gray-800 mb-3">
                  {secondFactor?.strategy === "backup_code"
                    ? "Backup code"
                    : secondFactor?.strategy === "totp"
                      ? "Authenticator code"
                      : "Verification code"}
                </Text>
                <View className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-1 mb-6 flex-row items-center">
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color="#9CA3AF"
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    value={mfaCode}
                    onChangeText={(value) => {
                      if (secondFactor?.strategy === "backup_code") {
                        setMfaCode(value);
                        return;
                      }

                      setMfaCode(value.replace(/\D/g, "").slice(0, 6));
                    }}
                    placeholder={
                      secondFactor?.strategy === "backup_code"
                        ? "Enter a backup code"
                        : "Enter verification code"
                    }
                    placeholderTextColor="#9CA3AF"
                    keyboardType={
                      secondFactor?.strategy === "backup_code"
                        ? "default"
                        : "number-pad"
                    }
                    autoCapitalize="none"
                    className="flex-1 py-3 text-base text-gray-800"
                  />
                </View>

                <TouchableOpacity
                  onPress={handleVerifySecondFactor}
                  disabled={loading}
                  className={`rounded-2xl py-4 mb-4 flex-row items-center justify-center ${
                    loading ? "opacity-50" : ""
                  }`}
                  style={{ backgroundColor: "#8e0c1a" }}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Text className="text-white font-bold text-lg mr-2">
                        Verify and sign in
                      </Text>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="white"
                      />
                    </>
                  )}
                </TouchableOpacity>

                {canResendSecondFactor ? (
                  <TouchableOpacity
                    className="items-center mb-4"
                    onPress={handleResendSecondFactor}
                  >
                    <Text className="text-red-500 font-medium text-sm">
                      Resend code
                    </Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  className="items-center"
                  onPress={resetFlowState}
                >
                  <Text className="text-gray-500 font-medium text-sm">
                    Start over
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <View className="flex-1" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
