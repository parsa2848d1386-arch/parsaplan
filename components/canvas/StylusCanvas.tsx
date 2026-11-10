import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StylusStroke, StylusPoint } from '../../types';
import { Pen, Highlighter, Eraser, Undo2, Trash2, Download, Grid } from 'lucide-react';

interface StylusCanvasProps {
    strokes: StylusStroke[];
    onChange: (strokes: StylusStroke[]) => void;
    height?: number;
}

const LOGICAL_WIDTH = 960;
const LOGICAL_HEIGHT = 540;

const PALETTE = [
    { label: 'ذغالی', value: '#1e293b' },
    { label: 'نیلی', value: '#4f46e5' },
    { label: 'قرمز', value: '#dc2626' },
    { label: 'سبز', value: '#059669' },
    { label: 'نارنجی', value: '#d97706' },
    { label: 'بنفش', value: '#9333ea' },
];

const WIDTHS = [
    { label: 'نازک', value: 2 },
    { label: 'متوسط', value: 4.5 },
    { label: 'ضخیم', value: 9 },
];

type BgPattern = 'grid' | 'lined' | 'blank';

function renderStrokeList(ctx: CanvasRenderingContext2D, list: StylusStroke[]) {
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    list.forEach((stroke) => {
        if (stroke.points.length === 0) return;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
            ctx.lineWidth = stroke.width * 3.2;
        } else if (stroke.tool === 'highlighter') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 0.32;
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.width * 3;
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.width;
        }

        ctx.beginPath();
        const pts = stroke.points;
        ctx.moveTo(pts[0].x, pts[0].y);
        if (pts.length === 1) {
            ctx.lineTo(pts[0].x + 0.1, pts[0].y + 0.1);
        } else {
            for (let i = 1; i < pts.length; i++) {
                const midX = (pts[i - 1].x + pts[i].x) / 2;
                const midY = (pts[i - 1].y + pts[i].y) / 2;
                ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, midX, midY);
            }
            const last = pts[pts.length - 1];
            ctx.lineTo(last.x, last.y);
        }
        ctx.stroke();
        ctx.restore();
    });
}

