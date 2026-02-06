
import { DailyRoutineSlot, Subject, SubjectTask } from './types';
import { BookOpen, Coffee, Calculator, Zap, FlaskConical, Tv, CheckCircle2 } from 'lucide-react';

export const TOTAL_DAYS = 12;
export const START_DATE_STR = "۱۱ بهمن";

export const MOTIVATIONAL_QUOTES = [
    "موفقیت مجموعه‌ای از تلاش‌های کوچک است که هر روز تکرار می‌شوند.",
    "آینده‌ات رو با کارهایی که امروز انجام میدی میسازی، نه کارهایی که قراره فردا انجام بدی.",
    "سخت‌کوشی استعداد رو شکست میده، وقتی که استعداد سخت کار نکنه.",
    "رویاهات رو باور کن، حتی اگه هیچکس دیگه باورشون نداره.",
    "درد امروز، قدرت فرداست.",
    "هیچ راه میانبری به جاهای که ارزش رفتن دارن وجود نداره.",
    "برنده همون بازنده‌ایه که یک بار دیگه تلاش کرده.",
    "تنها رقیب تو، خود دیروزت هستی.",
    "اجازه نده ترس از شکست، مانع بازی کردنت بشه.",
    "محدودیت‌ها فقط توی ذهن تو وجود دارن.",
    "هر روز یه فرصت جدید برای بهتر شدنه.",
    "تو قوی‌تر از اون چیزی هستی که فکر می‌کنی.",
    "شکست، معلم موفقیته.",
    "سخت‌ترین قدم، همون قدم اوله.",
    "به خودت اعتماد کن، تو می‌تونی.",
    "هر تلاشی که می‌کنی، یه قدم به هدفت نزدیک‌ترت می‌کنه.",
    "امروز رو با انرژی شروع کن، فردا نتیجه‌شو می‌بینی.",
    "موفقیت یه شبه نمیاد، ولی با پشتکار حتماً میاد.",
    "هر مشکلی یه راه‌حل داره، فقط باید پیداش کنی.",
    "تسلیم نشو، بهترین‌ها در راهن.",
    "زمان منتظر هیچکس نمی‌مونه، پس الان شروع کن.",
    "کوچک شروع کن، بزرگ فکر کن.",
    "هر شکستی یه درسه، هر درسی یه قدم به جلو.",
    "باور داشته باش که می‌تونی، نصف راه رو رفتی.",
    "تنبلی دشمن موفقیته.",
    "امروز سختی بکش، فردا راحت باش.",
    "رویاهات رو دنبال کن، نه بهانه‌هات رو.",
    "هر روز یه فرصته، هدرش نده.",
    "موفقیت انتخابه، نه شانس.",
    "تو بهتر از دیروزت هستی.",
    "با هر طلوع آفتاب، یه شانس جدید داری.",
    "اگه آسون بود، همه انجامش می‌دادن.",
    "سختی‌ها تو رو قوی‌تر می‌کنن.",
    "هیچوقت برای شروع دیر نیست.",
    "کنکور یه مسابقه با خودته، نه با بقیه.",
    "هر صفحه‌ای که می‌خونی، یه قدم به رتبه‌ات نزدیک‌ترت می‌کنه.",
    "استراحت کن، ولی تسلیم نشو.",
    "تمرکز کن، نتیجه قطعیه.",
    "موفقیت مال کساییه که دست از تلاش برنمی‌دارن.",
    "رقابت با دیگران نیست، رقابت با ضعف‌های خودته.",
    "هر روز صبح با این جمله شروع کن: امروز بهترین روز منه.",
    "نترس از اینکه کند پیش بری، بترس از اینکه بایستی.",
    "تو می‌تونی، تو می‌خوای، تو می‌رسی.",
    "سختی‌های امروز، خاطرات شیرین فرداست.",
    "یه قدم، یه تست، یه درس... هر کدوم مهمه.",
    "به جلو نگاه کن، گذشته تغییر نمی‌کنه ولی آینده دست توئه.",
    "هر چقدر سخت‌تر باشه، شیرینی موفقیت بیشتره.",
    "تو برنده‌ای، فقط باید ثابتش کنی.",
    "امروز کار کن که فردا افتخار کنی.",
    "هیچکس به اندازه خودت به خودت ایمان نداره، پس ایمان داشته باش."
];


