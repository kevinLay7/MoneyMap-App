import { useState, useEffect } from 'react';
import { Model } from '@nozbe/watermelondb';
import { Observable } from '@nozbe/watermelondb/utils/rx';

/**
 * Generic hook to observe a WatermelonDB model
 */
export function useObservable<T extends Model>(observable: Observable<T>): T | null {
  const [value, setValue] = useState<T | null>(null);

  useEffect(() => {
    const subscription = observable.subscribe({
      next: setValue,
      error: error => {
        console.warn('Error observing model:', error);
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
export function useObservableCollection<T extends Model>(observable: Observable<T[]>): T[] {
  const [value, setValue] = useState<T[]>([]);

  useEffect(() => {
    const subscription = observable.subscribe({
      next: setValue,
      error: error => {
        console.warn('Error observing collection:', error);
        setValue([]);
      },
    });
    return () => subscription.unsubscribe();
  }, [observable]);

  return value;
}

