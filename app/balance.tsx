import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Banknote, Wallet, ChevronRight } from "lucide-react-native";

export default function BalancePage() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        {/* Header */}
        <View className="flex-row items-center mb-8 mt-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 bg-white rounded-full shadow-sm mr-4"
          >
            <ArrowLeft color="#C62828" size={24} />
          </TouchableOpacity>
          <View>
            <Text className="text-2xl font-bold text-gray-800">Balance</Text>
            <Text className="text-gray-500 text-sm">
              Choose an option to continue
            </Text>
          </View>
        </View>

        {/* Options */}
        <View className="space-y-4">
          {/* Cash Count Option */}
          <TouchableOpacity
            onPress={() => router.push("/add-cash-count")}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
          >
            <View className="flex-row items-center">
              <View className="bg-brand-red/10 p-4 rounded-xl mr-4">
                <Banknote color="#C62828" size={32} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-800">
                  Cash Count
                </Text>
                <Text className="text-gray-500 text-sm mt-1">
                  Count notes and coins by denomination
                </Text>
              </View>
              <ChevronRight color="#9CA3AF" size={24} />
            </View>
          </TouchableOpacity>

          {/* Add Balances Option */}
          <TouchableOpacity
            onPress={() => router.push("/add-balance")}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
          >
            <View className="flex-row items-center">
              <View className="bg-brand-gold/30 p-4 rounded-xl mr-4">
                <Wallet color="#B8860B" size={32} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-800">
                  Add Balances
                </Text>
                <Text className="text-gray-500 text-sm mt-1">
                  Add account balances with images
                </Text>
              </View>
              <ChevronRight color="#9CA3AF" size={24} />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
