# طرح جامع بازطراحی و مدرن‌سازی UI/UX موبایل ParsaPlan (تراز اپل — نوامبر ۲۰۲۶)

> **وضعیت سند:** ممیزی صرفاً خواندنی (Read-Only Audit) و نقشه راه پیاده‌سازی فازبندی‌شده  
> **مرجع استانداردها:** Apple HIG (iOS 26 / iOS 27 / iOS 27.3 & iPhone Duo)، پژوهش‌های کاربردپذیری موبایل NN/G و Baymard 2026، استاندارد دسترسی‌پذیری W3C WCAG 2.2 AA + APCA، توکن‌های طراحی W3C DTCG 2025.10، فیزیک حرکت Fluid Interfaces و بودجه رندر ۶۰ تا ۱۲۰ فریم‌برثانیه موبایل.  
> **قانون تغییرناپذیر:** هیچ فایل کد منبع، استایل، وابستگی یا پیکربندی در این مرحله تغییر نکرده است. تمام قراردادهای API، اسکیمای Firestore، جریان احراز هویت و منطق تجاری برنامه دست‌نخورده باقی می‌مانند.

---

## فاز ۱ — شناخت کدبیس و نقشه سیستم (Codebase Reconnaissance & System Mapping)

### ۱.۱ استک فنی، کتابخانه‌های UI و سیستم استایلینگ
* **هسته و فریم‌ورک (`package.json:15-42`):** React `19.2.4` + Vite `6.2.0` + TypeScript `5.8.2` + PWA (`vite-plugin-pwa` `1.2.0`، Workbox در `vite.config.ts:18-72`) + سرور Express (`server.ts`) برای پروکسی امن API.
* **مسیریابی (Navigation):** `react-router-dom` `7.13.0` با `HashRouter` (`App.tsx:58`) و lazy loading صفحات با `React.lazy` + `<Suspense>` (`App.tsx:16-24, 60`).
* **استایلینگ و توکن‌ها:** Tailwind CSS `4.1.18` از طریق `@import "tailwindcss";` و اتصال legacy config با `@config "./tailwind.config.js";` (`index.css:1-2`). **سه سیستم رنگ و استایل ناهمگون** به‌صورت هم‌زمان وجود دارند:
  1. متغیرهای Material Design 3 (`--md-primary`, `--md-surface-*`) در `index.css:16-43, 131-158` و نگاشت در `tailwind.config.js:14-64`.
  2. متغیرهای legacy تم (`--color-indigo-*`, `--color-violet-*`) در `index.css:45-124` با کلاس‌های `.theme-forest` و `.theme-rosegold` که عملاً توسط رنگ‌های ثابت hex در `tailwind.config.js:81-105` خنثی شده‌اند.
  3. استایل‌های inline داخل `<style>` در `index.html:34-128` که مستقیماً با `index.css` تعارض دارند.
* **انیمیشن و ژست‌ها (Motion & Gestures):** `framer-motion` `12.34.3` (برای ترنزیشن صفحات و سوایپ در `TaskCard.tsx` و درگ در `FloatingPiPWidget.tsx`). پکیج `@use-gesture/react` `10.3.1` در `package.json:20` نصب شده اما **در هیچ فایلی ایمپورت نشده است**. همچنین کلاس‌های `tailwindcss-animate` (`animate-in`, `zoom-in-*`, `slide-in-from-*`) و `@tailwindcss/typography` (`prose`) در بیش از ۱۴ کامپوننت استفاده شده‌اند، در حالی که هیچ‌کدام در `package.json` یا `tailwind.config.js:189` (`plugins: []`) نصب نیستند.
* **آیکون‌ها و فونت‌ها:** `lucide-react` `0.563.0` + فونت `Material Symbols Outlined` بارگذاری‌شده در `index.html:29-32` و `index.css:181-195` (کاملاً بلااستفاده در کل TSX!) + ایموجی‌های سیستمی پراکنده در سراسر رابط کاربری. فونت‌ها: `Vazirmatn` + `Inter` + `Plus Jakarta Sans` (`index.html:26-28`).
* **فرم‌ها و نمودارها:** `react-hook-form` `7.71.1` + `zod` `4.3.6` (فقط در `AuthModal.tsx`)، `recharts` `3.7.0` (در `Analysis.tsx`).
* **ذخیره‌سازی و همگام‌سازی:** `idb-keyval` + `StorageManager` (`utils/StorageManager.ts`) + صف آفلاین `syncEngine` (`services/syncEngine.ts`) + Firebase `12.8.0` (`AuthContext.tsx`, `StoreContext.tsx`).
* **سند طراحی موجود:** هیچ فایل `DESIGN.md` یا کاتالوگ توکن DTCG وجود ندارد.

### ۱.۲ دستورات محلی راستی‌آزمایی (Verification Gates)
استخراج‌شده دقیقاً از `package.json:6-14`:
* **اجرای محیط توسعه (پورت ۳۰۰۰):** `npm run dev` (`tsx server.ts`)
* **بیلد تولیدی (Build Gate):** `npm run build` (`vite build`)
* **بررسی تایپ‌ها و لینت (Typecheck Gate):** `npm run lint` (`tsc --noEmit`)
* **تست‌های واحد و کامپوننت (Unit/Component Gate):** `npm run test` (`vitest run`)
* **تست‌های E2E:** `npm run test:e2e` (`vitest run src/__tests__/e2e`)
* **پیش‌نمایش بیلد:** `npm run preview` (`vite preview`)
* **ممیزی بصری و موبایل (Visual QA):** اجرای `playwright-cli` روی `http://localhost:3000` در ویوپورت‌های `375×812` (iPhone Compact)، `393×852` (iPhone 16/17)، `430×932` (Pro Max) و `768×1024` (Foldable/Tablet) در هر دو حالت Light و Dark و `prefers-reduced-motion: reduce`.

### ۱.۳ فهرست کامل صفحات و گراف ناوبری فعلی
مسیریابی در `App.tsx:59-75`:
1. `/welcome` (`pages/Welcome.tsx`): صفحه ورود اولیه، توسط `FirstVisitGate` (`App.tsx:32-44`) همه مسیرها را پیش از ثبت `parsaplan_welcomed_v1` مسدود می‌کند.
2. `/` (`pages/Dashboard.tsx` — ۹۹۷ خط): خانه و داشبورد روزانه (تقویم ۷ روزه، آمار، حال‌وهوا، پیشنهاد بلاک زمانی، لیست تسک‌ها، تسک‌های معوق، پاد مطالعه، صدای محیطی، نوار تخلیه ذهن).
3. `/planner` (`pages/VisualPlanner.tsx` — ۵۶۴ خط): برنامه‌ریز بصری با سه نمای «تایم‌لاین یکپارچه» (`UnifiedTimeline.tsx`)، «جدول ۱۰ دقیقه‌ای YPT» (`DualColumn10MinuteGrid.tsx`) و «هوشمند ماکرو» (`SmartMacroPlanner.tsx`).
4. `/subjects` (`pages/Subjects.tsx` — ۷۱۵ خط): مدیریت حوزه‌ها/دروس + ۶ نمای نمایش تسک (`list`, `kanban`, `matrix`, `table`, `calendar`, `grid`). **در نوار پایین موبایل غایب است!**
5. `/analysis` (`pages/Analysis.tsx` — ۷۰۸ خط): تحلیل‌ها، نمودارهای ریچارتس، اسپرینت فوکوس، کارت‌های لایتنر، هیت‌مپ سالانه و هفتگی.
6. `/leaderboard` (`pages/Leaderboard.tsx` — ۱۸۶۶ خط): لیگ، اتاق‌های مطالعه زنده، رتبه‌بندی و پروفایل رقبا.
7. `/settings` (`pages/Settings.tsx` — ۱۰۱۶ خط): تنظیمات حساب، پروفایل، برنامه زمانی، هوش مصنوعی، شخصی‌سازی، تم‌ها، بکاپ، چاپ، فایربیس و آرشیو.
8. `/history` (`pages/History.tsx` — ۱۱۹ خط): تاریخچه دوره‌های آرشیوشده و لاگ فعالیت. **در نوار پایین موبایل غایب است (فقط از ته Settings یا CommandPalette قابل دسترس است).**
9. `/ai-chat` (`pages/AIChat.tsx` — ۵۸۲ خط): صفحه کامل چت با مربی هوشمند (همچنین به‌عنوان دراور تمام‌صفحه در موبایل از طریق `Layout.tsx:540-576`).

**اوورلی‌ها و لایه‌های سراسری (`App.tsx:76-84`, `Layout.tsx:183-193, 456-468, 540-576`):**
`CommandPalette`، `MorningPlanningModal`، `EveningReflectionModal`، `BrainDumpModal`، `ToastContainer`، `ConfirmModal`، `LevelUpShowcase`، `ConfettiContainer`، `FocusTimer`، `FloatingPiPWidget`، `AuthModal`، `AIChat` Drawer، دکمه شناور AI FAB و `NotificationBell`.

### ۱.۴ محدودیت‌های معماری فعلی
* **کانتکست یکپارچه غول‌پیکر بدون Memoization (`context/StoreContext.tsx:1585-1730`):** آبجکت `contextValue` در هر رندر از نو ساخته می‌شود و بیش از ۸۰ فیلد (داده + UI + همگام‌سازی + `saveStatus`) را در یک Provider نگه می‌دارد؛ هر تغییر کوچک مثل `saveStatus` تمام درخت `Layout` و صفحات را دوباره رندر می‌کند.
* **فیلتر CSS روی `body` که `position: fixed` را می‌شکند (`index.css:197-214`, `hooks/useBioperformance.ts`):** اعمال `filter: sepia(...)` روی `body` یک Containing Block جدید ایجاد می‌کند و پوزیشن `fixed` نوار پایین، هدر، مودال‌ها و `FloatingPiPWidget` را در موبایل مختل می‌سازد.
* **رندر هم‌زمان ده‌ها لایه `backdrop-filter` و `blur-[120px]`** در لایه محتوا (به‌ویژه در `AIChat.tsx`، `ChatMessage.tsx` و `FocusTimer.tsx`).
* **وابستگی به `window.innerWidth < 768` هنگام رندر (`Layout.tsx:174, 446, 559`):** بدون listener واکنش‌پذیر برای چرخش گوشی یا دستگاه‌های تاشو (iPhone Duo / Foldable).
* **تداخل قوانین استایل در `index.html:34-128` با `index.css`** و وجود کلاس‌های تایپوگرافی تعریف‌نشده (`text-label-sm`, `text-body-sm`, `text-headline-md`) و پلاگین‌های نصب‌نشده (`tailwindcss-animate`, `@tailwindcss/typography`).
* **هویت بصری و شخصیت برند پیشنهادی (استنتاج‌شده از دامنه محصول):** آرام (Calm)، منظم و شفاف (Crisp & Structured)، متمرکز بر پیوستگی بدون استرس (Frictionless Momentum)، فارسی‌اصیل (Persian-Native Craft).

---

## فاز ۲ — ممیزی ۷ بُعدی در تراز اپل (استاندارد نوامبر ۲۰۲۶)

### بُعد ۱: معماری اطلاعات، ناوبری و اصول کاربردپذیری Baymard / NN/G

1. **مقاصد اصلی گمشده در ناوبری موبایل (Orphaned Destinations):**
   * **شواهد:** در سایدبار دسکتاپ (`components/Layout.tsx:135-146`) ۸ مقصد اصلی وجود دارد، اما نوار پایین موبایل (`components/Layout.tsx:471-534`) فقط ۵ تب دارد (`/`, `/planner`, `/analysis`, `/leaderboard`, `/settings`). صفحات کلیدی `/subjects` (مدیریت حوزه‌ها + ۶ نمای کانبان/ماتریس آیزنهاور/جدول/تقویم) و `/history` از ناوبری موبایل حذف شده‌اند! همچنین آرایه `mobileNavItems` در `components/Layout.tsx:147-153` تعریف شده ولی هرگز استفاده نشده است (تب‌ها دستی هاردکد شده‌اند).
