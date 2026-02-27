import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useUI } from '../context/UIContext';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SubjectTask } from '../types';
import { addDays, toIsoString } from '../utils';

export const VoiceTaskInput: React.FC = () => {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const { settings, addTask, startDate, currentDay, geminiApiKey } = useStore();
    const { showToast } = useUI();
    const [recognition, setRecognition] = useState<any>(null);

    useEffect(() => {
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const rec = new SpeechRec();
            rec.lang = 'fa-IR';
            rec.continuous = false;
            rec.interimResults = false;

            rec.onstart = () => setIsListening(true);
            rec.onend = () => setIsListening(false);
            rec.onerror = (e: any) => {
                setIsListening(false);
                if (e.error !== 'no-speech') {
                    showToast('خطا در تشخیص صدا: ' + e.error, 'error');
                }
            };
            rec.onresult = async (e: any) => {
                const text = e.results[0][0].transcript;
                await processVoiceCommand(text);
            };
            setRecognition(rec);
        }
    }, [startDate, currentDay, geminiApiKey, settings]);

    const processVoiceCommand = async (text: string) => {
        if (!text) return;

        const apiKey = geminiApiKey || (import.meta as any).env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            showToast('کد دسترسی Gemini (API Key) در تنظیمات وارد نشده است.', 'error');
            return;
        }

        setIsProcessing(true);
        showToast('در حال پردازش فرمان صوتی...', 'info');

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const modelName = settings?.geminiModel || "gemini-1.5-flash";
            const model = genAI.getGenerativeModel({ model: modelName });

            const prompt = `
            کاربر یک فرمان صوتی برای برنامه ریزی درسی داده است. متن: "${text}"
            لطفا اطلاعات را استخراج کن و دقیقا یک آرایه JSON برگردان شامل آبجکت‌های زیر:
            [
              {
                "subject": "نام درس (مثلا فیزیک, زیست, ریاضی)",
                "topic": "مبحث یا فصل مشخص شده",
                "details": "نوع فعالیت (مطالعه, تست, مرور)",
                "dateOffset": 0, // 0 = امروز، 1 = فردا، 2 = پس‌فردا و ...
                "estimatedMinutes": 45 // تخمین زمان به دقیقه در صورت ذکر شدن، وگرنه 60
              }
            ]
            *فقط* خروجی JSON با کروشه [] بده و هیچ توضیحات دیگری ننویس.
            `;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            let jsonStr = responseText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
            const startIndex = jsonStr.indexOf('[');
            const endIndex = jsonStr.lastIndexOf(']');
            if (startIndex !== -1 && endIndex !== -1) {
                jsonStr = jsonStr.substring(startIndex, endIndex + 1);
            }

            const parsed = JSON.parse(jsonStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
                parsed.forEach(item => {
                    const taskDayId = currentDay + (item.dateOffset || 0);
                    const taskDate = toIsoString(addDays(startDate, taskDayId - 1));

                    const newTask: SubjectTask = {
                        id: 'voice_' + Date.now() + Math.random().toString().substring(2, 6),
                        dayId: taskDayId,
                        date: taskDate,
                        subject: item.subject || 'عمومی',
                        topic: item.topic || 'بدون مبحث',
                        details: item.details || 'مطالعه',
                        isCompleted: false,
                        isCustom: true,
                        studyType: 'study',
                    };
                    addTask(newTask);
                });
                showToast(`${parsed.length} وظیفه هوشمند اضافه‌شد!`, 'success');
            } else {
                throw new Error("Invalid format");
            }
        } catch (error) {
            console.error("Voice Ai Error:", error);
            showToast('متاسفانه در پردازش فرمان مشکلی پیش آمد.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleListen = () => {
        if (!recognition) {
            showToast('مرورگر شما از قابلیت تشخیص صدا پشتیبانی نمی‌کند!', 'warning');
            return;
        }
        if (isListening) {
            recognition.stop();
        } else {
            try {
                recognition.start();
            } catch (e) {
                console.error(e);
            }
        }
    };

    return (
        <button
            onClick={toggleListen}
            className={`fixed bottom-[5.5rem] md:bottom-6 left-6 z-50 p-3.5 rounded-full shadow-lg transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/50' : isProcessing ? 'bg-amber-500 text-white shadow-amber-500/50 hover:bg-amber-600' : 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white hover:shadow-indigo-500/40 shadow-md'}`}
            title="فرمان صوتی (AI)"
        >
            {isProcessing ? <Loader2 size={24} className="animate-spin" /> : isListening ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
    );
};
