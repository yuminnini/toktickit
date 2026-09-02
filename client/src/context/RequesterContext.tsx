import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface Requester {
    id: number;
    name: string;
}

interface RequesterContextValue {
    requester: Requester | null;
    setRequester: (r: Requester) => void;
    clearRequester: () => void;
}

const STORAGE_KEY = "lab2-selected-requester";

const RequesterContext = createContext<RequesterContextValue | undefined>(undefined);

function loadFromStorage(): Requester | null {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as Requester;
    } catch {
        return null;
    }
}

export function RequesterProvider({ children }: { children: ReactNode }) {
    const [requester, setRequesterState] = useState<Requester | null>(loadFromStorage);

    const setRequester = useCallback((r: Requester) => {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(r));
        setRequesterState(r);
    }, []);

    const clearRequester = useCallback(() => {
        sessionStorage.removeItem(STORAGE_KEY);
        setRequesterState(null);
    }, []);

    return (
        <RequesterContext.Provider value={{ requester, setRequester, clearRequester }}>
            {children}
        </RequesterContext.Provider>
    );
}

export function useRequester(): RequesterContextValue {
    const ctx = useContext(RequesterContext);
    if (!ctx) throw new Error("useRequester must be used within a RequesterProvider");
    return ctx;
}