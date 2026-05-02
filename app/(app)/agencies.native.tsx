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
import Toast from "react-native-toast-message";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { enterAgency, selectViewingAgencyId } from "@/store/slices/authSlice";
import { useIsSuperAdmin, useIsAuthReady } from "@/hooks/useEffectiveRole";
import {
  fetchCompanyInfoList,
  deleteCompanyInfo,
} from "@/store/slices/companyInfoSlice";
import type { CompanyInfo } from "@/types";
import { Building2, Plus, Edit2, Trash2, RefreshCw } from "lucide-react-native";

export default function AgenciesScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isSuperAdmin = useIsSuperAdmin();
  const authReady = useIsAuthReady();
  const viewingAgencyId = useAppSelector(selectViewingAgencyId);
  const {
    items: agencies,
    isLoading,
    error,
  } = useAppSelector((state) => state.companyInfo);

  const [refreshing, setRefreshing] = useState(false);

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

  // Still loading auth â€” don't flash access denied
  if (!authReady) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#dc2626" />
      </View>
    );
  }

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

  // Delete agency with confirmation
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
              Toast.show({
                type: "error",
                text1: "Error",
                text2:
                  typeof err === "string"
                    ? err
                    : err instanceof Error
                      ? err.message
                      : "Failed to delete agency",
              });
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Agencies</Text>
          <Text style={styles.headerSubtitle}>
            {agencies.length} {agencies.length === 1 ? "agency" : "agencies"}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw size={18} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.createButtonText}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Column headers */}
      {agencies.length > 0 && (
        <View style={styles.columnHeaders}>
          <Text style={[styles.colLabel, { flex: 1 }]}>Agency</Text>
          <Text style={[styles.colLabel, { width: 52, textAlign: "center" }]}>
            CCY
          </Text>
          <Text style={[styles.colLabel, { width: 80, textAlign: "right" }]}>
            Actions
          </Text>
        </View>
      )}

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
          agencies.map((agency, index) => (
            <TouchableOpacity
              key={agency.id}
              style={[
                styles.row,
                index % 2 === 1 && styles.rowAlt,
                viewingAgencyId === agency.id && styles.rowActive,
              ]}
              onPress={() => handleEnterAgency(agency)}
              activeOpacity={0.7}
            >
              {/* Name + subtitle */}
              <View style={styles.rowMain}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {agency.name}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {agency.location ||
                    agency.adminName ||
                    (agency.emails?.[0] ?? "â€”")}
                </Text>
              </View>

              {/* Currency badge */}
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{agency.currency}</Text>
              </View>

              {/* Action buttons */}
              <View style={styles.rowActions}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => handleEdit(agency)}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Edit2 size={16} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtnDanger}
                  onPress={() => handleDelete(agency.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Trash2 size={16} color="#DC2626" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f1ea",
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#C62828",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  // Column headers
  columnHeaders: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F3F4F6",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  colLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // List rows
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 10,
  },
  rowAlt: {
    backgroundColor: "#FAFAFA",
  },
  rowActive: {
    backgroundColor: "#FFF0F0",
    borderLeftWidth: 3,
    borderLeftColor: "#C62828",
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  rowSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  badge: {
    width: 52,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B5563",
    letterSpacing: 0.3,
  },
  rowActions: {
    width: 80,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  iconBtnDanger: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  // Misc
  errorBanner: {
    backgroundColor: "#FEE2E2",
    padding: 12,
    margin: 16,
    borderRadius: 10,
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
    paddingHorizontal: 32,
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
    textAlign: "center",
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
