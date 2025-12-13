import { useState, useEffect, useMemo } from 'react';
import { Model, Relation } from '@nozbe/watermelondb';

// Extract the relation type from the declared type
// WatermelonDB relations are declared as Model | undefined, not Relation<Model>
// We extract the Model type, excluding undefined/null
type ExtractRelationType<T, K extends keyof T> = NonNullable<T[K]> extends Model ? NonNullable<T[K]> : never;

type RelationsMap<T extends Model, R extends readonly (keyof T)[]> = {
  [K in R[number]]: ExtractRelationType<T, K> | undefined;
};

/**
 * Hook to observe a WatermelonDB model and its relations
 *
 * @example
 * // Observe account with item relation
 * const { model: account, relations: { item } } = useModelWithRelations(account, ['item']);
 *
 * @example
 * // Observe transaction with account and category relations
 * const { model: transaction, relations: { account, category } } = useModelWithRelations(transaction, ['account', 'category']);
 */
export function useModelWithRelations<T extends Model, R extends readonly (keyof T)[]>(
  model: T,
  relationKeys: R
): {
  model: T;
  relations: RelationsMap<T, R>;
} {
  const [observedModel, setObservedModel] = useState<T>(model);
  const [relations, setRelations] = useState<RelationsMap<T, R>>(() => {
    const initial = {} as RelationsMap<T, R>;
    relationKeys.forEach(key => {
      initial[key] = undefined as any;
    });
    return initial;
  });

  // Memoize relation keys to avoid unnecessary re-subscriptions
  const relationKeysStr = useMemo(() => relationKeys.join(','), [relationKeys]);

  useEffect(() => {
    const modelSub = model.observe().subscribe(setObservedModel);

    const relationSubs = relationKeys
      .map(key => {
        const relation = model[key] as Relation<Model> | undefined;
        if (!relation || typeof relation.observe !== 'function') {
          return null;
        }

        return relation.observe().subscribe({
          next: observedRelation => {
            setRelations(prev => ({
              ...prev,
              [key]: observedRelation as any,
            }));
          },
          error: error => {
            // Silently handle "Record not found" errors for optional relations
            // This is expected when a relation ID references a non-existent record
            const isRecordNotFound = 
              error?.message?.includes('Record not found') ||
              error?.message?.includes('not found');
            
            if (!isRecordNotFound) {
              console.warn(`Error observing relation ${String(key)}:`, error);
            }
            
            setRelations(prev => ({
              ...prev,
              [key]: undefined as any,
            }));
          },
        });
      })
      .filter(Boolean);

    return () => {
      modelSub.unsubscribe();
      relationSubs.forEach(sub => sub?.unsubscribe());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, relationKeysStr]);

  return { model: observedModel, relations };
}
