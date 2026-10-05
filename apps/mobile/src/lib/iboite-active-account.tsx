import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * État partagé de la « boîte active » iBoîte.
 *
 * Le sélecteur de compte (pastilles de l'onglet iBoîte) et les écrans consommateurs
 * (inbox, compose email, compose courrier) doivent pointer sur la même
 * boîte. On persiste l'id choisi dans AsyncStorage pour le retrouver après
 * relance (même pattern que `BIOMETRIC_KEY` ailleurs dans l'app).
 *
 * Le provider ne stocke que l'id : la résolution vers un compte réel (avec
 * fallback sur `accounts[0]` si l'id stocké n'existe plus) reste côté
 * consommateur, via `resolveActiveAccountId`.
 */

const STORAGE_KEY = 'iboite.activeAccountId';

type IBoiteActiveAccountValue = {
  /** Id du compte actif, ou `null` tant que rien n'est stocké/chargé. */
  activeAccountId: string | null;
  setActiveAccountId: (id: string) => void;
};

const IBoiteActiveAccountContext = createContext<IBoiteActiveAccountValue | null>(null);

export function IBoiteActiveAccountProvider({ children }: { children: React.ReactNode }) {
  const [activeAccountId, setActiveAccountIdState] = useState<string | null>(null);

  // Hydratation depuis AsyncStorage au montage.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (!cancelled && v) setActiveAccountIdState(v);
      })
      .catch(() => {
        // ignore — les consommateurs défauteront sur accounts[0].
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setActiveAccountId = useCallback((id: string) => {
    setActiveAccountIdState(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {
      // best-effort : la sélection reste effective en mémoire même si la
      // persistance échoue.
    });
  }, []);

  return (
    <IBoiteActiveAccountContext.Provider value={{ activeAccountId, setActiveAccountId }}>
      {children}
    </IBoiteActiveAccountContext.Provider>
  );
}

export function useIBoiteActiveAccount(): IBoiteActiveAccountValue {
  const ctx = useContext(IBoiteActiveAccountContext);
  if (!ctx) {
    throw new Error('useIBoiteActiveAccount doit être appelé dans un IBoiteActiveAccountProvider.');
  }
  return ctx;
}

/**
 * Résout l'id de compte actif effectif : l'id stocké s'il existe encore
 * dans la liste, sinon le premier compte. Retourne `null` si la liste est
 * vide ou pas encore chargée.
 */
export function resolveActiveAccountId(
  accounts: readonly { _id: string }[] | undefined,
  activeAccountId: string | null,
): string | null {
  if (!accounts || accounts.length === 0) return null;
  if (activeAccountId && accounts.some((a) => a._id === activeAccountId)) {
    return activeAccountId;
  }
  return accounts[0]._id;
}
