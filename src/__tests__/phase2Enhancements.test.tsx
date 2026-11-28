import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SlideToComplete } from '../../components/ui/SlideToComplete';
import { WeekCalendarStrip, type WeekDayItem } from '../../components/dashboard/WeekCalendarStrip';
import Welcome from '../../pages/Welcome';
import { resolveModel, handleGeminiChat } from '../../api/_shared/geminiHandler';
import type { ApiRequestLike, ApiResponseLike } from '../../api/_shared/geminiHandler';

const mockNavigate = vi.fn();
const mockUpdateSettings = vi.fn();
const mockLoginOffline = vi.fn();
const mockSetUserName = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock('../../context/StoreContext', () => ({
    useStore: () => ({
        login: vi.fn(),
        register: vi.fn(),
        user: null,
        userName: '',
        setUserName: mockSetUserName,
        settings: {
            stream: 'life',
            pomodoroWorkMinutes: 25,
            pomodoroBreakMinutes: 5,
            dailyCapacityMinutes: 360,
        },
        updateSettings: mockUpdateSettings,
        loginOffline: mockLoginOffline,
    }),
}));

describe('Phase 2 Enhancements — SlideToComplete, Mobile Calendar, Welcome Carousel & Vercel Gemini API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('SlideToComplete handles incomplete keyboard commit and completed undo click', () => {
        const onComplete = vi.fn();
        const { rerender } = render(<SlideToComplete isCompleted={false} onComplete={onComplete} />);

        const slider = screen.getByRole('slider', { name: 'بکشید برای انجام' });
        fireEvent.keyDown(slider, { key: 'Enter' });
        expect(onComplete).toHaveBeenCalledTimes(1);

        rerender(<SlideToComplete isCompleted={true} onComplete={onComplete} />);
        const undoBtn = screen.getByRole('button', { name: /انجام شد/ });
        fireEvent.click(undoBtn);
        expect(onComplete).toHaveBeenCalledTimes(2);
    });

    it('WeekCalendarStrip fits all 7 days inside mobile grid-cols-7 without horizontal clipping', () => {
        const weekDays: WeekDayItem[] = ['۱۱', '۱۲', '۱۳', '۱۴', '۱۵', '۱۶', '۱۷'].map((num, idx) => ({
            iso: `2026-11-${14 + idx}`,
            weekday: 'شنبه',
            shortWeekday: 'ش',
            shamsiDayNum: num,
            done: idx % 2,
            total: 2,
            isToday: idx === 0,
            isSelected: idx === 0,
            isCompleted: false,
            pct: idx === 1 ? 100 : 50,
        }));

        const { container } = render(
            <WeekCalendarStrip
                weekDays={weekDays}
                prefersReducedMotion={true}
                onPrevWeek={vi.fn()}
                onToday={vi.fn()}
                onNextWeek={vi.fn()}
                onSelectDate={vi.fn()}
            />
        );

        const grid = container.querySelector('.grid.grid-cols-7');
        expect(grid).toBeInTheDocument();
        expect(container.querySelector('.overflow-x-auto')).not.toBeInTheDocument();
        expect(screen.getByText('۱۷')).toBeInTheDocument();
    });

    it('Welcome renders 4-slide skippable onboarding carousel and applies settings cleanly', async () => {
        render(
            <MemoryRouter>
                <Welcome />
            </MemoryRouter>
        );

        expect(screen.getByText(/گام ۱ از ۴/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /رد کردن/ })).toBeInTheDocument();

        const nameInput = screen.getByPlaceholderText('مثلاً پارسا');
        fireEvent.change(nameInput, { target: { value: 'علی' } });

        // Advance Slide 1 -> Slide 2
        fireEvent.click(screen.getByRole('button', { name: /ادامه/ }));
        const tajrobiBtn = await screen.findByRole('button', { name: /کنکور تجربی/ });
        expect(screen.getByText(/گام ۲ از ۴/)).toBeInTheDocument();
        fireEvent.click(tajrobiBtn);

        // Advance Slide 2 -> Slide 3
        fireEvent.click(screen.getByRole('button', { name: /ادامه/ }));
        const eightHoursBtn = await screen.findByRole('button', { name: /۸ ساعت/ });
        expect(screen.getByText(/گام ۳ از ۴/)).toBeInTheDocument();
        fireEvent.click(eightHoursBtn);

        // Advance Slide 3 -> Slide 4
        fireEvent.click(screen.getByRole('button', { name: /ادامه/ }));
        const startOfflineBtn = await screen.findByRole('button', { name: /شروع سریع آفلاین/ });
        expect(screen.getByText(/گام ۴ از ۴/)).toBeInTheDocument();

        // Start Offline
        fireEvent.click(startOfflineBtn);
        expect(mockSetUserName).toHaveBeenCalledWith('علی');
        expect(mockUpdateSettings).toHaveBeenCalledWith(
            expect.objectContaining({
                stream: 'tajrobi',
                dailyCapacityMinutes: 480,
            })
        );
        expect(mockLoginOffline).toHaveBeenCalled();
        expect(localStorage.getItem('parsaplan_onboarded')).toBe('1');
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('resolveModel supports Gemini 3.8 Flash and 3.5 Flash Lite and maps legacy aliases safely', () => {
        expect(resolveModel('gemini-3.8-flash')).toBe('gemini-3.8-flash');
        expect(resolveModel('gemini-3.5-flash-lite')).toBe('gemini-3.5-flash-lite');
        expect(resolveModel('gemini-1.5-flash')).toBe('gemini-3.5-flash-lite');
        expect(resolveModel('unknown-model')).toBe('gemini-3.8-flash');
    });

    it('handleGeminiChat enforces POST method and reports missing GEMINI_API_KEY gracefully', async () => {
        const makeRes = () => {
            const state = { statusCode: 200, body: null as unknown };
            const res = {
                status(code: number) {
                    state.statusCode = code;
                    return res;
                },
                json(payload: unknown) {
                    state.body = payload;
                },
                setHeader: vi.fn(),
                end: vi.fn(),
            } as unknown as ApiResponseLike;
            return { res, state };
        };

        const getMock = makeRes();
        await handleGeminiChat({ method: 'GET', headers: {} } as unknown as ApiRequestLike, getMock.res);
        expect(getMock.state.statusCode).toBe(405);

        const prevKey = process.env.GEMINI_API_KEY;
        delete process.env.GEMINI_API_KEY;
        try {
            const postMock = makeRes();
            await handleGeminiChat(
                {
                    method: 'POST',
                    headers: { 'x-forwarded-for': '10.0.0.99' },
                    body: { message: 'سلام' },
                } as unknown as ApiRequestLike,
                postMock.res
            );
            expect(postMock.state.statusCode).toBe(503);
            expect((postMock.state.body as { code?: string })?.code).toBe('MISSING_GEMINI_API_KEY');
        } finally {
            if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey;
        }
    });
});
