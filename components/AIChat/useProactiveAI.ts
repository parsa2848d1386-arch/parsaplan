import { useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
// @ts-ignore
import { GoogleGenerativeAI } from "@google/generative-ai";
import { get, set } from 'idb-keyval';
import { toIsoString, getShamsiDate } from '../../utils';

export const useProactiveAI = () => {
    const { settings, tasks, updateSettings, userName, currentDay, getProgress } = useStore();

    useEffect(() => {
        const checkProactive = async () => {
            const todayIso = toIsoString(new Date());
            const lastCheck = localStorage.getItem('parsaplan_last_proactive_check');

            if (lastCheck === todayIso) return; // Already checked today

            const activeApiKey = settings.geminiApiKey || localStorage.getItem('gemini_api_key') || '';
            const activeModel = settings.geminiModel || 'gemini-2.0-flash';

            if (!activeApiKey) return;

            // Only run if user is active and has done something
            if (tasks.filter(t => t.isCompleted).length === 0) return;

            // Analyze recent test stats
            const recentTasks = tasks.filter(t => t.date <= todayIso && t.date >= toIsoString(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)));
            const tasksWithStats = recentTasks.filter(t => t.testStats && t.testStats.total > 0);

            let promptContext = `
            Today's Date: ${todayIso}
            User Name: ${userName}
            Overall Progress: ${getProgress()}%
            `;

            if (tasksWithStats.length > 0) {
                promptContext += `\nRecent Test Stats:\n`;
                tasksWithStats.forEach(t => {
                    if (t.testStats) {
                        const pct = Math.round((t.testStats.correct / t.testStats.total) * 100);
                        promptContext += `- Topic: ${t.topic} (${t.subject}), Score: ${pct}% (${t.testStats.correct}/${t.testStats.total})\n`;
                    }
                });
            } else {
                const overdue = tasks.filter(t => t.date < todayIso && !t.isCompleted).length;
                promptContext += `\nOverdue Tasks: ${overdue}\n`;
                if (overdue < 3) return; // Not interesting enough to bother if no test stats and few overdue
            }

            const sysPrompt = `
            You are the ParsaPlan Ultra Intelligence. You are proactively checking up on the user.
            Analyze the following context.
            If the user has a test score below 50% recently, suggest a review session for that topic.
            If the user has many overdue tasks, suggest them to use the Rebalance feature in the dashboard.
            If the user is doing great, give a very short encouraging message.
            Keep it under 3-4 sentences. Speak completely in Persian. Friendly and supportive tone.
            If there is nothing really important to say, return "IGNORE".

            Context:
            ${promptContext}
            `;

            try {
                const genAI = new GoogleGenerativeAI(activeApiKey);
                const model = genAI.getGenerativeModel({ model: activeModel });
                const result = await model.generateContent(sysPrompt);
                const responseText = result.response.text().trim();

                if (responseText !== 'IGNORE' && responseText.length > 5) {
                    await sendProactiveMessage(responseText);
                    updateSettings({ hasUnreadAiMessage: true });
                }

                localStorage.setItem('parsaplan_last_proactive_check', todayIso);
            } catch (error) {
                console.error("Proactive AI Check Failed:", error);
            }
        };

        const t = setTimeout(checkProactive, 5000); // Wait 5s before running so we don't block initial load
        return () => clearTimeout(t);
    }, [settings.geminiApiKey, tasks]);
};

async function sendProactiveMessage(text: string) {
    try {
        let savedSessions: any = await get('gemini_chat_sessions');
        if (!savedSessions) {
            const localRaw = localStorage.getItem('gemini_chat_sessions');
            if (localRaw) savedSessions = JSON.parse(localRaw);
            else savedSessions = [];
        }

        let session;
        if (savedSessions && savedSessions.length > 0) {
            session = savedSessions[0];
        } else {
            session = {
                id: crypto.randomUUID(),
                title: 'دستیار پیش‌قدم',
                messages: [],
                timestamp: Date.now()
            };
            savedSessions = [session];
        }

        const newMsg = {
            id: crypto.randomUUID(),
            text: text,
            sender: 'ai',
            timestamp: new Date()
        };

        session.messages.push(newMsg);
        session.timestamp = Date.now();

        await set('gemini_chat_sessions', savedSessions);
    } catch (e) {
        console.error("Failed to inject proactive message", e);
    }
}
