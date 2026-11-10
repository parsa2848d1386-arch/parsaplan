import { DailyRoutineSlot, SubjectTask } from './types';

export const TOTAL_DAYS = 30;
export const START_DATE_STR = 'امروز';

export const MOTIVATIONAL_QUOTES = [
    'موفقیت مجموعه‌ای از قدم‌های کوچک و پیوسته است که هر روز تکرار می‌شوند.',
    'آینده‌ات را با کارهایی که امروز انجام می‌دهی می‌سازی، نه کارهایی که به فردا موکول می‌شوند.',
    'تمرکز روی یک کار مهم در لحظه، ارزشمندتر از شلوغ‌کاری پراکنده است.',
    'هر روز یک فرصت تازه برای نظم‌بخشی، یادگیری و رشد واقعی است.',
    'قدم‌های کوچک روزانه، در طول زمان نتایج خارق‌العاده می‌سازند.',
    'تنها رقیب واقعی تو، نسخه دیروز خودت است.',
    'بهترین زمان برای شروع یک عادت یا پروژه جدید همین الان است.',
    'استراحت هوشمندانه، سوخت تداوم و بهره‌وری پایدار است.',
    'ساختار شفاف در زمان، آرامش ذهن در عمل می‌آورد.',
    'کوچک شروع کن، منظم بمان و پیشرفتت را بسنج.',
    'نظم یعنی احترام گذاشتن به اهداف و زمان خودت.',
    'هر کاری که به پایان می‌رسد، انرژی تازه‌ای برای کار بعدی آزاد می‌کند.',
];

// Clean starter routine list is empty by default so new users never get fake Konkoor schedule data.
export const DAILY_ROUTINE: DailyRoutineSlot[] = [];

// Optional starter templates shown ONLY if the user explicitly picks one in Daily Routine page.
export const ROUTINE_TEMPLATES: Record<'balanced_life' | 'deep_work' | 'study_exam', DailyRoutineSlot[]> = {
    balanced_life: [
        {
            id: 1,
            time: '۰۷:۰۰ - ۰۷:۴۵',
            title: 'شروع صبح و برنامه‌ریزی',
            description: 'مرور اولویت‌های طلایی روز (MIT)، نوشیدن آب و آماده‌سازی ذهن.',
            icon: 'think',
            type: 'review',
        },
        {
            id: 2,
            time: '۰۹:۰۰ - ۱۱:۳۰',
            title: 'بلوک کار عمیق اول',
            description: 'تمرکز کامل روی مهم‌ترین کار یا پروژه روز بدون حواس‌پرتی.',
            icon: 'math',
            type: 'test',
        },
        {
            id: 3,
            time: '۱۳:۰۰ - ۱۴:۰۰',
            title: 'ناهار و استراحت میانه روز',
            description: 'تغذیه سالم و فاصله گرفتن کوتاه از صفحه‌نمایش.',
            icon: 'rest',
            type: 'rest',
        },
        {
            id: 4,
            time: '۱۵:۰۰ - ۱۷:۳۰',
            title: 'کارهای اجرایی و هماهنگی',
            description: 'پاسخ به پیام‌ها، جلسات، پیگیری امور و کارهای جاری.',
            icon: 'class',
            type: 'class',
        },
        {
            id: 5,
            time: '۱۸:۳۰ - ۱۹:۳۰',
            title: 'ورزش و سلامت جسم',
            description: 'باشگاه، پیاده‌روی یا تمرین کششی برای تخلیه استرس.',
            icon: 'gym',
            type: 'rest',
        },
        {
            id: 6,
            time: '۲۱:۳۰ - ۲۲:۰۰',
            title: 'جمع‌بندی شبانه و مطالعه سبک',
            description: 'ثبت دستاوردهای امروز، چیدن برنامه فردا و مطالعه کتاب.',
            icon: 'bio',
            type: 'review',
        },
    ],
    deep_work: [
        {
            id: 1,
            time: '۰۸:۳۰ - ۱۱:۰۰',
            title: 'اسپرینت عمیق صبحگاهی',
            description: 'طراحی، کدنویسی یا حل مسائل کلیدی با قفل تمرکز.',
            icon: 'think',
            type: 'test',
        },
        {
            id: 2,
            time: '۱۱:۳۰ - ۱۳:۰۰',
            title: 'جلسات و هم‌فکری تیمی',
            description: 'هماهنگی پروژه‌ها، تماس‌ها و بررسی بازخوردها.',
            icon: 'class',
            type: 'class',
        },
        {
            id: 3,
            time: '۱۴:۳۰ - ۱۷:۰۰',
            title: 'بلوک اجرایی و توسعه',
            description: 'تکمیل تسک‌های فنی، مستندسازی و تست خروجی.',
            icon: 'science',
            type: 'review',
        },
        {
            id: 4,
            time: '۲۰:۰۰ - ۲۱:۰۰',
            title: 'یادگیری مهارت جدید',
            description: 'مطالعه مقالات، دوره‌های تخصصی و به‌روزرسانی دانش.',
            icon: 'bio',
            type: 'class',
        },
    ],
    study_exam: [
        {
            id: 1,
            time: '۰۸:۰۰ - ۱۰:۰۰',
            title: 'پارت مطالعه یا آزمون صبح',
            description: 'تمرکز روی مباحث مفهومی یا حل سوالات زمان‌دار.',
            icon: 'test',
            type: 'test',
        },
        {
            id: 2,
            time: '۱۰:۳۰ - ۱۲:۳۰',
            title: 'تحلیل و مرور نکات',
            description: 'بررسی اشکالات، خلاصه‌نویسی و ساخت کارت لایتنر.',
            icon: 'review',
            type: 'review',
        },
        {
            id: 3,
            time: '۱۵:۰۰ - ۱۷:۳۰',
            title: 'پارت مطالعاتی عصر',
            description: 'پیشروی در منابع اصلی و تمرین عملی.',
            icon: 'bio',
            type: 'class',
        },
        {
            id: 4,
            time: '۲۱:۰۰ - ۲۲:۰۰',
            title: 'مرور شبانه و جمع‌بندی',
            description: 'مرور فلش‌کارت‌ها و برنامه‌ریزی روز بعد.',
            icon: 'think',
            type: 'review',
        },
    ],
};

// Empty by default so users start with an authentic clean slate rather than fake seed tasks.
export const PLAN_DATA: SubjectTask[] = [];
