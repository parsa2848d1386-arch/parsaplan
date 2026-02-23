import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';

/**
 * PWA Update Prompt:
 * When a new service worker is detected and waiting,
 * show a banner prompting the user to update.
 */
export const PWAUpdatePrompt: React.FC = () => {
    const [showUpdate, setShowUpdate] = useState(false);
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        const checkForUpdates = async () => {
            try {
                const reg = await navigator.serviceWorker.getRegistration();
                if (reg) {
                    setRegistration(reg);

                    // If a waiting SW already exists, show prompt
                    if (reg.waiting) {
                        setShowUpdate(true);
                    }

                    // Listen for new SW installing
                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    setShowUpdate(true);
                                }
                            });
                        }
                    });
                }
            } catch (e) {
                console.warn('SW registration check failed', e);
            }
        };

        checkForUpdates();

        // Also listen for controllerchange (new SW activated)
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });
    }, []);

    const handleUpdate = () => {
        if (registration?.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        setShowUpdate(false);
    };

    return (
        <AnimatePresence>
            {showUpdate && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-[9999] bg-indigo-600 text-white rounded-2xl p-4 shadow-2xl shadow-indigo-500/40 flex items-center gap-3"
                >
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <RefreshCw size={18} className="animate-spin-slow" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold">نسخه جدید موجود است!</p>
                        <p className="text-[10px] text-indigo-200 mt-0.5">برای دریافت آپدیت کلیک کنید</p>
                    </div>
                    <button
                        onClick={handleUpdate}
                        className="px-3 py-2 bg-white text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-50 active:scale-95 transition-all flex-shrink-0"
                    >
                        آپدیت
                    </button>
                    <button onClick={() => setShowUpdate(false)} className="p-1 rounded-lg hover:bg-white/10 transition">
                        <X size={14} />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
