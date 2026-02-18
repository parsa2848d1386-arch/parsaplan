
// XP and Leveling Logic - Refactored for a more "Game-like" progression

// Constants
export const BASE_XP_PER_LEVEL = 200;
export const XP_MULTIPLIER = 150; // Linear increment
export const MAX_LEVEL = 100;

/**
 * Returns the XP required to reach the NEXT level from the current level.
 * Formula: Base + (Level * 150)
 */
export const getXpForNextLevel = (currentLevel: number): number => {
    // Level 1 -> 2: 200 + (1 * 150) = 350
    // Level 5 -> 6: 200 + (5 * 150) = 950
    // Level 10 -> 11: 200 + (10 * 150) = 1700
    return BASE_XP_PER_LEVEL + (currentLevel * XP_MULTIPLIER);
};

/**
 * Calculates level information based on total XP.
 * @returns { level, currentLevelXp, xpForNextLevel, progressPercent }
 */
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
        currentLevelXp: xp,
        xpForNextLevel,
        progressPercent
    };
};

export const XP_REWARDS = {
    COMPLETE_TASK: 100,
    COMPLETE_EXAM: 250,      // Exams are worth much more
    COMPLETE_ANALYSIS: 150,  // Analysis/Review is rewarded well
    COMPLETE_ROUTINE: 30,
    PERFECT_DAY_BONUS: 500,  // Major reward for 100% completion
    STREAK_BONUS_BASE: 20,    // Extra XP per day of streak
};

/**
 * Calculates XP reward based on type and current streak.
 */
export const getXpReward = (type: keyof typeof XP_REWARDS, streakDays: number = 0): number => {
    const base = XP_REWARDS[type];

    // Add streak bonus for task completion
    if (type.startsWith('COMPLETE_TASK') || type === 'COMPLETE_EXAM') {
        const streakBonus = streakDays * XP_REWARDS.STREAK_BONUS_BASE;
        return base + streakBonus;
    }

    return base;
};
