import React, { useState, useCallback } from "react";
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
import { X, Camera, ChevronDown, Check } from "lucide-react-native";
import { useDispatch } from "react-redux";
import { useCurrencyFormatter } from "../hooks/useCurrency";
import { TransactionCategory } from "../types";
import { createTransaction } from "../store/slices/transactionsSlice";
import { addBalanceEntry } from "../store/slices/balanceHistorySlice";
import type { AppDispatch } from "../store";

type TransactionType = "income" | "expense";

interface FormErrors {
  [key: string]: string | undefined;
}

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
        className="flex-1 justify-end sm:justify-center bg-black/50"
      >
        <View className="bg-white w-full sm:w-[90%] sm:self-center sm:rounded-2xl rounded-t-3xl overflow-hidden h-[85%] sm:h-auto">
          <View className="flex-row justify-between items-center p-6 border-b border-gray-100">
            <View className="w-6" />
            <Text className="text-xl font-bold text-brand-red">{title}</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 24 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// Available accounts for selection
const ACCOUNTS = ["AURTEZ", "Main Savings", "Emergency Fund", "Investment"];

// Available categories
const CATEGORIES: TransactionCategory[] = [
  "Food & Dining",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Bills & Utilities",
  "Healthcare",
  "Education",
  "Other",
];

interface AddBalanceFormProps {
  onSuccess?: () => void;
  onClose?: () => void;
}

