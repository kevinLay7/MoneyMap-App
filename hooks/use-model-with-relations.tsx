import { useState, useEffect, useMemo } from 'react';
import { Model } from '@nozbe/watermelondb';

type RelationKey<T> = {
  [K in keyof T]: T[K] extends Model ? K : never;
}[keyof T];

type Relations<T extends Model> = {
  [K in RelationKey<T>]?: T[K];
};

/**
 * Hook to observe a WatermelonDB model and its relations
 * 
 * @example
 * // Observe account with item relation
 * const { model: account, relations: { item } } = useModelWithRelations(account, ['item']);
 * 
 * @example
 * // Observe transaction with account relation
 * const { model: transaction, relations: { account } } = useModelWithRelations(transaction, ['account']);
 */
export function useModelWithRelations<T extends Model, R extends (keyof T)[]>(
  model: T,
  relationKeys: R
): {
  model: T;
  relations: Relations<T>;
} {
  const [observedModel, setObservedModel] = useState<T>(model);
  const [relations, setRelations] = useState<Relations<T>>(() => {
    const initial: Relations<T> = {} as Relations<T>;
    relationKeys.forEach(key => {
      const relation = model[key] as Model | undefined;
      if (relation) {
        initial[key] = relation as any;
      }
    });
    return initial;
  });

  // Memoize relation keys to avoid unnecessary re-subscriptions
  const relationKeysStr = useMemo(() => relationKeys.join(','), [relationKeys]);

  useEffect(() => {
    const modelSub = model.observe().subscribe(setObservedModel);
    
    // Initialize relations from current model
    const initialRelations: Relations<T> = {} as Relations<T>;
    relationKeys.forEach(key => {
      const relation = model[key] as Model | undefined;
      if (relation) {
        initialRelations[key] = relation as any;
      }
    });
    setRelations(initialRelations);
    
    const relationSubs = relationKeys.map(key => {
      const relation = model[key] as Model | undefined;
      if (!relation) return null;
      
      return relation.observe().subscribe(observedRelation => {
        setRelations(prev => ({
          ...prev,
          [key]: observedRelation,
        }));
      });
    }).filter(Boolean);

    return () => {
      modelSub.unsubscribe();
      relationSubs.forEach(sub => sub?.unsubscribe());
    };
  }, [model, relationKeysStr]);

  return { model: observedModel, relations };
}

