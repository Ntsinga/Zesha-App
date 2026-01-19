import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Lock,
} from "lucide-react-native";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { useReconcileReviewScreen } from "../../hooks/screens/useReconcileReviewScreen";

export default function ReconcileReviewScreen() {
  const params = useLocalSearchParams<{ date: string; shift: "AM" | "PM" }>();

  const {
    notes,
    setNotes,
    reconciliation,
    isLoading,
    isCalculating,
    isFinalizing,
    error,
    formatCurrency,
    handleRecalculate,
    handleFinalize,
    handleBack,
  } = useReconcileReviewScreen({
    date: params.date || "",
    shift: params.shift || "AM",
  });

  const handleRecalculatePress = async () => {
    const result = await handleRecalculate();
    if (result?.success) {
      Alert.alert("Success", "Reconciliation recalculated successfully");
    } else {
      Alert.alert("Error", result?.error || "Failed to recalculate");
    }
  };

  const handleFinalizePress = () => {
    if (reconciliation?.is_finalized) {
      Alert.alert("Already Finalized", "This reconciliation is already locked");
      return;
    }

    Alert.alert(
      "Finalize Reconciliation",
      "Are you sure? This will lock the reconciliation and send notifications to supervisors.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Finalize",
          style: "destructive",
          onPress: async () => {
            const result = await handleFinalize();
            if (result?.success) {
              Alert.alert(
                "Success",
                "Reconciliation finalized and notifications sent!",
                [{ text: "OK", onPress: handleBack }]
              );
            } else {
              Alert.alert("Error", result?.error || "Failed to finalize");
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading reconciliation details..." />;
  }

  if (error) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center p-6">
        <XCircle color="#EF4444" size={48} />
        <Text className="text-gray-800 text-lg font-bold mt-4">
          Error Loading Reconciliation
        </Text>
        <Text className="text-gray-600 text-center mt-2">{error}</Text>
        <TouchableOpacity
          onPress={handleBack}
          className="mt-6 bg-brand-red px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!reconciliation) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center p-6">
        <Text className="text-gray-800 text-lg font-bold">
          No reconciliation found
        </Text>
        <TouchableOpacity
          onPress={handleBack}
          className="mt-6 bg-brand-red px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Determine status icon and color
  const getStatusDisplay = () => {
    const status = reconciliation.status || "CALCULATED";
    switch (status) {
      case "PASSED":
        return {
          icon: <CheckCircle color="#22C55E" size={32} />,
          color: "bg-green-50",
          textColor: "text-green-700",
          borderColor: "border-green-500",
          label: "Passed",
        };
      case "FLAGGED":
        return {
          icon: <AlertTriangle color="#F59E0B" size={32} />,
          color: "bg-yellow-50",
          textColor: "text-yellow-700",
          borderColor: "border-yellow-500",
          label: "Flagged",
        };
      case "FAILED":
        return {
          icon: <XCircle color="#EF4444" size={32} />,
          color: "bg-red-50",
          textColor: "text-red-700",
          borderColor: "border-red-500",
          label: "Failed",
        };
      default:
        return {
          icon: <CheckCircle color="#6B7280" size={32} />,
          color: "bg-gray-50",
          textColor: "text-gray-700",
          borderColor: "border-gray-500",
          label: "Calculated",
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-5 pt-6 pb-4 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={handleBack}
              className="p-2 bg-gray-100 rounded-full mr-4"
            >
              <ArrowLeft color="#C62828" size={24} />
            </TouchableOpacity>
            <View>
              <Text className="text-2xl font-bold text-gray-800">
                Reconciliation Review
              </Text>
              <Text className="text-gray-500 text-sm mt-1">
                {params.date} - {params.shift} Shift
              </Text>
            </View>
          </View>
          {reconciliation.is_finalized && (
            <View className="bg-gray-100 px-3 py-1.5 rounded-full flex-row items-center">
              <Lock color="#6B7280" size={14} />
              <Text className="text-gray-600 text-xs font-bold ml-1">
                Finalized
              </Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        {/* Status Card */}
        <View
          className={`${statusDisplay.color} border-2 ${statusDisplay.borderColor} rounded-2xl p-6 mb-6`}
        >
          <View className="items-center">
            {statusDisplay.icon}
            <Text
              className={`${statusDisplay.textColor} text-2xl font-bold mt-3`}
            >
              {statusDisplay.label}
            </Text>
            <Text className="text-gray-600 text-sm mt-1">
              Variance: {formatCurrency(reconciliation.variance || 0)}
            </Text>
          </View>
        </View>

        {/* Summary Card */}
        <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <Text className="text-lg font-bold text-gray-800 mb-4">Summary</Text>

          <View className="space-y-3">
            <View className="flex-row justify-between py-2 border-b border-gray-100">
              <Text className="text-gray-600">Total Float</Text>
              <Text className="text-gray-800 font-semibold">
                {formatCurrency(reconciliation.total_float || 0)}
              </Text>
            </View>
            <View className="flex-row justify-between py-2 border-b border-gray-100">
              <Text className="text-gray-600">Total Cash</Text>
              <Text className="text-gray-800 font-semibold">
                {formatCurrency(reconciliation.total_cash || 0)}
              </Text>
            </View>
            <View className="flex-row justify-between py-2 border-b border-gray-100">
              <Text className="text-gray-600">Commissions</Text>
              <Text className="text-gray-800 font-semibold">
                {formatCurrency(reconciliation.total_commissions || 0)}
              </Text>
            </View>
            <View className="flex-row justify-between py-3 border-t-2 border-gray-300 mt-2">
              <Text className="text-gray-800 font-bold">Actual Total</Text>
              <Text className="text-gray-800 font-bold text-lg">
                {formatCurrency(reconciliation.actual_closing || 0)}
              </Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text className="text-gray-600">Expected Total</Text>
              <Text className="text-gray-600 font-medium">
                {formatCurrency(reconciliation.expected_closing || 0)}
              </Text>
            </View>
            <View className="flex-row justify-between py-3 bg-gray-50 -mx-6 px-6 rounded-lg">
              <Text className="text-gray-800 font-bold">Variance</Text>
              <Text
                className={`font-bold text-lg ${
                  Math.abs(reconciliation.variance || 0) < 1
                    ? "text-green-600"
                    : Math.abs(reconciliation.variance || 0) <= 1000
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(reconciliation.variance || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes Section */}
        {!reconciliation.is_finalized && (
          <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <Text className="text-lg font-bold text-gray-800 mb-3">
              Notes (Optional)
            </Text>
            <TextInput
              className="bg-gray-50 rounded-xl p-4 text-gray-800 min-h-[100px] border border-gray-200"
              placeholder="Add any notes about this reconciliation..."
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
            />
          </View>
        )}

        {reconciliation.notes && (
          <View className="bg-blue-50 rounded-2xl p-6 shadow-sm mb-6">
            <Text className="text-lg font-bold text-blue-900 mb-2">
              Finalization Notes
            </Text>
            <Text className="text-blue-800">{reconciliation.notes}</Text>
          </View>
        )}

        {/* Action Buttons */}
        {!reconciliation.is_finalized && (
          <View className="space-y-3 mb-6">
            <TouchableOpacity
              onPress={handleRecalculatePress}
              disabled={isCalculating}
              className={`bg-white border-2 border-brand-red rounded-xl p-4 flex-row items-center justify-center ${
                isCalculating ? "opacity-50" : ""
              }`}
            >
              <RefreshCw color="#C62828" size={20} />
              <Text className="text-brand-red font-bold text-lg ml-2">
                {isCalculating ? "Recalculating..." : "Recalculate"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleFinalizePress}
              disabled={isFinalizing}
              className={`bg-brand-red rounded-xl p-4 flex-row items-center justify-center shadow-lg ${
                isFinalizing ? "opacity-50" : ""
              }`}
            >
              <Lock color="white" size={20} />
              <Text className="text-white font-bold text-lg ml-2">
                {isFinalizing ? "Finalizing..." : "Finalize & Lock"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