2. **تداخل FAB شناور هوش مصنوعی با Tab Bar و PiP Widget (نقض الگوی دو-لایه و Glass Sandwich):**
   * **شواهد:** دکمه شناور بنفش AI در `components/Layout.tsx:456-468` با `fixed bottom-20 left-4 z-40` دقیقاً بالای نوار تب موبایل شناور است و هنگام فعال بودن تایمر با `FloatingPiPWidget` (`components/focus/FloatingPiPWidget.tsx:38`, `fixed bottom-20 left-1/2 -translate-x-1/2 z-[70]`) و دکمه‌های پایین لیست‌ها هم‌پوشانی پیدا می‌کند.
3. **نقض یک‌پارچگی دکمه بازگشت (Back-Button Continuity) و تخریب موقعیت اسکرول (Baymard 2026):**
   * **شواهد:**
     * `components/ScrollToTop.tsx:8-10` در هر تغییر مسیر بدون استثنا `window.scrollTo(0, 0)` را اجرا می‌کند و `components/Layout.tsx:440-446` با `key={location.pathname}` کل `<Outlet />` را unmount/remount می‌کند؛ بنابراین بازگشت به لیست هرگز موقعیت اسکرول را حفظ نمی‌کند.
     * اوورلی‌های >۷۰٪ ویوپورت مانند دراور تمام‌صفحه AI در موبایل (`components/Layout.tsx:540-576`)، `TaskModal.tsx:242`، `FocusTimer.tsx:347`، `AuthModal.tsx:268`، `CommandPalette.tsx:184` و `BrainDumpModal.tsx:171` به History Stack مرورگر (`popstate`) متصل نیستند؛ زدن دکمه Back اندروید یا سوایپ لبه iOS به‌جای بستن مودال، کاربر را از صفحه خارج می‌کند.
     * هنگام باز شدن دراور AI در موبایل، `components/Layout.tsx:446` کلاس `hidden` را به `<main>` می‌دهد که موقعیت اسکرول صفحه زیرین را هنگام بستن دراور از بین می‌برد.
4. **شلوغی مفرط داشبورد (نقض قانون «یک وظیفه اصلی در هر صفحه»):**
   * **شواهد:** `pages/Dashboard.tsx` (۹۹۷ خط) بیش از ۱۰ بلوک سنگین را عمودی روی هم می‌چیند: `WelcomeBanner` + بنر Demo + Hero Banner (با سلام هاردکدشده «صبح بخیر» در `Dashboard.tsx:363` حتی در نیمه‌شب!) + تقویم ۷ ستونه + ۲ کارت متریک + مودترکر ۵ گزینه‌ای + پیشنهاد تایم‌بلاک + تسک‌های امروز + تسک‌های معوق + پاد زنده + کارت صدای محیطی + نوار Brain Dump. کاربر در ویوپورت اول (Above the Fold) موبایل اصلاً تسک‌های امروز خود را نمی‌بیند.
5. **نقص استاندارد جستجو (WWDC26 Search Excellence):**
   * **شواهد:** `components/CommandPalette.tsx:1-256` فاقد جستجوهای اخیر (با حذف تکی و پاک‌سازی همه)، فاقد چیپ‌های فیلتر دامنه (صفحه / تسک / ابزار)، فاقد نگهداری آخرین عبارت (`setQuery('')` در `CommandPalette.tsx:105`)، فاقد دکمه بستن لمسی در موبایل (فقط نشان `ESC` در `CommandPalette.tsx:204-206`) و فاقد اکو کردن عبارت جستجوشده در حالت «نتیجه‌ای یافت نشد» (`CommandPalette.tsx:211`) است.
6. **عاملیت و بخشندگی (Agency & Forgiveness — WWDC26):**
   * **شواهد:** حذف تسک در `pages/Subjects.tsx:301-306` کاربر را با `ConfirmModal` مسدود می‌کند، در حالی که حذف تسک در `pages/Dashboard.tsx:272-275` و سوایپ در `components/TaskCard.tsx:99-102` **بدون هیچ تأییدیه و بدون Undo Toast** داده کاربر را فوراً پاک می‌کند! `context/UIContext.tsx:25-29` در `showToast` اصلاً پارامتر `action` (دکمه بازگردانی/Undo) ندارد. همچنین `pages/AIChat.tsx:302, 314-317` به هوش مصنوعی اجازه می‌دهد با `auto_add_tasks` بدون پیش‌نمایش و تأیید کاربر، تسک به برنامه اضافه کند.
7. **هدر شلوغ موبایل و ناوبری دوگانه در زیرصفحات:**
   * **شواهد:** `components/Layout.tsx:403-437` در ارتفاع `h-14` (۵۶px) شش المان (لوگو، عنوان، چیپ استریک، `NotificationBell`، دکمه ورود، دکمه جستجو) را کنار هم می‌چیند و در زیرصفحاتی مانند `pages/History.tsx:14-21` یک دکمه بازگشت تکراری زیر هدر اصلی نمایش می‌دهد.

---

### بُعد ۲: انضباط Liquid Glass دو-لایه، هندسه هم‌مرکز و Safe Areas (iOS 26/27)

1. **نقض شدید تفکیک دو-لایه (Glass-on-Content و Glass-on-Glass):**
   * **شواهد:**
     * `index.css:554-571` (`.glass-card`)، `index.css:793-827` (`.glass-premium`) و `index.css:853-869` (`.bubble-ai-premium` با `backdrop-filter: blur(16px)` روی **تک‌تک پیام‌های اسکرول‌شونده چت**!) شیشه مات را روی لایه محتوا اعمال کرده‌اند.
     * در نمای موبایل چت AI، ۵ لایه شیشه روی هم انباشته می‌شوند (Glass-on-Glass): دراور `Layout.tsx:558` (`glass-premium` + `backdrop-blur-xl`) ← هدر و فوتر `AIChat.tsx:422, 551` (`backdrop-blur-xl`) ← کادر ورودی `ChatInput.tsx:185` (`glass-premium`) ← پیش‌نمایش پیوست `ChatInput.tsx:193` (`backdrop-blur-sm`) ← حباب‌های پیام `ChatMessage.tsx:65, 76, 187, 216`.
     * `pages/Welcome.tsx:100, 176` و `pages/Dashboard.tsx:373, 408` نیز افکت glassmorphism را روی کارت‌های محتوایی و بج‌های داخلی اعمال کرده‌اند.
2. **نقص حیاتی Safe Area و نبود `viewport-fit=cover`:**
   * **شواهد:** `index.html:6` فقط `width=device-width, initial-scale=1.0` دارد و فاقد `viewport-fit=cover` است؛ در نتیجه روی آیفون‌های دارای Dynamic Island/Notch مقدار `env(safe-area-inset-*)` برابر `0px` می‌شود.
   * کلاس `.pt-safe` اصلاً تعریف نشده (`index.html:144-146` فقط `.pb-safe` دارد)؛ هدر موبایل (`Layout.tsx:403`)، هدر `FocusTimer.tsx:354` و هدر `AIChat.tsx:422` در حالت PWA تمام‌صفحه زیر Status Bar/Dynamic Island می‌روند. همچنین فاصله انتهای صفحه در `Layout.tsx:451` به صورت ثابت `h-24` است نه `calc(4.5rem + env(safe-area-inset-bottom))`.
3. **نقض هندسه هم‌مرکز (Concentric Corner Radius: `R_inner = max(0, R_outer - Gap)`):**
   * **شواهد:**
     * `pages/Dashboard.tsx:354, 398`: کارت بیرونی `rounded-3xl` (۲۴px) با `p-5` (۲۰px)، اما کارت داخلی `rounded-2xl` (۱۶px) است (مقدار صحیح هم‌مرکز: `R_outer = 28px`, `Gap = 16px` ← `R_inner = 12px`).
     * `components/AuthModal.tsx:284`: شیت پایینی `rounded-t-[2.5rem]` (۴۰px) با padding ۲۰px و کارت‌های داخلی `rounded-xl` (۱۲px) ناهم‌مرکز.
     * `components/Feedback.tsx:91`: مودال `ConfirmModal` دارای `rounded-[2rem]` (۳۲px) و `p-4` (۱۶px) با دکمه‌های `rounded-xl` (۱۲px) به‌جای `16px`.
4. **شکست چیدمان در عرض کامپکت ۳۷۵px:**
   * **شواهد:**
     * `pages/Dashboard.tsx:494`: گرید ۷ ستونه `grid-cols-7 gap-2` داخل کارت `p-4` بدون حداقل عرض اسکرول، هر ستون را در ۳۷۵px به ~۳۸px فشرده می‌کند و اعداد و بج‌ها را برش می‌دهد.
     * `components/views/MonthlyCalendarView.tsx:80-90`: گرید ۷ ستونه با نام کامل روزها («چهارشنبه»، «پنج‌شنبه») و برچسب‌های `text-[9px]` در موبایل ۳۷۵px ناخوانا و سرریز می‌شود.
     * `components/planner/DualColumn10MinuteGrid.tsx:198`: `min-w-[520px]` کاربر موبایل را مجبور به اسکرول افقی ممتد می‌کند.
     * `components/TaskModal.tsx:293, 309, 455`: گریدهای `grid-cols-4` داخل مودال `m-4` در ۳۷۵px دکمه‌هایی با عرض ~۶۸px و متن `text-[9px]`/`text-[10px]` بریده‌شده تولید می‌کنند.
     * `components/views/TableView.tsx:124`: جدول ۱۱ ستونه با `min-w-[820px]` فاقد نمای کارتی جایگزین برای موبایل است.

---

### بُعد ۳: توکن‌های طراحی (W3C DTCG 2025.10)، حالت تاریک معنایی، تایپوگرافی و دقت فارسی/RTL

1. **آشفتگی ۳ سیستم توکن و تم‌های شکسته:**
   * **شواهد:**
     * در `pages/Settings.tsx:791-819` انتخابگر «پالت رنگی برنامه» (`indigo` / `forest` / `rosegold`) وجود دارد که کلاس `.theme-forest` یا `.theme-rosegold` را روی `<html>` می‌گذارد (`context/ThemeContext.tsx:41-47`). اما:
       1. `tailwind.config.js:81-105` رنگ‌های `indigo.*` و `violet.*` را به hex ثابت هاردکد کرده و متغیرهای `--color-indigo-*` تعریف‌شده در `index.css:45-124` را اصلاً نمی‌خواند!
       2. متغیرهای `--md-primary` و `--md-primary-container` (`index.css:16-43`) در `.theme-forest` و `.theme-rosegold` بازنویسی نشده‌اند!
       3. غلط املایی `--color-violet-750` به‌جای `700` در `index.css:120`.
       4. توکن‌های `primary-fixed`, `secondary-fixed`, `tertiary-fixed`, `tertiary-container` در `tailwind.config.js:18-40` به صورت hex ثابت مخصوص Light Mode تعریف شده‌اند و در Dark Mode تغییر نمی‌کنند.
2. **نقص‌های جدی حالت تاریک (Semantic Dark Mode):**
   * **شواهد:**
     * `context/ThemeContext.tsx:21-24`: پیش‌فرض `darkMode` همیشه `false` است و **اصلاً `window.matchMedia('(prefers-color-scheme: dark)')` را نمی‌خواند** (فاقد گزینه `system`).
     * `index.html:43-46`: `.dark body` گرادیان بنفش-سرمه‌ای (`linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)` — مصداق AI-Slop) اعمال می‌کند که با `index.css:176-179` (`#0b1220`)، `Layout.tsx:182` (`dark:bg-gray-950`) و `Layout.tsx:440` (`dark:bg-slate-950`) در تضاد است.
     * سطوح تاریک در یک صفحه به‌طور تصادفی از ۵ پالت مختلف (`slate-900`, `slate-950`, `gray-800`, `gray-900`, `gray-950`) مخلوط شده‌اند.
     * `components/TaskCard.tsx:292`: دکمه `bg-amber-50` هیچ کلاس `dark:` ندارد و در حالت تاریک مثل یک لکه زرد روشن چشم‌زننده دیده می‌شود.
