import { useCallback, useEffect, useState } from "react";

import {
  fetchTellers,
  fetchTellerDetail,
  createTeller,
  updateTeller,
  deleteTeller,
  assignAccountToTeller,
  endAccountAssignment,
  assignUserToTeller,
  endUserAssignment,
  clearSelectedTeller,
} from "@/store/slices/tellersSlice";
import type {
  TellerCreate,
  TellerUpdate,
  TellerAccountAssignmentCreate,
  TellerAccountAssignmentEnd,
  TellerUserAssignmentCreate,
  TellerUserAssignmentEnd,
  User,
} from "@/types";
import { mapApiResponse } from "@/types";
import { secureApiRequest } from "@/services/secureApi";
import { API_ENDPOINTS } from "@/config/api";
import { buildTypedQueryString } from "@/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function useTellersScreen() {
  const dispatch = useAppDispatch();
  const { items, selectedTeller, isLoading, error } = useAppSelector(
    (state) => state.tellers,
  );
  const accounts = useAppSelector((state) => state.accounts.items);
  const companyId = useAppSelector(
    (state) => state.auth.viewingAgencyId ?? state.auth.user?.companyId,
  );

  // Company users for assignment dropdown
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);

  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignAccountModal, setShowAssignAccountModal] = useState(false);
  const [showAssignUserModal, setShowAssignUserModal] = useState(false);
  const [selectedTellerId, setSelectedTellerId] = useState<number | null>(null);

  // Form state for create
  const [newTellerName, setNewTellerName] = useState("");
  const [newTargetOperatingCapital, setNewTargetOperatingCapital] =
    useState("");

  useEffect(() => {
    void dispatch(fetchTellers({}));
  }, [dispatch]);

  // Fetch company users for assignment dropdown
  useEffect(() => {
    if (!companyId) return;
    const fetchUsers = async () => {
      try {
        const query = buildTypedQueryString({ companyId });
        const data = await secureApiRequest<unknown>(
          `${API_ENDPOINTS.users.list}${query}`,
        );
        setCompanyUsers(mapApiResponse<User[]>(data));
      } catch {
        // Non-critical — user can still type ID manually
      }
    };
    void fetchUsers();
  }, [companyId]);

  useEffect(() => {
    if (selectedTellerId) {
      void dispatch(fetchTellerDetail(selectedTellerId));
    } else {
      dispatch(clearSelectedTeller());
    }
  }, [dispatch, selectedTellerId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchTellers({}));
    if (selectedTellerId) {
      await dispatch(fetchTellerDetail(selectedTellerId));
    }
    setRefreshing(false);
  }, [dispatch, selectedTellerId]);

  const handleCreate = useCallback(async () => {
    const payload: TellerCreate = {
      name: newTellerName.trim(),
      targetOperatingCapital:
        parseFloat(newTargetOperatingCapital.replace(/,/g, "")) || 0,
    };
    const result = await dispatch(createTeller(payload));
    if (createTeller.fulfilled.match(result)) {
      setShowCreateModal(false);
      setNewTellerName("");
      setNewTargetOperatingCapital("");
    }
  }, [dispatch, newTellerName, newTargetOperatingCapital]);

  const handleUpdate = useCallback(
    async (tellerId: number, data: TellerUpdate) => {
      await dispatch(updateTeller({ tellerId, data }));
    },
    [dispatch],
  );

  const handleDelete = useCallback(
    async (tellerId: number) => {
      await dispatch(deleteTeller(tellerId));
      if (selectedTellerId === tellerId) {
        setSelectedTellerId(null);
      }
    },
    [dispatch, selectedTellerId],
  );

  const handleAssignAccount = useCallback(
    async (data: Omit<TellerAccountAssignmentCreate, "tellerId">) => {
      if (!selectedTellerId) return;
      await dispatch(
        assignAccountToTeller({ ...data, tellerId: selectedTellerId }),
      );
    },
    [dispatch, selectedTellerId],
  );

  const handleEndAccountAssignment = useCallback(
    async (assignmentId: number, data: TellerAccountAssignmentEnd) => {
      if (!selectedTellerId) return;
      await dispatch(endAccountAssignment({ assignmentId, data }));
    },
    [dispatch, selectedTellerId],
  );

  const handleAssignUser = useCallback(
    async (
      data: Omit<TellerUserAssignmentCreate, "tellerId" | "effectiveShift"> & {
        effectiveShift: "AM" | "PM" | "Both";
      },
    ) => {
      if (!selectedTellerId) return;
      const { effectiveShift, ...rest } = data;
      if (effectiveShift === "Both") {
        await dispatch(
          assignUserToTeller({
            ...rest,
            effectiveShift: "AM",
            tellerId: selectedTellerId,
          }),
        );
        await dispatch(
          assignUserToTeller({
            ...rest,
            effectiveShift: "PM",
            tellerId: selectedTellerId,
          }),
        );
      } else {
        await dispatch(
          assignUserToTeller({
            ...rest,
            effectiveShift,
            tellerId: selectedTellerId,
          }),
        );
      }
    },
    [dispatch, selectedTellerId],
  );

  const handleEndUserAssignment = useCallback(
    async (assignmentId: number, data: TellerUserAssignmentEnd) => {
      if (!selectedTellerId) return;
      await dispatch(endUserAssignment({ assignmentId, data }));
    },
    [dispatch, selectedTellerId],
  );

  return {
    // State
    tellers: items,
    selectedTeller,
    isLoading,
    error,
    refreshing,
    accounts,
    companyUsers,
    // Selection
    selectedTellerId,
    setSelectedTellerId,
    // Modals
    showCreateModal,
    setShowCreateModal,
    showAssignAccountModal,
    setShowAssignAccountModal,
    showAssignUserModal,
    setShowAssignUserModal,
    // Create form
    newTellerName,
    setNewTellerName,
    newTargetOperatingCapital,
    setNewTargetOperatingCapital,
    // Actions
    onRefresh,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleAssignAccount,
    handleEndAccountAssignment,
    handleAssignUser,
    handleEndUserAssignment,
  };
}