export const StylusCanvas: React.FC<StylusCanvasProps> = ({ strokes, onChange, height = 520 }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const activeStrokeRef = useRef<StylusStroke | null>(null);
    const isDrawingRef = useRef(false);

    const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
    const [color, setColor] = useState('#4f46e5');
    const [strokeWidth, setStrokeWidth] = useState(4.5);
    const [bgPattern, setBgPattern] = useState<BgPattern>('grid');

    const redraw = useCallback(
        (previewStroke?: StylusStroke | null) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            const all = previewStroke ? [...strokes, previewStroke] : strokes;
            renderStrokeList(ctx, all);
        },
        [strokes]
    );

    useEffect(() => {
        redraw(null);
    }, [redraw]);

    const toLogicalPoint = (e: React.PointerEvent<HTMLCanvasElement>): StylusPoint => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
        const y = ((e.clientY - rect.top) / rect.height) * LOGICAL_HEIGHT;
        return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        isDrawingRef.current = true;
        const pt = toLogicalPoint(e);
        const newStroke: StylusStroke = {
            id: `stk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            tool,
            color,
            width: strokeWidth,
            points: [pt],
        };
        activeStrokeRef.current = newStroke;
        redraw(newStroke);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawingRef.current || !activeStrokeRef.current) return;
        const pt = toLogicalPoint(e);
        const pts = activeStrokeRef.current.points;
        const last = pts[pts.length - 1];
        if (last && Math.hypot(pt.x - last.x, pt.y - last.y) < 1.5) return;
        pts.push(pt);
        redraw(activeStrokeRef.current);
    };

    const finishStroke = () => {
        if (!isDrawingRef.current || !activeStrokeRef.current) return;
        isDrawingRef.current = false;
        const completed = activeStrokeRef.current;
        activeStrokeRef.current = null;
        if (completed.points.length > 0) {
            onChange([...strokes, completed]);
        }
    };

    const handleUndo = () => {
        if (strokes.length === 0) return;
        onChange(strokes.slice(0, -1));
    };

    const handleClear = () => {
        if (strokes.length === 0) return;
        onChange([]);
    };

    const handleExportPng = () => {
        const out = document.createElement('canvas');
        out.width = LOGICAL_WIDTH;
        out.height = LOGICAL_HEIGHT;
        const ctx = out.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

        if (bgPattern === 'grid') {
            ctx.strokeStyle = '#eef2ff';
            ctx.lineWidth = 1;
            for (let x = 0; x <= LOGICAL_WIDTH; x += 24) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, LOGICAL_HEIGHT);
                ctx.stroke();
            }
            for (let y = 0; y <= LOGICAL_HEIGHT; y += 24) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(LOGICAL_WIDTH, y);
                ctx.stroke();
            }
        } else if (bgPattern === 'lined') {
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            for (let y = 32; y <= LOGICAL_HEIGHT; y += 32) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(LOGICAL_WIDTH, y);
                ctx.stroke();
            }
        }

        if (canvasRef.current) {
            ctx.drawImage(canvasRef.current, 0, 0);
        }

        const link = document.createElement('a');
        link.download = `parsaplan-whiteboard-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = out.toDataURL('image/png');
        link.click();
    };

    const bgStyle: React.CSSProperties =
        bgPattern === 'grid'
            ? {
                  backgroundImage:
                      'linear-gradient(to right, rgba(99,102,241,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(99,102,241,0.08) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
              }
            : bgPattern === 'lined'
              ? {
                    backgroundImage: 'linear-gradient(to bottom, rgba(148,163,184,0.16) 1px, transparent 1px)',
                    backgroundSize: '100% 32px',
                }
              : {};

    return (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            {/* Toolbar */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800/90 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setTool('pen')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                            tool === 'pen'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                    >
                        <Pen size={14} /> قلم
                    </button>
                    <button
                        type="button"
                        onClick={() => setTool('highlighter')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                            tool === 'highlighter'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                    >
                        <Highlighter size={14} /> ماژیک
                    </button>
                    <button
                        type="button"
                        onClick={() => setTool('eraser')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                            tool === 'eraser'
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                    >
                        <Eraser size={14} /> پاک‌کن
                    </button>
                </div>

                {/* Colors & Widths */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                        {PALETTE.map((c) => (
                            <button
                                key={c.value}
                                type="button"
                                onClick={() => {
                                    setColor(c.value);
                                    if (tool === 'eraser') setTool('pen');
                                }}
                                title={c.label}
                                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                                    color === c.value && tool !== 'eraser'
                                        ? 'border-gray-900 dark:border-white scale-110'
                                        : 'border-white dark:border-gray-700'
                                }`}
                                style={{ backgroundColor: c.value }}
                            />
                        ))}
                    </div>

                    <div className="flex items-center gap-1 bg-white dark:bg-gray-700 p-1 rounded-xl border border-gray-200 dark:border-gray-600">
                        {WIDTHS.map((w) => (
                            <button
                                key={w.value}
                                type="button"
                                onClick={() => setStrokeWidth(w.value)}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                                    strokeWidth === w.value
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-gray-500 dark:text-gray-300'
                                }`}
                            >
                                {w.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() =>
                            setBgPattern((prev) =>
                                prev === 'grid' ? 'lined' : prev === 'lined' ? 'blank' : 'grid'
                            )
                        }
                        title="تغییر پس‌زمینه"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 text-xs font-bold border border-gray-200 dark:border-gray-600"
                    >
                        <Grid size={14} />
                        {bgPattern === 'grid' ? 'شطرنجی' : bgPattern === 'lined' ? 'خط‌دار' : 'ساده'}
                    </button>
                    <button
                        type="button"
                        onClick={handleUndo}
                        disabled={strokes.length === 0}
                        className="p-2 rounded-xl bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 border border-gray-200 dark:border-gray-600 disabled:opacity-40"
                        title="بازگشت (Undo)"
                    >
                        <Undo2 size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={strokes.length === 0}
                        className="p-2 rounded-xl bg-white dark:bg-gray-700 text-rose-500 border border-gray-200 dark:border-gray-600 disabled:opacity-40"
                        title="پاک کردن کل تخته"
                    >
                        <Trash2 size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={handleExportPng}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                        title="ذخیره تصویر PNG"
                    >
                        <Download size={14} />
                        PNG
                    </button>
                </div>
            </div>

            {/* Drawing surface */}
            <div
                className="relative w-full bg-white dark:bg-slate-900 select-none overflow-hidden"
                style={{ ...bgStyle, height }}
            >
                <canvas
                    ref={canvasRef}
                    width={LOGICAL_WIDTH}
                    height={LOGICAL_HEIGHT}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={finishStroke}
                    onPointerCancel={finishStroke}
                    className="w-full h-full touch-none cursor-crosshair block"
                />
                {strokes.length === 0 && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-400/70">
                        با قلم نوری، لمس یا ماوس اینجا حل تمرین، فرمول یا رسم نمودار انجام دهید...
                    </div>
                )}
            </div>
        </div>
    );
};
