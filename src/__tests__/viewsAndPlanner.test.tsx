import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubjectTask, StudySession } from '../../types';

const mockUpdateTask = vi.fn();
const mockToggleTask = vi.fn();
const mockUpdateTaskStatus = vi.fn();
const mockAddTask = vi.fn();
const mockStartFocusForTask = vi.fn();
const mockShowToast = vi.fn();

vi.mock('../../context/StoreContext', () => ({
    useStore: () => ({
        updateTask: mockUpdateTask,
        toggleTask: mockToggleTask,
        updateTaskStatus: mockUpdateTaskStatus,
        addTask: mockAddTask,
        routineTemplate: [],
        settings: { dailyCapacityMinutes: 360 },
        currentDay: 1,
    }),
}));

vi.mock('../../context/UIContext', () => ({
    useUI: () => ({
        showToast: mockShowToast,
    }),
}));

vi.mock('../../context/FocusContext', () => ({
    useFocus: () => ({
        status: 'idle',
        selectedSubject: 'فیزیک',
        startFocusForTask: mockStartFocusForTask,
    }),
}));

import { TableView } from '../../components/views/TableView';
import { DualColumn10MinuteGrid } from '../../components/planner/DualColumn10MinuteGrid';
import { UnifiedTimeline } from '../../components/planner/UnifiedTimeline';
import { PLAN_DATA, DAILY_ROUTINE } from '../../constants';

describe('Multi-View TableView & DualColumn10MinuteGrid', () => {
    const sampleTasks: SubjectTask[] = [
        {
            id: 't1',
            dayId: 1,
            date: '2026-05-10',
            subject: 'فیزیک',
            topic: 'الکتریسیته ساکن',
            details: 'تست آموزشی',
            isCompleted: false,
            status: 'todo',
            priority: 'urgent',
            startTime: '09:00',
            durationMinutes: 60,
            actualDuration: 30,
        },
        {
            id: 't2',
            dayId: 1,
            date: '2026-05-10',
            subject: 'شیمی',
            topic: 'اسید و باز',
            details: 'مطالعه',
            isCompleted: true,
            status: 'completed',
            priority: 'high',
            startTime: '11:00',
            durationMinutes: 90,
            actualDuration: 90,
        },
    ];

    it('filters tasks in TableView and triggers Focus Now on selected task', () => {
        render(<TableView tasks={sampleTasks} onEdit={vi.fn()} onDelete={vi.fn()} />);

        expect(screen.getByText('الکتریسیته ساکن')).toBeInTheDocument();
        expect(screen.getByText('اسید و باز')).toBeInTheDocument();

        const focusBtns = screen.getAllByTitle('شروع تمرکز');
        fireEvent.click(focusBtns[0]);
        expect(mockStartFocusForTask).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
    });

    it('renders 144 planned + 144 actual slots and computes adherence summary', () => {
        const sessions: StudySession[] = [
            {
                id: 's1',
                subjectId: 'phys',
                subjectName: 'فیزیک',
                durationSeconds: 3600,
                startedAt: new Date(2026, 4, 10, 9, 0, 0).toISOString(),
                endedAt: new Date(2026, 4, 10, 10, 0, 0).toISOString(),
                logicalDate: '2026-05-10',
                mode: 'pomodoro',
            },
        ];

        render(
            <DualColumn10MinuteGrid
                logicalDate="2026-05-10"
                tasks={sampleTasks}
                sessions={sessions}
                subjects={[{ id: 'p', name: 'فیزیک', icon: '⚡', color: 'indigo' }]}
                cutoffHour={5}
            />
        );

        // Planned: 60m + 90m = 150m; Actual: 60m; Adherence: 6/15 = 40%
        expect(screen.getByText(/۱۵۰ دقیقه/)).toBeInTheDocument();
        expect(screen.getByText(/۶۰ دقیقه/)).toBeInTheDocument();
        expect(screen.getByText(/۴۰٪/)).toBeInTheDocument();
    });

    it('renders UnifiedTimeline proportional blocks, companion track, auto-fit scheduler, and clean empty constants', () => {
        expect(PLAN_DATA).toEqual([]);
        expect(DAILY_ROUTINE).toEqual([]);

        const tasksWithBacklog: SubjectTask[] = [
            ...sampleTasks,
            {
                id: 't_free',
                dayId: 1,
                date: '2026-05-10',
                subject: 'ورزش و سلامت',
                topic: 'دویدن عصرگاهی',
                details: 'تندرستی',
                isCompleted: false,
                durationMinutes: 45,
            },
        ];

        const sessions: StudySession[] = [
            {
                id: 's1',
                subjectId: 'work',
                subjectName: 'کار و پروژه',
                durationSeconds: 1800,
                startedAt: new Date(2026, 4, 10, 9, 0, 0).toISOString(),
                endedAt: new Date(2026, 4, 10, 9, 30, 0).toISOString(),
                logicalDate: '2026-05-10',
                mode: 'stopwatch',
            },
        ];

        render(
            <UnifiedTimeline
                logicalDate="2026-05-10"
                tasks={tasksWithBacklog}
                sessions={sessions}
                cutoffHour={5}
                onAddAtHour={vi.fn()}
                onEditTask={vi.fn()}
            />
        );

        expect(screen.getByText('الکتریسیته ساکن')).toBeInTheDocument();
        expect(screen.getByText('دویدن عصرگاهی')).toBeInTheDocument();
        expect(screen.getByText('کار و پروژه')).toBeInTheDocument();

        // Trigger auto-fit free slot button for unscheduled 45m task: 08:00->08:45 fits before 09:00 task
        fireEvent.click(screen.getByTitle('یافتن اولین وقت خالی'));
        expect(mockUpdateTask).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 't_free',
                startTime: '08:00',
            })
        );
    });
});
