import { useState, useEffect } from 'react';
import { Model } from '@nozbe/watermelondb';
import { Observable } from '@nozbe/watermelondb/utils/rx';

/**
 * Generic hook to observe a WatermelonDB model
 */
export function useObservable<T extends Model>(observable: Observable<T> | undefined | null): T | null {
  const [value, setValue] = useState<T | null>(null);

  useEffect(() => {
    if (!observable) {
      return;
    }

    const subscription = observable.subscribe({
      next: setValue,
      error: error => {
        // Silently handle "Record not found" errors
        // This is expected when observing models that reference non-existent records
        const isRecordNotFound = error?.message?.includes('Record not found') || error?.message?.includes('not found');

        if (!isRecordNotFound) {
          console.warn('Error observing model:', error);
        }

        setValue(null);
      },
    });
    return () => subscription.unsubscribe();
  }, [observable]);

  return value;
}

/**
 * Generic hook to observe a WatermelonDB collection
 */
export function useObservableCollection<T extends Model>(observable: Observable<T[]> | null | undefined): T[] {
  const [value, setValue] = useState<T[]>([]);

  useEffect(() => {
    if (!observable) {
      setValue([]);
      return;
    }

    const subscription = observable.subscribe({
      next: setValue,
      error: error => {
        // Silently handle "Record not found" errors
        const isRecordNotFound = error?.message?.includes('Record not found') || error?.message?.includes('not found');

        if (!isRecordNotFound) {
          console.warn('Error observing collection:', error);
        }

        setValue([]);
      },
    });
    return () => subscription.unsubscribe();
  }, [observable]);

  return value;
}
