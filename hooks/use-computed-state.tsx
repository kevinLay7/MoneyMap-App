import { useState, useEffect } from 'react';
import { Observable } from '@nozbe/watermelondb/utils/rx';

/**
 * Hook to observe a computed state observable from a WatermelonDB model.
 *
 * This is designed for use with @lazy observables that return derived state
 * (e.g., Budget.computedState$, Account.computedState$).
 *
 * @example
 * // In a component:
 * const budgetState = useComputedState(budget?.computedState$)
 * if (!budgetState) return <Loading />
 * return <Text>{budgetState.remainingSafeToSpend}</Text>
 */
export function useComputedState<T>(observable$: Observable<T> | undefined | null): T | null {
  const [state, setState] = useState<T | null>(null);

  useEffect(() => {
    if (!observable$) {
      setState(null);
      return;
    }

    const subscription = observable$.subscribe({
      next: setState,
      error: error => {
        // Silently handle expected errors (e.g., record not found during deletion)
        const isRecordNotFound =
          error?.message?.includes('Record not found') || error?.message?.includes('not found');

        if (!isRecordNotFound) {
          console.warn('Error in computed state observable:', error);
        }

        setState(null);
      },
    });

    return () => subscription.unsubscribe();
  }, [observable$]);

  return state;
}

