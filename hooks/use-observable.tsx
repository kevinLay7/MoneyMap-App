import { useState, useEffect } from 'react';
import { Model } from '@nozbe/watermelondb';
import { Observable } from '@nozbe/watermelondb/utils/rx';

/**
 * Generic hook to observe a WatermelonDB model
 */
export function useObservable<T extends Model>(observable: Observable<T>): T | null {
  const [value, setValue] = useState<T | null>(null);

  useEffect(() => {
    const subscription = observable.subscribe(setValue);
    return () => subscription.unsubscribe();
  }, [observable]);

  return value;
}