3. **تایپوگرافی، کلاس‌های تعریف‌نشده و باگ بزرگ‌نمایی خودکار iOS Safari:**
   * **شواهد:**
     * `index.html:114-128`: فونت پایه موبایل `14px` با `line-height: 1.5` تنظیم شده (زیر کف ۱۶px و بیش‌ازحد فشرده برای نقطه‌ها و کشیدگی‌های خط فارسی).
     * **باگ iOS Safari Auto-Zoom:** تقریباً تمام `<input>`، `<textarea>` و `<select>`ها اندازه `text-xs` (۱۲px) یا `text-sm` (۱۴px) دارند (`Welcome.tsx:112`, `Dashboard.tsx:970`, `TaskModal.tsx:337,352,365,518,530,568`, `AuthModal.tsx:111`, `CommandPalette.tsx:202`, `Settings.tsx:90,98,150,355,374,462,604,700,985`, `AIChat.tsx:514`, `ChatInput.tsx:247`, `BrainDumpModal.tsx:202`, `TableView.tsx:95`, `FocusTimer.tsx:766`) که در iOS Safari با هر فوکوس صفحه را زوم می‌کند!
     * **کلاس‌های تایپوگرافی ناموجود (Silent Failure):** `text-label-sm`, `text-label-md`, `text-body-sm`, `text-body-md`, `text-headline-md`, `text-headline-lg`, `text-headline-lg-mobile` در ده‌ها خط (`Analysis.tsx:356-655`, `Leaderboard.tsx:1812-1855`, `WelcomeScreen.tsx:52-85`) استفاده شده‌اند ولی نه در `tailwind.config.js` و نه در `index.css` تعریف نشده‌اند!
     * **تقدم اشتباه فونت لاتین:** `tailwind.config.js:124-133` فونت‌های `Inter` و `Plus Jakarta Sans` را **قبل از `Vazirmatn`** قرار داده است.
     * **ریزمتن‌های زیر ۱۱px:** `text-[8px]`, `text-[9px]`, `text-[10px]` به‌وفور در `History.tsx:80,100,104`, `TaskCard.tsx:154,161,220-292`, `TaskModal.tsx:469,635`, `UnifiedTimeline.tsx:676,701,786`, `MonthlyCalendarView.tsx:135`.
     * نبود `tabular-nums` روی شمارنده‌ها و درصدها (`Dashboard.tsx:417,423,544,547`, `Analysis.tsx:336,357,468`).

#### ماژول تخصصی دقت فارسی و RTL (Persian & RTL Precision Module)
* **حروف‌چینی شکسته با `letter-spacing` روی متن فارسی:** کلاس‌های `tracking-tight`, `tracking-wide`, `tracking-wider` روی تیترها و متن فارسی به اتصال حروف (Cursive Ligatures) آسیب می‌زنند: `Layout.tsx:215`, `Dashboard.tsx:362`, `Subjects.tsx:507`, `Analysis.tsx:265`, `Leaderboard.tsx:703,740`, `Settings.tsx:548`, `WelcomeScreen.tsx:52`.
* **استفاده از `italic` روی متن فارسی:** `components/TaskModal.tsx:483` و `components/AIChat/ChatMessage.tsx:116` (در `blockquote`).
* **ارتفاع خط ناکافی برای فارسی:** `index.html:117` (`line-height: 1.5`), `Subjects.tsx:452`, `Settings.tsx:45`, `ChatMessage.tsx:73` به‌جای `1.7–1.85` برای متن بدنه فارسی.
* **ویژگی‌های فیزیکی به‌جای CSS Logical Properties:** استفاده گسترده از `ml-/mr-/pl-/pr-/left-/right-/border-l/border-r/rounded-l-/rounded-r-` به‌جای `ms-/me-/ps-/pe-/start-/end-/border-s/border-e` در `Layout.tsx:201,321,325,456`, `TaskCard.tsx:162,167`, `TaskModal.tsx:557-568,611`, `AuthModal.tsx:107-114,300`, `Subjects.tsx:442-460`, `UnifiedTimeline.tsx:531-643`, `TableView.tsx:89,95`, `BrainDumpModal.tsx:207`, `FloatingPiPWidget.tsx:59`.
* **کلاس‌های اشتباه `dir-ltr` / `dir-rtl` به‌جای اتریبیوت HTML `dir`:** در `Dashboard.tsx:698,719,749`, `VisualPlanner.tsx:469`, `ChatMessage.tsx:226` رشته `dir-ltr`/`dir-rtl` به عنوان کلاس Tailwind نوشته شده که هیچ اثری ندارد!
* **آشوب ارقام فارسی و انگلیسی و نبود نرمال‌سازی ورودی:** ترکیب نامنظم `0-9` و `۰-۹` در یک صفحه (`Subjects.tsx:445,615,668`, `History.tsx:75-105`, `TaskCard.tsx:155-260`, `FocusTimer.tsx:553-559`, `Settings.tsx:464-666`, `UnifiedTimeline.tsx:555-684`). هیچ تابع نرمال‌ساز برای تبدیل ارقام فارسی/عربی (`۰-۹`/`٠-٩`) به لاتین در فیلدهای عددی و کد اتاق وجود ندارد (`TaskModal.tsx:364,607`, `FocusTimer.tsx:763`, `Leaderboard.tsx:922`).
* **نبود `<bdi>` برای عبارات لاتین درون جمله فارسی:** رشته‌هایی مثل `ParsaPlan`, `XP`, `MIT`, `YPT`, `Ctrl+K`, `BioTheme`, `D-Day` بدون `<bdi>` هستند و در کنار علائم نگارشی باعث پرش جهت متن می‌شوند.
* **تناقض جهت فلش بازگشت و سوایپ معکوس در RTL:**
  * در `pages/AIChat.tsx:495` برای بازگشت به خانه از `ChevronLeft` استفاده شده در حالی که در RTL جهت بازگشت به راست است (`ArrowRight` در `History.tsx:20`).
  * در `components/TaskCard.tsx:94-116` پس‌زمینه قرمز حذف (`bgLeft`) اولین فرزند در flex راست‌به‌چپ است (پس در سمت راست قرار می‌گیرد!) در حالی که آستانه حذف `offset < -SWIPE_THRESHOLD` (کشیدن به چپ) است — جهت پس‌زمینه و جهت سوایپ کاملاً برعکس هستند!

---

### بُعد ۴: فیزیک حرکت سیال (Fluid Interfaces)، میکروتعامل‌ها، هپتیک و آیکونوگرافی

1. **انیمیشن‌های تزئینی بی‌پایان (Anti-AI-Slop Violations):**
   * **شواهد:** `animate-pulse` روی لوگو و دات‌های ایستا (`Layout.tsx:211`, `Dashboard.tsx:369,519,901`, `VisualPlanner.tsx:454`, `Leaderboard.tsx:796,856`, `AIChat.tsx:442`, `Subjects.tsx:447,457,662`, `WelcomeBanner.tsx:29-30`), `animate-ping` دائمی روی هدر تایم‌لاین (`VisualPlanner.tsx:395`), `animate-bounce` + `animate-spin-slow` روی `LevelUpShowcase` (`Feedback.tsx:157-158`) و `FocusFlower` (`FocusTimer.tsx:93`), `animate-spin` روی آیکون Sparkles (`AIChat.tsx:534`), `animate-spin-slow` روی دکمه آپدیت (`NotificationBell.tsx:116`), و کی‌فریم‌های `animate-float`/`animate-blob` در `index.css:315-400, 478-505, 736-744`.
   * دکمه با easing فنریِ اغراق‌شده (bouncy slop): `.btn-micro-interactive` در `index.css:873` (`cubic-bezier(0.34, 1.56, 0.64, 1)`).
2. **پشتیبانی ناقص از `prefers-reduced-motion`:**
   * **شواهد:** `index.css:949-961` فقط ۴ کلاس را خاموش می‌کند و `.animate-ping`, `.animate-spin`, `.animate-spin-slow`, `.animate-blob`, `.shimmer`, `.animate-page-enter` را نادیده می‌گیرد. در `App.tsx` اصلاً `<MotionConfig reducedMotion="user">` وجود ندارد و انیمیشن کانواس `ConfettiCelebration` (`Feedback.tsx:181-275`) حرکت کاهشی کاربر را بررسی نمی‌کند.
3. **ترنزیشن‌های غیرفیزیکی، کُند یا شکسته:**
   * **شواهد:**
     * `index.css:455`: `.animate-page-enter` برابر `450ms` است (بیش از آستانه ۴۰۰ms دوهرتی).
     * بیش از ۱۴ کامپوننت (`TaskModal.tsx:252`, `Feedback.tsx:20,91,144`, `ChatMessage.tsx:53,186`, `NotificationBell.tsx:74`, `Settings.tsx:50,538`) از کلاس‌های ناموجود `animate-in`/`zoom-in-95` استفاده می‌کنند و عملاً هیچ ترنزیشنی اجرا نمی‌شود.
     * `TaskCard.tsx:130` از `type: 'tween', duration: 0.15` به‌جای فنر قابل‌قطع (`spring`) استفاده می‌کند و بدون پیش‌بینی سرعت (velocity projection) صرفاً با `SWIPE_THRESHOLD = 50` تصمیم می‌گیرد.
     * `FloatingPiPWidget.tsx:31-38`: دارای `drag` بدون `dragConstraints` است؛ کاربر می‌تواند تایمر شناور را کاملاً به بیرون صفحه پرتاب و گم کند!
4. **تعامل‌های غیرقابل‌استفاده در لمس (HTML5 Drag-and-Drop و Hover-Only Controls):**
   * **شواهد:** `UnifiedTimeline.tsx:416,634`, `Subjects.tsx:425,600`, `KanbanView.tsx:71`, `EisenhowerMatrixView.tsx:97`, `MonthlyCalendarView.tsx:132` به HTML5 Drag-and-Drop متکی هستند که روی iOS Safari و مرورگرهای لمسی موبایل کار نمی‌کند.
   * دکمه‌های حیاتی تایم‌لاین (`-15`, `+15`, حذف از تایم‌لاین و دستگیره تغییر ارتفاع در `UnifiedTimeline.tsx:692,745`) و دکمه افزودن روز در تقویم (`MonthlyCalendarView.tsx:120`) پشت `opacity-0 group-hover:opacity-100` پنهان شده‌اند و در موبایل کاملاً غیرقابل دسترس‌اند!
5. **هپتیک خام و ناکامل (`utils/haptics.ts`):**
   * **شواهد:** فقط در `TaskCard.tsx:8` ایمپورت شده، پالس‌های سنگین `30ms–100ms` می‌فرستد (به‌جای پالس لمسی کوتاه `10–15ms`)، تنظیمات صدا/حرکت کاهشی کاربر را بررسی نمی‌کند و در تعویض تب، شروع/توقف فوکوس و ثبت حال‌وهوا وجود ندارد.
6. **ناهماهنگی سیستم آیکونوگرافی:**
   * **شواهد:** ترکیب هم‌زمان ۳ منبع: `lucide-react` + بارگذاری بیهوده فونت `Material Symbols Outlined` (`index.html:29-32`) + ایموجی‌های سیستمی پراکنده (`Dashboard.tsx:363`, `Subjects.tsx:73,571,664`, `TaskCard.tsx:155-156,246`, `FocusTimer.tsx:680-780`, `Settings.tsx:778,784`, `Feedback.tsx:165,174`).

---

### بُعد ۵: سرعت ادراک‌شده، کمال ۵ حالت صفحه، آنبوردینگ، فرم‌ها و تاب‌آوری آفلاین

1. **اسپینر مسدودکننده تمام‌صفحه به‌جای App Shell + Skeleton:**
   * **شواهد:** `context/StoreContext.tsx:1728` و `App.tsx:60` کل صفحه را با `<LoadingSpinner fullScreen />` مسدود می‌کنند، در حالی که کامپوننت `components/Skeleton.tsx` تعریف شده ولی در هیچ صفحه‌ای استفاده نشده است!
2. **ناقص بودن ۵ حالت صفحه (`loading` / `empty` / `noSearchResults` / `error` / `offline`):**
   * **شواهد:**
     * `pages/Dashboard.tsx:841-850`: بین حالت «هیچ تسکی وجود ندارد» و «فیلتر فعال هیچ نتیجه‌ای ندارد» تمایزی قائل نمی‌شود و دکمه «پاک کردن فیلتر» ندارد.
     * `pages/Subjects.tsx:635,651`: حالت خالی فقط متن ساده بدون CTA («+ افزودن تسک») است.
     * `pages/VisualPlanner.tsx`: فاقد حالت خالی هدایت‌گر هنگام نبود تسک زمان‌بندی‌شده در روز انتخابی.
     * **نبود بنر وضعیت آفلاین/همگام‌سازی در موبایل:** در هدر دسکتاپ (`Layout.tsx:337-341`) وضعیت `isSyncing` دیده می‌شود، اما در هدر موبایل (`Layout.tsx:403-437`) هیچ نشانگر آفلاین یا صف همگام‌سازی (`syncQueueCount` / `deadLetterCount`) نمایش داده نمی‌شود! (توابع `getCloudIcon` / `CloudIcon` در `Layout.tsx:155-168` تعریف شده‌اند ولی هرگز رندر نشده‌اند).
