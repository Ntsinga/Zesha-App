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
import { Building2, Plus, Edit2, Trash2, RefreshCw } from "lucide-react";
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
      {/* Header */}
      <header className="header-bar">
        <div className="header-left">
          <h1 className="header-title">Agencies</h1>
          <span className="header-date">
            {agencies.length} {agencies.length === 1 ? "agency" : "agencies"}
          </span>
        </div>
        <div className="header-right">
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
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Currency</th>
                  <th>Location</th>
                  <th>Admin</th>
                  <th>Email</th>
                  <th style={{ width: 100 }}></th>
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
                      <span className="agency-table-name">{agency.name}</span>
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
                      {agency.adminName || (
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
    </div>
  );
}
