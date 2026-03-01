import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from "react-native";
import {
  Plus,
  SlidersHorizontal,
  RotateCcw,
  Wallet,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { ActionModal, AddTransactionForm } from "../../components/ActionModal";
import {
  fetchTransactions,
  reverseTransaction,
  createCapitalInjection,
} from "../../store/slices/transactionsSlice";
import { fetchAccounts } from "../../store/slices/accountsSlice";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { formatDate } from "../../utils/formatters";
import { useCurrencyFormatter } from "../../hooks/useCurrency";
import type {
  TransactionRecord as Transaction,
  TransactionTypeEnum,
  ShiftEnum,
  CapitalInjectionCreate,
} from "../../types";
import type { Account } from "../../types";

type TypeFilter = "ALL" | TransactionTypeEnum;
type ShiftFilter = "ALL" | ShiftEnum;

function getTypeLabel(type: string): string {
  switch (type) {
    case "DEPOSIT":
      return "Deposit";
    case "WITHDRAW":
      return "Withdraw";
    case "FLOAT_PURCHASE":
      return "Float Purchase";
    case "CAPITAL_INJECTION":
      return "Capital Injection";
    default:
      return type;
  }
}

function getTypeBadgeColors(type: string) {
  switch (type) {
    case "DEPOSIT":
      return { bg: "#dcfce7", text: "#16a34a" };
    case "WITHDRAW":
      return { bg: "#fee2e2", text: "#dc2626" };
    case "FLOAT_PURCHASE":
      return { bg: "#dbeafe", text: "#2563eb" };
    case "CAPITAL_INJECTION":
      return { bg: "#ccfbf1", text: "#0d9488" };
    default:
      return { bg: "#f3f4f6", text: "#6b7280" };
  }
}

function getAmountColor(type: string): string {
  switch (type) {
    case "DEPOSIT":
    case "CAPITAL_INJECTION":
      return "#16a34a";
    case "WITHDRAW":
      return "#dc2626";
    case "FLOAT_PURCHASE":
      return "#2563eb";
    default:
      return "#374151";
  }
}

function getAmountPrefix(type: string): string {
  switch (type) {
    case "DEPOSIT":
    case "CAPITAL_INJECTION":
      return "+";
    case "WITHDRAW":
      return "-";
    default:
      return "";
  }
}

export default function Transactions() {
  const dispatch = useAppDispatch();
  const { formatCurrency } = useCurrencyFormatter();
  const insets = useSafeAreaInsets();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<TypeFilter>("ALL");
  const [filterShift, setFilterShift] = useState<ShiftFilter>("ALL");
  const [filterAccountId, setFilterAccountId] = useState<number | undefined>(
    undefined,
  );
  const [isReversing, setIsReversing] = useState(false);
  const [showInjectionModal, setShowInjectionModal] = useState(false);
  const [injectionForm, setInjectionForm] = useState({
    accountId: undefined as number | undefined,
    amount: "",
    reference: "",
    notes: "",
  });
  const [isSubmittingInjection, setIsSubmittingInjection] = useState(false);
  const { items: transactions, isLoading } = useAppSelector(
    (state) => state.transactions,
  );
  const accounts = useAppSelector((state) => state.accounts.items);
  const backendUser = useAppSelector((state) => state.auth.user);
  const canInjectCapital = backendUser?.role !== "Agent";
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchAccounts({}));
  }, [dispatch]);

  const buildFilters = () => ({
    transactionType:
      filterType !== "ALL" ? (filterType as TransactionTypeEnum) : undefined,
    shift: filterShift !== "ALL" ? (filterShift as ShiftEnum) : undefined,
    accountId: filterAccountId,
  });

  useEffect(() => {
    dispatch(fetchTransactions(buildFilters()));
  }, [dispatch, filterType, filterShift, filterAccountId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchTransactions(buildFilters()));
    setRefreshing(false);
  };

  const activeFilterCount =
    (filterType !== "ALL" ? 1 : 0) +
    (filterShift !== "ALL" ? 1 : 0) +
    (filterAccountId !== undefined ? 1 : 0);

  const handleFormSuccess = () => {
    dispatch(fetchTransactions(buildFilters()));
  };

  const handleCreateCapitalInjection = useCallback(async () => {
    if (!injectionForm.accountId || !injectionForm.amount) return;
    const companyId = backendUser?.companyId;
    if (!companyId) return;

    const data: CapitalInjectionCreate = {
      companyId,
      accountId: injectionForm.accountId,
      amount: parseFloat(injectionForm.amount),
      transactionTime: new Date().toISOString(),
      reference: injectionForm.reference || undefined,
      notes: injectionForm.notes || undefined,
    };

    try {
      setIsSubmittingInjection(true);
      await dispatch(createCapitalInjection(data)).unwrap();
      setShowInjectionModal(false);
      setInjectionForm({
        accountId: undefined,
        amount: "",
        reference: "",
        notes: "",
      });
      dispatch(fetchTransactions(buildFilters()));
    } catch (err) {
      Alert.alert(
        "Injection Failed",
        typeof err === "string"
          ? err
          : "Could not record capital injection. Please try again.",
      );
    } finally {
      setIsSubmittingInjection(false);
    }
  }, [dispatch, injectionForm, backendUser, buildFilters]);

  const handleReverse = useCallback(
    (tx: Transaction) => {
      Alert.alert(
        "Reverse Transaction",
        `Are you sure you want to reverse this ${getTypeLabel(tx.transactionType).toLowerCase()} of ${formatCurrency(tx.amount)} for ${tx.account?.name || `Acct #${tx.accountId}`}?\n\nThis will create a reversing entry and cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reverse",
            style: "destructive",
            onPress: async () => {
              try {
                setIsReversing(true);
                await dispatch(reverseTransaction(tx.id)).unwrap();
                dispatch(fetchTransactions(buildFilters()));
              } catch (err) {
                Alert.alert(
                  "Reversal Failed",
                  typeof err === "string"
                    ? err
                    : "Could not reverse this transaction. Please try again.",
                );
              } finally {
                setIsReversing(false);
              }
            },
          },
        ],
      );
    },
    [dispatch, formatCurrency, buildFilters],
  );

  if (isLoading && !refreshing) {
    return <LoadingSpinner message="Loading transactions..." />;
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="mb-6 mt-4">
          <Text className="text-3xl font-bold text-brand-red">
            Transactions
          </Text>
        </View>

        {/* Filter row */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-sm text-gray-500">
            {transactions.length} transaction
            {transactions.length !== 1 ? "s" : ""}
            {activeFilterCount > 0
              ? ` · ${activeFilterCount} filter${activeFilterCount > 1 ? "s" : ""} active`
              : ""}
          </Text>
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            className="flex-row items-center gap-1 px-3 py-1.5 rounded-lg border"
            style={{
              backgroundColor:
                showFilters || activeFilterCount > 0 ? "#FEF2F2" : "#FFFFFF",
              borderColor:
                showFilters || activeFilterCount > 0 ? "#DC2626" : "#E5E7EB",
            }}
          >
            <SlidersHorizontal
              size={16}
              color={
                showFilters || activeFilterCount > 0 ? "#DC2626" : "#9CA3AF"
              }
            />
            <Text
              className="text-xs font-medium ml-1"
              style={{
                color:
                  showFilters || activeFilterCount > 0 ? "#DC2626" : "#6B7280",
              }}
            >
              Filters
            </Text>
          </TouchableOpacity>
        </View>

        {/* Collapsible filter panel */}
        {showFilters && (
          <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 shadow-sm">
            {/* Transaction type */}
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Type
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {(
                [
                  "ALL",
                  "DEPOSIT",
                  "WITHDRAW",
                  "FLOAT_PURCHASE",
                  "CAPITAL_INJECTION",
                ] as TypeFilter[]
              ).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setFilterType(t)}
                  className="px-3 py-1.5 rounded-full border"
                  style={{
                    backgroundColor: filterType === t ? "#DC2626" : "#F9FAFB",
                    borderColor: filterType === t ? "#DC2626" : "#E5E7EB",
                  }}
                >
                  <Text
                    className="text-xs font-medium"
                    style={{ color: filterType === t ? "#FFFFFF" : "#374151" }}
                  >
                    {t === "ALL" ? "All" : getTypeLabel(t)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Shift */}
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Shift
            </Text>
            <View className="flex-row gap-2 mb-4">
              {(["ALL", "AM", "PM"] as ShiftFilter[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setFilterShift(s)}
                  className="px-4 py-1.5 rounded-full border"
                  style={{
                    backgroundColor: filterShift === s ? "#DC2626" : "#F9FAFB",
                    borderColor: filterShift === s ? "#DC2626" : "#E5E7EB",
                  }}
                >
                  <Text
                    className="text-xs font-medium"
                    style={{ color: filterShift === s ? "#FFFFFF" : "#374151" }}
                  >
                    {s === "ALL" ? "All Shifts" : s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Account */}
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Account
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="-mx-1"
            >
              <View className="flex-row gap-2 px-1 pb-1">
                <TouchableOpacity
                  onPress={() => setFilterAccountId(undefined)}
                  className="px-3 py-1.5 rounded-full border"
                  style={{
                    backgroundColor:
                      filterAccountId === undefined ? "#DC2626" : "#F9FAFB",
                    borderColor:
                      filterAccountId === undefined ? "#DC2626" : "#E5E7EB",
                  }}
                >
                  <Text
                    className="text-xs font-medium"
                    style={{
                      color:
                        filterAccountId === undefined ? "#FFFFFF" : "#374151",
                    }}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {accounts.map((acc) => (
                  <TouchableOpacity
                    key={acc.id}
                    onPress={() =>
                      setFilterAccountId(
                        filterAccountId === acc.id ? undefined : acc.id,
                      )
                    }
                    className="px-3 py-1.5 rounded-full border"
                    style={{
                      backgroundColor:
                        filterAccountId === acc.id ? "#DC2626" : "#F9FAFB",
                      borderColor:
                        filterAccountId === acc.id ? "#DC2626" : "#E5E7EB",
                    }}
                  >
                    <Text
                      className="text-xs font-medium"
                      style={{
                        color:
                          filterAccountId === acc.id ? "#FFFFFF" : "#374151",
                      }}
                    >
                      {acc.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setFilterType("ALL");
                  setFilterShift("ALL");
                  setFilterAccountId(undefined);
                }}
                className="mt-3 self-end"
              >
                <Text className="text-xs text-red-500 font-medium">
                  Clear filters
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <Text className="text-lg font-bold text-brand-red mb-4">
            Recent Activity
          </Text>

          {transactions.length === 0 ? (
            <View className="py-8 items-center">
              <Text className="text-gray-400">No transactions yet</Text>
            </View>
          ) : (
            transactions.map((tx: Transaction, idx: number) => {
              const badgeColors = getTypeBadgeColors(tx.transactionType);
              return (
                <View
                  key={tx.id || `tx-${idx}`}
                  className="border-b border-gray-100 py-4 flex-row justify-between items-center"
                >
                  <View className="flex-1">
                    <View className="flex-row items-center mb-1">
                      <Text className="font-bold text-gray-700 mr-2">
                        {tx.account?.name || `Acct #${tx.accountId}`}
                      </Text>
                      <Text className="text-xs text-gray-400">
                        {formatDate(tx.transactionTime, "short")} · {tx.shift}
                      </Text>
                    </View>
                    {tx.reference ? (
                      <Text className="text-gray-600 font-medium">
                        {tx.reference}
                      </Text>
                    ) : null}
                    {tx.notes ? (
                      <Text className="text-xs text-gray-400 mt-0.5">
                        {tx.notes}
                      </Text>
                    ) : null}
                    <View
                      className="self-start px-2 py-0.5 rounded mt-1"
                      style={{ backgroundColor: badgeColors.bg }}
                    >
                      <Text
                        className="text-xs font-medium"
                        style={{ color: badgeColors.text }}
                      >
                        {getTypeLabel(tx.transactionType)}
                      </Text>
                    </View>
                    {!tx.isConfirmed && (
                      <View className="self-start bg-yellow-100 px-2 py-0.5 rounded mt-1">
                        <Text className="text-xs font-medium text-yellow-700">
                          ⚠ Unconfirmed
                        </Text>
                      </View>
                    )}
                  </View>
                  <View className="items-end">
                    <Text
                      className="font-bold text-base"
                      style={{ color: getAmountColor(tx.transactionType) }}
                    >
                      {getAmountPrefix(tx.transactionType)}
                      {formatCurrency(Math.abs(tx.amount))}
                    </Text>
                    {tx.expectedCommission && (
                      <Text className="text-xs text-purple-600 mt-0.5">
                        Commission:{" "}
                        {formatCurrency(tx.expectedCommission.commissionAmount)}
                      </Text>
                    )}
                    {!tx.reconciliationId && (
                      <TouchableOpacity
                        onPress={() => handleReverse(tx)}
                        disabled={isReversing}
                        className="flex-row items-center mt-2 px-2 py-1 rounded"
                        style={{ backgroundColor: "#FEF2F2" }}
                      >
                        <RotateCcw size={12} color="#DC2626" />
                        <Text className="text-xs font-medium text-red-600 ml-1">
                          Reverse
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Capital Injection FAB — visible for non-Agent roles only */}
      {canInjectCapital && (
        <TouchableOpacity
          onPress={() => setShowInjectionModal(true)}
          className="absolute w-14 h-14 rounded-full items-center justify-center"
          style={{
            right: 88,
            bottom: insets.bottom + 80,
            backgroundColor: "#0d9488",
            elevation: 8,
            shadowColor: "#0d9488",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
          }}
        >
          <Wallet color="white" size={24} />
        </TouchableOpacity>
      )}

      {/* Add Transaction FAB */}
      <TouchableOpacity
        onPress={() => setIsModalOpen(true)}
        className="absolute right-5 w-14 h-14 bg-brand-red rounded-full items-center justify-center"
        style={{
          bottom: insets.bottom + 80,
          elevation: 8,
          shadowColor: "#DC2626",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        }}
      >
        <Plus color="white" size={28} />
      </TouchableOpacity>

      <ActionModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Transaction"
      >
        <AddTransactionForm
          onSuccess={handleFormSuccess}
          onClose={() => setIsModalOpen(false)}
        />
      </ActionModal>

      {/* Capital Injection Modal */}
      <ActionModal
        visible={showInjectionModal}
        onClose={() => {
          setShowInjectionModal(false);
          setInjectionForm({
            accountId: undefined,
            amount: "",
            reference: "",
            notes: "",
          });
        }}
        title="Capital Injection"
      >
        <View className="px-4 pb-6">
          <Text className="text-xs text-gray-500 mb-4">
            Record additional capital being injected into the business.
          </Text>

          {/* Account picker */}
          <Text className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Account *
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
          >
            <View className="flex-row gap-2 pb-1">
              {accounts
                .filter((a: Account) => a.isActive)
                .map((acc: Account) => (
                  <TouchableOpacity
                    key={acc.id}
                    onPress={() =>
                      setInjectionForm((f) => ({ ...f, accountId: acc.id }))
                    }
                    className="px-3 py-2 rounded-xl border"
                    style={{
                      backgroundColor:
                        injectionForm.accountId === acc.id
                          ? "#0d9488"
                          : "#F9FAFB",
                      borderColor:
                        injectionForm.accountId === acc.id
                          ? "#0d9488"
                          : "#E5E7EB",
                    }}
                  >
                    <Text
                      className="text-sm font-medium"
                      style={{
                        color:
                          injectionForm.accountId === acc.id
                            ? "#FFFFFF"
                            : "#374151",
                      }}
                    >
                      {acc.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          </ScrollView>

          {/* Amount */}
          <Text className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Amount *
          </Text>
          <TextInput
            value={injectionForm.amount}
            onChangeText={(v) => setInjectionForm((f) => ({ ...f, amount: v }))}
            placeholder="0.00"
            keyboardType="decimal-pad"
            className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 bg-white mb-4"
          />

          {/* Reference */}
          <Text className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Reference
          </Text>
          <TextInput
            value={injectionForm.reference}
            onChangeText={(v) =>
              setInjectionForm((f) => ({ ...f, reference: v }))
            }
            placeholder="Optional reference"
            className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 bg-white mb-4"
          />

          {/* Notes */}
          <Text className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Notes
          </Text>
          <TextInput
            value={injectionForm.notes}
            onChangeText={(v) => setInjectionForm((f) => ({ ...f, notes: v }))}
            placeholder="Optional notes"
            multiline
            numberOfLines={3}
            className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 bg-white mb-6"
            style={{ textAlignVertical: "top", minHeight: 80 }}
          />

          {/* Submit */}
          <TouchableOpacity
            onPress={handleCreateCapitalInjection}
            disabled={
              isSubmittingInjection ||
              !injectionForm.accountId ||
              !injectionForm.amount
            }
            className="py-4 rounded-xl items-center"
            style={{
              backgroundColor:
                isSubmittingInjection ||
                !injectionForm.accountId ||
                !injectionForm.amount
                  ? "#99f6e4"
                  : "#0d9488",
            }}
          >
            <Text className="text-white font-semibold text-base">
              {isSubmittingInjection ? "Recording..." : "Record Injection"}
            </Text>
          </TouchableOpacity>
        </View>
      </ActionModal>
    </View>
  );
}