3. **فرم‌ها، اعتبارسنجی و دسترسی‌پذیری احراز هویت (WCAG 3.3.8):**
   * **شواهد:**
     * `components/AuthModal.tsx:153-167`: اعتبارسنجی فقط در `onSubmit` (بدون `mode: 'onBlur'`)؛ ورودی‌ها فاقد `autoComplete` (`username`, `current-password`, `new-password`, `email`, `name`) و `inputMode` هستند که Password Managerها و Passkey/Autofill موبایل را مختل می‌کند. `InlineAuthForm` در `Settings.tsx:85-100` نیز فاقد `<label>` و `autoComplete` است.
     * `components/TaskModal.tsx:117-131, 514`: خطای اعتبارسنجی به‌جای نمایش خطای inline کنار فیلد، به صورت Toast بالای صفحه پرتاب می‌شود؛ همچنین اتریبیوت `required` روی فیلد `topic` در تب اول (`514`) باعث می‌شود اگر کاربر در تب دوم یا سوم دکمه ذخیره را بزند، فرم بی‌صدا قفل شود!
     * نبود پیش‌نویس خودکار (Draft Persistence) در `TaskModal.tsx` و `BrainDumpModal.tsx`: بستن تصادفی یا ری‌لود، متن کاربر را از بین می‌برد.
4. **محدودیت آنبوردینگ (`FirstVisitGate`):**
   * **شواهد:** `App.tsx:32-44` حتی لینک مستقیم به مسیرهایی مثل `/planner` را پیش از مشاهده `/welcome` مسدود می‌کند و `pages/Welcome.tsx` در موبایل دیوار متراکم امکانات + فرم + ۲ دکمه را یکجا نمایش می‌دهد.

---

### بُعد ۶: دسترسی‌پذیری (WCAG 2.2 AA + APCA + ارگونومی موبایل)

1. **شکست گسترده ابعاد هدف لمسی (زیر کف ۴۴×۴۴px اپل و حتی زیر کف قانونی ۲۴×۲۴px WCAG 2.2 AA 2.5.8):**
   * **شواهد:**
     * `components/TaskCard.tsx:168-170`: دکمه‌های حالت فشرده `p-1` با آیکون ۱۲–۱۴px (~۲۰×۲۰px!).
     * `components/TaskModal.tsx:380,400,449-450`: چیپ اولویت `px-2 py-0.5` (~۲۰px) و دکمه حذف تگ `<X size={12} />` (~۱۲×۱۲px!).
     * `components/planner/UnifiedTimeline.tsx:436,444,656,701-732`: چک‌باکس ۱۵px و دکمه‌های `-15`/`+15`/`X` (~۱۸–۲۰px).
     * `pages/Subjects.tsx:462-476, 620-621`, `KanbanView.tsx:84,104,116`, `EisenhowerMatrixView.tsx:102,117`: دکمه‌های `p-1`/`p-1.5` (~۲۲–۲۶px).
     * `components/AIChat/ChatMessage.tsx:160,167-177`, `FloatingPiPWidget.tsx:61-92`: دکمه‌های `p-1`/`p-1.5` (~۲۰–۲۵px).
     * `components/Layout.tsx:420,430`: دکمه‌های هدر موبایل `p-2` با آیکون ۱۷px (~۳۳×۳۳px).
2. **نقض WCAG 2.5.7 (Dragging Movements):**
   * **شواهد:** جابه‌جایی اولویت در `EisenhowerMatrixView.tsx:97`، انتقال بین ستون‌ها در `KanbanView.tsx:71` (بدون دکمه انتقال به «در حال انجام»)، مرتب‌سازی حوزه‌ها در `Subjects.tsx:425` و تغییر زمان/مدت در `UnifiedTimeline.tsx:634,743` فاقد جایگزین تک‌تپ قابل‌دسترس در موبایل هستند.
3. **شکست کنتراست رنگ (WCAG AA 4.5:1 و APCA Lc 75):**
   * **شواهد:**
     * استفاده گسترده از `text-gray-400` (`#a1a1aa`) روی پس‌زمینه سفید (`#ffffff` / `#f8f9ff`) ← نسبت کنتراست ~۲.۵:۱ (رد شدن شدید در AA و APCA!) در `Subjects.tsx:445,510,623,666`, `History.tsx:49,104`, `Settings.tsx:140,156,369,549,573`, `TaskCard.tsx:223`, `UnifiedTimeline.tsx:554`, `Settings.tsx:1009` (`text-gray-300`!).
     * `components/AIChat/ChatMessage.tsx:160`: دکمه کپی پیام کاربر کلاس `text-indigo-100` دارد در حالی که بیرون از حباب بنفش و روی پس‌زمینه روشن صفحه قرار گرفته (سفید روی سفید — عملاً نامرئی!).
4. **معناشناسی HTML، ARIA و مدیریت فوکوس (Focus Management):**
   * **شواهد:**
     * استفاده از `<div>` کلیک‌پذیر به‌جای `<button>` در `Subjects.tsx:423,607`, `TaskCard.tsx:133,204`, `FocusTimer.tsx:484,513`, `ChatMessage.tsx:190`, `EisenhowerMatrixView.tsx:107`.
     * مودال‌های سفارشی (`TaskModal.tsx:242`, `AuthModal.tsx:268`, `Subjects.tsx:99`, `CommandPalette.tsx:184`, `FocusTimer.tsx:347`, `BrainDumpModal.tsx:171`, `Settings.tsx:944`) فاقد Focus Trap و بازگرداندن فوکوس پس از بسته شدن هستند.
     * مقادیر جادویی `zIndex: 2147483647` (`AuthModal.tsx:275`, `Feedback.tsx:15`) و `z-[99999]` (`TaskModal.tsx:243`) بدون یک مقیاس z-index لایه‌بندی‌شده.
     * نبود `role="tablist"` / `aria-selected` / `aria-pressed` روی کنترل‌های Segmented (`VisualPlanner.tsx:295`, `Subjects.tsx:518`, `Analysis.tsx:274`, `Leaderboard.tsx:785`, `TaskModal.tsx:256`, `FocusTimer.tsx:415`).
     * نبود `aria-label` روی دکمه‌های صرفاً آیکونی در `UnifiedTimeline.tsx:656-733`, `FocusTimer.tsx:356-611`, `TaskModal.tsx:449-557`, `Settings.tsx:569,702`, `AIChat.tsx:424-494`, `FloatingPiPWidget.tsx:61-86`, `BrainDumpModal.tsx:188`, `WelcomeBanner.tsx:33`.

---

### بُعد ۷: عملکرد رندر ۶۰ تا ۱۲۰ فریم‌برثانیه در موبایل

1. **اشباع GPU با لایه‌های هم‌زمان `backdrop-filter` و `blur-[120px]`:**
   * **شواهد:** در نمای چت موبایل (`Layout.tsx:558` + `AIChat.tsx:403-404,422,551` + `ChatInput.tsx:185,193` + `ChatMessage.tsx:65,76,187,216`) بین **۱۰ تا ۲۵+ لایه هم‌زمان `backdrop-filter` و `blur-[120px]`** روی GPU رندر می‌شود (در حالی که بودجه ۶۰–۱۲۰fps موبایل حداکثر ۱ تا ۲ ناحیه blur در لایه ناوبری است). در `FocusTimer.tsx:348,406-407,415` نیز `backdrop-blur-3xl` تمام‌صفحه + دو کره `blur-[150px]` + `blur-[40px]` متحرک روی هم قرار دارند.
2. **آبشار رندر مجدد از کانتکست‌ها و تایمرهای ۱ ثانیه‌ای:**
   * **شواهد:**
     * `context/StoreContext.tsx:1585-1730`: نبود `useMemo` روی `contextValue` و تجمیع وضعیت‌های پرتغییر (`saveStatus`, `isSyncing`, `toasts`) با داده‌ها باعث رندر مجدد کل اپلیکیشن می‌شود.
     * `components/Layout.tsx:67-86`: اشتراک مستقیم به کل `useStore()` به همراه `setInterval` هر ۱۰ ثانیه باعث رندر مجدد کل پوسته برنامه می‌شود.
     * `pages/Leaderboard.tsx` (۱۸۶۶ خط) و `components/FocusTimer.tsx` (۹۰۰ خط) در سطح ریشه به `useFocusTick()` متصل‌اند و **هر ثانیه** کل درخت ۱۸۰۰ خطی خود را رندر مجدد می‌کنند!
3. **سربار Layout Thrashing و فیلترهای پرهزینه روی لیست و `body`:**
   * **شواهد:**
     * `components/TaskCard.tsx:198`: پراپ `layout` فریمور موشن روی هر کارت لیست در کنار `blur-[0.5px] grayscale` (`TaskCard.tsx:216`) روی هر تسک تکمیل‌شده، هزینه اندازه‌گیری FLIP و لایه کامپوزیتینگ GPU اضافه می‌کند.
     * `index.css:173`: `transition: ... filter 2s ease` روی `body` باعث rasterize شدن کل ویوپورت می‌شود.
4. **سربار شبکه فونت‌ها و تعارض هدر کش PWA:**
   * **شواهد:**
     * `index.html:26-32`: بارگذاری ۴ خانواده فونت سنگین شامل فونت متغیر بلااستفاده `Material Symbols Outlined` و `Plus Jakarta Sans` + `Inter` + ۷ وزن `Vazirmatn`.
     * `index.html:10-12`: تگ‌های `<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />` که با استراتژی آفلاین PWA (`vite.config.ts:18-72`) تعارض ایجاد می‌کنند.

---

## فاز ۳ — ماتریس اولویت‌بندی یافته‌ها (عمیق‌ترین اول: Structural → Behavioral → Visual)

> فرمول محاسبه اهرم: **`Leverage = Impact ÷ Effort`** (هرچه بالاتر، بازده بیشتر).