export const DAILY_ROUTINE: DailyRoutineSlot[] = [
    {
        id: 1,
        time: '۰۷:۳۰ - ۰۹:۰۰',
        title: 'زیست‌شناسی (آزمون)',
        description: '۴۵ تست: ۴۵ دقیقه آزمون جدی + ۴۵ دقیقه تحلیل اولیه.',
        icon: 'bio',
        type: 'test'
    },
    {
        id: 2,
        time: '۰۹:۱۵ - ۱۰:۴۵',
        title: 'زیست‌شناسی (تکمیل)',
        description: 'ادامه تحلیل، بررسی پاسخنامه تشریحی و مطالعه متن کتاب.',
        icon: 'bio',
        type: 'review'
    },
    {
        id: 3,
        time: '۱۱:۰۰ - ۱۲:۳۰',
        title: 'ریاضیات (آزمون)',
        description: '۳۵ تست: ۶۰ دقیقه آزمون زمان‌دار + ۳۰ دقیقه شروع تحلیل.',
        icon: 'math',
        type: 'test'
    },
    {
        id: 4,
        time: '۱۲:۴۵ - ۱۴:۱۵',
        title: 'ریاضیات (تکمیل)',
        description: 'تکمیل تحلیل. اگر زود تمام شد، ۱۰ دقیقه استراحت مطلق.',
        icon: 'math',
        type: 'review'
    },
    {
        id: 5,
        time: '۱۴:۱۵ - ۱۵:۱۵',
        title: 'ناهار و استراحت',
        description: 'موبایل ممنوع ⛔️ - فقط خواب یا غذا.',
        icon: 'rest',
        type: 'rest'
    },
    {
        id: 6,
        time: '۱۵:۱۵ - ۱۶:۴۵',
        title: 'دفترچه دوم (فیزیک+شیمی)',
        description: '۶۸ تست ترکیبی (۳۳ فیزیک + ۳۵ شیمی). بدون وقفه.',
        icon: 'science',
        type: 'test'
    },
    {
        id: 7,
        time: '۱۷:۰۰ - ۱۸:۲۰',
        title: 'تحلیل دفترچه دوم',
        description: 'تحلیل ۶۸ تست در ۸۰ دقیقه. تمرکز بر غلط‌ها و نزده‌ها.',
        icon: 'science',
        type: 'review'
    },
    {
        id: 8,
        time: '۱۸:۴۵ - ۲۰:۱۵',
        title: 'آموزش / کلاس',
        description: 'دیدن فیلم‌های آموزشی (اولویت با ضعف‌های امروز).',
        icon: 'class',
        type: 'class'
    },
    {
        id: 9,
        time: '۲۰:۴۵ - ۲۲:۰۰',
        title: 'آموزش / لکه‌گیری',
        description: 'ادامه کلاس‌ها یا جبران عقب‌افتادگی.',
        icon: 'class',
        type: 'class'
    }
];