export const AddBalanceForm: React.FC<AddBalanceFormProps> = ({
  onSuccess,
  onClose,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { formatCurrency } = useCurrencyFormatter();
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const handleAmountChange = (text: string) => {
    const cleanedText = text.replace(/[^0-9.]/g, "");
    const parts = cleanedText.split(".");
    if (parts.length > 2) return;
    if (parts[1]?.length > 2) return;
    setAmount(cleanedText);
    if (errors.amount) {
      setErrors((prev: FormErrors) => {
        const newErrors = { ...prev };
        delete newErrors.amount;
        return newErrors;
      });
    }
  };

  const handleSelectAccount = (selectedAccount: string) => {
    setAccount(selectedAccount);
    setShowAccountDropdown(false);
    if (errors.account) {
      setErrors((prev: FormErrors) => {
        const newErrors = { ...prev };
        delete newErrors.account;
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!account) newErrors.account = "Please select an account";
    if (!amount || parseFloat(amount) <= 0)
      newErrors.amount = "Please enter a valid amount";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const parsedAmount = parseFloat(amount);
      await dispatch(
        addBalanceEntry({
          date: new Date().toISOString().split("T")[0],
          totalCash: parsedAmount,
          amount: parsedAmount,
          capital: 100000, // Default capital
          status: "Balanced",
        })
      ).unwrap();

      Alert.alert(
        "Success",
        `${formatCurrency(parsedAmount)} added to ${account}`,
        [
          {
            text: "OK",
            onPress: () => {
              setAccount("");
              setAmount("");
              onSuccess?.();
              onClose?.();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to add balance. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [dispatch, account, amount, onSuccess, onClose]);

  return (
    <View className="space-y-5">
      <View className="space-y-2">
        <Text className="text-sm font-bold text-brand-red">Account</Text>
        <TouchableOpacity
          onPress={() => setShowAccountDropdown(!showAccountDropdown)}
          className={`bg-gray-50 border ${
            errors.account ? "border-red-500" : "border-brand-red/30"
          } rounded-lg p-4 flex-row justify-between items-center`}
        >
          <Text className={account ? "text-gray-700" : "text-gray-400"}>
            {account || "Select account"}
          </Text>
          <ChevronDown size={20} color="#9CA3AF" />
        </TouchableOpacity>
        {errors.account && (
          <Text className="text-red-500 text-xs">{errors.account}</Text>
        )}

        {showAccountDropdown && (
          <View className="bg-white border border-gray-200 rounded-lg shadow-lg">
            {ACCOUNTS.map((acc) => (
              <TouchableOpacity
                key={acc}
                onPress={() => handleSelectAccount(acc)}
                className="p-4 border-b border-gray-100 flex-row justify-between items-center"
              >
                <Text className="text-gray-700">{acc}</Text>
                {account === acc && <Check size={16} color="#C62828" />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View className="space-y-2">
        <Text className="text-sm font-bold text-brand-red">Amount</Text>
        <View className="relative">
          <TextInput
            placeholder="0.00"
            keyboardType="numeric"
            value={amount}
            onChangeText={handleAmountChange}
            className={`w-full p-4 bg-white border ${
              errors.amount ? "border-red-500" : "border-brand-red/30"
            } rounded-lg text-gray-700 font-medium`}
          />
        </View>
        {errors.amount && (
          <Text className="text-red-500 text-xs">{errors.amount}</Text>
        )}
      </View>

      <View className="space-y-2">
        <Text className="text-sm font-bold text-brand-red">Confirm Amount</Text>
        <View className="flex-row items-center p-4 bg-gray-50 border border-brand-red rounded-lg">
          <Text className="text-gray-500 mr-2">$</Text>
          <Text className="text-gray-800 font-medium">
            {amount ? parseFloat(amount || "0").toFixed(2) : "0.00"}
          </Text>
        </View>
      </View>

      <View className="space-y-2">
        <Text className="text-sm font-bold text-brand-red">
          Picture (Optional)
        </Text>
        <TouchableOpacity className="w-full p-3 border border-brand-red rounded-lg flex-row items-center space-x-3">
          <View className="bg-brand-red p-2 rounded">
            <Camera size={16} color="white" />
          </View>
          <Text className="text-gray-600">Upload or take photo</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isSubmitting}
        className={`w-full mt-4 ${
          isSubmitting ? "bg-gray-400" : "bg-brand-red"
        } py-4 rounded-lg shadow-md items-center flex-row justify-center`}
      >
        {isSubmitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold text-base">Save Entry</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

interface AddTransactionFormProps {
  onSuccess?: () => void;
  onClose?: () => void;
  selectedAccount?: string;
}

export const AddTransactionForm: React.FC<AddTransactionFormProps> = ({
  onSuccess,
  onClose,
  selectedAccount = "AURTEZ",
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { formatCurrency } = useCurrencyFormatter();
  const [transactionType, setTransactionType] =
    useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TransactionCategory | "">("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const handleAmountChange = (text: string) => {
    const cleanedText = text.replace(/[^0-9.]/g, "");
    const parts = cleanedText.split(".");
    if (parts.length > 2) return;
    if (parts[1]?.length > 2) return;
    setAmount(cleanedText);
    if (errors.amount) {
      setErrors((prev: FormErrors) => {
        const newErrors = { ...prev };
        delete newErrors.amount;
        return newErrors;
      });
    }
  };

  const handleSelectCategory = (selectedCategory: TransactionCategory) => {
    setCategory(selectedCategory);
    setShowCategoryDropdown(false);
    if (errors.category) {
      setErrors((prev: FormErrors) => {
        const newErrors = { ...prev };
        delete newErrors.category;
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!amount || parseFloat(amount) <= 0)
      newErrors.amount = "Please enter a valid amount";
    if (!description.trim())
      newErrors.description = "Please enter a description";
    if (!category) newErrors.category = "Please select a category";
    if (!date) newErrors.date = "Please enter a date";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const parsedAmount = parseFloat(amount);
      await dispatch(
        createTransaction({
          date,
          description,
          category: category as TransactionCategory,
          amount: parsedAmount,
          type: transactionType,
          hasReceipt: false,
          account: selectedAccount,
        })
      ).unwrap();

      const typeLabel = transactionType === "expense" ? "Expense" : "Income";
      Alert.alert(
        "Success",
        `${typeLabel} of ${formatCurrency(parsedAmount)} recorded`,
        [
          {
            text: "OK",
            onPress: () => {
              setAmount("");
              setDescription("");
              setCategory("");
              setDate(new Date().toISOString().split("T")[0]);
              onSuccess?.();
              onClose?.();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to save transaction. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    dispatch,
    amount,
    description,
    category,
    date,
    transactionType,
    selectedAccount,
    onSuccess,
    onClose,
  ]);

  return (
    <View className="space-y-4">
      <View className="bg-gray-50 p-3 rounded-lg mb-2">
        <Text className="text-sm text-gray-500">
          Adding to Account:{" "}
          <Text className="font-bold text-brand-red">{selectedAccount}</Text>
        </Text>
      </View>

      {/* Transaction Type Toggle */}
      <View className="flex-row space-x-4">
        <TouchableOpacity
          onPress={() => setTransactionType("expense")}
          className={`flex-1 ${
            transactionType === "expense"
              ? "bg-brand-red"
              : "border border-brand-red"
          } rounded-lg justify-center items-center h-12`}
        >
          <Text
            className={
              transactionType === "expense"
                ? "text-white font-bold"
                : "text-brand-red font-medium"
            }
          >
            Expense
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTransactionType("income")}
          className={`flex-1 ${
            transactionType === "income"
              ? "bg-green-600"
              : "border border-green-600"
          } rounded-lg justify-center items-center h-12`}
        >
          <Text
            className={
              transactionType === "income"
                ? "text-white font-bold"
                : "text-green-600 font-medium"
            }
          >
            Income
          </Text>
        </TouchableOpacity>
      </View>

      {/* Amount Input */}
      <View className="space-y-1">
        <Text className="text-xs font-bold text-gray-800">Amount</Text>
        <TextInput
          placeholder="0.00"
          keyboardType="numeric"
          value={amount}
          onChangeText={handleAmountChange}
          className={`w-full p-3 border ${
            errors.amount ? "border-red-500" : "border-gray-200"
          } rounded text-gray-700`}
        />
        {errors.amount && (
          <Text className="text-red-500 text-xs">{errors.amount}</Text>
        )}
      </View>

      {/* Description Input */}
      <View className="space-y-1">
        <Text className="text-xs font-bold text-gray-800">Description</Text>
        <TextInput
          placeholder="What was this for?"
          value={description}
          onChangeText={(text) => {
            setDescription(text);
            if (errors.description) {
              setErrors((prev) => ({ ...prev, description: undefined }));
            }
          }}
          className={`w-full p-3 border ${
            errors.description ? "border-red-500" : "border-gray-200"
          } rounded text-gray-700`}
        />
        {errors.description && (
          <Text className="text-red-500 text-xs">{errors.description}</Text>
        )}
      </View>

      {/* Date and Category Row */}
      <View className="flex-row space-x-4">
        <View className="flex-1 space-y-1">
          <Text className="text-xs font-bold text-gray-800">Date</Text>
          <TextInput
            placeholder="YYYY-MM-DD"
            value={date}
            onChangeText={(text) => {
              setDate(text);
              if (errors.date) {
                setErrors((prev) => ({ ...prev, date: undefined }));
              }
            }}
            className={`w-full p-3 border ${
              errors.date ? "border-red-500" : "border-gray-200"
            } rounded text-gray-700`}
          />
          {errors.date && (
            <Text className="text-red-500 text-xs">{errors.date}</Text>
          )}
        </View>
        <View className="flex-1 space-y-1">
          <Text className="text-xs font-bold text-gray-800">Category</Text>
          <TouchableOpacity
            onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className={`w-full p-3 border ${
              errors.category ? "border-red-500" : "border-gray-200"
            } rounded flex-row justify-between items-center`}
          >
            <Text className={category ? "text-gray-700" : "text-gray-400"}>
              {category || "Select"}
            </Text>
            <ChevronDown size={16} color="#9CA3AF" />
          </TouchableOpacity>
          {errors.category && (
            <Text className="text-red-500 text-xs">{errors.category}</Text>
          )}
        </View>
      </View>

      {/* Category Dropdown */}
      {showCategoryDropdown && (
        <View className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-48">
          <ScrollView nestedScrollEnabled>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => handleSelectCategory(cat)}
                className="p-3 border-b border-gray-100 flex-row justify-between items-center"
              >
                <Text className="text-gray-700">{cat}</Text>
                {category === cat && <Check size={16} color="#C62828" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Receipt Upload */}
      <View className="flex-row justify-end">
        <TouchableOpacity className="p-3 border border-brand-red rounded flex-row items-center justify-center space-x-2">
          <Text className="text-brand-red font-medium">Receipt</Text>
          <Camera size={16} color="#C62828" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isSubmitting}
        className={`w-full mt-6 ${
          isSubmitting ? "bg-gray-400" : "bg-brand-red"
        } py-4 rounded-lg shadow-md items-center flex-row justify-center`}
      >
        {isSubmitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold text-base">
            Save Transaction
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};
