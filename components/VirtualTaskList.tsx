import React, { CSSProperties } from 'react';
import { FixedSizeList as List } from 'react-window';
// @ts-ignore
import AutoSizer from 'react-virtualized-auto-sizer';
import { SubjectTask } from '../types';
import { TaskCard } from './TaskCard';

interface VirtualTaskListProps {
    tasks: SubjectTask[];
    toggleTask: (id: string) => void;
    openEdit: (e: React.MouseEvent, task: SubjectTask) => void;
    handleDelete: (e: React.MouseEvent, id: string) => void;
    viewMode: 'normal' | 'compact';
    isOverdue?: boolean; // We might reuse this for overdue lists too
    onMoveToToday?: (id: string) => void;
}

export const VirtualTaskList: React.FC<VirtualTaskListProps> = ({
    tasks,
    toggleTask,
    openEdit,
    handleDelete,
    viewMode,
    isOverdue,
    onMoveToToday
}) => {
    // Estimate heights
    // Normal Card is approx 180px with margins.
    // Compact Card is approx 80px with margins.
    const itemSize = viewMode === 'compact' ? 90 : 200;

    const Row = ({ index, style }: { index: number; style: CSSProperties }) => {
        const task = tasks[index];
        // We need to add some padding to style because react-window positions absolutely
        // But TaskCard has margins. Best to put padding inside the div wrapper.
        return (
            <div style={style} className="px-1 pb-2">
                <TaskCard
                    task={task}
                    viewMode={viewMode}
                    onToggle={toggleTask}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    isOverdue={isOverdue}
                    onMoveToToday={onMoveToToday}
                />
            </div>
        );
    };

    return (
        <div style={{ height: '600px', width: '100%' }}>
            <AutoSizer>
                {({ height, width }) => (
                    <List
                        height={height}
                        itemCount={tasks.length}
                        itemSize={itemSize}
                        width={width}
                        className="custom-scrollbar"
                    >
                        {Row}
                    </List>
                )}
            </AutoSizer>
        </div>
    );
};
