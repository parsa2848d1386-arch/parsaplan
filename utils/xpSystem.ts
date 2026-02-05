
// XP and Leveling Logic

// Constants
export const BASE_XP_PER_LEVEL = 100;
export const XP_MULTIPLIER = 1.2; // Exponential growth factor
export const MAX_LEVEL = 100;

// Returns the XP required to reach the NEXT level from the current level
export const getXpForNextLevel = (currentLevel: number): number => {
    // Formula: Base * (Level ^ Multiplier)
    // Level 1 -> 2: 100 * 1^1.2 = 100
    // Level 2 -> 3: 100 * 2^1.2 ~= 230
    // Level 10 -> 11: 100 * 10^1.2 ~= 1585
    return Math.floor(BASE_XP_PER_LEVEL * Math.pow(currentLevel, XP_MULTIPLIER));
};

// Returns { level, currentLevelXp, xpForNextLevel, progressPercent } based on total XP
export const calculateLevelInfo = (totalXp: number) => {
    let level = 1;
    let xp = totalXp;

    while (level < MAX_LEVEL) {
        const required = getXpForNextLevel(level);
        if (xp >= required) {
            xp -= required;
            level++;
        } else {
            break;
        }
    }

    const xpForNextLevel = getXpForNextLevel(level);
    const progressPercent = Math.min(100, Math.max(0, (xp / xpForNextLevel) * 100));

    return {
        level,
        currentLevelXp: xp, // XP earned towards next level
        xpForNextLevel,
        progressPercent
    };
};

export const XP_REWARDS = {
    COMPLETE_TASK: 50,
    COMPLETE_SUBTASK: 10,
    COMPLETE_ROUTINE: 20,
    PERFECT_DAY_BONUS: 200,
    STREAK_BONUS_MULTIPLIER: 0.1, // 10% extra per streak day
};

export const getXpReward = (type: keyof typeof XP_REWARDS, streakDays: number = 0): number => {
    const base = XP_REWARDS[type];
    if (type === 'COMPLETE_TASK') {
        const bonus = Math.floor(base * (streakDays * XP_REWARDS.STREAK_BONUS_MULTIPLIER));
        return base + bonus;
    }
    return base;
};