| ID | Tier | Problem (Observation → User Impact) | File:Line Evidence | Concrete Fix | Impact (1–5) | Effort (1–5) | Leverage | Confidence |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **F-01** | Structural | **فیلتر CSS روی `body` باعث شکستن `position: fixed` در موبایل می‌شود** ← با فعال شدن BioTheme، نوار تب پایین، هدر و مودال‌ها از جای ثابت خارج و بریده می‌شوند. | `index.css:197-214`, `hooks/useBioperformance.ts` | حذف `filter` از `body` و جایگزینی BioTheme با شیفت دمای رنگیِ مبتنی بر توکن‌های CSS (warm/cool surface tint tokens) بدون ایجاد containing block جدید. | 5 | 1 | **5.0** | High |
| **F-02** | Structural | **نبود `viewport-fit=cover` و `.pt-safe` + ارتفاع ثابت اسپیسر** ← روی آیفون‌های Notch/Dynamic Island هدر زیر Status Bar و نوار پایین روی Home Indicator می‌افتد. | `index.html:6, 144-146`, `Layout.tsx:403, 451, 471`, `FocusTimer.tsx:354`, `AIChat.tsx:422` | افزودن `viewport-fit=cover` به meta viewport، تعریف کلاس‌های `pt-safe`/`pb-safe`/`px-safe` و محاسبه داینامیک padding پایین با `calc(4.5rem + env(safe-area-inset-bottom))`. | 5 | 1 | **5.0** | High |
| **F-03** | Structural | **ورودی‌های فرم زیر ۱۶px در سراسر اپ** ← در iOS Safari با هر تپ روی input/textarea صفحه به‌صورت ناخواسته زوم می‌شود و تجربه فرم را می‌شکند. | `index.html:114-128`, `TaskModal.tsx:337-568`, `AuthModal.tsx:111`, `CommandPalette.tsx:202`, `ChatInput.tsx:247`, `Settings.tsx:90-985`, `BrainDumpModal.tsx:202` | تعیین کف `16px` (`text-base`) برای تمام `input`/`textarea`/`select` در موبایل و `16px`/`1.75` برای بدنه فارسی. | 5 | 1 | **5.0** | High |
| **F-04** | Structural | **مقاصد اصلی `/subjects` (۶ نمای کار) و `/history` از ناوبری موبایل حذف شده‌اند و FAB هوش مصنوعی با Tab Bar و PiP تداخل دارد** ← کاربر موبایل دسترسی مستقیم به نیمی از امکانات کلیدی ندارد و دکمه‌های شناور روی هم می‌افتند. | `Layout.tsx:135-153, 456-534`, `FloatingPiPWidget.tsx:38` | بازطراحی Bottom Tab Bar به ۵ تب اصلی برچسب‌دار (`امروز`، `برنامه`، `حوزه‌ها`، `تحلیل`، `بیشتر/لیگ`) + جایگزینی FAB شناور با قرص/دکمه یکپارچه مربی در هدر یا Tab Accessory + قرارگیری `FloatingPiPWidget` در یک Bottom Accessory Shelf یکپارچه بالای Tab Bar. | 5 | 3 | **1.67** | High |
| **F-05** | Structural | **آشفتگی ۳ سیستم توکن، شکستن تم‌های Forest/RoseGold و نبود پشتیبانی از `prefers-color-scheme`** ← انتخاب تم در تنظیمات عمل نمی‌کند، رنگ‌های Light در Dark Mode می‌سوزند و احترام به تنظیم سیستم وجود ندارد. | `index.css:16-158`, `index.html:34-128`, `tailwind.config.js:14-105`, `ThemeContext.tsx:21-47`, `Settings.tsx:791-819` | تجمیع در سیستم ۳ لایه W3C DTCG (`primitives` ← `semantic` ← `component`)، حذف `<style>` تکراری از `index.html`، اتصال `indigo`/`primary` به CSS variables برای کارکرد واقعی ۳ پالت، و افزودن حالت `system`/`light`/`dark`. | 5 | 3 | **1.67** | High |
| **F-06** | Structural | **تضاد شیشه روی محتوا (Glass-on-Content) و انباشت ۱۰–۲۵ لایه `backdrop-filter` + `blur-[120px]`** ← افت شدید فریم‌ریت، داغ شدن گوشی و کاهش شدید خوانایی متن در چت و فوکوس. | `index.css:554-571, 793-869`, `AIChat.tsx:403-404, 422, 551`, `ChatMessage.tsx:65, 76, 187, 216`, `FocusTimer.tsx:348, 406-407` | محدود کردن Liquid Glass صرفاً به لایه ناوبری شناور (حداکثر ۲ ناحیه هم‌زمان)، سطوح کدر/مات معنایی برای تمام کارت‌ها و حباب‌های چت، و حذف کره‌های `blur-[120px]`/`blur-[150px]`. | 5 | 2 | **2.5** | High |
| **F-07** | Structural | **آبشار رندر مجدد در `StoreContext` و رندر هرثانیه‌ای `Leaderboard` و `FocusTimer`** ← لگ محسوس هنگام اسکرول و تایپ در موبایل‌های میان‌رده. | `StoreContext.tsx:1585-1730`, `Layout.tsx:67-86`, `Leaderboard.tsx`, `FocusTimer.tsx` | تفکیک `StoreUIContext` (وضعیت‌های پرتغییر `saveStatus`, `isSyncing`, `toasts`) از `StoreDataContext` با `useMemo` و جداسازی زیرکامپوننت `LiveTimerReadout` برای محدود کردن re-render یک‌ثانیه‌ای. | 5 | 3 | **1.67** | High |
| **F-08** | Structural | **تراکم مفرط داشبورد و شکست چیدمان در ۳۷۵px (`grid-cols-7`, `grid-cols-4`, جدول ۸۲۰px)** ← کاربر در ویوپورت اول تسک‌های امروز را نمی‌بیند و تقویم/مودال‌ها در آیفون کامپکت له می‌شوند. | `Dashboard.tsx:354-997`, `TaskModal.tsx:293,309,455`, `DualColumn10MinuteGrid.tsx:198`, `MonthlyCalendarView.tsx:80-90`, `TableView.tsx:124` | معماری مجدد داشبورد با سلسله‌مراتب «یک وظیفه اصلی: اقدام امروز» (نوار فشرده امروز + تقویم اسکرول‌پذیر افقی با `scroll-snap` + جمع‌کردن ابزارهای ثانویه در Sheet/Section)، گرید `grid-cols-2` در موبایل برای `TaskModal` و نمای کارتی موبایل برای `TableView`. | 5 | 4 | **1.25** | High |
| **F-09** | Structural | **تخریب موقعیت اسکرول در بازگشت و قطع ارتباط اوورلی‌ها با دکمه Back** ← زدن Back در مودال‌ها و دراور AI کاربر را از صفحه خارج می‌کند و بازگشت به لیست همیشه به بالا می‌پرد. | `ScrollToTop.tsx:8-10`, `Layout.tsx:174, 440-446, 540-576`, `TaskModal.tsx:242`, `AuthModal.tsx:268`, `CommandPalette.tsx:184` | هوک مشترک `useOverlayHistory(isOpen, onClose)` برای بستن اوورلی >۷۰٪ با Back، جایگزینی `window.innerWidth` با `useMediaQuery`، حفظ scroll position در `POP` navigation و عدم `hidden` کردن `<main>`. | 4 | 2 | **2.0** | High |
| **F-10** | Behavioral | **حذف آنی تسک بدون Undo Toast و مسدودسازی با ConfirmModal + افزودن خودکار AI بدون پیش‌نمایش** ← ترس کاربر از حذف تصادفی در سوایپ یا مزاحمت مودال‌های تکراری و بی‌اعتمادی به تغییرات خودکار AI. | `TaskCard.tsx:99-102`, `Dashboard.tsx:272-275`, `Subjects.tsx:301-306`, `UIContext.tsx:25-29`, `AIChat.tsx:302, 314-317` | ارتقای `ToastContainer` به پشتیبانی از دکمه «بازگردانی (Undo)» ۵ ثانیه‌ای برای حذف تسک (حذف `ConfirmModal`های غیرضروری) و اجباری کردن عبور `auto_add_tasks` از `AITaskReviewWindow`. | 5 | 2 | **2.5** | High |
| **F-11** | Behavioral | **تعامل‌های غیرلمسی (HTML5 Drag-and-Drop و دکمه‌های `group-hover`) در تایم‌لاین، کانبان، آیزنهاور و تقویم** ← کاربر موبایل عملاً نمی‌تواند زمان تسک را در تایم‌لاین تغییر دهد، ستون کانبان را عوض کند یا روی روز تقویم تسک بسازد (نقض WCAG 2.5.7). | `UnifiedTimeline.tsx:416,634,692,745`, `KanbanView.tsx:71`, `EisenhowerMatrixView.tsx:97`, `MonthlyCalendarView.tsx:120,132`, `Subjects.tsx:425,600` | افزودن منوی عملیات سریع (Quick Action Sheet / Context Menu) با دکمه‌های واضح لمسی (تغییر ساعت/مدت ±۱۵دقیقه، انتقال ستون/ربع، جابه‌جایی بالا/پایین) و نمایش دائمی دکمه افزودن در لمس (`pointer: coarse`). | 5 | 3 | **1.67** | High |
| **F-12** | Behavioral | **شکست گسترده ابعاد هدف لمسی (<۲۴px و <۴۴px) و دکمه‌های `div` بدون ARIA/FocusTrap** ← خطای مکرر لمس (Fat-finger errors) و شکست کامل دسترسی‌پذیری کیبورد و صفحه‌خوان. | `TaskCard.tsx:133,168-170,204,277`, `TaskModal.tsx:242,380,449`, `UnifiedTimeline.tsx:656-733`, `Subjects.tsx:423,462,607`, `ChatMessage.tsx:160-190`, `FloatingPiPWidget.tsx:61-92` | استانداردسازی تمام اهداف لمسی به کف `44×44px` (`min-h-11 min-w-11` یا expanded hit-area)، تبدیل تمام `div`های کلیک‌پذیر به `<button>`، افزودن Focus Trap و `aria-label`/`role="tablist"`. | 5 | 3 | **1.67** | High |
| **F-13** | Behavioral | **جهت معکوس سوایپ در `TaskCard` (RTL) + نبود `dragConstraints` در `FloatingPiPWidget` + نبود Velocity Projection** ← سوایپ حذف با پس‌زمینه قرمز هم‌جهت نیست و تایمر شناور می‌تواند از صفحه خارج و گم شود. | `TaskCard.tsx:90-130`, `FloatingPiPWidget.tsx:31-38` | اصلاح چیدمان پس‌زمینه‌های سوایپ در RTL با منطق فیزیکی شفاف، اعمال spring با پیش‌بینی سرعت (velocity projection) و افزودن `dragConstraints` (snap به گوشه‌های امن ویوپورت) برای PiP. | 4 | 1 | **4.0** | High |
| **F-14** | Behavioral | **نبود 5-State کامل، نبود بنر آفلاین/همگام‌سازی موبایل و اسپینر مسدودکننده تمام‌صفحه** ← کاربر موبایل در قطع اینترنت نمی‌فهمد چند تغییر در صف است و هنگام بارگذاری با صفحه سفید/اسپینر مواجه می‌شود. | `StoreContext.tsx:1728`, `App.tsx:60`, `Layout.tsx:155-168, 403-437`, `Dashboard.tsx:841-850`, `Subjects.tsx:635,651`, `Skeleton.tsx` | جایگزینی `LoadingSpinner fullScreen` با App Shell فوری + Skeletonهای هم‌شکل صفحه، نمایش چیپ/بنر آفلاین و صف همگام‌سازی در هدر موبایل، و تفکیک `empty` از `noSearchResults` با دکمه بازنشانی فیلتر. | 4 | 2 | **2.0** | High |
| **F-15** | Behavioral | **نقص فرم‌ها (اعتبارسنجی Toast، `required` مخفی در تب دیگر، نبود `autoComplete` و نرمال‌سازی ارقام فارسی)** ← قفل بی‌صدای ثبت تسک در تب دوم/سوم، شکست Autofill/Passkey و خطای ورود ارقام فارسی. | `AuthModal.tsx:111, 153-167`, `Settings.tsx:85-100`, `TaskModal.tsx:117-131, 514, 607`, `FocusTimer.tsx:763`, `Leaderboard.tsx:922` | فعال‌سازی اعتبارسنجی inline روی `onBlur` + انتقال خودکار به تب خطادار، افزودن `autoComplete`/`inputMode` استاندارد، پیش‌نویس خودکار `sessionStorage` و تبدیل خودکار ارقام فارسی/عربی (`normalizeDigits`). | 4 | 2 | **2.0** | High |
| **F-16** | Behavioral | **نقص استاندارد جستجو در `CommandPalette` (WWDC26)** ← نبود جستجوهای اخیر، فیلتر دامنه، اکو کردن کوئری و دکمه بستن لمسی در موبایل. | `CommandPalette.tsx:105, 184-250` | ارتقای `CommandPalette` به شیت جستجوی موبایل با Recent Searches (حذف تکی و همه)، چیپ‌های Scope (همه/تسک‌ها/صفحات/ابزارها)، نگهداری کوئری و حالت No-Results گویا. | 3 | 2 | **1.5** | High |
| **F-17** | Visual | **کلاس‌های تایپوگرافی و انیمیشن تعریف‌نشده (`text-label-sm`, `animate-in`, `prose`, `dir-ltr`)** ← سایز فونت‌ها، انیمیشن ورود مودال‌ها و فرمت‌دهی مارک‌داون AI بی‌صدا خراب می‌شوند. | `Analysis.tsx:356-655`, `Leaderboard.tsx:1812-1855`, `WelcomeScreen.tsx:52-85`, `ChatMessage.tsx:106,226`, `TaskModal.tsx:252`, `Dashboard.tsx:698-749`, `tailwind.config.js:189` | تعریف اسکیل تایپوگرافی استاندارد فارسی در `@theme`، اصلاح `dir="ltr"` واقعی HTML، جایگزینی `animate-in` با پرست‌های یکپارچه Framer Motion و استایل‌دهی تمیز مارک‌داون فارسی. | 4 | 2 | **2.0** | High |
| **F-18** | Visual | **دقت فارسی و RTL: `tracking-*` روی فارسی، `italic` فارسی، ارقام مخلوط، نبود `<bdi>` و جهت اشتباه فلش بازگشت** ← شکستن اتصال حروف، پرش متن دوزبانه و سردرگمی ناوبری RTL. | `Layout.tsx:215`, `Dashboard.tsx:362`, `TaskModal.tsx:483`, `ChatMessage.tsx:116`, `AIChat.tsx:495`, `History.tsx:75-105`, `Subjects.tsx:445-668` | حذف کامل `tracking-*` و `italic` از متن فارسی، یکپارچه‌سازی فرمت اعداد (`toPersianDigits`) با `tabular-nums`، استفاده از `<bdi>` برای عبارات لاتین، تبدیل به CSS Logical Properties و تصحیح فلش بازگشت (`ChevronRight`). | 4 | 2 | **2.0** | High |
| **F-19** | Visual | **شکست کنتراست رنگ (`text-gray-400`، دکمه کپی نامرئی `text-indigo-100`، `bg-amber-50` بدون dark)** ← ناخوانایی برچسب‌ها زیر نور روز و شکست WCAG AA / APCA. | `ChatMessage.tsx:160`, `TaskCard.tsx:292`, `Subjects.tsx:445-666`, `History.tsx:49,104`, `Settings.tsx:140-573, 1009` | جایگزینی تمام `text-gray-400` روی متن/لیبل با توکن معنایی `--text-secondary` (کنتراست ≥ ۵.۵:۱ / APCA Lc ≥ ۷۵)، اصلاح کنتراست دکمه کپی چت و دکمه زرد `TaskCard` در حالت تاریک. | 4 | 1 | **4.0** | High |
| **F-20** | Visual | **انیمیشن‌های Anti-AI-Slop بی‌پایان (`animate-pulse`/`ping`/`bounce`/`spin-slow`), نبود `MotionConfig reducedMotion` و بارگذاری فونت بلااستفاده `Material Symbols`** ← حس بصری شلوغ/مصنوعی، مصرف باتری، خطر سرگیجه حرکتی و سربار اضافه شبکه. | `index.html:29-32`, `index.css:181-195, 315-505, 873, 949-961`, `App.tsx`, `VisualPlanner.tsx:395`, `Feedback.tsx:157-275`, `FocusTimer.tsx:93`, `AIChat.tsx:534` | حذف فونت `Material Symbols Outlined` و ایموجی‌های سیستمی از کنترل‌ها (یکپارچگی کامل با `lucide-react`)، حذف انیمیشن‌های حلقه‌ای تزئینی، افزودن `<MotionConfig reducedMotion="user">` و پوشش کامل `@media (prefers-reduced-motion: reduce)`. | 4 | 1 | **4.0** | High |
| **F-21** | Visual | **ناهماهنگی هندسه هم‌مرکز (Concentric Radii) و سلام هاردکدشده «صبح بخیر»** ← حس ناهمگون کارت‌های تو در تو و تجربه غیرهوشمند در شب. | `Dashboard.tsx:354,363,398,650`, `AuthModal.tsx:284`, `Feedback.tsx:91` | اعمال سیستم شعاع هم‌مرکز (`--radius-sheet: 28px`, `--radius-card: 20px`, `--radius-control: 12px`) و پویاسازی سلام بر اساس ساعت روز (صبح/ظهر/عصر/شب بخیر). | 3 | 1 | **3.0** | High |

