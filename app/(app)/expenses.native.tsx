import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  TrendingDown,
  Wrench,
  Zap,
  ShoppingCart,
  Users,
  Home,
} from "lucide-react-native";
import {
  useExpensesScreen,
  EXPENSE_CATEGORIES,
} from "../../hooks/screens/useExpensesScreen";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { formatDate } from "../../utils/formatters";

export default function Expenses() {
  const {
    expenses,
    isLoading,
    refreshing,
    isModalOpen,
    editingExpense,
    deleteConfirmId,
    totalAmount,
    name,
    amount,
    description,
    expenseDate,
    category,
    setName,
    setAmount,
    setDescription,
    setExpenseDate,
    setCategory,
    setDeleteConfirmId,
    onRefresh,
    openAddModal,
    openEditModal,
    closeModal,
    handleSubmit,
    handleDelete,
    formatCurrency,
  } = useExpensesScreen();

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const getCategoryIcon = (category: string | null) => {
    switch (category) {
      case "Business Operations":
        return <TrendingDown color="#EF4444" size={20} />;
      case "Maintenance":
        return <Wrench color="#F59E0B" size={20} />;
      case "Utilities":
        return <Zap color="#3B82F6" size={20} />;
      case "Supplies":
        return <ShoppingCart color="#10B981" size={20} />;
      case "Salaries":
        return <Users color="#8B5CF6" size={20} />;
      case "Rent":
        return <Home color="#EC4899" size={20} />;
      case "Transport":
        return <DollarSign color="#14B8A6" size={20} />;
      case "Marketing":
        return <TrendingDown color="#F97316" size={20} />;
      case "Shortage":
        return <DollarSign color="#DC2626" size={20} />;
      default:
        return <DollarSign color="#6B7280" size={20} />;
    }
  };

  const onSubmit = async () => {
    const result = await handleSubmit();
    if (result.success) {
      Alert.alert(
        "Success",
        editingExpense
          ? "Expense updated successfully!"
          : "Expense added successfully!",
      );
      setShowCategoryPicker(false);
    } else {
      Alert.alert("Error", result.error || "An error occurred");
    }
  };

  const onDelete = async (id: number) => {
    const result = await handleDelete(id);
    if (result.success) {
      Alert.alert("Success", "Expense deleted successfully!");
    } else {
      Alert.alert("Error", result.error || "An error occurred");
    }
  };

  const onCloseModal = () => {
    closeModal();
    setShowCategoryPicker(false);
  };

  if (isLoading && !refreshing) {
    return <LoadingSpinner message="Loading expenses..." />;
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-brand-red">Expenses</Text>
        </View>

        {/* Total Expenses Card */}
        <View className="bg-brand-red rounded-2xl p-5 mb-6 shadow-md">
          <Text className="text-white/80 text-sm font-medium">
            Total Expenses
          </Text>
          <Text className="text-white text-3xl font-bold mt-1">
            {formatCurrency(totalAmount)}
          </Text>
          <Text className="text-white/60 text-xs mt-2">
            {expenses.length} expense{expenses.length !== 1 ? "s" : ""} recorded
          </Text>
        </View>

        {/* Expenses List */}
        <View className="bg-white rounded-3xl shadow-sm p-4 border border-gray-100">
          <Text className="text-lg font-bold text-gray-800 mb-4">
            Recent Expenses
          </Text>

          {expenses.length === 0 ? (
            <View className="py-8 items-center">
              <DollarSign color="#9CA3AF" size={48} />
              <Text className="text-gray-400 mt-2">No expenses recorded</Text>
            </View>
          ) : (
            expenses.map((expense) => (
              <View
                key={expense.id}
                className="flex-row items-center py-4 border-b border-gray-100"
              >
                <View className="mr-3">
                  {getCategoryIcon(expense.category)}
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-gray-800">
                    {expense.name}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    {expense.category && (
                      <View className="bg-gray-100 px-2 py-0.5 rounded mr-2">
                        <Text className="text-xs text-gray-600">
                          {expense.category}
                        </Text>
                      </View>
                    )}
                    <Text className="text-xs text-gray-400">
                      {formatDate(expense.expenseDate, "short")}
                    </Text>
                  </View>
                </View>
                <Text className="font-bold text-red-600 mr-4">
                  -{formatCurrency(expense.amount)}
                </Text>
                <TouchableOpacity
                  onPress={() => openEditModal(expense)}
                  className="p-2 mr-1"
                >
                  <Edit2 color="#6B7280" size={18} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setDeleteConfirmId(expense.id)}
                  className="p-2"
                >
                  <Trash2 color="#EF4444" size={18} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={openAddModal}
        className="absolute bottom-32 right-5 w-14 h-14 bg-brand-red rounded-full items-center justify-center"
        style={{
          elevation: 8,
          shadowColor: "#DC2626",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        }}
      >
        <Plus color="white" size={28} />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-white"
        >
          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-gray-200">
            <TouchableOpacity onPress={onCloseModal} className="p-2">
              <X color="#6B7280" size={24} />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-800">
              {editingExpense ? "Edit Expense" : "Add Expense"}
            </Text>
            <TouchableOpacity
              onPress={onSubmit}
              className="bg-brand-red px-4 py-2 rounded-xl"
            >
              <Text className="text-white font-semibold">
                {editingExpense ? "Update" : "Add"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Name Input */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Name *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g., Office Rent"
                autoFocus
                className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200"
              />
            </View>

            {/* Amount Input */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Amount *</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
                className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200 text-lg"
              />
            </View>

            {/* Category Picker */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Category</Text>
              <TouchableOpacity
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 flex-row justify-between items-center"
              >
                <View className="flex-row items-center">
                  <Tag color="#6B7280" size={20} />
                  <Text
                    className={`ml-2 ${
                      category ? "text-gray-800" : "text-gray-400"
                    }`}
                  >
                    {category || "Select category"}
                  </Text>
                </View>
                <Text className="text-gray-400">▼</Text>
              </TouchableOpacity>

              {showCategoryPicker && (
                <View className="bg-white border border-gray-200 rounded-xl mt-2">
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => {
                        setCategory(cat);
                        setShowCategoryPicker(false);
                      }}
                      className={`px-4 py-3 border-b border-gray-100 ${
                        category === cat ? "bg-red-50" : ""
                      }`}
                    >
                      <Text
                        className={`${
                          category === cat
                            ? "text-brand-red font-bold"
                            : "text-gray-700"
                        }`}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Date Input */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Date</Text>
              <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <Calendar color="#6B7280" size={20} />
                <TextInput
                  value={expenseDate}
                  onChangeText={setExpenseDate}
                  placeholder="YYYY-MM-DD"
                  className="flex-1 ml-2 text-gray-800"
                />
              </View>
            </View>

            {/* Description Input */}
            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-2">
                Description
              </Text>
              <View className="flex-row items-start bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <FileText color="#6B7280" size={20} />
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Optional notes..."
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  className="flex-1 ml-2 text-gray-800 min-h-[60px]"
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={onSubmit}
              className="bg-brand-red py-4 rounded-xl items-center mb-4"
            >
              <Text className="text-white font-bold text-base">
                {editingExpense ? "Update Expense" : "Add Expense"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteConfirmId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmId(null)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <Text className="text-xl font-bold text-gray-800 mb-2">
              Delete Expense?
            </Text>
            <Text className="text-gray-600 mb-6">
              This action cannot be undone.
            </Text>
            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => setDeleteConfirmId(null)}
                className="flex-1 py-3 rounded-xl bg-gray-100"
              >
                <Text className="text-center font-semibold text-gray-700">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => deleteConfirmId && onDelete(deleteConfirmId)}
                className="flex-1 py-3 rounded-xl bg-red-500"
              >
                <Text className="text-center font-semibold text-white">
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
