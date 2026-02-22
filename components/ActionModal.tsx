import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ChevronDown,
} from "lucide-react-native";
import { useDispatch, useSelector } from "react-redux";
import { useCurrencyFormatter } from "../hooks/useCurrency";
import {
  createTransaction,
  createFloatPurchase,
} from "../store/slices/transactionsSlice";
import { fetchAccounts } from "../store/slices/accountsSlice";
import type { AppDispatch, RootState } from "../store";
import type { ShiftEnum } from "../types";

type TxMode = "DEPOSIT" | "WITHDRAW" | "FLOAT";

interface ActionModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const ActionModal: React.FC<ActionModalProps> = ({
  visible,
  onClose,
  title,
  children,
}) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end bg-black/50"
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          className="bg-white w-full rounded-t-3xl overflow-hidden"
          style={{ maxHeight: "90%" }}
        >
          <View className="flex-row justify-between items-center px-6 pt-6 pb-4 border-b border-gray-100">
            <Text className="text-xl font-bold text-brand-red">{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
            >
              <X size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

interface AddTransactionFormProps {
  onSuccess?: () => void;
  onClose?: () => void;
}

export const AddTransactionForm: React.FC<AddTransactionFormProps> = ({
  onSuccess,
  onClose,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { formatCurrency } = useCurrencyFormatter();

  const { items: accounts } = useSelector((state: RootState) => state.accounts);
  const companyId = useSelector(
    (state: RootState) =>
      state.auth.viewingAgencyId || state.auth.user?.companyId,
  );
  const isCreating = useSelector(
    (state: RootState) => state.transactions.isCreating,
  );

  const [mode, setMode] = useState<TxMode>("DEPOSIT");
  const [accountId, setAccountId] = useState<number | null>(null);
  const [sourceAccountId, setSourceAccountId] = useState<number | null>(null);
  const [destAccountId, setDestAccountId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [shift, setShift] = useState<ShiftEnum>(() => {
    return new Date().getHours() < 12 ? "AM" : "PM";
  });

  const activeAccounts = accounts.filter((a) => a.isActive);

  // Fetch accounts if not loaded
  useEffect(() => {
    if (accounts.length === 0 && companyId) {
      dispatch(fetchAccounts({ companyId, isActive: true }));
    }
  }, [companyId]);

  const reset = () => {
    setMode("DEPOSIT");
    setAccountId(null);
    setSourceAccountId(null);
    setDestAccountId(null);
    setAmount("");
    setReference("");
    setNotes("");
  };

  const pickAccount = (
    title: string,
    exclude: number | null,
    onPick: (id: number) => void,
  ) => {
    const options = activeAccounts
      .filter((a) => a.id !== exclude)
      .map((a) => ({
        text: `${a.name} (${a.accountType})`,
        onPress: () => onPick(a.id),
      }));
    if (options.length === 0) {
      Alert.alert("No Accounts", "No active accounts available.");
      return;
    }
    Alert.alert(title, undefined, [
      ...options,
      { text: "Cancel", style: "cancel" as const },
    ]);
  };

  const getAccountName = (id: number | null) =>
    id ? (activeAccounts.find((a) => a.id === id)?.name ?? "Unknown") : null;

  const handleSubmit = useCallback(async () => {
    if (!companyId) {
      Alert.alert("Error", "Company not found. Please log in again.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Validation", "Please enter a valid amount.");
      return;
    }

    try {
      if (mode === "FLOAT") {
        if (!sourceAccountId || !destAccountId) {
          Alert.alert(
            "Validation",
            "Please select both source and destination accounts.",
          );
          return;
        }
        await dispatch(
          createFloatPurchase({
            companyId,
            sourceAccountId,
            destinationAccountId: destAccountId,
            amount: parseFloat(amount),
            transactionTime: new Date().toISOString(),
            shift,
            reference: reference || undefined,
            notes: notes || undefined,
          }),
        ).unwrap();
      } else {
        if (!accountId) {
          Alert.alert("Validation", "Please select an account.");
          return;
        }
        await dispatch(
          createTransaction({
            companyId,
            accountId,
            transactionType: mode,
            amount: parseFloat(amount),
            transactionTime: new Date().toISOString(),
            shift,
            reference: reference || undefined,
            notes: notes || undefined,
          }),
        ).unwrap();
      }

      reset();
      onSuccess?.();
      onClose?.();
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to save transaction.",
      );
    }
  }, [
    companyId,
    mode,
    accountId,
    sourceAccountId,
    destAccountId,
    amount,
    shift,
    reference,
    notes,
  ]);

  const modeColors = {
    DEPOSIT: {
      bg: "#dcfce7",
      border: "#16a34a",
      text: "#16a34a",
      solid: "#16a34a",
    },
    WITHDRAW: {
      bg: "#fee2e2",
      border: "#dc2626",
      text: "#dc2626",
      solid: "#dc2626",
    },
    FLOAT: {
      bg: "#dbeafe",
      border: "#2563eb",
      text: "#2563eb",
      solid: "#2563eb",
    },
  };
  const c = modeColors[mode];

  return (
    <View>
      {/* Type selector */}
      <View className="flex-row mb-5" style={{ gap: 8 }}>
        {(["DEPOSIT", "WITHDRAW", "FLOAT"] as TxMode[]).map((m) => {
          const mc = modeColors[m];
          const active = mode === m;
          return (
            <TouchableOpacity
              key={m}
              onPress={() => setMode(m)}
              className="flex-1 rounded-xl py-3 items-center flex-row justify-center"
              style={{
                gap: 5,
                backgroundColor: active ? mc.bg : "#f9fafb",
                borderWidth: 2,
                borderColor: active ? mc.border : "#e5e7eb",
              }}
            >
              {m === "DEPOSIT" && (
                <ArrowDownLeft size={14} color={active ? mc.text : "#9ca3af"} />
              )}
              {m === "WITHDRAW" && (
                <ArrowUpRight size={14} color={active ? mc.text : "#9ca3af"} />
              )}
              {m === "FLOAT" && (
                <ArrowLeftRight
                  size={14}
                  color={active ? mc.text : "#9ca3af"}
                />
              )}
              <Text
                style={{
                  color: active ? mc.text : "#9ca3af",
                  fontWeight: "600",
                  fontSize: 12,
                }}
              >
                {m === "FLOAT"
                  ? "Float"
                  : m.charAt(0) + m.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Account selector(s) */}
      {mode === "FLOAT" ? (
        <>
          <Text className="text-sm font-medium text-gray-600 mb-1">
            Source Account
          </Text>
          <TouchableOpacity
            onPress={() =>
              pickAccount("Select Source", destAccountId, setSourceAccountId)
            }
            className="border border-gray-200 rounded-xl px-4 py-3 mb-4 flex-row justify-between items-center"
          >
            <Text
              className={sourceAccountId ? "text-gray-800" : "text-gray-400"}
            >
              {getAccountName(sourceAccountId) ?? "Select source account..."}
            </Text>
            <ChevronDown size={16} color="#9ca3af" />
          </TouchableOpacity>

          <Text className="text-sm font-medium text-gray-600 mb-1">
            Destination Account
          </Text>
          <TouchableOpacity
            onPress={() =>
              pickAccount(
                "Select Destination",
                sourceAccountId,
                setDestAccountId,
              )
            }
            className="border border-gray-200 rounded-xl px-4 py-3 mb-4 flex-row justify-between items-center"
          >
            <Text className={destAccountId ? "text-gray-800" : "text-gray-400"}>
              {getAccountName(destAccountId) ?? "Select destination account..."}
            </Text>
            <ChevronDown size={16} color="#9ca3af" />
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text className="text-sm font-medium text-gray-600 mb-1">
            Account
          </Text>
          <TouchableOpacity
            onPress={() => pickAccount("Select Account", null, setAccountId)}
            className="border border-gray-200 rounded-xl px-4 py-3 mb-4 flex-row justify-between items-center"
          >
            <Text className={accountId ? "text-gray-800" : "text-gray-400"}>
              {getAccountName(accountId) ?? "Select account..."}
            </Text>
            <ChevronDown size={16} color="#9ca3af" />
          </TouchableOpacity>
        </>
      )}

      {/* Amount */}
      <Text className="text-sm font-medium text-gray-600 mb-1">Amount *</Text>
      <TextInput
        className="border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800 text-base"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
        placeholderTextColor="#9ca3af"
      />

      {/* Shift */}
      <Text className="text-sm font-medium text-gray-600 mb-1">Shift</Text>
      <View className="flex-row mb-4" style={{ gap: 8 }}>
        {(["AM", "PM"] as ShiftEnum[]).map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setShift(s)}
            className="flex-1 rounded-xl py-3 items-center"
            style={{
              backgroundColor: shift === s ? "#dbeafe" : "#f9fafb",
              borderWidth: 2,
              borderColor: shift === s ? "#2563eb" : "#e5e7eb",
            }}
          >
            <Text
              style={{
                color: shift === s ? "#2563eb" : "#9ca3af",
                fontWeight: "600",
              }}
            >
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Reference */}
      <Text className="text-sm font-medium text-gray-600 mb-1">
        Reference <Text className="text-gray-400 font-normal">(optional)</Text>
      </Text>
      <TextInput
        className="border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800"
        value={reference}
        onChangeText={setReference}
        placeholder="Receipt no., voucher..."
        placeholderTextColor="#9ca3af"
      />

      {/* Notes */}
      <Text className="text-sm font-medium text-gray-600 mb-1">
        Notes <Text className="text-gray-400 font-normal">(optional)</Text>
      </Text>
      <TextInput
        className="border border-gray-200 rounded-xl px-4 py-3 mb-6 text-gray-800"
        value={notes}
        onChangeText={setNotes}
        placeholder="Additional details..."
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={2}
        textAlignVertical="top"
      />

      {/* Submit */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isCreating}
        className="rounded-xl py-4 items-center"
        style={{ backgroundColor: isCreating ? "#d1d5db" : c.solid }}
      >
        {isCreating ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold text-base">
            {mode === "DEPOSIT"
              ? "Record Deposit"
              : mode === "WITHDRAW"
                ? "Record Withdrawal"
                : "Execute Float Transfer"}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};
