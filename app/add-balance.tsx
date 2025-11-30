import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Camera,
  Save,
  Plus,
  X,
  Image as ImageIcon,
} from "lucide-react-native";
import { useDispatch } from "react-redux";
import * as ImagePicker from "expo-image-picker";
import { createBalance } from "../store/slices/balancesSlice";
import { fetchDashboard } from "../store/slices/dashboardSlice";
import type { AppDispatch } from "../store";
import type { ShiftEnum, BalanceCreate } from "../types";

interface BalanceEntry {
  id: string;
  account: string;
  shift: ShiftEnum;
  amount: string;
  imageUrl: string;
}

const createEmptyEntry = (): BalanceEntry => ({
  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
  account: "",
  shift: "AM",
  amount: "",
  imageUrl: "",
});

const CARD_WIDTH = Dimensions.get("window").width * 0.75;

export default function AddBalancePage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const [entries, setEntries] = useState<BalanceEntry[]>([createEmptyEntry()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>(
    {}
  );

  // Request camera permissions
  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Camera permission is needed to take photos. Please enable it in your device settings.",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  };

  // Request media library permissions
  const requestMediaLibraryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Photo library permission is needed to select images. Please enable it in your device settings.",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  };

  // Take photo with camera
  const takePhoto = async (entryId: string) => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        updateEntry(entryId, "imageUrl", result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  // Pick image from library
  const pickImage = async (entryId: string) => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        updateEntry(entryId, "imageUrl", result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  // Show image picker options
  const showImageOptions = (entryId: string) => {
    Alert.alert("Add Image", "Choose an option", [
      { text: "Take Photo", onPress: () => takePhoto(entryId) },
      { text: "Choose from Library", onPress: () => pickImage(entryId) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // Remove image from entry
  const removeImage = (entryId: string) => {
    updateEntry(entryId, "imageUrl", "");
  };

  const updateEntry = (
    id: string,
    field: keyof BalanceEntry,
    value: string
  ) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
    // Clear error for this field
    if (errors[id]?.[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        if (newErrors[id]) {
          delete newErrors[id][field];
        }
        return newErrors;
      });
    }
  };

  const addEntry = () => {
    setEntries((prev) => [...prev, createEmptyEntry()]);
  };

  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }
  };

  const validateEntries = (): boolean => {
    const newErrors: Record<string, Record<string, string>> = {};
    let isValid = true;

    entries.forEach((entry) => {
      const entryErrors: Record<string, string> = {};

      if (!entry.account.trim()) {
        entryErrors.account = "Required";
        isValid = false;
      }

      if (!entry.amount.trim()) {
        entryErrors.amount = "Required";
        isValid = false;
      } else if (
        isNaN(parseFloat(entry.amount)) ||
        parseFloat(entry.amount) < 0
      ) {
        entryErrors.amount = "Invalid amount";
        isValid = false;
      }

      if (Object.keys(entryErrors).length > 0) {
        newErrors[entry.id] = entryErrors;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateEntries()) return;

    setIsSubmitting(true);

    try {
      const promises = entries.map((entry) => {
        const balanceData: BalanceCreate = {
          account: entry.account.trim(),
          shift: entry.shift,
          amount: parseFloat(entry.amount),
          image_url: entry.imageUrl || "",
          media_id: "",
          message_id: "",
          source: "app",
          sha256: "",
          date: new Date().toISOString().split("T")[0],
        };
        return dispatch(createBalance(balanceData)).unwrap();
      });

      await Promise.all(promises);

      // Refresh dashboard after adding balances
      dispatch(fetchDashboard());

      Alert.alert(
        "Success",
        `${entries.length} balance${
          entries.length > 1 ? "s" : ""
        } added successfully!`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to add balances"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50"
    >
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-6 pb-4">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2 bg-white rounded-full shadow-sm mr-4"
            >
              <ArrowLeft color="#C62828" size={24} />
            </TouchableOpacity>
            <View>
              <Text className="text-2xl font-bold text-gray-800">
                Add Balances
              </Text>
              <Text className="text-gray-500 text-sm">
                {entries.length} balance{entries.length > 1 ? "s" : ""}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={addEntry}
            className="bg-brand-red p-3 rounded-full shadow-md"
          >
            <Plus color="white" size={24} />
          </TouchableOpacity>
        </View>

        {/* Horizontal Scrolling Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          className="flex-1"
          snapToInterval={CARD_WIDTH + 16}
          decelerationRate="fast"
        >
          {entries.map((entry, index) => (
            <View
              key={entry.id}
              style={{ width: CARD_WIDTH }}
              className="bg-white rounded-3xl shadow-sm p-5 border border-gray-100 mr-4"
            >
              {/* Card Header */}
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-bold text-brand-red">
                  Balance {index + 1}
                </Text>
                {entries.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeEntry(entry.id)}
                    className="p-1"
                  >
                    <X color="#EF4444" size={20} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Account Name */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-1 text-sm">
                  Account *
                </Text>
                <TextInput
                  value={entry.account}
                  onChangeText={(value) =>
                    updateEntry(entry.id, "account", value)
                  }
                  placeholder="Account name"
                  className={`bg-gray-50 rounded-xl px-3 py-2.5 text-gray-800 ${
                    errors[entry.id]?.account
                      ? "border-2 border-red-500"
                      : "border border-gray-200"
                  }`}
                />
                {errors[entry.id]?.account && (
                  <Text className="text-red-500 text-xs mt-1">
                    {errors[entry.id].account}
                  </Text>
                )}
              </View>

              {/* Shift Selection */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-1 text-sm">
                  Shift *
                </Text>
                <View className="flex-row space-x-2">
                  <TouchableOpacity
                    onPress={() => updateEntry(entry.id, "shift", "AM")}
                    className={`flex-1 py-2.5 rounded-xl ${
                      entry.shift === "AM"
                        ? "bg-brand-red"
                        : "bg-gray-100 border border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-center font-bold ${
                        entry.shift === "AM" ? "text-white" : "text-gray-600"
                      }`}
                    >
                      AM
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => updateEntry(entry.id, "shift", "PM")}
                    className={`flex-1 py-2.5 rounded-xl ${
                      entry.shift === "PM"
                        ? "bg-brand-red"
                        : "bg-gray-100 border border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-center font-bold ${
                        entry.shift === "PM" ? "text-white" : "text-gray-600"
                      }`}
                    >
                      PM
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Amount */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-1 text-sm">
                  Amount *
                </Text>
                <TextInput
                  value={entry.amount}
                  onChangeText={(value) =>
                    updateEntry(entry.id, "amount", value)
                  }
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  className={`bg-gray-50 rounded-xl px-3 py-2.5 text-gray-800 text-lg ${
                    errors[entry.id]?.amount
                      ? "border-2 border-red-500"
                      : "border border-gray-200"
                  }`}
                />
                {errors[entry.id]?.amount && (
                  <Text className="text-red-500 text-xs mt-1">
                    {errors[entry.id].amount}
                  </Text>
                )}
              </View>

              {/* Image Section */}
              <View>
                <Text className="text-gray-700 font-semibold mb-1 text-sm">
                  Image (Optional)
                </Text>
                {entry.imageUrl ? (
                  <View className="relative">
                    <Image
                      source={{ uri: entry.imageUrl }}
                      className="w-full h-32 rounded-xl"
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={() => removeImage(entry.id)}
                      className="absolute top-2 right-2 bg-red-500 p-1.5 rounded-full"
                    >
                      <X color="white" size={14} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => showImageOptions(entry.id)}
                      className="absolute bottom-2 right-2 bg-white/90 px-3 py-1.5 rounded-lg flex-row items-center"
                    >
                      <Camera color="#6B7280" size={14} />
                      <Text className="text-gray-600 text-xs ml-1">Change</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="flex-row space-x-2">
                    <TouchableOpacity
                      onPress={() => takePhoto(entry.id)}
                      className="flex-1 bg-gray-50 rounded-xl py-4 border border-gray-200 items-center"
                    >
                      <Camera color="#6B7280" size={24} />
                      <Text className="text-gray-500 text-xs mt-1">Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => pickImage(entry.id)}
                      className="flex-1 bg-gray-50 rounded-xl py-4 border border-gray-200 items-center"
                    >
                      <ImageIcon color="#6B7280" size={24} />
                      <Text className="text-gray-500 text-xs mt-1">
                        Gallery
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))}

          {/* Add More Card */}
          <TouchableOpacity
            onPress={addEntry}
            style={{ width: CARD_WIDTH * 0.5 }}
            className="bg-gray-100 rounded-3xl border-2 border-dashed border-gray-300 items-center justify-center mr-4"
          >
            <Plus color="#9CA3AF" size={40} />
            <Text className="text-gray-400 font-semibold mt-2">Add More</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Submit Button - Fixed at bottom */}
        <View className="px-5 pb-6 pt-2 bg-gray-50">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={`py-4 rounded-xl flex-row items-center justify-center space-x-2 ${
              isSubmitting ? "bg-gray-400" : "bg-brand-red"
            }`}
          >
            <Save color="white" size={20} />
            <Text className="text-white font-bold text-base ml-2">
              {isSubmitting
                ? "Saving..."
                : `Save ${entries.length} Balance${
                    entries.length > 1 ? "s" : ""
                  }`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
