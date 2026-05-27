
import React, { useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { X, CheckCircle2, AlertTriangle, Info, AlertOctagon, Trash2 } from 'lucide-react';

export const ToastContainer = () => {
    const { toasts, removeToast } = useStore();

    return (
        <div className="fixed top-20 md:top-4 left-0 right-0 flex flex-col items-center gap-2 pointer-events-none px-4 transition-all duration-500" style={{ zIndex: 2147483647 }}>
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border animate-in slide-in-from-top-5 fade-in duration-300 max-w-sm w-full backdrop-blur-md transition-all
                        ${toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800 dark:bg-emerald-900/90 dark:border-emerald-700 dark:text-emerald-100' : ''}
                        ${toast.type === 'error' ? 'bg-rose-50/90 border-rose-200 text-rose-800 dark:bg-rose-900/90 dark:border-rose-700 dark:text-rose-100' : ''}
                        ${toast.type === 'warning' ? 'bg-amber-50/90 border-amber-200 text-amber-800 dark:bg-amber-900/90 dark:border-amber-700 dark:text-amber-100' : ''}
                        ${toast.type === 'info' ? 'bg-blue-50/90 border-blue-200 text-blue-800 dark:bg-blue-900/90 dark:border-blue-700 dark:text-blue-100' : ''}
                    `}
                >
                    {toast.type === 'success' && <CheckCircle2 size={20} />}
                    {toast.type === 'error' && <AlertOctagon size={20} />}
                    {toast.type === 'warning' && <AlertTriangle size={20} />}
                    {toast.type === 'info' && <Info size={20} />}

                    <p className="text-sm font-bold flex-1">{toast.message}</p>

                    <button onClick={() => removeToast(toast.id)} className="opacity-60 hover:opacity-100">
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
};

export const ConfirmModal = () => {
    const { confirmState, closeConfirm } = useStore();

    if (!confirmState.isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4" style={{ zIndex: 2147483647 }}>
            <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-2xl max-w-xs w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700 mb-32 sm:mb-0">
                <div className={`p-6 text-center ${confirmState.type === 'danger' ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-gray-50 dark:bg-gray-700'}`}>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${confirmState.type === 'danger' ? 'bg-rose-100 text-rose-600 dark:bg-rose-800 dark:text-rose-200' : 'bg-indigo-100 text-indigo-600'}`}>
                        {confirmState.type === 'danger' ? <Trash2 size={32} /> : <Info size={32} />}
                    </div>
                    <h3 className="text-lg font-black text-gray-800 dark:text-white mb-2">{confirmState.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed">{confirmState.message}</p>
                </div>
                <div className="p-4 flex gap-3 bg-white dark:bg-gray-800">
                    <button
                        onClick={closeConfirm}
                        className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition"
                    >
                        انصراف
                    </button>
                    <button
                        onClick={() => { confirmState.onConfirm(); closeConfirm(); }}
                        className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition transform active:scale-95 ${confirmState.type === 'danger' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200 dark:shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none'}`}
                    >
                        تایید می‌کنم
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 2026 LUXURIOUS LEVEL-UP & CONFETTI CELEBRATIONS
// ==========================================
import { Sparkles, Palette } from 'lucide-react';
import { soundFX } from '../utils';

export const LevelUpShowcase = () => {
    const { level } = useStore();
    const [show, setShow] = React.useState(false);
    const prevLevelRef = React.useRef(level);

    useEffect(() => {
        if (level > prevLevelRef.current && prevLevelRef.current > 0) {
            setShow(true);
            soundFX.playLevelUp();
        }
        prevLevelRef.current = level;
    }, [level]);

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300 p-4" dir="rtl">
            {/* Glowing backdrop effect */}
            <div className="absolute w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl animate-pulse" />
            <div className="absolute w-72 h-72 rounded-full bg-purple-500/20 blur-3xl animate-pulse [animation-delay:1s]" />

            <div className="relative bg-white/90 dark:bg-gray-900/90 border border-white/20 dark:border-white/5 backdrop-blur-2xl rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-300">
                
                {/* Floating particle effect in SVG */}
                <div className="absolute inset-0 overflow-hidden rounded-[2.5rem] pointer-events-none">
                    <div className="absolute top-10 left-10 w-2 h-2 rounded-full bg-indigo-400 opacity-60 animate-float" />
                    <div className="absolute bottom-12 right-12 w-3 h-3 rounded-full bg-rose-400 opacity-40 animate-float-slow" />
                </div>

                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/30 border border-white/20 relative animate-bounce" style={{ animationDuration: '3s' }}>
                    <Sparkles className="text-white animate-spin-slow" size={42} />
                    {/* Level Number Emblem */}
                    <div className="absolute -bottom-2 right-[-10px] bg-yellow-450 text-slate-950 font-black text-sm px-2.5 py-1 rounded-full border-2 border-white shadow">
                        سطح {level}
                    </div>
                </div>

                <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 leading-tight">صعود به سطح جدید! 🚀</h2>
                <p className="text-xs text-gray-500 dark:text-gray-300 mb-6 leading-relaxed">
                    تلاش و استمرار تو نتیجه داد! تو اکنون به سطح <span className="font-extrabold text-indigo-500 dark:text-indigo-400">{level}</span> رسیدی. پر قدرت به مسیرت ادامه بده!
                </p>

                <button
                    onClick={() => setShow(false)}
                    className="w-full py-4 bg-gradient-to-l from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-bold text-xs transition duration-200 shadow-xl shadow-indigo-500/20 active:scale-98 cursor-pointer"
                >
                    دمت گرم، ادامه میدم! 🔥
                </button>
            </div>
        </div>
    );
};

export const ConfettiCelebration = ({ active, onComplete }: { active: boolean; onComplete?: () => void }) => {
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        if (!active || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        
        // Resize canvas to cover window
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
        
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
        for (let i = 0; i < 150; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: -10 - Math.random() * 150,
                size: Math.random() * 8 + 6,
                color: colors[Math.floor(Math.random() * colors.length)],
                speedX: Math.random() * 4 - 2,
                speedY: Math.random() * 5 + 4,
                rotation: Math.random() * 360,
                rotationSpeed: Math.random() * 4 - 2
            });
        }

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let activeParticles = 0;

            particles.forEach(p => {
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
    }, [active]);

    if (!active) return null;

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[99] w-full h-full"
        />
    );
};

export const ConfettiContainer = () => {
    const { showConfetti, setShowConfetti } = useStore();
    return <ConfettiCelebration active={showConfetti} onComplete={() => setShowConfetti(false)} />;
};
