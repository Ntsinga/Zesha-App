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
} from "lucide-react-native";
import { useNavigation } from "expo-router";
import {
  useExpensesScreen,
  EXPENSE_CATEGORIES,
} from "../../hooks/screens/useExpensesScreen";
import { LoadingSpinner } from "../../components/LoadingSpinner";

export default function Expenses() {
  const navigation = useNavigation();
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

  if (isLoading && !refreshing && expenses.length === 0) {
    return <LoadingSpinner message="Loading expenses..." />;
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="mb-6 mt-4">
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
              <TouchableOpacity
                onPress={openAddModal}
                className="mt-4 bg-brand-red px-6 py-2 rounded-xl"
              >
                <Text className="text-white font-semibold">
                  Add First Expense
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            expenses.map((expense) => (
              <View
                key={expense.id}
                className="flex-row items-center py-4 border-b border-gray-100"
              >
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
                      {new Date(expense.expense_date).toLocaleDateString()}
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

        {/* Add Button */}
        <TouchableOpacity
          onPress={openAddModal}
          className="mt-6 bg-brand-red py-4 rounded-xl flex-row items-center justify-center shadow-md"
        >
          <Plus size={20} color="white" />
          <Text className="text-white font-bold text-base ml-2">
            Add Expense
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="slide"
        onRequestClose={onCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={onCloseModal}
            className="bg-black/50 justify-end"
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View className="bg-white rounded-t-3xl p-6 max-h-[85%]">
                {/* Modal Header */}
                <View className="flex-row justify-between items-center mb-6">
                  <Text className="text-xl font-bold text-gray-800">
                    {editingExpense ? "Edit Expense" : "Add Expense"}
                  </Text>
                  <TouchableOpacity onPress={onCloseModal}>
                    <X color="#6B7280" size={24} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Name Input */}
                  <View className="mb-4">
                    <Text className="text-gray-700 font-semibold mb-2">
                      Name *
                    </Text>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="e.g., Office Rent"
                      className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200"
                    />
                  </View>

                  {/* Amount Input */}
                  <View className="mb-4">
                    <Text className="text-gray-700 font-semibold mb-2">
                      Amount *
                    </Text>
                    <TextInput
                      value={amount}
                      onChangeText={setAmount}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200 text-lg"
                    />
                  </View>

                  {/* Date Input */}
                  <View className="mb-4">
                    <Text className="text-gray-700 font-semibold mb-2">
                      Date
                    </Text>
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

                  {/* Category Picker */}
                  <View className="mb-4">
                    <Text className="text-gray-700 font-semibold mb-2">
                      Category
                    </Text>
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
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
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
