import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../context/StoreContext';
import { X, CheckCircle2, AlertTriangle, Info, AlertOctagon, Trash2, Sparkles, RotateCcw } from 'lucide-react';
import { soundFX } from '../utils';
import { toPersianNum } from '../utils/designSystemHelpers';
import { modalScaleVariants, toastVariants, TRANSITION_FAST } from '../utils/motionPresets';
import { haptics } from '../utils/haptics';

export const ToastContainer = () => {
    const { toasts, removeToast } = useStore();
    // Minor success/info notifications now appear compactly inside DynamicIsland at the top.
    // Keep bottom toast strictly for critical errors/warnings or actionable Undo banners (max 1 at a time).
    const hasDynamicIsland =
        typeof document !== 'undefined' && Boolean(document.querySelector('[data-dynamic-island-host="true"]'));
    const filtered = hasDynamicIsland
        ? toasts.filter((t) => Boolean(t.action) || t.type === 'error' || t.type === 'warning')
        : toasts;
    const visibleToasts = filtered.slice(-1);

    return (
        <div
            role="region"
            aria-live="polite"
            aria-label="اعلان‌های سیستم"
            className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6 inset-x-0 z-[80] flex flex-col items-center md:items-end gap-2 pointer-events-none px-3.5 md:px-6"
        >
            <AnimatePresence initial={false}>
                {visibleToasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        variants={toastVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={`pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 squircle-sm shadow-lg border max-w-md w-full backdrop-blur-xl
                            ${toast.type === 'success' ? 'bg-emerald-50/95 border-emerald-200/80 text-emerald-900 dark:bg-emerald-950/95 dark:border-emerald-800/80 dark:text-emerald-100' : ''}
                            ${toast.type === 'error' ? 'bg-rose-50/95 border-rose-200/80 text-rose-900 dark:bg-rose-950/95 dark:border-rose-800/80 dark:text-rose-100' : ''}
                            ${toast.type === 'warning' ? 'bg-amber-50/95 border-amber-200/80 text-amber-950 dark:bg-amber-950/95 dark:border-amber-800/80 dark:text-amber-100' : ''}
                            ${toast.type === 'info' ? 'bg-slate-50/95 border-slate-200/80 text-slate-900 dark:bg-slate-900/95 dark:border-slate-700/80 dark:text-slate-100' : ''}
                        `}
                    >
                        <span className="shrink-0" aria-hidden="true">
                            {toast.type === 'success' && <CheckCircle2 size={18} />}
                            {toast.type === 'error' && <AlertOctagon size={18} />}
                            {toast.type === 'warning' && <AlertTriangle size={18} />}
                            {toast.type === 'info' && <Info size={18} />}
                        </span>

                        <p className="text-sm font-semibold flex-1 leading-snug pretty-text">{toast.message}</p>

                        {toast.action && (
                            <button
                                type="button"
                                onClick={() => {
                                    haptics.light();
                                    toast.action?.onClick();
                                    removeToast(toast.id);
                                }}
                                className="shrink-0 inline-flex items-center gap-1 px-3 min-h-[36px] rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 active:scale-95 transition cursor-pointer"
                            >
                                <RotateCcw size={13} aria-hidden="true" />
                                <span>{toast.action.label}</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => removeToast(toast.id)}
                            aria-label="بستن اعلان"
                            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                        >
                            <X size={16} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export const ConfirmModal = () => {
    const { confirmState, closeConfirm } = useStore();
    const dialogRef = React.useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (confirmState.isOpen) {
            dialog.returnValue = '';
            dialog.setAttribute('closedby', 'any');
            if (typeof dialog.showModal === 'function') {
                if (!dialog.open) dialog.showModal();
            } else {
                dialog.setAttribute('open', '');
            }
        } else {
            if (typeof dialog.close === 'function') {
                if (dialog.open) dialog.close();
            } else {
                dialog.removeAttribute('open');
            }
            dialog.returnValue = '';
        }
    }, [confirmState.isOpen]);

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby={confirmState.isOpen ? 'confirm-modal-title' : undefined}
            aria-describedby={confirmState.isOpen ? 'confirm-modal-message' : undefined}
            onCancel={(e) => {
                e.preventDefault();
                closeConfirm();
            }}
            onClick={(e) => {
                if (e.target === dialogRef.current) {
                    closeConfirm();
                }
            }}
            className="m-auto p-0 bg-transparent border-0 max-w-xs w-[calc(100%-2rem)] overflow-visible shadow-none"
        >
            {confirmState.isOpen && (
                <motion.div
                    variants={modalScaleVariants}
                    initial="hidden"
                    animate="visible"
                    className="bg-[var(--surface-elevated)] squircle-lg shadow-2xl w-full overflow-hidden border border-[var(--border-subtle)]"
                >
                    <div
                        className={`p-6 text-center ${
                            confirmState.type === 'danger'
                                ? 'bg-rose-50/70 dark:bg-rose-950/30'
                                : 'bg-slate-50/70 dark:bg-slate-800/40'
                        }`}
                    >
                        <div
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3.5 ${
                                confirmState.type === 'danger'
                                    ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-200'
                                    : 'bg-primary/10 text-primary'
                            }`}
                        >
                            {confirmState.type === 'danger' ? <Trash2 size={26} /> : <Info size={26} />}
                        </div>
                        <h3 id="confirm-modal-title" className="text-lg font-extrabold text-[var(--text-primary)] mb-2">
                            {confirmState.title}
                        </h3>
                        <p id="confirm-modal-message" className="text-sm text-[var(--text-secondary)] leading-relaxed pretty-text">
                            {confirmState.message}
                        </p>
                    </div>
                    <div className="p-4 flex gap-2.5 bg-[var(--surface-elevated)]">
                        <button
                            type="button"
                            autoFocus
                            onClick={closeConfirm}
                            className="flex-1 min-h-[44px] py-2.5 rounded-xl font-bold text-sm text-[var(--text-secondary)] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer"
                        >
                            انصراف
                        </button>
                        <button
                            type="button"
                            data-haptic="custom"
                            onClick={() => {
                                if (confirmState.type === 'danger') {
                                    haptics.heavy();
                                } else {
                                    haptics.light();
                                }
                                confirmState.onConfirm();
                                closeConfirm();
                            }}
                            className={`flex-1 min-h-[44px] py-2.5 rounded-xl font-bold text-sm text-white transition active:scale-[0.98] cursor-pointer ${
                                confirmState.type === 'danger'
                                    ? 'bg-rose-600 hover:bg-rose-700'
                                    : 'bg-[var(--md-primary)] hover:opacity-95'
                            }`}
                        >
                            تایید می‌کنم
                        </button>
                    </div>
                </motion.div>
            )}
        </dialog>
    );
};

export const LevelUpShowcase = () => {
    const { level } = useStore();
    const [show, setShow] = React.useState(false);
    const prevLevelRef = React.useRef(level);

    useEffect(() => {
        if (level > prevLevelRef.current && prevLevelRef.current > 0) {
            setShow(true);
            soundFX.playLevelUp();
            haptics.success();
        }
        prevLevelRef.current = level;
    }, [level]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="levelup-title"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={TRANSITION_FAST}
                    className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/72 dark:bg-black/80 backdrop-blur-md p-4"
                    dir="rtl"
                >
                    <motion.div
                        variants={modalScaleVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="relative bg-[var(--surface-elevated)] border border-[var(--border-subtle)] squircle-xl p-7 max-w-sm w-full text-center shadow-2xl"
                    >
                        <div className="w-20 h-20 rounded-[1.5rem] bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] flex items-center justify-center mx-auto mb-5 relative">
                            <Sparkles size={34} aria-hidden="true" />
                            <div className="absolute -bottom-2 -right-2 bg-amber-400 text-slate-950 font-black text-xs px-2.5 py-1 rounded-full border-2 border-[var(--surface-elevated)] tabular-nums">
                                سطح {toPersianNum(level)}
                            </div>
                        </div>

                        <h2 id="levelup-title" className="text-xl font-extrabold text-[var(--text-primary)] mb-2 leading-snug">
                            صعود به سطح جدید
                        </h2>
                        <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
                            استمرار و تمرکزت نتیجه داد. اکنون به سطح{' '}
                            <span className="font-extrabold text-[var(--md-primary)] tabular-nums">{toPersianNum(level)}</span>{' '}
                            رسیدی.
                        </p>

                        <button
                            type="button"
                            onClick={() => setShow(false)}
                            className="w-full min-h-[48px] bg-[var(--md-primary)] text-[var(--md-on-primary)] rounded-2xl font-bold text-sm transition active:scale-[0.98] cursor-pointer hover:opacity-95"
                        >
                            ادامه مسیر
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export const ConfettiCelebration = ({ active, onComplete }: { active: boolean; onComplete?: () => void }) => {
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        if (!active) return;

        // Honor WCAG / iOS Reduce Motion setting
        if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                onComplete?.();
                return;
            }
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const colors = ['#4f46e5', '#0f766e', '#10b981', '#f59e0b', '#be185d'];

        interface Particle {
            x: number;
            y: number;
            size: number;
            color: string;
            speedX: number;
            speedY: number;
            rotation: number;
            rotationSpeed: number;
        }

        const particles: Particle[] = [];
        for (let i = 0; i < 90; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: -10 - Math.random() * 120,
                size: Math.random() * 7 + 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                speedX: Math.random() * 3.5 - 1.75,
                speedY: Math.random() * 4.5 + 3.5,
                rotation: Math.random() * 360,
                rotationSpeed: Math.random() * 4 - 2,
            });
        }

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let activeParticles = 0;

            particles.forEach((p) => {
                p.y += p.speedY;
                p.x += p.speedX;
                p.rotation += p.rotationSpeed;

                if (p.y < canvas.height) {
                    activeParticles++;
                }

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();
            });

            if (activeParticles > 0) {
                animationFrameId = requestAnimationFrame(draw);
            } else {
                onComplete?.();
            }
        };

        draw();

        const handleResize = () => {
            if (canvas) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
        };
    }, [active, onComplete]);

    if (!active) return null;

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="fixed inset-0 pointer-events-none z-[79] w-full h-full"
        />
    );
};

export const ConfettiContainer = () => {
    const { showConfetti, setShowConfetti } = useStore();
    return <ConfettiCelebration active={showConfetti} onComplete={() => setShowConfetti(false)} />;
};
