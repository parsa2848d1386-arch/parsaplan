import React, { createContext, useContext, useState, ReactNode, useRef, useCallback } from 'react';
import { ToastMessage, ToastType, ToastAction, ConfirmDialogState } from '../types';

export interface ShowToastOptions {
    action?: ToastAction;
    durationMs?: number;
}

interface UIContextType {
    toasts: ToastMessage[];
    showToast: (message: string, type?: ToastType, options?: ShowToastOptions) => void;
    removeToast: (id: string) => void;
    confirmState: ConfirmDialogState;
    askConfirm: (title: string, message: string, onConfirm: () => void, type?: 'danger' | 'info') => void;
    closeConfirm: () => void;
    isMorningModalOpen: boolean;
    setMorningModalOpen: (open: boolean) => void;
    isEveningModalOpen: boolean;
    setEveningModalOpen: (open: boolean) => void;
    isBrainDumpOpen: boolean;
    setBrainDumpOpen: (open: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // --- TOASTS ---
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const removeToast = useCallback((id: string) => {
        const timer = timersRef.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(id);
        }
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'info', options?: ShowToastOptions) => {
        const id = crypto.randomUUID();
        const duration = options?.durationMs ?? (options?.action ? 5200 : 3200);
        setToasts(prev => [...prev.slice(-2), { id, message, type, action: options?.action, durationMs: duration }]);
        const timer = setTimeout(() => removeToast(id), duration);
        timersRef.current.set(id, timer);
    }, [removeToast]);

    // --- CONFIRM DIALOG ---
    const [confirmState, setConfirmState] = useState<ConfirmDialogState>({
        isOpen: false, message: '', title: '', onConfirm: () => { }, onCancel: () => { }, type: 'info'
    });

    const askConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'info' = 'danger') => {
        setConfirmState({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                onConfirm();
                closeConfirm();
            },
            onCancel: () => closeConfirm(),
            type
        });
    };

    const closeConfirm = () => setConfirmState(prev => ({ ...prev, isOpen: false }));

    const [isMorningModalOpen, setMorningModalOpen] = useState(false);
    const [isEveningModalOpen, setEveningModalOpen] = useState(false);
    const [isBrainDumpOpen, setBrainDumpOpen] = useState(false);

    return (
        <UIContext.Provider value={{
            toasts, showToast, removeToast,
            confirmState, askConfirm, closeConfirm,
            isMorningModalOpen, setMorningModalOpen,
            isEveningModalOpen, setEveningModalOpen,
            isBrainDumpOpen, setBrainDumpOpen,
        }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) throw new Error("useUI must be used within UIProvider");
    return context;
};
