import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { inviteUser, clearInviteState } from "../../store/slices/usersSlice";
import { selectEffectiveCompanyId } from "../../store/slices/authSlice";
import type { UserInviteRequest } from "@/types";

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: string;
}

export const useUserManagementScreen = () => {
  const dispatch = useAppDispatch();
  const companyId = useAppSelector(selectEffectiveCompanyId);
  const { isInviting, inviteSuccess, inviteError, lastInvitedEmail } =
    useAppSelector((state) => state.users);

  const [formData, setFormData] = useState<FormData>({
    email: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    role: "Agent",
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  // Clear success/error messages after some time
  useEffect(() => {
    if (inviteSuccess || inviteError) {
      const timer = setTimeout(() => {
        dispatch(clearInviteState());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [inviteSuccess, inviteError, dispatch]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.email || !formData.firstName || !formData.lastName) {
      setValidationError(
        "Please fill in all required fields (email, first name, last name)",
      );
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setValidationError("Please enter a valid email address");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!companyId) {
      setValidationError("Company not found. Please log in again.");
      return;
    }

    // Get the frontend URL from window location or construct it
    const frontendUrl =
      typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.host}`
        : undefined;

    const inviteData: UserInviteRequest = {
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phoneNumber: formData.phoneNumber || undefined,
      role: formData.role as any,
      companyId: companyId,
      redirectUrl: frontendUrl ? `${frontendUrl}/welcome` : undefined,
    };

    const result = await dispatch(inviteUser(inviteData));

    // Reset form on success
    if (inviteUser.fulfilled.match(result)) {
      handleReset();
    }
  };

  const handleReset = () => {
    setFormData({
      email: "",
      firstName: "",
      lastName: "",
      phoneNumber: "",
      role: "Agent",
    });
    setValidationError(null);
  };

  return {
    formData,
    isInviting,
    inviteSuccess,
    inviteError,
    validationError,
    lastInvitedEmail,
    handleInputChange,
    handleSubmit,
    handleReset,
  };
};
