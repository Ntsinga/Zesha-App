import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
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

  // Account picker sheet state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTitle, setPickerTitle] = useState("");
  const [pickerExclude, setPickerExclude] = useState<number | null>(null);
  const [pickerOnSelect, setPickerOnSelect] = useState<(id: number) => void>(
    () => () => {},
  );

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
    setPickerTitle(title);
    setPickerExclude(exclude);
    setPickerOnSelect(() => (id: number) => {
      onPick(id);
      setPickerVisible(false);
    });
    setPickerVisible(true);
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
        typeof err === "string"
          ? err
          : err instanceof Error
            ? err.message
            : "Failed to save transaction.",
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

      {/* Account Picker Bottom Sheet */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        />
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#fff",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: "60%",
            paddingBottom: 32,
          }}
        >
          {/* Sheet header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#f3f4f6",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>
              {pickerTitle}
            </Text>
            <TouchableOpacity
              onPress={() => setPickerVisible(false)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "#f3f4f6",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Scrollable account list */}
          <FlatList
            data={activeAccounts.filter((a) => a.id !== pickerExclude)}
            keyExtractor={(item) => String(item.id)}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
            showsVerticalScrollIndicator={true}
            ListEmptyComponent={
              <Text
                style={{
                  textAlign: "center",
                  color: "#9ca3af",
                  paddingVertical: 24,
                }}
              >
                No active accounts available
              </Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => pickerOnSelect(item.id)}
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 4,
                  borderBottomWidth: 1,
                  borderBottomColor: "#f3f4f6",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    color: "#111827",
                    fontWeight: "500",
                    flex: 1,
                  }}
                >
                  {item.name}
                </Text>
                <Text style={{ fontSize: 12, color: "#6b7280", marginLeft: 8 }}>
                  {item.accountType}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
};
