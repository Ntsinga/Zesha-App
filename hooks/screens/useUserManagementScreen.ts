import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  inviteUser,
  clearInviteState,
  UserInviteRequest,
} from "../../store/slices/usersSlice";

interface FormData {
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
}

export const useUserManagementScreen = () => {
  const dispatch = useAppDispatch();
  const { isInviting, inviteSuccess, inviteError, lastInvitedEmail } =
    useAppSelector((state) => state.users);

  const [formData, setFormData] = useState<FormData>({
    email: "",
    first_name: "",
    last_name: "",
    phone_number: "",
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
    if (!formData.email || !formData.first_name || !formData.last_name) {
      setValidationError(
        "Please fill in all required fields (email, first name, last name)"
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

    const inviteData: UserInviteRequest = {
      email: formData.email,
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone_number: formData.phone_number || undefined,
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
      first_name: "",
      last_name: "",
      phone_number: "",
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