// Raw Data
const RAW_PLAN_DATA: Omit<SubjectTask, 'id'>[] = [
    // --- Biology ---
    { dayId: 1, date: '۱۱ بهمن', subject: Subject.Biology, topic: 'دوازدهم - فصل ۵ (گفتار ۱)', testRange: '۱۷۰۴ تا ۱۷۴۸', details: '۴۵ تست', isCompleted: false },
    { dayId: 2, date: '۱۲ بهمن', subject: Subject.Biology, topic: 'دوازدهم - فصل ۵ (گفتار ۲)', testRange: '۱۷۴۹ تا ۱۷۹۳', details: '۴۵ تست', isCompleted: false },
    { dayId: 3, date: '۱۳ بهمن', subject: Subject.Biology, topic: 'دوازدهم - فصل ۵ (گفتار ۳)', testRange: '۱۷۹۴ تا ۱۸۳۸', details: '۴۵ تست', isCompleted: false },
    { dayId: 4, date: '۱۴ بهمن', subject: Subject.Biology, topic: 'دوازدهم (پایان) + شروع یازدهم', testRange: '۱۸۳۹-۱۸۵۹ (۱۲) + ۷۴۷-۷۷۰ (۱۱)', details: 'ترکیبی', isCompleted: false },
    { dayId: 5, date: '۱۵ بهمن', subject: Subject.Biology, topic: 'یازدهم - فصل ۵ (ایمنی)', testRange: '۷۷۱ تا ۸۱۵', details: '۴۵ تست', isCompleted: false },
    { dayId: 6, date: '۱۶ بهمن', subject: Subject.Biology, topic: 'یازدهم - فصل ۵ (ایمنی)', testRange: '۸۱۶ تا ۸۶۰', details: '۴۵ تست', isCompleted: false },
    { dayId: 7, date: '۱۷ بهمن', subject: Subject.Biology, topic: 'یازدهم - فصل ۵ (ایمنی)', testRange: '۸۶۱ تا ۹۰۵', details: '۴۵ تست', isCompleted: false },
    { dayId: 8, date: '۱۸ بهمن', subject: Subject.Biology, topic: 'یازدهم - فصل ۵ و ۶', testRange: '۹۰۶ تا ۹۵۰', details: '۴۵ تست', isCompleted: false },
    { dayId: 9, date: '۱۹ بهمن', subject: Subject.Biology, topic: 'یازدهم - فصل ۶ (تقسیم)', testRange: '۹۵۱ تا ۹۹۵', details: '۴۵ تست', isCompleted: false },
    { dayId: 10, date: '۲۰ بهمن', subject: Subject.Biology, topic: 'یازدهم - فصل ۶ (تقسیم)', testRange: '۹۹۶ تا ۱۰۴۰', details: '۴۵ تست', isCompleted: false },
    { dayId: 11, date: '۲۱ بهمن', subject: Subject.Biology, topic: 'یازدهم - فصل ۶ (تقسیم)', testRange: '۱۰۴۱ تا ۱۰۸۵', details: '۴۵ تست', isCompleted: false },
    { dayId: 12, date: '۲۲ بهمن', subject: Subject.Biology, topic: 'یازدهم - جمع‌بندی', testRange: '۱۰۸۶ تا ۱۱۲۸', details: 'پایان', isCompleted: false },

    // --- Physics ---
    { dayId: 1, date: '۱۱ بهمن', subject: Subject.Physics, topic: 'یازدهم - الکتریسیته ساکن', testRange: '۳۶۵ تا ۴۳۰', details: 'انتخاب ۳۳ تست (زوج‌ها)', isCompleted: false },
    { dayId: 2, date: '۱۲ بهمن', subject: Subject.Physics, topic: 'یازدهم - الکتریسیته جاری', testRange: '۴۳۱ تا ۴۹۶', details: 'انتخاب ۳۳ تست (زوج‌ها)', isCompleted: false },
    { dayId: 3, date: '۱۳ بهمن', subject: Subject.Physics, topic: 'یازدهم - مغناطیس', testRange: '۴۹۷ تا ۵۶۲', details: 'انتخاب ۳۳ تست (زوج‌ها)', isCompleted: false },
    { dayId: 4, date: '۱۴ بهمن', subject: Subject.Physics, topic: 'یازدهم - مغناطیس و القا', testRange: '۵۶۳ تا ۶۲۸', details: 'انتخاب ۳۳ تست (زوج‌ها)', isCompleted: false },
    { dayId: 5, date: '۱۵ بهمن', subject: Subject.Physics, topic: 'یازدهم - القا (پایان)', testRange: '۶۲۹ تا ۶۷۲', details: 'انتخاب ۳۳ تست (باقی‌مانده)', isCompleted: false },
    { dayId: 6, date: '۱۶ بهمن', subject: Subject.Physics, topic: 'دوازدهم - نوسان', testRange: '۱۲۰۸ تا ۱۲۴۰', details: 'همه تست‌ها', isCompleted: false },
    { dayId: 7, date: '۱۷ بهمن', subject: Subject.Physics, topic: 'دوازدهم - نوسان', testRange: '۱۲۴۱ تا ۱۲۷۳', details: 'همه تست‌ها', isCompleted: false },
    { dayId: 8, date: '۱۸ بهمن', subject: Subject.Physics, topic: 'دوازدهم - موج', testRange: '۱۲۷۴ تا ۱۳۰۶', details: 'همه تست‌ها', isCompleted: false },
    { dayId: 9, date: '۱۹ بهمن', subject: Subject.Physics, topic: 'دوازدهم - موج', testRange: '۱۳۰۷ تا ۱۳۳۹', details: 'همه تست‌ها', isCompleted: false },
    { dayId: 10, date: '۲۰ بهمن', subject: Subject.Physics, topic: 'دوازدهم - موج', testRange: '۱۳۴۰ تا ۱۳۷۲', details: 'همه تست‌ها', isCompleted: false },
    { dayId: 11, date: '۲۱ بهمن', subject: Subject.Physics, topic: 'دوازدهم - موج (صوت)', testRange: '۱۳۷۳ تا ۱۴۰۵', details: 'همه تست‌ها', isCompleted: false },
    { dayId: 12, date: '۲۲ بهمن', subject: Subject.Physics, topic: 'دوازدهم - موج (پایان)', testRange: '۱۴۰۶ تا ۱۴۴۳', details: 'همه تست‌ها', isCompleted: false },

    // --- Chemistry ---
    { dayId: 1, date: '۱۱ بهمن', subject: Subject.Chemistry, topic: 'دوازدهم - فصل ۳', testRange: '۱۵۵۰ تا ۱۵۸۵', details: '۳۵ تست', isCompleted: false },
    { dayId: 2, date: '۱۲ بهمن', subject: Subject.Chemistry, topic: 'دوازدهم - فصل ۳', testRange: '۱۵۸۶ تا ۱۶۲۱', details: '۳۵ تست', isCompleted: false },
    { dayId: 3, date: '۱۳ بهمن', subject: Subject.Chemistry, topic: 'دوازدهم - فصل ۳', testRange: '۱۶۲۲ تا ۱۶۵۷', details: '۳۵ تست', isCompleted: false },
    { dayId: 4, date: '۱۴ بهمن', subject: Subject.Chemistry, topic: 'دوازدهم - فصل ۳', testRange: '۱۶۵۸ تا ۱۶۹۳', details: '۳۵ تست', isCompleted: false },
    { dayId: 5, date: '۱۵ بهمن', subject: Subject.Chemistry, topic: 'دوازدهم - فصل ۳ (پایان)', testRange: '۱۶۹۴ تا ۱۷۳۱', details: '۳۵ تست', isCompleted: false },
    { dayId: 6, date: '۱۶ بهمن', subject: Subject.Chemistry, topic: 'یازدهم - فصل ۲', testRange: '۴۴۹ تا ۴۸۴', details: '۳۵ تست', isCompleted: false },
    { dayId: 7, date: '۱۷ بهمن', subject: Subject.Chemistry, topic: 'یازدهم - فصل ۲', testRange: '۴۸۵ تا ۵۲۰', details: '۳۵ تست', isCompleted: false },
    { dayId: 8, date: '۱۸ بهمن', subject: Subject.Chemistry, topic: 'یازدهم - فصل ۲', testRange: '۵۲۱ تا ۵۵۶', details: '۳۵ تست', isCompleted: false },
    { dayId: 9, date: '۱۹ بهمن', subject: Subject.Chemistry, topic: 'یازدهم - فصل ۲', testRange: '۵۵۷ تا ۵۹۲', details: '۳۵ تست', isCompleted: false },
    { dayId: 10, date: '۲۰ بهمن', subject: Subject.Chemistry, topic: 'یازدهم - فصل ۲', testRange: '۵۹۳ تا ۶۲۸', details: '۳۵ تست', isCompleted: false },
    { dayId: 11, date: '۲۱ بهمن', subject: Subject.Chemistry, topic: 'یازدهم - فصل ۲', testRange: '۶۲۹ تا ۶۶۴', details: '۳۵ تست', isCompleted: false },
    { dayId: 12, date: '۲۲ بهمن', subject: Subject.Chemistry, topic: 'یازدهم - فصل ۲ (پایان)', testRange: '۶۶۵ تا ۷۰۰', details: '۳۵ تست', isCompleted: false },

    // --- Math ---
    { dayId: 1, date: '۱۱ بهمن', subject: Subject.Math, topic: 'مشتق', testRange: '۱۶۷۰ تا ۱۷۳۹', details: '۳۵ تست (زوج‌ها)', isCompleted: false },
    { dayId: 2, date: '۱۲ بهمن', subject: Subject.Math, topic: 'مشتق', testRange: '۱۷۴۰ تا ۱۸۰۹', details: '۳۵ تست (زوج‌ها)', isCompleted: false },
    { dayId: 3, date: '۱۳ بهمن', subject: Subject.Math, topic: 'مشتق', testRange: '۱۸۱۰ تا ۱۸۷۹', details: '۳۵ تست (زوج‌ها)', isCompleted: false },
    { dayId: 4, date: '۱۴ بهمن', subject: Subject.Math, topic: 'مشتق (پایان) + کاربرد (شروع)', testRange: '۱۸۸۰-۱۹۱۹ (زوج) + ۱۹۲۰-۱۹۳۴', details: '۲۰ تست مشتق + ۱۵ کاربرد', isCompleted: false },
    { dayId: 5, date: '۱۵ بهمن', subject: Subject.Math, topic: 'کاربرد مشتق', testRange: '۱۹۳۵ تا ۱۹۶۹', details: 'همه تست‌ها', isCompleted: false },
    { dayId: 6, date: '۱۶ بهمن', subject: Subject.Math, topic: 'کاربرد مشتق', testRange: '۱۹۷۰ تا ۲۰۰۴', details: 'همه تست‌ها', isCompleted: false },
    { dayId: 7, date: '۱۷ بهمن', subject: Subject.Math, topic: 'کاربرد مشتق', testRange: '۲۰۰۵ تا ۲۰۳۹', details: 'همه تست‌ها', isCompleted: false },
    { dayId: 8, date: '۱۸ بهمن', subject: Subject.Math, topic: 'کاربرد مشتق', testRange: '۲۰۴۰ تا ۲۰۷۴', details: 'همه تست‌ها', isCompleted: false },
    { dayId: 9, date: '۱۹ بهمن', subject: Subject.Math, topic: 'کاربرد مشتق (پایان)', testRange: '۲۰۷۵ تا ۲۱۱۹', details: 'همه تست‌ها', isCompleted: false },
    { dayId: 10, date: '۲۰ بهمن', subject: Subject.Math, topic: 'هندسه یازدهم', testRange: '۲۲۱۱ تا ۲۲۴۵', details: 'همه تست‌ها', isCompleted: false },
    { dayId: 11, date: '۲۱ بهمن', subject: Subject.Math, topic: 'هندسه یازدهم', testRange: '۲۲۴۶ تا ۲۲۸۰', details: 'همه تست‌ها', isCompleted: false },
    { dayId: 12, date: '۲۲ بهمن', subject: Subject.Math, topic: 'هندسه یازدهم (پایان)', testRange: '۲۲۸۱ تا ۲۳۳۵', details: '۵۴ تست (انتخابی)', isCompleted: false },
];

// Generate IDs for the default plan
export const PLAN_DATA: SubjectTask[] = RAW_PLAN_DATA.map((task, index) => ({
    ...task,
    id: `default-${index}-${task.dayId}-${task.subject.replace(/\s/g, '')}`
}));
