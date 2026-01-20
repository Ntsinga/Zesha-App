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
    }
  }, [isLoaded, user, router]);

  // Show sign-up page (which handles invite tickets and password setup)
  return <SignUpPageWeb />;
}