### ۵ برد سریع با بیشترین اهرم (Top 5 Highest-Leverage Quick Wins)
1. **F-01 (Leverage 5.0):** حذف `filter` از `body` در `index.css:197-214` (رفع فوری باگ شکستن `position: fixed` در تمام مودال‌ها و نوار پایین موبایل).
2. **F-02 (Leverage 5.0):** افزودن `viewport-fit=cover` و `.pt-safe`/`.pb-safe` داینامیک در `index.html` و `Layout.tsx` (ترازبندی فوری با Dynamic Island و Home Indicator).
3. **F-03 (Leverage 5.0):** ارتقای سایز تمام ورودی‌های موبایل به `>= 16px` و اصلاح `line-height` پایه فارسی به `1.75` (توقف فوری باگ آزاردهنده زوم خودکار iOS Safari).
4. **F-13 + F-19 (Leverage 4.0):** اصلاح جهت معکوس سوایپ `TaskCard` در RTL + `dragConstraints` برای `FloatingPiPWidget` + رفع شکست‌های کنتراست (`text-gray-400`, `ChatMessage.tsx:160`, `TaskCard.tsx:292`).
5. **F-20 (Leverage 4.0):** حذف فونت بلااستفاده `Material Symbols Outlined` و `<style>` تکراری `index.html`، حذف انیمیشن‌های `pulse/ping/bounce` تزئینی و افزودن `<MotionConfig reducedMotion="user">`.

---

## فاز ۴ — نقشه راه پیاده‌سازی فازبندی‌شده و خودکفا (Phases 0 → 5)

---

### Phase 0: بنیاد توکن‌های طراحی (W3C DTCG 3-Tier)، حالت تاریک معنایی، Safe Area و تایپوگرافی فارسی/RTL

* **هدف و مرز دامنه (Objective & Scope Boundaries):**
  * **In-Scope:** استقرار معماری ۳ لایه توکن‌ها (`tokens.css` مطابق W3C DTCG 2025.10)، حذف `<style>` تکراری از `index.html`، اصلاح واقعی ۳ پالت رنگی (`indigo` / `forest` / `rosegold`)، افزودن حالت تاریک `system | light | dark`، رفع باگ `filter` روی `body` در BioTheme، تنظیم `viewport-fit=cover` و Safe Areas، استقرار تایپوگرافی استاندارد فارسی (`Vazirmatn` اول، کف ۱۶px ورودی‌ها، `tabular-nums`، حذف `tracking-*` و `italic` از فارسی)، و تعریف اسکیل `z-index` و شعاع‌های هم‌مرکز.
  * **Out-of-Scope:** تغییر ساختار ناوبری، چیدمان صفحات، منطق دیتابیس یا کامپوننت‌های چارت/تایم‌لاین.

* **مشخصات طراحی و توکن‌ها (Design & Token Spec):**
  * **لایه ۱ (Primitives):** رنگ‌های خنثی سرد (`--neutral-0` تا `--neutral-950`)، رنگ‌های برند برای هر پالت (`indigo`: `#4338ca`/`#818cf8`, `forest`: `#047857`/`#34d399`, `rosegold`: `#be123c`/`#fb7185`)، و رنگ‌های وضعیت (`success`, `warning`, `danger`).
  * **لایه ۲ (Semantic — Light & Dark & Contrast ≥ 4.5:1 / APCA Lc ≥ 75):**
    * `--bg-canvas`: Light `#F5F6FA` / Dark `#0B0D14`
    * `--bg-surface-1`: Light `#FFFFFF` / Dark `#131622`
    * `--bg-surface-2`: Light `#EEF0F6` / Dark `#1B2030`
    * `--text-primary`: Light `#0F172A` / Dark `#F8FAFC`
    * `--text-secondary`: Light `#475569` (کنتراست ۷.۱:۱) / Dark `#A8B3C7` (کنتراست ۸.۲:۱)
    * `--text-tertiary`: Light `#5A6577` (کنتراست ۵.۵:۱) / Dark `#8B97AD` (کنتراست ۵.۹:۱)
    * `--border-subtle`: Light `rgba(15, 23, 42, 0.08)` / Dark `rgba(248, 250, 252, 0.10)`
    * `--glass-nav-bg`: Light `rgba(255, 255, 255, 0.78)` / Dark `rgba(19, 22, 34, 0.78)` (منحصراً برای لایه ناوبری)
    * **شعاع‌های هم‌مرکز:** `--radius-sheet: 28px`, `--radius-card: 20px`, `--radius-inner: 12px`, `--radius-control: 12px`, `--radius-pill: 9999px`.
    * **مقیاس `z-index`:** `--z-base: 0`, `--z-sticky: 20`, `--z-nav: 30`, `--z-accessory: 35`, `--z-drawer: 40`, `--z-modal: 50`, `--z-popover: 60`, `--z-toast: 70`.
  * **تایپوگرافی فارسی:** `font-family: 'Vazirmatn', system-ui, -apple-system, sans-serif;` (حذف `Plus Jakarta Sans` و `Material Symbols Outlined`). تعریف کلاس‌های رسمی `@utility` برای `text-display`, `text-title-lg`, `text-title-md`, `text-body`, `text-callout`, `text-caption` (`min 12px`) و قانون اجباری `input, textarea, select { font-size: max(1rem, 16px); }` روی موبایل.

* **گام‌های اصلاح فایل‌به‌فایل:**
  1. `index.html`: افزودن `viewport-fit=cover`؛ حذف `<meta http-equiv="Cache-Control">` متعارض با PWA؛ حذف لینک فونت `Material Symbols Outlined` و `Plus Jakarta Sans`؛ حذف بلوک `<style>` تکراری (خطوط ۳۴–۱۲۸).
  2. `src/styles/tokens.css` (جدید، ایمپورت در `index.css`): تعریف توکن‌های ۳ لایه Light/Dark، پالت‌های `.theme-indigo`/`.theme-forest`/`.theme-rosegold` متصل به `--accent-primary` و `--md-primary`، و توکن‌های دمایی `BioTheme` (`[data-bio-phase="morning|afternoon|evening|night"]`) بدون `filter`.
  3. `index.css`: حذف قوانین `body.bio-* { filter: ... }`، حذف `.glass-card`/`.bubble-ai-premium` بلوردار روی محتوا، حذف `.mobile-bottom-nav` مرده، افزودن `.pt-safe`/`.pb-safe`/`.px-safe` و پوشش کامل `@media (prefers-reduced-motion: reduce)`.
  4. `tailwind.config.js`: اتصال `primary`/`indigo`/`surface` به توکن‌های CSS، حذف hexهای ثابت Light-only، قرار دادن `Vazirmatn` به‌عنوان فونت اول.
  5. `context/ThemeContext.tsx`: افزودن `themePreference: 'system' | 'light' | 'dark'` با گوش دادن به `matchMedia('(prefers-color-scheme: dark)')` و حفظ سازگاری کامل با `darkMode` و `toggleDarkMode` برای تست‌ها و کامپوننت‌های فعلی.
  6. `hooks/useBioperformance.ts`: اعمال `document.documentElement.dataset.bioPhase` به‌جای کلاس فیلتردار روی `body`.
  7. `utils.ts` (یا `utils/persianFormat.ts`): افزودن `toPersianDigits()` و `normalizeDigits()` (تبدیل `۰-۹` و `٠-٩` به `0-9`) و `getTimeOfDayGreeting()`.

* **ماتریس راستی‌آزمایی (Verification Gates):**
  * `npm run lint && npm run build && npm run test`
  * تست واحد برای `normalizeDigits`، `toPersianDigits`، `getTimeOfDayGreeting` و تغییر `themePreference`.
  * بررسی با Playwright در `375×812` (Light + Dark + ۳ پالت رنگی): صفر `filter` روی `body`، مقدار `fontSize >= 16px` روی تمام inputها، و کنتراست ≥ ۴.۵:۱ روی متن‌های ثانویه.
* **شرایط توقف (STOP Conditions):** هر خطای TypeScript، شکست هر تست موجود در `src/__tests__/`, یا بروز تداخل رنگی در حالت تاریک.

---

### Phase 1: معماری اطلاعات، ناوبری موبایل تراز اپل، یک‌پارچگی Back/Scroll، Undo Toast و کمال ۵ حالت صفحه

* **هدف و مرز دامنه:**
  * **In-Scope:** بازطراحی `Layout.tsx` در موبایل (Tab Bar پنج‌تبه برچسب‌دار با دسترسی کامل به `/subjects`، هدر پاک و هم‌تراز با Safe Area، حذف FAB تداخلی و یکپارچه‌سازی ورود به مربی AI، ایجاد Bottom Accessory Shelf یکپارچه برای `FloatingPiPWidget` و وضعیت آفلاین)، پیاده‌سازی `useOverlayHistory` برای دکمه Back، حفظ موقعیت اسکرول در بازگشت، ارتقای `UIContext` و `Feedback.tsx` به Undo Toast غیرمسدودکننده، ارتقای `CommandPalette.tsx` به استاندارد جستجوی WWDC26، و جایگزینی `LoadingSpinner fullScreen` با App Shell + Skeleton و ۵ حالت صفحه.
  * **Out-of-Scope:** بازطراحی داخلی چارت‌های `Analysis.tsx` یا گریدهای داخلی `VisualPlanner.tsx`.

