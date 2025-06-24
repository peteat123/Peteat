import { useEffect } from 'react';
import { router, useSegments } from 'expo-router';
import { useUserRole } from '@/app/contexts/UserRoleContext';

/**
 * Simple role guard – call inside a screen to redirect if current userRole is not allowed.
 * @param allowed array of allowed roles, e.g., ['clinic'] or ['user']
 */
export const useRoleGuard = (allowed: ('clinic' | 'user')[]) => {
  const { userRole } = useUserRole();
  const segments = useSegments();

  useEffect(() => {
    if (!allowed.includes(userRole)) {
      // Unauthorized – navigate to safe root (tabs index)
      router.replace('/(tabs)');
    }
  }, [userRole, allowed, segments]);
}; 