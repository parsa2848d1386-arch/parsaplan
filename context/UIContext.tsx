import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ToastMessage, ToastType, ConfirmDialogState } from '../types';

interface UIContextType {
    toasts: ToastMessage[];
    showToast: (message: string, type?: ToastType) => void;
    removeToast: (id: string) => void;
    confirmState: ConfirmDialogState;
    askConfirm: (title: string, message: string, onConfirm: () => void, type?: 'danger' | 'info') => void;
    closeConfirm: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // --- TOASTS ---
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const showToast = (message: string, type: ToastType = 'info') => {
        const id = crypto.randomUUID();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), 3000);
    };

    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

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

    return (
        <UIContext.Provider value={{
            toasts, showToast, removeToast,
            confirmState, askConfirm, closeConfirm
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
