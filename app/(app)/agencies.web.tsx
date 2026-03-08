import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectUserRole,
  enterAgency,
  selectViewingAgencyId,
} from "@/store/slices/authSlice";
import { useUser } from "@clerk/clerk-react";
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
} from "lucide-react";
import "../../styles/web.css";

export default function AgenciesScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const userRole = useAppSelector(selectUserRole);
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const viewingAgencyId = useAppSelector(selectViewingAgencyId);
  const {
    items: agencies,
    isLoading,
    error,
  } = useAppSelector((state) => state.companyInfo);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Use effective role: backend role first, fall back to Clerk metadata
  const clerkMetadataRole =
    (clerkUser?.publicMetadata as { role?: string } | undefined)?.role ?? null;
  const effectiveRole = userRole ?? clerkMetadataRole;
  const isSuperAdmin = effectiveRole === "Super Administrator";

  // Load agencies on mount
  useEffect(() => {
    if (isSuperAdmin) {
      dispatch(fetchCompanyInfoList({}));
    }
  }, [dispatch, isSuperAdmin]);

  // Still loading Clerk user — show spinner
  if (!isClerkLoaded) {
    return (
      <div
        className="page-wrapper"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            border: "4px solid #e5e7eb",
            borderTopColor: "#dc2626",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Access denied for non-superadmins
  if (!isSuperAdmin) {
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

  // Handle entering an agency
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
    try {
      await dispatch(deleteCompanyInfo(id)).unwrap();
      setDeleteConfirm(null);
      dispatch(fetchCompanyInfoList({}));
    } catch (err) {
      console.error("Failed to delete agency:", err);
    }
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  // Refresh agencies
  const handleRefresh = () => {
    dispatch(fetchCompanyInfoList({}));
  };

  return (
    <div className="page-wrapper">
      {/* Action bar */}
      <div className="agencies-action-bar">
        <button
          className="btn-refresh"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw size={18} className={isLoading ? "spin" : ""} />
        </button>
        <button className="btn btn-primary" onClick={handleCreate}>
          <Plus size={18} />
          <span>New Agency</span>
        </button>
      </div>

      {/* Content */}
      <div className="dashboard-content">
        {error && <div className="alert alert-error">{error}</div>}

        {isLoading ? (
          <div className="loading-container">
            <RefreshCw size={32} className="spin text-primary" />
            <p>Loading agencies...</p>
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
          <div className="agencies-grid">
            {agencies.map((agency) => (
              <div
                key={agency.id}
                className={`agency-card ${
                  viewingAgencyId === agency.id ? "agency-card-active" : ""
                }`}
              >
                <div className="agency-card-header">
                  <div className="agency-icon">
                    <Building2 size={24} />
                  </div>
                  <div className="agency-info">
                    <h3>{agency.name}</h3>
                    {agency.description && (
                      <p className="agency-description">{agency.description}</p>
                    )}
                  </div>
                </div>

                <div className="agency-stats">
                  <div className="agency-stat">
                    <DollarSign size={16} />
                    <div className="stat-content">
                      <span className="stat-label">Working Capital</span>
                      <strong className="stat-value">
                        {formatCurrency(
                          agency.totalWorkingCapital,
                          agency.currency,
                        )}
                      </strong>
                    </div>
                  </div>
                  <div className="agency-stat">
                    <div className="stat-content">
                      <span className="stat-label">Currency</span>
                      <strong className="stat-value">{agency.currency}</strong>
                    </div>
                  </div>
                </div>

                {agency.emails && agency.emails.length > 0 && (
                  <div className="agency-emails">
                    {agency.emails.slice(0, 2).map((email, i) => (
                      <span key={i} className="email-tag">
                        {email}
                      </span>
                    ))}
                    {agency.emails.length > 2 && (
                      <span className="email-tag">
                        +{agency.emails.length - 2} more
                      </span>
                    )}
                  </div>
                )}

                <div className="agency-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => handleEnterAgency(agency)}
                  >
                    <LogIn size={16} />
                    <span>Enter Agency</span>
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => handleEdit(agency)}
                  >
                    <Edit2 size={16} />
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
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
