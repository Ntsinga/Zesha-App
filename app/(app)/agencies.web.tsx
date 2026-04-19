import React, { useState, useEffect, useCallback } from "react";
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
import { inviteAgencyAdmin, clearInviteState } from "@/store/slices/usersSlice";
import type { CompanyInfo } from "@/types";
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Mail,
  Phone,
  UserPlus,
  Check,
  AlertCircle,
  X,
} from "lucide-react";
import "../../styles/web.css";

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
  const { isInviting, inviteSuccess, inviteError, lastInvitedEmail } =
    useAppSelector((state) => state.users);

  const isSuperAdmin = userRole === "Super Administrator";

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
  });
  const [inviteValidationError, setInviteValidationError] = useState<
    string | null
  >(null);

  // Fetch agencies as soon as the Redux role is available — no Clerk wait
  useEffect(() => {
    if (isSuperAdmin) {
      dispatch(fetchCompanyInfoList({}));
    }
  }, [dispatch, isSuperAdmin]);

  // Auto-close modal and clear invite state after success
  useEffect(() => {
    if (inviteSuccess) {
      const timer = window.setTimeout(() => {
        dispatch(clearInviteState());
        setInviteModalOpen(false);
        setInviteForm({
          email: "",
          firstName: "",
          lastName: "",
          phoneNumber: "",
        });
      }, 2200);
      return () => window.clearTimeout(timer);
    }
  }, [dispatch, inviteSuccess]);

  useEffect(() => {
    if (inviteError) {
      const timer = window.setTimeout(() => {
        dispatch(clearInviteState());
      }, 5000);
      return () => window.clearTimeout(timer);
    }
  }, [dispatch, inviteError]);

  const handleEnterAgency = (agency: CompanyInfo) => {
    dispatch(enterAgency({ agencyId: agency.id, agencyName: agency.name }));
    router.push("/(app)");
  };

  const handleCreate = () => router.push("/agency-form");
  const handleEdit = (agency: CompanyInfo) =>
    router.push(`/agency-form?id=${agency.id}`);

  const handleDelete = async (id: number) => {
    try {
      await dispatch(deleteCompanyInfo(id)).unwrap();
      setDeleteConfirm(null);
      dispatch(fetchCompanyInfoList({}));
    } catch (err) {
      console.error("Failed to delete agency:", err);
    }
  };

  const handleInviteChange = (
    field: "email" | "firstName" | "lastName" | "phoneNumber",
    value: string,
  ) => {
    setInviteForm((prev) => ({ ...prev, [field]: value }));
    if (inviteValidationError) setInviteValidationError(null);
  };

  const openInviteModal = useCallback(() => {
    setInviteForm({ email: "", firstName: "", lastName: "", phoneNumber: "" });
    setInviteValidationError(null);
    dispatch(clearInviteState());
    setInviteModalOpen(true);
  }, [dispatch]);

  const closeInviteModal = useCallback(() => {
    if (isInviting) return;
    setInviteModalOpen(false);
    setInviteValidationError(null);
    dispatch(clearInviteState());
  }, [dispatch, isInviting]);

  const handleAgencyInvite = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!inviteForm.email.trim()) {
      setInviteValidationError("Email is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email.trim())) {
      setInviteValidationError("Enter a valid email address.");
      return;
    }

    const frontendUrl =
      typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.host}`
        : undefined;

    await dispatch(
      inviteAgencyAdmin({
        email: inviteForm.email.trim(),
        firstName: inviteForm.firstName.trim() || undefined,
        lastName: inviteForm.lastName.trim() || undefined,
        phoneNumber: inviteForm.phoneNumber.trim() || undefined,
        redirectUrl: frontendUrl ? `${frontendUrl}/welcome` : undefined,
      }),
    );
  };

  if (!isSuperAdmin && userRole !== null) {
    return (
      <div className="page-wrapper">
        <div className="access-denied">
          <Building2 size={48} className="text-muted" />
          <h2>Access Denied</h2>
          <p>You need Super Administrator privileges to access this area.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Header */}
      <header className="header-bar">
        <div className="header-left">
          <h1 className="header-title">Agencies</h1>
          <span className="header-date">
            {isLoading
              ? "Loading…"
              : `${agencies.length} ${agencies.length === 1 ? "agency" : "agencies"}`}
          </span>
        </div>
        <div className="header-right">
          <button
            className="btn btn-secondary"
            onClick={openInviteModal}
            title="Invite agency administrator"
          >
            <UserPlus size={17} />
            <span>Invite Agency</span>
          </button>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={18} />
            <span>New Agency</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="dashboard-content">
        {error && <div className="alert alert-error">{error}</div>}

        {isLoading ? (
          <div className="loading-container" style={{ minHeight: "40vh" }}>
            <RefreshCw size={28} className="spin text-primary" />
            <p>Loading agencies…</p>
          </div>
        ) : agencies.length === 0 ? (
          <div className="empty-state">
            <Building2 size={48} className="text-muted" />
            <h3>No Agencies Yet</h3>
            <p>Create your first agency to get started.</p>
            <button className="btn btn-primary" onClick={handleCreate}>
              <Plus size={18} />
              <span>Create Agency</span>
            </button>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Currency</th>
                  <th>Location</th>
                  <th>Admin</th>
                  <th>Email</th>
                  <th style={{ width: 110 }}></th>
                </tr>
              </thead>
              <tbody>
                {agencies.map((agency) => (
                  <tr
                    key={agency.id}
                    className={`agency-table-row${viewingAgencyId === agency.id ? " agency-row-active" : ""}`}
                    onClick={() => handleEnterAgency(agency)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span className="agency-table-name">{agency.name}</span>
                        {viewingAgencyId === agency.id && (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 7px",
                              borderRadius: 999,
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: 0.4,
                              textTransform: "uppercase",
                              background: "var(--color-danger-light)",
                              color: "var(--color-primary)",
                              flexShrink: 0,
                            }}
                          >
                            Viewing
                          </span>
                        )}
                      </div>
                      {agency.description && (
                        <span className="agency-table-desc">
                          {agency.description}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-neutral">
                        {agency.currency}
                      </span>
                    </td>
                    <td>
                      {agency.location || <span className="text-muted">—</span>}
                    </td>
                    <td>
                      {agency.adminName ? (
                        (() => {
                          const parts = agency.adminName
                            .split(",")
                            .map((p: string) => p.trim());
                          const display =
                            parts.length === 2
                              ? `${parts[1]} ${parts[0]}`
                              : agency.adminName;
                          return <span>{display}</span>;
                        })()
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      {agency.emails && agency.emails.length > 0 ? (
                        <span>{agency.emails[0]}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="agency-actions">
                        <button
                          className="btn btn-outline"
                          onClick={() => handleEdit(agency)}
                        >
                          <Edit2 size={15} />
                        </button>
                        {deleteConfirm === agency.id ? (
                          <>
                            <button
                              className="btn btn-danger"
                              onClick={() => handleDelete(agency.id)}
                            >
                              Confirm
                            </button>
                            <button
                              className="btn btn-outline"
                              onClick={() => setDeleteConfirm(null)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn btn-outline btn-danger-outline"
                            onClick={() => setDeleteConfirm(agency.id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {inviteModalOpen && (
        <div
          className="modal-overlay"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeInviteModal();
          }}
        >
          <div className="modal-content" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-danger-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <UserPlus
                    size={18}
                    style={{ color: "var(--color-primary)" }}
                  />
                </div>
                <div>
                  <h2 style={{ margin: 0 }}>Invite Agency</h2>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 12,
                      color: "var(--color-text-secondary)",
                      fontWeight: 400,
                    }}
                  >
                    They will receive a setup link by email
                  </p>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={closeInviteModal}
                disabled={isInviting}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAgencyInvite}>
              <div className="modal-form">
                {(inviteValidationError || inviteError) && (
                  <div
                    className="alert alert-error"
                    style={{
                      marginBottom: 20,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{inviteValidationError || inviteError}</span>
                  </div>
                )}

                {inviteSuccess && lastInvitedEmail && (
                  <div
                    className="alert alert-success"
                    style={{
                      marginBottom: 20,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Check size={16} style={{ flexShrink: 0 }} />
                    <span>
                      Invitation sent to <strong>{lastInvitedEmail}</strong>
                    </span>
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      value={inviteForm.firstName}
                      onChange={(e) =>
                        handleInviteChange("firstName", e.target.value)
                      }
                      placeholder="Amahle"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      value={inviteForm.lastName}
                      onChange={(e) =>
                        handleInviteChange("lastName", e.target.value)
                      }
                      placeholder="Dlamini"
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Email Address{" "}
                    <span style={{ color: "var(--color-primary)" }}>*</span>
                  </label>
                  <div className="input-with-icon">
                    <Mail size={17} className="input-icon" />
                    <input
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) =>
                        handleInviteChange("email", e.target.value)
                      }
                      placeholder="owner@agency.com"
                      className="form-input"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Phone Number</label>
                  <div className="input-with-icon">
                    <Phone size={17} className="input-icon" />
                    <input
                      type="tel"
                      value={inviteForm.phoneNumber}
                      onChange={(e) =>
                        handleInviteChange("phoneNumber", e.target.value)
                      }
                      placeholder="+27123456789"
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeInviteModal}
                  disabled={isInviting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isInviting}
                  style={{ flex: 1 }}
                >
                  <UserPlus size={17} />
                  {isInviting ? "Sending…" : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
