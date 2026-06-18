import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Toast from "react-native-toast-message";
import {
  Plus,
  Trash2,
  X,
  DollarSign,
  Tag,
  FileText,
  TrendingDown,
  Wrench,
  Zap,
  ShoppingCart,
  Users,
  Home,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react-native";
import { useExpensesScreen } from "../../../hooks/screens/useExpensesScreen";
import { LoadingSpinner } from "../../../components/LoadingSpinner";
import {
  formatAmountInput,
  formatDate,
  parseAmountInput,
} from "../../../utils/formatters";

export default function Expenses() {
  const {
    expenses,
    isLoading,
    refreshing,
    isModalOpen,
    editingExpense,
    deleteConfirmId,
    clearConfirmId,
    totalAmount,
    totalCount,
    name,
    amount,
    description,
    category,
    fundingSource,
    selectedMonth,
    setSelectedMonth,
    showAllTime,
    setShowAllTime,
    filterCategory,
    setFilterCategory,
    filterSource,
    setFilterSource,
    setName,
    setAmount,
    setDescription,
    setCategory,
    setFundingSource,
    setDeleteConfirmId,
    setClearConfirmId,
    onRefresh,
    openAddModal,
    openEditModal,
    closeModal,
    handleSubmit,
    handleDelete,
    handleClear,
    formatCurrency,
    fundingSources,
    categories,
    isExpenseEditable,
  } = useExpensesScreen();

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showFundingSourcePicker, setShowFundingSourcePicker] = useState(false);
  const [clearNotes, setClearNotes] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const displayAmount = formatAmountInput(amount);

  // Month navigation helpers
  const navigateMonth = (direction: -1 | 1) => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const d = new Date(year, month - 1 + direction, 1);
    setSelectedMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
    if (showAllTime) setShowAllTime(false);
  };

  const monthLabel = (() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    return new Date(year, month - 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  })();

  const activeFilterCount =
    (filterCategory !== "ALL" ? 1 : 0) + (filterSource !== "ALL" ? 1 : 0);

  const handleAmountChange = (text: string) => {
    const clean = parseAmountInput(text);
    if (clean !== null) {
      setAmount(clean);
    }
  };

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

  const getFundingSourceLabel = (value: string) => {
    return (
      fundingSources.find((source) => source.value === value)?.label || value
    );
  };

  const onSubmit = async () => {
    const result = await handleSubmit();
    if (result.success) {
      Toast.show({
        type: "success",
        text1: "Success",
        text2: editingExpense
          ? "Expense updated successfully!"
          : "Expense added successfully!",
      });
      setShowCategoryPicker(false);
      setShowFundingSourcePicker(false);
    } else {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: result.error || "An error occurred",
      });
    }
  };

  const onDelete = async (id: number) => {
    const result = await handleDelete(id);
    if (result.success) {
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Expense deleted successfully!",
      });
    } else {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: result.error || "An error occurred",
      });
    }
  };

  const onClear = async (id: number) => {
    const result = await handleClear(id, clearNotes || undefined);
    setClearNotes("");
    if (result.success) {
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Expense marked as cleared!",
      });
    } else {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: result.error || "An error occurred",
      });
    }
  };

  const onCloseModal = () => {
    closeModal();
    setShowCategoryPicker(false);
    setShowFundingSourcePicker(false);
  };

  if (isLoading && !refreshing) {
    return <LoadingSpinner message="Loading expenses..." />;
  }

  return (
    <View className="flex-1 bg-brand-bg">
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

        {/* Month Navigation */}
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={() => navigateMonth(-1)}
            className="p-2"
            disabled={showAllTime}
          >
            <ChevronLeft
              color={showAllTime ? "#D1D5DB" : "#374151"}
              size={24}
            />
          </TouchableOpacity>
          <Text
            className={`text-lg font-bold ${showAllTime ? "text-gray-400" : "text-gray-800"}`}
          >
            {monthLabel}
          </Text>
          <TouchableOpacity
            onPress={() => navigateMonth(1)}
            className="p-2"
            disabled={showAllTime}
          >
            <ChevronRight
              color={showAllTime ? "#D1D5DB" : "#374151"}
              size={24}
            />
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center gap-2 mb-4">
          <TouchableOpacity
            onPress={() => setShowAllTime(false)}
            className={`flex-1 py-2 rounded-full border ${
              !showAllTime
                ? "bg-brand-red border-brand-red"
                : "bg-white border-gray-300"
            }`}
          >
            <Text
              className={`text-center text-sm font-semibold ${
                !showAllTime ? "text-white" : "text-gray-600"
              }`}
            >
              This Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowAllTime(true)}
            className={`flex-1 py-2 rounded-full border ${
              showAllTime
                ? "bg-brand-red border-brand-red"
                : "bg-white border-gray-300"
            }`}
          >
            <Text
              className={`text-center text-sm font-semibold ${
                showAllTime ? "text-white" : "text-gray-600"
              }`}
            >
              All Time
            </Text>
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <View className="bg-brand-red rounded-2xl p-5 mb-4 shadow-md">
          <Text className="text-white/80 text-sm font-medium">
            {showAllTime ? "Total Expenses" : "Monthly Expenses"}
          </Text>
          <Text className="text-white text-3xl font-bold mt-1">
            {formatCurrency(totalAmount)}
          </Text>
          <Text className="text-white/60 text-xs mt-2">
            {totalCount} expense{totalCount !== 1 ? "s" : ""} recorded
          </Text>
        </View>

        {/* Filter Toggle + Active Chips */}
        <View className="flex-row items-center justify-between mb-2">
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            className="flex-row items-center px-3 py-2 rounded-full bg-white border border-gray-200"
          >
            <SlidersHorizontal color="#6B7280" size={16} />
            <Text className="text-sm text-gray-600 ml-1.5 font-medium">
              Filters
            </Text>
            {activeFilterCount > 0 && (
              <View className="ml-1.5 bg-brand-red w-5 h-5 rounded-full items-center justify-center">
                <Text className="text-white text-xs font-bold">
                  {activeFilterCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {activeFilterCount > 0 && (
            <TouchableOpacity
              onPress={() => {
                setFilterCategory("ALL");
                setFilterSource("ALL");
              }}
            >
              <Text className="text-sm text-brand-red font-medium">
                Clear filters
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Expandable Filter Panel */}
        {showFilters && (
          <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
            {/* Category Filter */}
            <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
              Category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-3"
            >
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setFilterCategory("ALL")}
                  className={`px-3 py-1.5 rounded-full border ${
                    filterCategory === "ALL"
                      ? "bg-brand-red border-brand-red"
                      : "bg-white border-gray-300"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      filterCategory === "ALL" ? "text-white" : "text-gray-600"
                    }`}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setFilterCategory(cat.name)}
                    className={`px-3 py-1.5 rounded-full border ${
                      filterCategory === cat.name
                        ? "bg-brand-red border-brand-red"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        filterCategory === cat.name
                          ? "text-white"
                          : "text-gray-600"
                      }`}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Source Filter */}
            <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
              Funding Source
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <TouchableOpacity
                onPress={() => setFilterSource("ALL")}
                className={`px-3 py-1.5 rounded-full border ${
                  filterSource === "ALL"
                    ? "bg-brand-red border-brand-red"
                    : "bg-white border-gray-300"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    filterSource === "ALL" ? "text-white" : "text-gray-600"
                  }`}
                >
                  All
                </Text>
              </TouchableOpacity>
              {fundingSources.map((src) => (
                <TouchableOpacity
                  key={src.value}
                  onPress={() => setFilterSource(src.value)}
                  className={`px-3 py-1.5 rounded-full border ${
                    filterSource === src.value
                      ? "bg-brand-red border-brand-red"
                      : "bg-white border-gray-300"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      filterSource === src.value
                        ? "text-white"
                        : "text-gray-600"
                    }`}
                  >
                    {src.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Expenses List */}
        <View className="bg-white rounded-3xl shadow-sm p-4 border border-gray-100">
          <Text className="text-lg font-bold text-gray-800 mb-4">
            {showAllTime ? "All Expenses" : "Expenses"}
          </Text>

          {expenses.length === 0 ? (
            <View className="py-8 items-center">
              <DollarSign color="#9CA3AF" size={48} />
              <Text className="text-gray-400 mt-2">
                {showAllTime
                  ? "No expenses recorded yet"
                  : "No expenses recorded this month"}
              </Text>
            </View>
          ) : (
            expenses.map((expense) => (
              <TouchableOpacity
                key={expense.id}
                onPress={() =>
                  isExpenseEditable(expense) && openEditModal(expense)
                }
                activeOpacity={isExpenseEditable(expense) ? 0.6 : 1}
                className="flex-row items-center py-4 border-b border-gray-100"
              >
                <View className="mr-3">
                  {getCategoryIcon(expense.category)}
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-gray-800">
                    {expense.name}
                  </Text>
                  <View className="flex-row items-center mt-1 flex-wrap gap-1">
                    {expense.category && (
                      <View className="bg-gray-100 px-2 py-0.5 rounded mr-1">
                        <Text className="text-xs text-gray-600">
                          {expense.category}
                        </Text>
                      </View>
                    )}
                    {expense.fundingSource === "CAPITAL" && (
                      <View
                        className={`px-2 py-0.5 rounded mr-1 ${
                          expense.status === "CLEARED"
                            ? "bg-green-100"
                            : "bg-amber-100"
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            expense.status === "CLEARED"
                              ? "text-green-700"
                              : "text-amber-700"
                          }`}
                        >
                          {expense.status === "CLEARED"
                            ? "Reimbursed"
                            : "Unreimbursed"}
                        </Text>
                      </View>
                    )}
                    <View className="bg-blue-50 px-2 py-0.5 rounded mr-1">
                      <Text className="text-xs text-blue-700 font-medium">
                        {getFundingSourceLabel(expense.fundingSource)}
                      </Text>
                    </View>
                    {expense.recurringExpenseId ? (
                      <View className="bg-purple-50 px-2 py-0.5 rounded mr-1">
                        <Text className="text-xs text-purple-700 font-medium">
                          Recurring
                        </Text>
                      </View>
                    ) : null}
                    <Text className="text-xs text-gray-400">
                      {formatDate(expense.expenseDate, "short")}
                    </Text>
                  </View>
                </View>
                <Text
                  className={`font-bold mr-2 ${
                    expense.status === "CLEARED"
                      ? "text-green-600 line-through"
                      : "text-red-600"
                  }`}
                >
                  -{formatCurrency(expense.amount)}
                </Text>
                {expense.fundingSource === "CAPITAL" &&
                  isExpenseEditable(expense) && (
                    <TouchableOpacity
                      onPress={() => setClearConfirmId(expense.id)}
                      className="p-2 mr-1"
                    >
                      <CheckCircle color="#10B981" size={18} />
                    </TouchableOpacity>
                  )}
                <TouchableOpacity
                  onPress={() => setDeleteConfirmId(expense.id)}
                  className="p-2"
                >
                  <Trash2 color="#EF4444" size={18} />
                </TouchableOpacity>
              </TouchableOpacity>
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
                value={displayAmount}
                onChangeText={handleAmountChange}
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
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => {
                        setCategory(cat.name);
                        setShowCategoryPicker(false);
                      }}
                      className={`px-4 py-3 border-b border-gray-100 ${
                        category === cat.name ? "bg-red-50" : ""
                      }`}
                    >
                      <Text
                        className={`${
                          category === cat.name
                            ? "text-brand-red font-bold"
                            : "text-gray-700"
                        }`}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">
                Funding Source
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setShowFundingSourcePicker(!showFundingSourcePicker)
                }
                className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 flex-row justify-between items-center"
              >
                <View className="flex-row items-center">
                  <DollarSign color="#6B7280" size={20} />
                  <Text className="ml-2 text-gray-800">
                    {getFundingSourceLabel(fundingSource)}
                  </Text>
                </View>
                <Text className="text-gray-400">▼</Text>
              </TouchableOpacity>

              {showFundingSourcePicker && (
                <View className="bg-white border border-gray-200 rounded-xl mt-2">
                  {fundingSources.map((source) => (
                    <TouchableOpacity
                      key={source.value}
                      onPress={() => {
                        setFundingSource(source.value);
                        setShowFundingSourcePicker(false);
                      }}
                      className={`px-4 py-3 border-b border-gray-100 ${
                        fundingSource === source.value ? "bg-red-50" : ""
                      }`}
                    >
                      <Text
                        className={`${
                          fundingSource === source.value
                            ? "text-brand-red font-bold"
                            : "text-gray-700"
                        }`}
                      >
                        {source.label}
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

      {/* Clear Confirmation Modal */}
      <Modal
        visible={clearConfirmId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setClearConfirmId(null);
          setClearNotes("");
        }}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <View className="flex-row items-center mb-3">
              <CheckCircle color="#10B981" size={22} />
              <Text className="text-xl font-bold text-gray-800 ml-2">
                Mark as Cleared?
              </Text>
            </View>
            <Text className="text-gray-600 mb-4">
              This marks the expense as recovered or reimbursed. It will no
              longer reduce working capital.
            </Text>
            <TextInput
              value={clearNotes}
              onChangeText={setClearNotes}
              placeholder="Optional notes (e.g., reimbursed by client)"
              className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200 mb-4"
              multiline
            />
            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => {
                  setClearConfirmId(null);
                  setClearNotes("");
                }}
                className="flex-1 py-3 rounded-xl bg-gray-100"
              >
                <Text className="text-center font-semibold text-gray-700">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => clearConfirmId && onClear(clearConfirmId)}
                className="flex-1 py-3 rounded-xl bg-green-500"
              >
                <Text className="text-center font-semibold text-white">
                  Confirm
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
