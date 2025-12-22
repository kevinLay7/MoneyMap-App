import { useState, useEffect } from 'react';
import database from '@/model/database';

const NEEDS_USER_CREATION_KEY = 'needs_user_creation';

export function useUserCreationFlag() {
  const [needsUserCreation, setNeedsUserCreationState] = useState<boolean | null>(null);

  // Load initial value from database
  useEffect(() => {
    async function loadFlag() {
      const value = await database.localStorage.get<boolean>(NEEDS_USER_CREATION_KEY);
      setNeedsUserCreationState(value ?? true);
    }
    loadFlag();
  }, []);

  const setNeedsUserCreation = async (value: boolean) => {
    await database.localStorage.set(NEEDS_USER_CREATION_KEY, value);

    setNeedsUserCreationState(value);
  };

  return {
    needsUserCreation: needsUserCreation === true,
    isLoading: needsUserCreation === null,
    setNeedsUserCreation,
  };
}
