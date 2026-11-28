import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, X } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';

interface WelcomeBannerProps {
    visible: boolean;
    onDismiss: () => void;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ visible, onDismiss }) => {
    const navigate = useNavigate();
    const { setIsAiPanelOpen } = useStore();

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="relative overflow-hidden squircle-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] p-4 sm:p-5 shadow-xs"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 squircle-sm bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <BrandLogo size={21} />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)]">
                                    شروع سریع فضای کار ParsaPlan
                                </h2>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                                    برنامه‌های روزانه، تایم‌لاین ۲۴ ساعته و تمرکز عمیق را یکجا مدیریت کنید.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onDismiss}
                            aria-label="بستن پیام خوش‌آمدگویی"
                            className="w-10 h-10 -mt-1 -ms-1 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-surface-container transition shrink-0"
                        >
                            <X size={17} />
                        </button>
                    </div>

                    <div className="mt-3.5 flex flex-col sm:flex-row gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setIsAiPanelOpen(true);
                                onDismiss();
                            }}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 min-h-[44px] bg-primary text-on-primary rounded-xl font-bold text-xs hover:opacity-95 active:scale-[0.98] transition cursor-pointer"
                        >
                            <MessageSquare size={15} aria-hidden="true" />
                            <span>ساخت برنامه با هوش مصنوعی</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                navigate('/planner');
                                onDismiss();
                            }}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 min-h-[44px] bg-surface-container-low dark:bg-slate-800 text-[var(--text-primary)] rounded-xl font-bold text-xs border border-[var(--border-subtle)] hover:bg-surface-container active:scale-[0.98] transition cursor-pointer"
                        >
                            <Plus size={15} aria-hidden="true" />
                            <span>برنامه‌ریزی در تایم‌لاین</span>
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