* **مشخصات طراحی:**
  * **Bottom Tab Bar موبایل (۵ تب اصلی، بدون Glass Sandwich):**
    1. `امروز` (`/`)
    2. `تایم‌لاین` (`/planner`)
    3. `حوزه‌ها` (`/subjects` — بازگرداندن دسترسی به ۶ نمای کار)
    4. `تحلیل` (`/analysis`)
    5. `بیشتر` (یا `لیگ` با دسترسی سریع به `تاریخچه` و `تنظیمات` در منوی ساختاریافته یا نگه داشتن `لیگ` + انتقال `تنظیمات` و `تاریخچه` به آواتار/پروفایل هدر — **تصمیم کلیدی جهت تأیید کاربر در دروازه پایان**).
    * استایل لایه ناوبری: تنها ناحیه Liquid Glass صفحه (`backdrop-blur-xl` + border بالا `1px` ظریف)، ارتفاع `64px + env(safe-area-inset-bottom)`، تمام تب‌ها دارای آیکون ۲۲px + برچسب ۱۲px خوانا با کنتراست بالا و حداقل هدف لمسی `48×56px`.
  * **Unified Bottom Accessory Shelf:** اگر `FloatingPiPWidget` فعال باشد، در یک نوار جمع‌وجور با ارتفاع `52px` و فاصله `8px` بالای Tab Bar لنگر می‌گیرد (یا در دسکتاپ قابل درگ با `dragConstraints` می‌ماند) — هیچ‌گاه روی دکمه‌های صفحه نمی‌افتد.
  * **هدر موبایل (`pt-safe` + ارتفاع `56px`):** سمت شروع (راست): عنوان صفحه یا دکمه بازگشت راست‌سو (`ChevronRight`) در زیرصفحات + نشانگر فشرده آفلاین/صف همگام‌سازی در صورت نیاز. سمت پایان (چپ): دکمه جستجو (`44×44px`)، اعلان (`44×44px`) و دسترسی یک‌تپ به مربی هوشمند (جایگزین FAB شناور مزاحم).
  * **Undo Toast:** نمایش در بالای Tab Bar (نه روی هدر) با دکمه `بازگردانی` (۵ ثانیه) برای حذف تسک و عملیات برگشت‌پذیر؛ حفظ `ConfirmModal` منحصراً برای عملیات غیرقابل‌برگشت (پاک کردن کل داده‌ها، حذف حوزه، حذف دوره آرشیوی).

* **گام‌های اصلاح فایل‌به‌فایل:**
  1. `hooks/useMediaQuery.ts` و `hooks/useOverlayHistory.ts` (جدید): جایگزینی `window.innerWidth < 768` و مدیریت دکمه Back برای همه اوورلی‌های >۷۰٪.
  2. `components/ScrollToTop.tsx`: اسکرول به بالا فقط در `navigationType === 'PUSH'` و حفظ موقعیت اسکرول در `POP`.
  3. `context/UIContext.tsx` و `components/Feedback.tsx`: افزودن `{ label, onClick }` به `showToast` برای Undo Toast، اصلاح z-index به `--z-toast`، حذف `ConfirmModal`های غیرضروری برای حذف تک‌تسک با نگه داشتن snapshot تسک جهت بازیابی.
  4. `components/Layout.tsx`: پیاده‌سازی هدر پاک موبایل (`pt-safe`)، نمایش وضعیت واقعی آفلاین/صف همگام‌سازی (`syncQueueCount`, `deadLetterCount`)، حذف `mobileNavItems` بلااستفاده و FAB شناور، بازطراحی Bottom Tab Bar، عدم اعمال `hidden` روی `<main>` هنگام باز شدن دراور AI و رندر دراور AI به‌صورت Sheet با اتصال به `useOverlayHistory`.
  5. `components/focus/FloatingPiPWidget.tsx`: افزودن `dragConstraints` در دسکتاپ و حالت Accessory Docked بالای Tab Bar در موبایل + `aria-label` و هدف لمسی ۴۴px.
  6. `components/CommandPalette.tsx`: افزودن Recent Searches (ذخیره در `localStorage` با حذف تکی و پاک‌سازی کل)، چیپ‌های Scope (`همه` / `تسک‌ها` / `صفحات` / `ابزارها`)، دکمه بستن لمسی ۴۴px، ورودی ۱۶px و حالت No-Results با اکو کردن کوئری.
  7. `context/StoreContext.tsx`, `App.tsx`, `components/Skeleton.tsx`: جایگزینی `LoadingSpinner fullScreen` با App Shell فوری + `PageSkeleton` هم‌شکل داشبورد/لیست‌ها.
  8. `pages/History.tsx` و `pages/AIChat.tsx`: حذف دکمه بازگشت تکراری در `History.tsx` (یا یکپارچه‌سازی با هدر)، اصلاح `ChevronLeft` به `ChevronRight` در `AIChat.tsx:495` و اجباری کردن عبور `auto_add_tasks` از `AITaskReviewWindow`.

* **ماتریس راستی‌آزمایی:**
  * `npm run lint && npm run build && npm run test && npm run test:e2e`
  * تست Playwright در `375×812`: دسترسی با ≤ ۲ تپ به `/subjects` و `/history`، تست Undo پس از حذف تسک، تست بسته شدن CommandPalette و AI Drawer با `page.goBack()`، و تست عدم هم‌پوشانی Tab Bar با PiP Widget.
* **شرایط توقف:** شکست تست‌های مسیریابی در `src/__tests__/backendAndNavigation.test.tsx` یا `navigationAndAppFlow.e2e.test.tsx`.

---

### Phase 2: بازطراحی صفحات اصلی (Dashboard، VisualPlanner/Timeline، Subjects و 6 Views، Welcome و Settings) با هندسه هم‌مرکز و سطح‌های کدر

* **هدف و مرز دامنه:**
  * **In-Scope:** سبک‌سازی و اولویت‌بندی `Dashboard.tsx` (اصل «یک وظیفه اصلی: اقدام امروز»)، موبایل‌دوست کردن کامل `VisualPlanner.tsx` + `UnifiedTimeline.tsx` + `DualColumn10MinuteGrid.tsx`، تکمیل تجربه لمسی `Subjects.tsx` و ۴ نمای `KanbanView`/`EisenhowerMatrixView`/`MonthlyCalendarView`/`TableView` (جایگزینی Drag-only و Hover-only با Quick Action Sheetهای لمسی)، ساده‌سازی `Welcome.tsx` (ورود بدون اصطکاک)، و تمیزسازی `AIChat.tsx`/`ChatMessage.tsx`/`ChatInput.tsx` از Glass-on-Glass.
  * **Out-of-Scope:** تغییر الگوریتم‌های `timelineLayout.ts`, `brainDumpParser.ts`, `streakEngine.ts`, `xpSystem.ts`.

* **مشخصات طراحی:**
  * **داشبورد (`pages/Dashboard.tsx`) — سلسله‌مراتب موبایل:**
    1. کارت خلاصه فشرده امروز (سلام پویا بر اساس ساعت روز + درصد پیشرفت حلقه + ۱ دکمه اصلی تمام‌عرض در منطقه شست یا بالای لیست برای «شروع تمرکز / افزودن تسک»).
    2. نوار انتخاب روز افقی با `scroll-snap-x` و عرض حداقل `56px` برای هر روز (جایگزین `grid-cols-7` له شده در ۳۷۵px).
    3. بخش اصلی در ویوپورت اول: **تسک‌های امروز** (با تفکیک فیلتر خالی از روز خالی + دکمه «پاک کردن فیلتر»).
    4. بخش‌های ثانویه (پیشنهاد تایم‌بلاک، حال‌وهوا، صدای محیطی، پاد مطالعه) به صورت کارت‌های جمع‌شونده/فشرده یا کشویی پس از لیست امروز.
  * **تایم‌لاین و برنامه‌ریز (`VisualPlanner.tsx`, `UnifiedTimeline.tsx`, `DualColumn10MinuteGrid.tsx`):**
    * حذف کامل وابستگی به `group-hover`؛ تپ روی هر بلاک تسک در تایم‌لاین یک Bottom Action Sheet تمیز با دکمه‌های ۴۴px (تکمیل، شروع تمرکز، `−۱۵دقیقه` / `+۱۵دقیقه`، تغییر ساعت شروع، حذف از تایم‌لاین، ویرایش) باز می‌کند.
    * در `DualColumn10MinuteGrid.tsx`: در موبایل نمایش تک‌ستونه (صبح / بعدازظهر / شب با Segmented Control) با دکمه‌های حداقل `44px` به‌جای `min-w-[520px]`.
  * **حوزه‌ها و ۶ نمای کار (`Subjects.tsx`, `KanbanView`, `EisenhowerMatrixView`, `MonthlyCalendarView`, `TableView`):**
    * `KanbanView`: روی موبایل به صورت تب‌های افقیِ ۳ وضعیت (یا اسکرول افقی snap-x) + دکمه تک‌تپ تغییر وضعیت (`در صف` ← `در حال انجام` ← `تکمیل`) روی هر کارت.
    * `EisenhowerMatrixView`: افزودن انتخابگر سریع اولویت روی هر کارت به‌جای اتکای صرف به Drag-and-Drop.
    * `MonthlyCalendarView`: در موبایل نمایش گرید فشرده با نشانگر نقطه (dot indicators) در هر روز + نمایش لیست تسک‌های روز انتخاب‌شده زیر تقویم به همراه دکمه دائمی «+ افزودن در این روز».
    * `TableView`: زیر `md` تبدیل خودکار به Compact Card List قابل ویرایش سریع (بدون اسکرول افقی ۸۲۰px).
  * **چت هوشمند (`AIChat.tsx`, `ChatMessage.tsx`, `ChatInput.tsx`):**
    * حذف تمام `backdrop-filter` از حباب‌های پیام و کره‌های `blur-[120px]` پس‌زمینه؛ استفاده از سطوح کدر `--bg-surface-1` و `--bg-surface-2` با حاشیه ظریف و استایل استاندارد مارک‌داون فارسی (جایگزین `prose` ناموجود)؛ اصلاح رنگ دکمه کپی پیام کاربر.

* **گام‌های اصلاح فایل‌به‌فایل:**
  1. `pages/Dashboard.tsx`: بازآرایی سلسله‌مراتب، تقویم افقی `scroll-snap`، سلام پویا، تفکیک `empty` از `noSearchResults`، هندسه هم‌مرکز.
  2. `pages/VisualPlanner.tsx`, `components/planner/UnifiedTimeline.tsx`, `components/planner/DualColumn10MinuteGrid.tsx`: افزودن Action Sheet لمسی برای بلوک‌ها، حذف `group-hover`، و نمای ریسپانسیو موبایل ۱۰ دقیقه‌ای.
  3. `pages/Subjects.tsx`, `components/views/KanbanView.tsx`, `EisenhowerMatrixView.tsx`, `MonthlyCalendarView.tsx`, `TableView.tsx`: جایگزین‌های تک‌تپ لمسی (WCAG 2.5.7)، نمای موبایل جدول و تقویم، و Empty States با CTA.
  4. `pages/AIChat.tsx`, `components/AIChat/ChatMessage.tsx`, `components/AIChat/ChatInput.tsx`, `components/AIChat/WelcomeScreen.tsx`: حذف Glass-on-Glass، اصلاح کنتراست، جایگزینی کلاس‌های undefined.
  5. `pages/Welcome.tsx` و `pages/Settings.tsx` و `components/WelcomeBanner.tsx`: کاهش شلوغی، یکسان‌سازی توکن‌ها، اصلاح دکمه‌ها و کنتراست.

* **ماتریس راستی‌آزمایی:**
  * `npm run lint && npm run build && npm run test`
  * تست Playwright روی `375×812` و `430×932`: عدم سرریز افقی (`document.documentElement.scrollWidth <= window.innerWidth`) در تمام ۹ صفحه و هر ۶ نمای `Subjects`.
* **شرایط توقف:** شکست تست‌های `dashboardMilestone2.test.tsx` یا `viewsAndPlanner.test.tsx` یا بروز overflow افقی در ۳۷۵px.

