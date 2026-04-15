import React, { useEffect } from "react";
import { useUser, useSignUp } from "@clerk/clerk-react";
import { useRouter } from "expo-router";
import SignUpPageWeb from "./sign-up.web";

/**
 * Welcome page for Clerk invitations (Web)
 * Handles invitation flow by showing sign-up which processes the ticket
 */
export default function WelcomePageWeb() {
  const { user, isLoaded } = useUser();
  const { signUp } = useSignUp();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    // If fully authenticated with password, go to app
    if (user && user.passwordEnabled) {
      router.replace("/");
      return;
    }

    // If authenticated but no password yet (invite accepted), go to set-password
    if (user && !user.passwordEnabled) {
      router.replace("/set-password");
      return;
    }

    // If there's a __clerk_ticket in the URL, redirect to set-password to process it
    const urlParams = new URLSearchParams(window.location.search);
    const ticket = urlParams.get("__clerk_ticket");
    if (ticket) {
      router.replace(`/set-password?__clerk_ticket=${ticket}`);
    }
  }, [isLoaded, user, router]);

  // Show sign-up page for non-invite flows
  return <SignUpPageWeb />;
}
