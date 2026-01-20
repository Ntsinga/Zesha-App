import React from "react";
import {
  UserPlus,
  Mail,
  Phone,
  User,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import { useUserManagementScreen } from "../hooks/screens/useUserManagementScreen";

export default function UserManagement() {
  const {
    formData,
    isInviting,
    inviteSuccess,
    inviteError,
    validationError,
    lastInvitedEmail,
    handleInputChange,
    handleSubmit,
    handleReset,
  } = useUserManagementScreen();

  const displayError = validationError || inviteError;
  const displaySuccess = inviteSuccess && lastInvitedEmail;

  return (
    <div className="settings-card full-width">
      <div className="settings-card-header">
        <UserPlus size={24} className="text-primary" />
        <h2>User Management</h2>
      </div>

      <p className="form-hint mb-4">
        Invite new users to the platform. They will receive an email invitation
        to set up their account.
      </p>

      {displayError && (
        <div className="alert alert-error mb-4">
          <AlertCircle size={18} />
          <span>{displayError}</span>
        </div>
      )}

      {displaySuccess && (
        <div className="alert alert-success mb-4">
          <Check size={18} />
          <span>Invitation sent successfully to {lastInvitedEmail}</span>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div className="form-row">
          <div className="form-group flex-1">
            <label className="form-label">
              First Name <span className="text-red-500">*</span>
            </label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) =>
                  handleInputChange("first_name", e.target.value)
                }
                placeholder="John"
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="form-group flex-1">
            <label className="form-label">
              Last Name <span className="text-red-500">*</span>
            </label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => handleInputChange("last_name", e.target.value)}
                placeholder="Doe"
                className="form-input"
                required
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            Email Address <span className="text-red-500">*</span>
          </label>
          <div className="input-with-icon">
            <Mail size={18} className="input-icon" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="john.doe@example.com"
              className="form-input"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Phone Number (Optional)</label>
          <div className="input-with-icon">
            <Phone size={18} className="input-icon" />
            <input
              type="tel"
              value={formData.phone_number}
              onChange={(e) =>
                handleInputChange("phone_number", e.target.value)
              }
              placeholder="+1234567890"
              className="form-input"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            Role <span className="text-red-500">*</span>
          </label>
          <div className="input-with-icon">
            <User size={18} className="input-icon" />
            <select
              value={formData.role}
              onChange={(e) => handleInputChange("role", e.target.value)}
              className="form-input"
              required
            >
              <option value="Agent">Agent</option>
              <option value="Agent Supervisor">Agent Supervisor</option>
              <option value="Administrator">Administrator</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={handleReset}
            className="btn-secondary"
            disabled={isInviting}
          >
            <X size={18} />
            Reset
          </button>
          <button type="submit" className="btn-primary" disabled={isInviting}>
            <UserPlus size={18} />
            {isInviting ? "Sending Invitation..." : "Send Invitation"}
          </button>
        </div>
      </form>
    </div>
  );
}
