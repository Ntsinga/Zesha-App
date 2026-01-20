import React, { useEffect } from "react";
import { useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import SignUpPage from "./sign-up";

/**
 * Welcome page for Clerk invitations
 * Redirects authenticated users without passwords to set-password
 * Otherwise shows sign-up flow
 */
export default function WelcomePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    // If user is authenticated and doesn't have a password, redirect to set-password
    if (user && !user.passwordEnabled) {
      router.replace("/set-password");
    }
  }, [isLoaded, user, router]);

  // Show sign-up page (which handles invite tickets)
  return <SignUpPage />;
}
