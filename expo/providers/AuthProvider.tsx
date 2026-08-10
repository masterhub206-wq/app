import createContextHook from "@nkzw/create-context-hook";
import React, { useCallback, useEffect, useState } from "react";

import {
  AdminProfile,
  clearAdminProfile,
  persistAdminProfile,
  restoreAdminProfile,
  signInWithPassword,
} from "@/services/authService";

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    let isMounted: boolean = true;

    const hydrateSession = async (): Promise<void> => {
      try {
        const storedProfile: AdminProfile | null = await restoreAdminProfile();
        if (isMounted) {
          setAdmin(storedProfile);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void hydrateSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AdminProfile> => {
    setIsSubmitting(true);
    try {
      const profile: AdminProfile = await signInWithPassword(email, password);
      await persistAdminProfile(profile);
      setAdmin(profile);
      return profile;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await clearAdminProfile();
    setAdmin(null);
  }, []);

  return {
    admin,
    isLoading,
    isSubmitting,
    signIn,
    signOut,
  };
});
