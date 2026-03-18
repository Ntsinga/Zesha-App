import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchAccountTemplates,
  createAccountTemplate,
} from "../../store/slices/accountsSlice";
import { fetchCommissionTemplates } from "../../store/slices/commissionSchedulesSlice";
import type { RootState } from "../../store";
import type {
  Account,
  AccountTemplateCreate,
  AccountTypeEnum,
  CommissionModelEnum,
} from "../../types";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAccountTemplatesScreen() {
  const dispatch = useAppDispatch();

  const { templates, isTemplatesLoading, error } = useAppSelector(
    (state: RootState) => state.accounts
  );

  const { templates: scheduleTemplates, isTemplatesLoading: isSchedulesLoading } =
    useAppSelector((state: RootState) => state.commissionSchedules);

  // ── Messages ───────────────────────────────────────────────────────────────
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    if (type === "success") setTimeout(() => setMessage(null), 3500);
  };

  // ── Modal ──────────────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Form ───────────────────────────────────────────────────────────────────
  const [formName, setFormName] = useState("");
  const [formAccountType, setFormAccountType] = useState<AccountTypeEnum>("BANK");
  const [formDescription, setFormDescription] = useState("");
  const [formCommissionModel, setFormCommissionModel] =
    useState<CommissionModelEnum>("EXPECTED_ONLY");
  const [formScheduleId, setFormScheduleId] = useState<number | null>(null);

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchAccountTemplates());
    dispatch(fetchCommissionTemplates());
  }, [dispatch]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openModal = () => {
    setFormName("");
    setFormAccountType("BANK");
    setFormDescription("");
    setFormCommissionModel("EXPECTED_ONLY");
    setFormScheduleId(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      showMsg("error", "Template name is required.");
      return;
    }

    const payload: AccountTemplateCreate = {
      name: formName.trim(),
      accountType: formAccountType,
      description: formDescription.trim() || undefined,
      commissionModel: formCommissionModel,
      commissionScheduleId: formScheduleId ?? undefined,
    };

    setIsSubmitting(true);
    try {
      await dispatch(createAccountTemplate(payload)).unwrap();
      showMsg("success", "Account template created.");
      closeModal();
    } catch (err) {
      showMsg(
        "error",
        err instanceof Error ? err.message : "Failed to create template."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const refresh = () => {
    dispatch(fetchAccountTemplates());
  };

  return {
    // Data
    templates,
    isTemplatesLoading,
    scheduleTemplates,
    isSchedulesLoading,
    error,

    // Messages
    message,

    // Modal
    isModalOpen,
    openModal,
    closeModal,
    isSubmitting,

    // Form
    formName,
    setFormName,
    formAccountType,
    setFormAccountType,
    formDescription,
    setFormDescription,
    formCommissionModel,
    setFormCommissionModel,
    formScheduleId,
    setFormScheduleId,

    // Actions
    handleSubmit,
    refresh,
  };
}
