import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  completeAgencyOnboarding,
  clearError as clearCompanyError,
} from "@/store/slices/companyInfoSlice";
import {
  fetchAccounts,
  fetchAccountTemplates,
  inheritAccountTemplate,
  createAccountsBulk,
} from "@/store/slices/accountsSlice";
import {
  fetchUserByClerkId,
  completeMyAgencyOnboarding,
  selectNeedsAgencyOnboarding,
} from "@/store/slices/authSlice";
import type {
  CompanyInfoCreate,
  AccountCreate,
  AccountTypeEnum,
  CommissionModelEnum,
} from "@/types";
import { CURRENCIES } from "@/hooks/screens/useSettingsScreen";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Landmark,
  Plus,
  Trash2,
} from "lucide-react";
import "../styles/web.css";

type TemplateInstance = {
  instanceId: string;
  templateId: number;
  name: string;
};

type CustomAccountDraft = {
  id: string;
  name: string;
  description: string;
  accountType: AccountTypeEnum;
  commissionModel: CommissionModelEnum;
};

export default function AgencySetupWeb() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((state) => state.auth.user);
  const needsAgencyOnboarding = useAppSelector(selectNeedsAgencyOnboarding);
  const { isLoading: isCompanySaving, error: companyError } = useAppSelector(
    (state) => state.companyInfo,
  );
  const {
    items: existingAccounts,
    templates,
    isTemplatesLoading,
    isLoading: isAccountsSaving,
    error: accountsError,
  } = useAppSelector((state) => state.accounts);

  const [step, setStep] = useState<1 | 2>(1);

  const [adminFirstName, setAdminFirstName] = useState(
    authUser?.firstName?.trim() ?? "",
  );
  const [adminLastName, setAdminLastName] = useState(
    authUser?.lastName?.trim() ?? "",
  );
  const [workingCapitalInput, setWorkingCapitalInput] = useState("");

  const [companyForm, setCompanyForm] = useState<CompanyInfoCreate>({
    name: "",
    currency: "UGX",
    totalWorkingCapital: 0,
    description: "",
    emails: [],
    location: "",
  });
  const [emailInput, setEmailInput] = useState("");
  const [stepOneError, setStepOneError] = useState<string | null>(null);
  const [templateInstances, setTemplateInstances] = useState<
    TemplateInstance[]
  >([]);
  const [customAccounts, setCustomAccounts] = useState<CustomAccountDraft[]>(
    [],
  );
  const [isFinishing, setIsFinishing] = useState(false);
  const [accountStepError, setAccountStepError] = useState<string | null>(null);

  const companyId = authUser?.companyId ?? null;
  const existingAccountCount = useMemo(
    () =>
      existingAccounts.filter(
        (account) => account.isActive && !account.isTemplate,
      ).length,
    [existingAccounts],
  );

  useEffect(() => {
    if (!needsAgencyOnboarding && companyId) {
      router.replace("/(app)");
    }
  }, [companyId, needsAgencyOnboarding, router]);

  useEffect(() => {
    if (authUser?.onboardingStatus === "PENDING_ACCOUNTS") {
      setStep(2);
    } else {
      setStep(1);
    }
  }, [authUser?.onboardingStatus]);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    const nextFirstName = authUser.firstName?.trim() ?? "";
    const nextLastName = authUser.lastName?.trim() ?? "";

    setAdminFirstName((current) => current || nextFirstName);
    setAdminLastName((current) => current || nextLastName);
  }, [authUser]);

  useEffect(() => {
    if (step === 2) {
      dispatch(fetchAccounts({ forceRefresh: true }));
      dispatch(fetchAccountTemplates());
    }
  }, [dispatch, step]);

  useEffect(() => {
    return () => {
      dispatch(clearCompanyError());
    };
  }, [dispatch]);

  const handleCompanyFieldChange = <K extends keyof CompanyInfoCreate>(
    field: K,
    value: CompanyInfoCreate[K],
  ) => {
    setCompanyForm((prev) => ({ ...prev, [field]: value }));
    if (stepOneError) {
      setStepOneError(null);
    }
  };

  const addCompanyEmail = () => {
    if (!emailInput.trim()) {
      return;
    }

    const nextEmail = emailInput.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(nextEmail)) {
      setStepOneError("Enter a valid agency email address.");
      return;
    }

    if ((companyForm.emails ?? []).includes(nextEmail)) {
      setStepOneError("That agency email has already been added.");
      return;
    }

    setCompanyForm((prev) => ({
      ...prev,
      emails: [...(prev.emails ?? []), nextEmail],
    }));
    setEmailInput("");
    if (stepOneError) {
      setStepOneError(null);
    }
  };

  const removeCompanyEmail = (email: string) => {
    setCompanyForm((prev) => ({
      ...prev,
      emails: (prev.emails ?? []).filter((entry) => entry !== email),
    }));
  };

  const submitCompanySetup = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!companyForm.name?.trim()) {
      setStepOneError("Agency name is required.");
      return;
    }

    if (!adminFirstName.trim() || !adminLastName.trim()) {
      setStepOneError("Administrator first name and last name are required.");
      return;
    }

    const adminName = `${adminLastName.trim()}, ${adminFirstName.trim()}`;

    const result = await dispatch(
      completeAgencyOnboarding({
        ...companyForm,
        name: companyForm.name.trim(),
        adminName,
        description: companyForm.description?.trim() || undefined,
        location: companyForm.location?.trim() || undefined,
        emails: companyForm.emails?.length ? companyForm.emails : undefined,
      }),
    );

    if (
      completeAgencyOnboarding.fulfilled.match(result) &&
      authUser?.clerkUserId
    ) {
      await dispatch(fetchUserByClerkId(authUser.clerkUserId));
      setStep(2);
    }
  };

  const addTemplateInstance = (templateId: number, defaultName: string) => {
    const existingCount = templateInstances.filter(
      (inst) => inst.templateId === templateId,
    ).length;
    const numberedName =
      existingCount === 0 ? defaultName : `${defaultName} ${existingCount + 1}`;
    setTemplateInstances((prev) => [
      ...prev,
      {
        instanceId: `${templateId}-${Date.now()}`,
        templateId,
        name: numberedName,
      },
    ]);
  };

  const updateTemplateInstanceName = (instanceId: string, name: string) => {
    setTemplateInstances((prev) =>
      prev.map((inst) =>
        inst.instanceId === instanceId ? { ...inst, name } : inst,
      ),
    );
  };

  const removeTemplateInstance = (instanceId: string) => {
    setTemplateInstances((prev) =>
      prev.filter((inst) => inst.instanceId !== instanceId),
    );
  };

  const addCustomAccount = () => {
    setCustomAccounts((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${prev.length}`,
        name: "",
        description: "",
        accountType: "TELECOM",
        commissionModel: "EXPECTED_ONLY",
      },
    ]);
  };

  const updateCustomAccount = (
    id: string,
    field: keyof CustomAccountDraft,
    value: string,
  ) => {
    setCustomAccounts((prev) =>
      prev.map((account) =>
        account.id === id ? { ...account, [field]: value } : account,
      ),
    );
  };

  const removeCustomAccount = (id: string) => {
    setCustomAccounts((prev) => prev.filter((account) => account.id !== id));
  };

  const handleFinishOnboarding = async () => {
    setIsFinishing(true);
    try {
      await finishOnboarding();
    } finally {
      setIsFinishing(false);
    }
  };

  const finishOnboarding = async () => {
    const effectiveCompanyId = companyId ?? authUser?.companyId;
    if (!effectiveCompanyId || !authUser?.clerkUserId) {
      setAccountStepError("Company context is missing. Refresh and try again.");
      return;
    }

    setAccountStepError(null);

    const selectedTemplates = templateInstances.map((inst) => ({
      templateId: inst.templateId,
      name: inst.name.trim(),
    }));

    const invalidTemplate = selectedTemplates.find(
      (template) => !template.name,
    );
    if (invalidTemplate) {
      setAccountStepError("Every selected account needs a name.");
      return;
    }

    const invalidCustom = customAccounts.find(
      (account) => !account.name.trim(),
    );
    if (invalidCustom) {
      setAccountStepError("Every custom account needs a name.");
      return;
    }

    const requestedAccountCount =
      existingAccountCount + selectedTemplates.length + customAccounts.length;
    if (requestedAccountCount < 2) {
      setAccountStepError(
        "Add at least two accounts before completing onboarding.",
      );
      return;
    }

    for (const template of selectedTemplates) {
      const result = await dispatch(
        inheritAccountTemplate({
          templateId: template.templateId,
          name: template.name,
          companyId: effectiveCompanyId,
        }),
      );

      if (inheritAccountTemplate.rejected.match(result)) {
        setAccountStepError(
          (result.payload as string) ||
            "Failed to add a selected template account.",
        );
        return;
      }
    }

    if (customAccounts.length > 0) {
      const payload: AccountCreate[] = customAccounts.map((account) => ({
        name: account.name,
        description: account.description || undefined,
        accountType: account.accountType,
        commissionModel: account.commissionModel,
        companyId: effectiveCompanyId,
        isActive: true,
        initialBalance: 0,
      }));

      const result = await dispatch(createAccountsBulk({ accounts: payload }));
      if (createAccountsBulk.rejected.match(result)) {
        setAccountStepError(
          (result.payload as string) || "Failed to create custom accounts.",
        );
        return;
      }
    }

    const completionResult = await dispatch(completeMyAgencyOnboarding());
    if (completeMyAgencyOnboarding.rejected.match(completionResult)) {
      setAccountStepError(
        (completionResult.payload as string) ||
          "Failed to complete onboarding.",
      );
      return;
    }

    await dispatch(fetchUserByClerkId(authUser.clerkUserId));
    router.replace("/(app)");
  };

  return (
    <div
      className="page-wrapper"
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "var(--color-bg)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1480,
          margin: "0 auto",
          padding: "40px clamp(24px, 3vw, 40px) 60px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 12px",
              borderRadius: 999,
              background: "var(--color-danger-light)",
              color: "var(--color-primary)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            <Building2 size={12} />
            Agency Setup
          </div>
          <h1
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: "var(--color-text)",
              marginTop: 0,
              marginBottom: 8,
              letterSpacing: -0.5,
            }}
          >
            Finish setting up your agency
          </h1>
          <p
            style={{
              color: "var(--color-text-secondary)",
              maxWidth: 640,
              lineHeight: 1.6,
              margin: 0,
              fontSize: 15,
            }}
          >
            Add your agency details, choose the telecom and bank accounts you
            operate, then launch into the dashboard.
          </p>
        </div>

        <div className="settings-card">
          {step === 1 ? (
            <>
              <div className="settings-card-header">
                <Building2 size={24} className="text-primary" />
                <h2>Agency Information</h2>
              </div>

              {(stepOneError || companyError) && (
                <div className="alert alert-error mb-4">
                  <span>{stepOneError || companyError}</span>
                </div>
              )}

              <form onSubmit={submitCompanySetup}>
                {/* Section: Basic Details */}
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.7,
                    color: "var(--color-text-secondary)",
                    marginBottom: 14,
                  }}
                >
                  Basic Details
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 16,
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">Agency Name</label>
                    <input
                      type="text"
                      value={companyForm.name}
                      onChange={(e) =>
                        handleCompanyFieldChange("name", e.target.value)
                      }
                      className="form-input"
                      placeholder="Masakhane Financial Services"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      value={adminFirstName}
                      onChange={(e) => {
                        setAdminFirstName(e.target.value);
                        if (stepOneError) {
                          setStepOneError(null);
                        }
                      }}
                      className="form-input"
                      placeholder="Amahle"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      value={adminLastName}
                      onChange={(e) => {
                        setAdminLastName(e.target.value);
                        if (stepOneError) {
                          setStepOneError(null);
                        }
                      }}
                      className="form-input"
                      placeholder="Dlamini"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <input
                      type="text"
                      value={companyForm.location ?? ""}
                      onChange={(e) =>
                        handleCompanyFieldChange("location", e.target.value)
                      }
                      className="form-input"
                      placeholder="Johannesburg"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    value={companyForm.description ?? ""}
                    onChange={(e) =>
                      handleCompanyFieldChange("description", e.target.value)
                    }
                    className="form-input"
                    rows={3}
                    placeholder="Optional notes about the agency"
                  />
                </div>

                {/* Section: Financial Info */}
                <div
                  style={{
                    borderTop: "1px solid var(--color-border-light)",
                    marginTop: 8,
                    marginBottom: 14,
                    paddingTop: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.7,
                    color: "var(--color-text-secondary)",
                  }}
                >
                  Financial Info
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 16,
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">Currency</label>
                    <select
                      value={companyForm.currency ?? "UGX"}
                      onChange={(e) =>
                        handleCompanyFieldChange("currency", e.target.value)
                      }
                      className="form-select"
                    >
                      {CURRENCIES.map((currency) => (
                        <option key={currency.code} value={currency.code}>
                          {currency.code} - {currency.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Working Capital</label>
                    <input
                      type="number"
                      value={workingCapitalInput}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setWorkingCapitalInput(nextValue);
                        handleCompanyFieldChange(
                          "totalWorkingCapital",
                          nextValue === "" ? 0 : Number(nextValue),
                        );
                      }}
                      className="form-input"
                      min="0"
                      placeholder="3000000"
                    />
                  </div>
                </div>

                {/* Section: Contact */}
                <div
                  style={{
                    borderTop: "1px solid var(--color-border-light)",
                    marginTop: 8,
                    marginBottom: 14,
                    paddingTop: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.7,
                    color: "var(--color-text-secondary)",
                  }}
                >
                  Contact (Optional)
                </div>

                <div className="form-group">
                  <label className="form-label">Agency Emails</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="form-input"
                      placeholder="ops@agency.com"
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={addCompanyEmail}
                    >
                      Add Email
                    </button>
                  </div>
                  {(companyForm.emails ?? []).length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        marginTop: 12,
                      }}
                    >
                      {(companyForm.emails ?? []).map((email) => (
                        <button
                          key={email}
                          type="button"
                          onClick={() => removeCompanyEmail(email)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            border: "1px solid var(--color-primary-light)",
                            background: "#fff5f5",
                            color: "var(--color-primary)",
                            borderRadius: 999,
                            padding: "4px 10px",
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: "pointer",
                          }}
                        >
                          {email}
                          <span style={{ fontSize: 14, lineHeight: 1 }}>×</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-actions" style={{ marginTop: 24 }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isCompanySaving}
                  >
                    <ChevronRight size={18} />
                    {isCompanySaving
                      ? "Saving agency..."
                      : "Continue to Accounts"}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="settings-card-header">
                <Landmark size={24} className="text-primary" />
                <h2>Which accounts does your agency use?</h2>
              </div>

              <p className="form-hint mb-4">
                Select all the mobile money and bank services your agency
                operates. You need at least two to get started.
              </p>

              {(accountStepError || accountsError) && (
                <div className="alert alert-error mb-4">
                  <span>{accountStepError || accountsError}</span>
                </div>
              )}

              <div style={{ display: "grid", gap: 24 }}>
                <section>
                  {isTemplatesLoading ? (
                    <p className="text-muted">Loading accounts...</p>
                  ) : templates.length === 0 ? (
                    <p className="text-muted">No accounts are available yet.</p>
                  ) : (
                    <div style={{ display: "grid", gap: 12 }}>
                      {templates.map((template) => {
                        const isBank = template.accountType === "BANK";
                        return (() => {
                          const instances = templateInstances.filter(
                            (inst) => inst.templateId === template.id,
                          );
                          const hasInstances = instances.length > 0;
                          return (
                            <div
                              key={template.id}
                              style={{
                                border: hasInstances
                                  ? "1.5px solid var(--color-primary)"
                                  : "1px solid var(--color-border)",
                                borderRadius: "var(--radius-md)",
                                padding: 16,
                                background: hasInstances
                                  ? "#fff5f5"
                                  : "var(--color-bg-card)",
                                transition:
                                  "border-color 0.2s, background 0.2s",
                              }}
                            >
                              {/* Template header row */}
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: 16,
                                  alignItems: "flex-start",
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                      flexWrap: "wrap",
                                      marginBottom: 4,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontWeight: 700,
                                        fontSize: 15,
                                      }}
                                    >
                                      {template.name}
                                    </span>
                                    <span
                                      style={{
                                        display: "inline-block",
                                        padding: "2px 8px",
                                        borderRadius: 999,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        letterSpacing: 0.3,
                                        background: isBank
                                          ? "var(--color-success-light)"
                                          : "var(--color-info-light)",
                                        color: isBank
                                          ? "var(--color-success)"
                                          : "var(--color-info)",
                                      }}
                                    >
                                      {template.accountType}
                                    </span>
                                    {template.commissionSchedule?.name && (
                                      <span
                                        style={{
                                          fontSize: 12,
                                          color: "var(--color-text-secondary)",
                                        }}
                                      >
                                        {template.commissionSchedule.name}
                                      </span>
                                    )}
                                  </div>
                                  {template.description && (
                                    <div
                                      style={{
                                        color: "var(--color-text-secondary)",
                                        fontSize: 13,
                                        lineHeight: 1.4,
                                      }}
                                    >
                                      {template.description}
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() =>
                                    addTemplateInstance(
                                      template.id,
                                      template.name,
                                    )
                                  }
                                  style={{ flexShrink: 0 }}
                                >
                                  {hasInstances ? (
                                    <>
                                      <Plus size={13} />
                                      Add another
                                    </>
                                  ) : (
                                    "I use this"
                                  )}
                                </button>
                              </div>

                              {/* Inline instances */}
                              {hasInstances && (
                                <div
                                  style={{
                                    marginTop: 14,
                                    display: "grid",
                                    gap: 8,
                                  }}
                                >
                                  {instances.map((inst, idx) => (
                                    <div
                                      key={inst.instanceId}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        background: "var(--color-bg-card)",
                                        border:
                                          "1px solid var(--color-border-light)",
                                        borderRadius: "var(--radius-sm, 8px)",
                                        padding: "8px 10px",
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: 12,
                                          color: "var(--color-text-secondary)",
                                          whiteSpace: "nowrap",
                                          minWidth: 20,
                                        }}
                                      >
                                        #{idx + 1}
                                      </span>
                                      <input
                                        type="text"
                                        value={inst.name}
                                        onChange={(e) =>
                                          updateTemplateInstanceName(
                                            inst.instanceId,
                                            e.target.value,
                                          )
                                        }
                                        className="form-input"
                                        placeholder="Account name"
                                        style={{ flex: 1, margin: 0 }}
                                      />
                                      <button
                                        type="button"
                                        className="btn-icon"
                                        onClick={() =>
                                          removeTemplateInstance(
                                            inst.instanceId,
                                          )
                                        }
                                        title="Remove"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })();
                      })}
                    </div>
                  )}
                </section>

                <section>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0 }}>Don't see yours?</h3>
                      <div
                        style={{
                          color: "#64748b",
                          fontSize: 13,
                          marginTop: 4,
                        }}
                      >
                        Add an account that isn't in the list above.
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={addCustomAccount}
                    >
                      <Plus size={16} />
                      Add manually
                    </button>
                  </div>

                  {customAccounts.length === 0 ? (
                    <p className="text-muted">None added yet.</p>
                  ) : (
                    <div style={{ display: "grid", gap: 14 }}>
                      {customAccounts.map((account, index) => (
                        <div
                          key={account.id}
                          style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: 12,
                            padding: 16,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 12,
                            }}
                          >
                            <strong>Custom Account {index + 1}</strong>
                            <button
                              type="button"
                              className="btn-icon"
                              onClick={() => removeCustomAccount(account.id)}
                              title="Remove account"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(220px, 1fr))",
                              gap: 12,
                            }}
                          >
                            <div className="form-group">
                              <label className="form-label">Name</label>
                              <input
                                type="text"
                                value={account.name}
                                onChange={(e) =>
                                  updateCustomAccount(
                                    account.id,
                                    "name",
                                    e.target.value,
                                  )
                                }
                                className="form-input"
                                placeholder="MTN MOMO"
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Account Type</label>
                              <select
                                value={account.accountType}
                                onChange={(e) =>
                                  updateCustomAccount(
                                    account.id,
                                    "accountType",
                                    e.target.value,
                                  )
                                }
                                className="form-select"
                              >
                                <option value="BANK">BANK</option>
                                <option value="TELECOM">TELECOM</option>
                              </select>
                            </div>
                            <div className="form-group">
                              <label className="form-label">
                                Commission Model
                              </label>
                              <select
                                value={account.commissionModel}
                                onChange={(e) =>
                                  updateCustomAccount(
                                    account.id,
                                    "commissionModel",
                                    e.target.value,
                                  )
                                }
                                className="form-select"
                              >
                                <option value="EXPECTED_ONLY">
                                  EXPECTED_ONLY
                                </option>
                                <option value="CUMULATIVE">CUMULATIVE</option>
                                <option value="PARTIAL">PARTIAL</option>
                              </select>
                            </div>
                            <div
                              className="form-group"
                              style={{ gridColumn: "1 / -1" }}
                            >
                              <label className="form-label">Description</label>
                              <input
                                type="text"
                                value={account.description}
                                onChange={(e) =>
                                  updateCustomAccount(
                                    account.id,
                                    "description",
                                    e.target.value,
                                  )
                                }
                                className="form-input"
                                placeholder="Optional description"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <div className="form-actions" style={{ marginTop: 28 }}>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={isFinishing || isTemplatesLoading}
                  onClick={handleFinishOnboarding}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {isFinishing ? (
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        border: "2px solid rgba(255,255,255,0.4)",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                        display: "inline-block",
                        animation: "spin 0.7s linear infinite",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  {isFinishing ? "Finishing setup..." : "Finish Setup"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