---

### Phase 3: فیزیک حرکت سیال (Fluid Interfaces)، میکروتعامل‌ها، هپتیک لمسی و آیکونوگرافی یکپارچه

* **هدف و مرز دامنه:**
  * **In-Scope:** ساخت ماژول `utils/motionPresets.ts` با فنرهای استاندارد اپل (`stiff`, `snappy`, `sheet`, `gentle`، بدون overshoot مصنوعی)، پوشش ریشه با `<MotionConfig reducedMotion="user">`، حذف کامل انیمیشن‌های تزئینی بی‌پایان (`animate-pulse`, `animate-ping`, `animate-bounce`, `animate-spin-slow`) و کلاس‌های مرده `animate-in`، بازنویسی سوایپ `TaskCard.tsx` با جهت صحیح RTL و velocity projection، بهبود `utils/haptics.ts` با پالس‌های ظریف و اتصال به تعامل‌های کلیدی، و جایگزینی ایموجی‌های کنترلی با آیکون‌های یکپارچه `lucide-react`.
  * **Out-of-Scope:** تغییر منطق محاسبه XP یا منطق تایمر.

* **مشخصات طراحی:**
  * **پرست‌های فیزیک حرکت (`utils/motionPresets.ts`):**
    * `SPRING_SNAPPY`: `{ type: 'spring', stiffness: 420, damping: 32, mass: 0.9 }` (برای تب‌ها، چک‌باکس، دکمه‌ها).
    * `SPRING_SHEET`: `{ type: 'spring', stiffness: 360, damping: 34, mass: 1 }` (برای شیت‌ها و مودال‌ها، قابل قطع).
    * `SPRING_SWIPE`: `{ type: 'spring', stiffness: 380, damping: 30 }` + فرمول پیش‌بینی سرعت `projected = offset + (velocity / 1000) * 0.2`.
    * محدودیت زمانی تمام ترنزیشن‌های غیرفنری ≤ `250ms` (بسیار زیر آستانه ۴۰۰ms دوهرتی).
  * **هپتیک ظریف (`utils/haptics.ts`):** `selection: 8ms`, `light: 12ms`, `success: [10, 40, 14]`, `warning: [16, 40, 16]` با بررسی `prefers-reduced-motion` و تنظیم `soundEnabled`.

* **گام‌های اصلاح فایل‌به‌فایل:**
  1. `utils/motionPresets.ts` (جدید): تعریف پرست‌های فنری و انیمیشن‌های استاندارد (حذف نیاز به `tailwindcss-animate`).
  2. `App.tsx`: افزودن `<MotionConfig reducedMotion="user">` در ریشه.
  3. `components/TaskCard.tsx`: اصلاح کامل جهت پس‌زمینه‌های سوایپ در RTL، افزودن velocity projection و آستانه هیسترزیس، حذف `layout` پرهزینه و `blur-[0.5px] grayscale` از تسک‌های تکمیل‌شده، و اصلاح دکمه زرد حالت تاریک (`292`).
  4. `components/Feedback.tsx`, `components/FocusTimer.tsx`, `components/NotificationBell.tsx`, `components/WelcomeBanner.tsx`, `pages/VisualPlanner.tsx`, `pages/Dashboard.tsx`, `pages/Leaderboard.tsx`, `pages/Subjects.tsx`, `pages/AIChat.tsx`: حذف تمام انیمیشن‌های `pulse/ping/bounce/spin-slow` تزئینی، احترام `ConfettiCelebration` به `prefers-reduced-motion`، جایگزینی کلاس‌های مرده `animate-in` با Framer Motion پرست‌دار، و جایگزینی ایموجی‌های سیستمی کنترل‌ها با `lucide-react`.
  5. `utils/haptics.ts`: اصلاح مدت‌زمان پالس‌ها و افزودن فراخوانی در تغییر تب (`Layout.tsx`)، شروع/توقف فوکوس (`FocusTimer.tsx`) و انتخاب مود (`Dashboard.tsx`).

* **ماتریس راستی‌آزمایی:**
  * `npm run lint && npm run build && npm run test`
  * تست Playwright با `emulateMedia({ reducedMotion: 'reduce' })`: عدم اجرای انیمیشن‌های پیوسته و کانفتی، و تست سوایپ راست/چپ `TaskCard` در RTL.
* **شرایط توقف:** کاهش نرمی انیمیشن یا شکست تست‌های `components.test.tsx`.

---

### Phase 4: فرم‌های پرتبدیل، اعتبارسنجی Inline، دسترسی‌پذیری کامل WCAG 2.2 AA + APCA

* **هدف و مرز دامنه:**
  * **In-Scope:** بازطراحی تجربه فرم‌ها (`TaskModal.tsx`, `AuthModal.tsx`, `BrainDumpModal.tsx`, `Settings.tsx`), استقرار Focus Trap و بازگرداندن فوکوس در تمام مودال‌ها/شیت‌ها، تضمین حداقل هدف لمسی `44×44px` در کل اپلیکیشن، تبدیل تمام `div`های کلیک‌پذیر به `<button>`، تکمیل `aria-label`/`role="tablist"`/`aria-selected`، افزودن `<bdi>` برای عبارات لاتین و نرمال‌سازی ارقام فارسی در ورودی‌های عددی و پیش‌نویس خودکار `sessionStorage`.
  * **Out-of-Scope:** تغییر اسکیمای Firestore یا APIهای احراز هویت.

* **مشخصات طراحی:**
  * **کامپوننت مشترک `components/ui/ModalSheet.tsx` (جدید):** روی موبایل به صورت Bottom Sheet هم‌مرکز (`rounded-t-[28px]`, handle bar، قابل بستن با سوایپ به پایین و Back) و روی دسکتاپ دیالوگ مرکزی؛ دارای Focus Trap، بستن با `Escape`، بازگرداندن فوکوس به عنصر بازکننده، و `role="dialog" aria-modal="true"`.
  * **فرم‌های بدون اصطکاک:** `mode: 'onBlur'` در `react-hook-form`، پیام خطای inline همراه آیکون (نه فقط رنگ) متصل با `aria-describedby`، اتریبیوت‌های کامل `autoComplete` و `inputMode`، تبدیل آنی ارقام فارسی به انگلیسی در فیلدهای عددی، و جلوگیری از خطای `required` مخفی در تب غیرفعال `TaskModal`.

* **گام‌های اصلاح فایل‌به‌فایل:**
  1. `components/ui/ModalSheet.tsx` و `hooks/useFocusTrap.ts` (جدید).
  2. `components/TaskModal.tsx`: مهاجرت به `ModalSheet`، گرید `grid-cols-2 sm:grid-cols-4` در موبایل، خطای inline + سوئیچ خودکار به تب خطادار، ذخیره پیش‌نویس در `sessionStorage`، کف `44×44px` برای چیپ‌ها و دکمه حذف تگ، نرمال‌سازی ارقام.
  3. `components/AuthModal.tsx` و `pages/Settings.tsx` (`InlineAuthForm` و مودال آرشیو): `mode: 'onBlur'`، اتریبیوت‌های `autoComplete`/`inputMode`، لیبل‌های صریح، مهاجرت به `ModalSheet`.
  4. `components/BrainDumpModal.tsx`: مهاجرت به `ModalSheet`، ورودی `16px`، ذخیره پیش‌نویس متن در `sessionStorage`، `aria-label` روی دکمه بستن و میکروفون.
  5. ممیزی نهایی دسترسی‌پذیری در `Subjects.tsx`, `FocusTimer.tsx`, `UnifiedTimeline.tsx`, `Analysis.tsx`, `Leaderboard.tsx`, `History.tsx`: تبدیل `div` کلیک‌پذیر به `<button>`، افزودن `role="tablist"`/`aria-selected`، `aria-label` و `<bdi>` روی رشته‌های لاتین.

* **ماتریس راستی‌آزمایی:**
  * `npm run lint && npm run build && npm run test`
  * ممیزی خودکار دسترسی‌پذیری با Playwright (بررسی صفر دکمه بدون accessible name، صفر هدف لمسی < ۴۴px روی کنترل‌های اصلی، بررسی تب‌زنی کیبورد و Focus Trap در تمام مودال‌ها، و تست کنتراست AA/APCA).
* **شرایط توقف:** هر خطای بحرانی WCAG 2.2 AA یا شکست احراز هویت/ساخت تسک.

---

### Phase 5: بهینه‌سازی رندر ۶۰–۱۲۰fps موبایل، تفکیک کانتکست، ممیزی نهایی و پاک‌سازی

* **هدف و مرز دامنه:**
  * **In-Scope:** تفکیک وضعیت‌های پرتغییر UI در `StoreContext.tsx` و `useMemo` کردن `contextValue` برای حذف آبشار رندر مجدد، ایزوله‌سازی `useFocusTick()` در زیرکامپوننت‌های کوچک در `Leaderboard.tsx` و `FocusTimer.tsx` (جلوگیری از رندر هرثانیه‌ای درخت ۱۸۰۰ خطی)، حذف پکیج بلااستفاده `@use-gesture/react` (در صورت عدم نیاز) یا استفاده هدفمند، و اجرای چرخه نهایی QA بصری و کارایی روی تمام صفحات.
  * **Out-of-Scope:** افزودن فیچرهای جدید خارج از بازطراحی UI/UX.

* **گام‌های اصلاح فایل‌به‌فایل:**
  1. `context/StoreContext.tsx`: جداسازی `StoreSyncStatusContext` (برای `saveStatus`, `isSyncing`, `syncQueueCount`, `deadLetterCount`) و پیچیدن `contextValue` در `useMemo` با حفظ کامل API عمومی `useStore()` (بدون هیچ Breaking Change).
  2. `pages/Leaderboard.tsx` و `components/FocusTimer.tsx`: استخراج زیرکامپوننت‌های ایزوله `ActiveSessionTimerDisplay` و `FocusClockFace` به‌گونه‌ای که فقط خوانش ثانیه‌شمار هر ثانیه رندر شود، نه کل صفحه.
  3. `components/Layout.tsx`: انتقال چک دوره‌ای `10s` به هوک اختصاصی که فقط در صورت تغییر واقعی `unread` یا وضعیت، state را به‌روزرسانی کند.
  4. `components/FocusTimer.tsx`: حذف `backdrop-blur-3xl` تمام‌صفحه و کره‌های `blur-[150px]` و جایگزینی با گرادیان رادیال ایستا و کم‌هزینه روی GPU.

* **ماتریس راستی‌آزمایی نهایی (Full Release Gate):**
  * `npm run lint && npm run build && npm run test && npm run test:e2e`
  * اسکرین‌شات کامل تمام ۹ صفحه در Playwright در ویوپورت‌های `375×812` و `430×932` در هر دو حالت Light و Dark + اندازه‌گیری تعداد لایه‌های `backdrop-filter` هم‌زمان (≤ ۲) و بررسی نبود خطای کنسول یا شکست رندر.
* **شرایط توقف:** هر رگرسیون در تست‌ها، خطای کنسول، یا افت فریم‌ریت در اسکرول موبایل.

---

## دروازه تعامل و تصمیم‌گیری پیش از اجرا (Final Interaction Gate)

* **پروفایل ریسک تخمینی:**
  * **Phase 0 (کم-ریسک):** صرفاً توکن‌ها، CSS، Safe Area و تایپوگرافی — بیشترین بازده بصری و رفع باگ‌های پایه بدون دست‌کاری منطق.
  * **Phase 1 (ریسک متوسط):** تغییر پوسته ناوبری و History Stack — نیازمند اجرای دقیق `test:e2e` برای حفظ قرارداد مسیرها.
  * **Phase 2 (ریسک متوسط):** بازطراحی چیدمان صفحات کلیدی و اضافه کردن Action Sheetهای لمسی — بدون تغییر منطق تجاری.
  * **Phase 3 & 4 (کم تا متوسط):** بهبود فیزیک حرکت، فرم‌ها و WCAG 2.2 AA — کاملاً افزایشی و قابل تست.
  * **Phase 5 (ریسک متوسط):** بهینه‌سازی Memoization کانتکست و ایزوله‌سازی تیک تایمر — نیازمند دقت روی dependencyها.
* **ترتیب اجرای پیشنهادی:** `Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5` (بنیادی‌ترین لایه‌ها اول).
