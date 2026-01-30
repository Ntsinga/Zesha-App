import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectUserRole,
  enterAgency,
  selectViewingAgencyId,
} from "@/store/slices/authSlice";
import {
  fetchCompanyInfoList,
  deleteCompanyInfo,
} from "@/store/slices/companyInfoSlice";
import type { CompanyInfo } from "@/types";
import { CURRENCIES } from "@/hooks/screens/useSettingsScreen";
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  LogIn,
  RefreshCw,
} from "lucide-react-native";

export default function AgenciesScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const userRole = useAppSelector(selectUserRole);
  const viewingAgencyId = useAppSelector(selectViewingAgencyId);
  const {
    items: agencies,
    isLoading,
    error,
  } = useAppSelector((state) => state.companyInfo);

  const [refreshing, setRefreshing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const isSuperAdmin = userRole === "Super Administrator";

  // Load agencies on mount
  useEffect(() => {
    if (isSuperAdmin) {
      dispatch(fetchCompanyInfoList({}));
    }
  }, [dispatch, isSuperAdmin]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchCompanyInfoList({}));
    setRefreshing(false);
  }, [dispatch]);

  // Access denied
  if (!isSuperAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.accessDenied}>
          <Building2 size={48} color="#9CA3AF" />
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedText}>
            You need Super Administrator privileges to access this area.
          </Text>
        </View>
      </View>
    );
  }

  // Enter agency
  const handleEnterAgency = (agency: CompanyInfo) => {
    dispatch(enterAgency({ agencyId: agency.id, agencyName: agency.name }));
    router.push("/(app)");
  };

  // Navigate to create form
  const handleCreate = () => {
    router.push("/agency-form");
  };

  // Navigate to edit form
  const handleEdit = (agency: CompanyInfo) => {
    router.push(`/agency-form?id=${agency.id}`);
  };

  // Delete agency
  const handleDelete = async (id: number) => {
    Alert.alert(
      "Delete Agency",
      "Are you sure you want to delete this agency? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await dispatch(deleteCompanyInfo(id)).unwrap();
              dispatch(fetchCompanyInfoList({}));
            } catch (err) {
              Alert.alert("Error", "Failed to delete agency");
            }
          },
        },
      ],
    );
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  return (
    <View style={styles.container}>
      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw size={20} color="#6B7280" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
          <Plus size={18} color="#FFFFFF" />
          <Text style={styles.createButtonText}>New Agency</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {isLoading && agencies.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#C62828" />
            <Text style={styles.loadingText}>Loading agencies...</Text>
          </View>
        ) : agencies.length === 0 ? (
          <View style={styles.emptyState}>
            <Building2 size={48} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>No Agencies Yet</Text>
            <Text style={styles.emptyStateText}>
              Create your first agency to get started.
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreate}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create Agency</Text>
            </TouchableOpacity>
          </View>
        ) : (
          agencies.map((agency) => (
            <View
              key={agency.id}
              style={[
                styles.agencyCard,
                viewingAgencyId === agency.id && styles.agencyCardActive,
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.agencyIcon}>
                  <Building2 size={24} color="#C62828" />
                </View>
                <View style={styles.agencyInfo}>
                  <Text style={styles.agencyName}>{agency.name}</Text>
                  {agency.description && (
                    <Text style={styles.agencyDescription} numberOfLines={2}>
                      {agency.description}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <DollarSign size={14} color="#B8860B" />
                  <View style={styles.statContent}>
                    <Text style={styles.statLabel}>Working Capital</Text>
                    <Text style={styles.statValue}>
                      {formatCurrency(
                        agency.totalWorkingCapital,
                        agency.currency,
                      )}
                    </Text>
                  </View>
                </View>
                <View style={styles.statItem}>
                  <DollarSign size={14} color="#B8860B" />
                  <View style={styles.statContent}>
                    <Text style={styles.statLabel}>Currency</Text>
                    <Text style={styles.statValue}>{agency.currency}</Text>
                  </View>
                </View>
              </View>

              {agency.emails && agency.emails.length > 0 && (
                <View style={styles.emailsRow}>
                  {agency.emails.slice(0, 2).map((email, i) => (
                    <View key={i} style={styles.emailTag}>
                      <Text style={styles.emailTagText}>{email}</Text>
                    </View>
                  ))}
                  {agency.emails.length > 2 && (
                    <View style={styles.emailTag}>
                      <Text style={styles.emailTagText}>
                        +{agency.emails.length - 2} more
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.enterButton}
                  onPress={() => handleEnterAgency(agency)}
                >
                  <LogIn size={16} color="#FFFFFF" />
                  <Text style={styles.enterButtonText}>Enter</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => handleEdit(agency)}
                >
                  <Edit2 size={18} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconButton, styles.deleteButton]}
                  onPress={() => handleDelete(agency.id)}
                >
                  <Trash2 size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  actionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#C62828",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    color: "#DC2626",
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    color: "#6B7280",
    fontSize: 14,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    marginBottom: 24,
  },
  agencyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  agencyCardActive: {
    borderColor: "#C62828",
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 16,
  },
  agencyIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  agencyInfo: {
    flex: 1,
  },
  agencyName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  agencyDescription: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#B8860B",
    marginTop: 2,
  },
  emailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  emailTag: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  emailTagText: {
    fontSize: 12,
    color: "#6B7280",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  enterButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#C62828",
    paddingVertical: 12,
    borderRadius: 10,
  },
  enterButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  accessDenied: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  accessDeniedTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
  },
  accessDeniedText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
  },
});
