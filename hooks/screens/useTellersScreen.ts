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
} from "@/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function useTellersScreen() {
  const dispatch = useAppDispatch();
  const { items, selectedTeller, isLoading, error } = useAppSelector(
    (state) => state.tellers,
  );
  const accounts = useAppSelector((state) => state.accounts.items);

  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignAccountModal, setShowAssignAccountModal] = useState(false);
  const [showAssignUserModal, setShowAssignUserModal] = useState(false);
  const [selectedTellerId, setSelectedTellerId] = useState<number | null>(null);

  // Form state for create
  const [newTellerName, setNewTellerName] = useState("");
  const [newTargetCash, setNewTargetCash] = useState("");
  const [newTargetFloat, setNewTargetFloat] = useState("");

  useEffect(() => {
    void dispatch(fetchTellers({}));
  }, [dispatch]);

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
      companyId: 0, // Will be resolved from auth state by the thunk
      name: newTellerName.trim(),
      targetCash: parseFloat(newTargetCash) || 0,
      targetFloat: parseFloat(newTargetFloat) || 0,
    };
    const result = await dispatch(createTeller(payload));
    if (createTeller.fulfilled.match(result)) {
      setShowCreateModal(false);
      setNewTellerName("");
      setNewTargetCash("");
      setNewTargetFloat("");
    }
  }, [dispatch, newTellerName, newTargetCash, newTargetFloat]);

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
    async (data: TellerAccountAssignmentCreate) => {
      if (!selectedTellerId) return;
      await dispatch(
        assignAccountToTeller({ tellerId: selectedTellerId, data }),
      );
    },
    [dispatch, selectedTellerId],
  );

  const handleEndAccountAssignment = useCallback(
    async (assignmentId: number, data: TellerAccountAssignmentEnd) => {
      if (!selectedTellerId) return;
      await dispatch(
        endAccountAssignment({
          tellerId: selectedTellerId,
          assignmentId,
          data,
        }),
      );
    },
    [dispatch, selectedTellerId],
  );

  const handleAssignUser = useCallback(
    async (data: TellerUserAssignmentCreate) => {
      if (!selectedTellerId) return;
      await dispatch(assignUserToTeller({ tellerId: selectedTellerId, data }));
    },
    [dispatch, selectedTellerId],
  );

  const handleEndUserAssignment = useCallback(
    async (assignmentId: number, data: TellerUserAssignmentEnd) => {
      if (!selectedTellerId) return;
      await dispatch(
        endUserAssignment({
          tellerId: selectedTellerId,
          assignmentId,
          data,
        }),
      );
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
    newTargetCash,
    setNewTargetCash,
    newTargetFloat,
    setNewTargetFloat,
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
