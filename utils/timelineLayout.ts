import { SubjectTask } from '../types';
import { timeToMinutes } from '../utils';

/**
 * Converts a wall-clock "HH:mm" string into minutes elapsed since `cutoffHour` (0..1439).
 * E.g. with cutoffHour=5: "05:00" -> 0, "09:30" -> 270, "01:15" -> 1215.
 */
export function getOffsetMinutesFromCutoff(timeStr: string, cutoffHour: number = 5): number {
    const mins = timeToMinutes(timeStr);
    const cutoffMins = ((cutoffHour % 24) + 24) % 24 * 60;
    return (mins - cutoffMins + 1440) % 1440;
}

/**
 * Converts a cutoff-relative minute offset (0..1439) back into a 24h "HH:mm" string,
 * optionally snapped to a step (e.g. 15 minutes).
 */
export function formatMinutesAtCutoffOffset(
    offsetMinutes: number,
    cutoffHour: number = 5,
    snapStep: number = 15
): string {
    const clamped = Math.max(0, Math.min(1439, offsetMinutes));
    const snapped = snapStep > 1 ? Math.round(clamped / snapStep) * snapStep : Math.round(clamped);
    const bounded = Math.min(1425, Math.max(0, snapped));
    const totalWallMins = (bounded + cutoffHour * 60) % 1440;
    const h = Math.floor(totalWallMins / 60);
    const m = totalWallMins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export interface TimelineSpanItem<T> {
    id: string;
    startOffset: number;
    endOffset: number;
    data: T;
}

export interface PositionedTimelineItem<T> extends TimelineSpanItem<T> {
    laneIndex: number;
    laneCount: number;
    hasConflict: boolean;
}

/**
 * Assigns non-overlapping side-by-side lanes to timeline intervals using connected-cluster
 * interval graph partitioning so overlapping blocks never cover one another.
 */
export function computeTimelineLanes<T>(items: TimelineSpanItem<T>[]): PositionedTimelineItem<T>[] {
    if (items.length === 0) return [];

    const sorted = [...items].sort((a, b) =>
        a.startOffset !== b.startOffset ? a.startOffset - b.startOffset : a.endOffset - b.endOffset
    );

    // Group into connected overlap clusters
    const clusters: TimelineSpanItem<T>[][] = [];
    let currentCluster: TimelineSpanItem<T>[] = [];
    let clusterEnd = -1;

    for (const item of sorted) {
        if (currentCluster.length === 0 || item.startOffset < clusterEnd) {
            currentCluster.push(item);
            clusterEnd = Math.max(clusterEnd, item.endOffset);
        } else {
            clusters.push(currentCluster);
            currentCluster = [item];
            clusterEnd = item.endOffset;
        }
    }
    if (currentCluster.length > 0) clusters.push(currentCluster);

    const positioned: PositionedTimelineItem<T>[] = [];

    for (const cluster of clusters) {
        const laneEnds: number[] = [];
        const assigned: { item: TimelineSpanItem<T>; laneIndex: number }[] = [];

        for (const item of cluster) {
            let chosenLane = laneEnds.findIndex((end) => end <= item.startOffset);
            if (chosenLane === -1) {
                chosenLane = laneEnds.length;
                laneEnds.push(item.endOffset);
            } else {
                laneEnds[chosenLane] = item.endOffset;
            }
            assigned.push({ item, laneIndex: chosenLane });
        }

        const totalLanes = Math.max(1, laneEnds.length);
        for (const entry of assigned) {
            positioned.push({
                ...entry.item,
                laneIndex: entry.laneIndex,
                laneCount: totalLanes,
                hasConflict: totalLanes > 1,
            });
        }
    }

    return positioned;
}

/**
 * Finds the earliest open "HH:mm" time slot on `logicalDate` that fits `durationMinutes`
 * without overlapping existing scheduled tasks, searching from `minOffsetMinutes` onward.
 */
export function findNextFreeSlot(
    tasks: SubjectTask[],
    logicalDate: string,
    durationMinutes: number = 60,
    minOffsetMinutes: number = 180, // e.g., 08:00 AM if cutoff=5
    cutoffHour: number = 5
): string {
    const safeDur = Math.max(15, durationMinutes);
    const intervals = tasks
        .filter((t) => t.date === logicalDate && t.startTime)
        .map((t) => {
            const start = getOffsetMinutesFromCutoff(t.startTime!, cutoffHour);
            const dur = Math.max(15, t.durationMinutes ?? 60);
            return { start, end: start + dur };
        })
        .sort((a, b) => a.start - b.start);

    // Round candidate up to nearest 15-minute increment
    let cursor = Math.ceil(Math.max(0, minOffsetMinutes) / 15) * 15;

    for (const block of intervals) {
        if (block.end <= cursor) continue;
        if (cursor + safeDur <= block.start) {
            break; // Fits cleanly before this block
        }
        // Jump cursor past current occupied block rounded up to 15m
        cursor = Math.ceil(block.end / 15) * 15;
    }

    if (cursor + safeDur > 1440) {
        // Fallback: if rest of day is packed, search from early morning (cutoff + 2h)
        cursor = 120;
    }

    return formatMinutesAtCutoffOffset(cursor, cutoffHour, 15);
}
