import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion, useDragControls, PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useOverlayHistory } from '../../hooks/useOverlayHistory';
import { FOLLOW_THROUGH_VARIANTS, SPRING_SHEET, TRANSITION_FAST } from '../../utils/motionPresets';
import { haptics } from '../../utils/haptics';

export interface ModalSheetProps {
    isOpen: boolean;
    onClose: () => void;
    /** Accessible dialog name (used as aria-label if ariaLabelledBy is not provided) */
    title: string;
    /** Optional visible subtitle when using built-in header */
    subtitle?: string;
    /** Set false if the child renders its own custom header (e.g. AuthModal / TaskModal tabs) */
    showHeader?: boolean;
    /** Optional custom header slot rendered inside the sticky sheet header */
    headerSlot?: React.ReactNode;
    /** Optional sticky footer slot */
    footerSlot?: React.ReactNode;
    /** Max width class on desktop (default: max-w-xl) */
    maxWidthClass?: string;
    /** Prevent closing via backdrop / Escape / swipe while submitting */
    dismissDisabled?: boolean;
    /** Unique history key for Baymard Back-button close behavior */
    historyKey?: string;
    /** Custom container class overrides */
    contentClassName?: string;
    /** Custom z-index class */
    zIndexClass?: string;
    /** Optional aria-labelledby ID when custom header provides the heading */
    ariaLabelledBy?: string;
    /** Optional CSS transform-origin for Origin Awareness expansion (e.g. 'bottom center', 'top left') */
    originTransform?: string;
    children: React.ReactNode;
}

const SWIPE_DISMISS_OFFSET = 96;
const SWIPE_DISMISS_VELOCITY = 500;

/**
 * Apple HIG Adaptive ModalSheet (iOS 26/27 + WCAG 2.2 AA)
 * - Mobile (< sm): Concentric bottom sheet (`rounded-t-[28px]`), grab handle, interruptible swipe-down-to-dismiss, `pb-safe`.
 * - Desktop (>= sm): Centered concentric dialog (`rounded-[28px]`) with Fluid spring motion & Origin Awareness.
 * - Accessibility: `role="dialog"`, `aria-modal="true"`, keyboard Focus Trap, focus restoration,
 *   Escape dismissal, and Baymard browser Back-button integration.
 */
export const ModalSheet: React.FC<ModalSheetProps> = ({
    isOpen,
    onClose,
    title,
    subtitle,
    showHeader = true,
    headerSlot,
    footerSlot,
    maxWidthClass = 'max-w-xl',
    dismissDisabled = false,
    historyKey,
    contentClassName = '',
    zIndexClass = 'z-[var(--z-modal)]',
    ariaLabelledBy,
    originTransform,
    children,
}) => {
    const dialogRef = useRef<HTMLDivElement>(null);
    const prefersReducedMotion = useReducedMotion();
    const dragControls = useDragControls();
    const titleId = ariaLabelledBy || (showHeader ? `modal-sheet-title-${historyKey || 'dialog'}` : undefined);

    const safeClose = () => {
        if (!dismissDisabled) {
            haptics.selection();
            onClose();
        }
    };

    useFocusTrap(dialogRef, {
        isActive: isOpen,
        onEscape: dismissDisabled ? undefined : safeClose,
    });

    useOverlayHistory(isOpen && !dismissDisabled, onClose, historyKey || 'modal-sheet');

    // Prevent background body scroll while sheet is open
    useEffect(() => {
        if (!isOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, [isOpen]);

    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (dismissDisabled) return;
        if (info.offset.y > SWIPE_DISMISS_OFFSET || info.velocity.y > SWIPE_DISMISS_VELOCITY) {
            safeClose();
        }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div
                    dir="rtl"
                    className={`fixed inset-0 ${zIndexClass} flex items-end sm:items-center justify-center sm:p-4`}
                >
                    {/* Backdrop (Figure-Ground contrast separation) */}
                    <motion.div
                        key="modal-sheet-backdrop"
                        initial={prefersReducedMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
                        transition={prefersReducedMotion ? { duration: 0 } : TRANSITION_FAST}
                        onClick={safeClose}
                        aria-hidden="true"
                        className="absolute inset-0 bg-slate-950/70 dark:bg-black/80 backdrop-blur-[8px]"
                    />

                    {/* Sheet / Dialog Surface */}
                    <motion.div
                        key="modal-sheet-panel"
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label={!titleId ? title : undefined}
                        aria-labelledby={titleId}
                        tabIndex={-1}
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 32, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
                        transition={prefersReducedMotion ? { duration: 0 } : SPRING_SHEET}
                        drag={dismissDisabled || prefersReducedMotion ? false : 'y'}
                        dragControls={dragControls}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.35 }}
                        dragListener={false}
                        onDragEnd={handleDragEnd}
                        style={originTransform ? { transformOrigin: originTransform } : undefined}
                        className={`relative z-10 w-full ${maxWidthClass} max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden bg-[var(--surface-elevated)] border border-[var(--border-subtle)] squircle-sheet shadow-2xl outline-none ${contentClassName}`}
                    >
                        {/* Mobile Swipe Handle */}
                        <div
                            onPointerDown={(e) => {
                                if (!dismissDisabled && !prefersReducedMotion) {
                                    dragControls.start(e);
                                }
                            }}
                            className="flex justify-center pt-2.5 pb-1 sm:hidden shrink-0 cursor-grab active:cursor-grabbing touch-none"
                            aria-hidden="true"
                        >
                            <span className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
                        </div>

                        {/* Built-in Header (also supports interruptible drag-to-dismiss on touch) */}
                        {showHeader && (
                            <div
                                onPointerDown={(e) => {
                                    if (!dismissDisabled && !prefersReducedMotion && e.pointerType !== 'mouse') {
                                        dragControls.start(e);
                                    }
                                }}
                                className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 bg-[var(--surface-elevated)] shrink-0 touch-pan-x"
                            >
                                {headerSlot ? (
                                    <div className="flex-1 min-w-0">{headerSlot}</div>
                                ) : (
                                    <div className="min-w-0">
                                        <h2
                                            id={titleId}
                                            className="text-base sm:text-lg font-extrabold text-on-surface truncate"
                                        >
                                            {title}
                                        </h2>
                                        {subtitle && (
                                            <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                                                {subtitle}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onPointerDownCapture={(e) => e.stopPropagation()}
                                    onClick={safeClose}
                                    disabled={dismissDisabled}
                                    aria-label="بستن"
                                    className="w-11 h-11 -ms-1.5 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:text-on-surface hover:bg-surface-container active:scale-95 transition cursor-pointer shrink-0 disabled:opacity-40"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        )}

                        {/* Scrollable Body (Follow-through inner settle) */}
                        <motion.div
                            variants={FOLLOW_THROUGH_VARIANTS}
                            initial={prefersReducedMotion ? false : 'hidden'}
                            animate="visible"
                            className="flex-1 min-h-0 overflow-y-auto custom-scrollbar"
                        >
                            {children}
                        </motion.div>

                        {/* Sticky Footer */}
                        {footerSlot && (
                            <motion.div
                                variants={FOLLOW_THROUGH_VARIANTS}
                                initial={prefersReducedMotion ? false : 'hidden'}
                                animate="visible"
                                className="px-5 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] sm:pb-3.5 border-t border-[var(--border-subtle)] bg-[var(--surface-elevated)] shrink-0"
                            >
                                {footerSlot}
                            </motion.div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default ModalSheet;
