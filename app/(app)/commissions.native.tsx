import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal,
} from "react-native";
import {
  ArrowLeft,
  Banknote,
  Image as ImageIcon,
  X,
  ChevronDown,
  ChevronUp,
  TrendingUp,
} from "lucide-react-native";
import { useNavigation, useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { fetchCommissions } from "../../store/slices/commissionsSlice";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { useCurrencyFormatter } from "../../hooks/useCurrency";
import { formatDate } from "../../utils/formatters";
import type { AppDispatch, RootState } from "../../store";
import type { Commission, ShiftEnum } from "../../types";

interface DailyCommissionGroup {
  date: string;
  amCommissions: Commission[];
  pmCommissions: Commission[];
  amTotal: number;
  pmTotal: number;
  dailyTotal: number;
}

export default function CommissionsPage() {
  const navigation = useNavigation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { formatCurrency } = useCurrencyFormatter();

  const { items: commissions, isLoading } = useSelector(
    (state: RootState) => state.commissions,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    dispatch(fetchCommissions({}));
  }, [dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchCommissions({}));
    setRefreshing(false);
  };

  // Group commissions by date
  const groupedCommissions = React.useMemo(() => {
    const groups: Map<string, DailyCommissionGroup> = new Map();

    commissions.forEach((commission) => {
      const dateKey = commission.date.split("T")[0];

      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          date: dateKey,
          amCommissions: [],
          pmCommissions: [],
          amTotal: 0,
          pmTotal: 0,
          dailyTotal: 0,
        });
      }

      const group = groups.get(dateKey)!;
      if (commission.shift === "AM") {
        group.amCommissions.push(commission);
        group.amTotal += commission.amount;
      } else {
        group.pmCommissions.push(commission);
        group.pmTotal += commission.amount;
      }
      group.dailyTotal += commission.amount;
    });

    // Sort by date descending
    return Array.from(groups.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [commissions]);

  const toggleExpand = (date: string) => {
    setExpandedDates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const getImageUri = (commission: Commission) => {
    if (commission.imageData) {
      return `data:image/jpeg;base64,${commission.imageData}`;
    }
    return commission.imageUrl;
  };

  // Calculate overall totals
  const overallTotal = groupedCommissions.reduce(
    (sum, g) => sum + g.dailyTotal,
    0,
  );

  if (isLoading && !refreshing) {
    return <LoadingSpinner message="Loading commissions..." />;
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-4 pt-4 pb-4">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <ArrowLeft color="#000" size={24} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Commissions</Text>
          <View className="p-2 w-10" />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Card */}
        <View className="bg-brand-red rounded-2xl p-5 mb-4 shadow-md">
          <View className="flex-row items-center mb-2">
            <Banknote color="#fff" size={24} />
            <Text className="text-white/80 font-semibold text-lg ml-2">
              Total Commissions
            </Text>
          </View>
          <Text className="text-4xl font-bold text-white">
            {formatCurrency(overallTotal)}
          </Text>
          <Text className="text-white/60 mt-1">
            {groupedCommissions.length} days with commissions
          </Text>
        </View>

        {/* Daily Groups */}
        {groupedCommissions.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center shadow-sm">
            <Banknote color="#9CA3AF" size={48} />
            <Text className="text-gray-400 mt-4 text-center">
              No commission records yet
            </Text>
            <Text className="text-gray-400 text-sm text-center mt-2">
              Add commissions from the Balance page
            </Text>
          </View>
        ) : (
          groupedCommissions.map((group) => {
            const isExpanded = expandedDates.has(group.date);
            const allCommissions = [
              ...group.amCommissions,
              ...group.pmCommissions,
            ];

            return (
              <View
                key={group.date}
                className="bg-white rounded-2xl mb-4 shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Date Header */}
                <TouchableOpacity
                  onPress={() => toggleExpand(group.date)}
                  className="flex-row items-center p-4 bg-gray-50"
                >
                  <View className="flex-1">
                    <Text className="font-bold text-gray-800 text-lg">
                      {formatDate(group.date, "medium")}
                    </Text>
                    <View className="flex-row mt-1">
                      {group.amCommissions.length > 0 && (
                        <View className="bg-blue-100 px-2 py-0.5 rounded-full mr-2">
                          <Text className="text-blue-700 text-xs font-bold">
                            AM: {formatCurrency(group.amTotal)}
                          </Text>
                        </View>
                      )}
                      {group.pmCommissions.length > 0 && (
                        <View className="bg-red-100 px-2 py-0.5 rounded-full">
                          <Text className="text-red-700 text-xs font-bold">
                            PM: {formatCurrency(group.pmTotal)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View className="items-end mr-2">
                    <Text className="font-bold text-gray-800 text-lg">
                      {formatCurrency(group.dailyTotal)}
                    </Text>
                    <Text className="text-gray-400 text-xs">
                      {allCommissions.length} record
                      {allCommissions.length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                  {isExpanded ? (
                    <ChevronUp color="#9CA3AF" size={20} />
                  ) : (
                    <ChevronDown color="#9CA3AF" size={20} />
                  )}
                </TouchableOpacity>

                {/* Expanded Content */}
                {isExpanded && (
                  <View className="border-t border-gray-100">
                    {/* AM Shift */}
                    {group.amCommissions.length > 0 && (
                      <View>
                        <View className="px-4 py-2 bg-blue-50">
                          <Text className="text-blue-700 font-bold text-xs uppercase">
                            AM Shift
                          </Text>
                        </View>
                        {group.amCommissions.map((commission, idx) => (
                          <TouchableOpacity
                            key={commission.id}
                            onPress={() => {
                              const uri = getImageUri(commission);
                              if (uri) setSelectedImage(uri);
                            }}
                            className={`flex-row items-center px-4 py-3 ${
                              idx < group.amCommissions.length - 1
                                ? "border-b border-gray-50"
                                : ""
                            }`}
                          >
                            <View className="flex-1">
                              <Text className="font-medium text-gray-800">
                                {commission.account?.name ||
                                  `Account ${commission.accountId}`}
                              </Text>
                              <Text className="text-xs text-gray-400">
                                {commission.source}
                              </Text>
                            </View>
                            <Text className="font-bold text-gray-700 mr-3">
                              {formatCurrency(commission.amount)}
                            </Text>
                            {(commission.imageData ||
                              commission.imageUrl) && (
                              <ImageIcon size={16} color="#9CA3AF" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* PM Shift */}
                    {group.pmCommissions.length > 0 && (
                      <View>
                        <View className="px-4 py-2 bg-red-50">
                          <Text className="text-red-700 font-bold text-xs uppercase">
                            PM Shift
                          </Text>
                        </View>
                        {group.pmCommissions.map((commission, idx) => (
                          <TouchableOpacity
                            key={commission.id}
                            onPress={() => {
                              const uri = getImageUri(commission);
                              if (uri) setSelectedImage(uri);
                            }}
                            className={`flex-row items-center px-4 py-3 ${
                              idx < group.pmCommissions.length - 1
                                ? "border-b border-gray-50"
                                : ""
                            }`}
                          >
                            <View className="flex-1">
                              <Text className="font-medium text-gray-800">
                                {commission.account?.name ||
                                  `Account ${commission.accountId}`}
                              </Text>
                              <Text className="text-xs text-gray-400">
                                {commission.source}
                              </Text>
                            </View>
                            <Text className="font-bold text-gray-700 mr-3">
                              {formatCurrency(commission.amount)}
                            </Text>
                            {(commission.imageData || commission.imageUrl) && (
                              <ImageIcon size={16} color="#9CA3AF" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Image Modal */}
      <Modal
        visible={selectedImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View className="flex-1 bg-black/90 justify-center items-center">
          <TouchableOpacity
            onPress={() => setSelectedImage(null)}
            className="absolute top-14 right-4 p-2 bg-white/20 rounded-full z-10"
          >
            <X color="#fff" size={24} />
          </TouchableOpacity>

          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              className="w-full h-[80%]"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
