import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AuthContext } from "./AuthContext";

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

export const RequesterContext = createContext<RequesterContextValue | undefined>(undefined);

function loadFromStorage(): Requester | null {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (
            parsed &&
            typeof parsed === "object" &&
            typeof parsed.id === "number" &&
            typeof parsed.name === "string" &&
            parsed.name.trim().length > 0
        ) {
            return { id: parsed.id, name: parsed.name };
        }
        return null;
    } catch {
        return null;
    }
}

export function RequesterProvider({ children }: { children: ReactNode }) {
    const [requester, setRequesterState] = useState<Requester | null>(loadFromStorage);
    const auth = useContext(AuthContext);

    const setRequester = useCallback((r: Requester) => {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(r));
        setRequesterState(r);
    }, []);

    const clearRequester = useCallback(() => {
        sessionStorage.removeItem(STORAGE_KEY);
        setRequesterState(null);
    }, []);

    const effectiveRequester = auth?.user
        ? { id: auth.user.id, name: auth.user.name }
        : requester;

    return (
        <RequesterContext.Provider value={{ requester: effectiveRequester, setRequester, clearRequester }}>
            {children}
        </RequesterContext.Provider>
    );
}

export function useRequester(): RequesterContextValue {
    const ctx = useContext(RequesterContext);
    if (!ctx) {
        return {
            requester: null,
            setRequester: () => {},
            clearRequester: () => {},
        };
    }
    return ctx;
}