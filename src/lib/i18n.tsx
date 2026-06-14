import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "ar" | "en";

const dict = {
  ar: {
    appName: "Hemocare",
    login: "تسجيل الدخول",
    signup: "إنشاء حساب",
    logout: "تسجيل الخروج",
    phone: "رقم الموبايل",
    password: "كلمة المرور",
    fullName: "الاسم الكامل",
    iAm: "أنا",
    doctor: "دكتور",
    patient: "مريض",
    welcome: "مرحبا",
    dashboard: "الرئيسية",
    medications: "الأدوية",
    labTests: "الفحوصات",
    glucose: "السكر",
    appointments: "المواعيد",
    settings: "الإعدادات",
    chatbot: "المساعد الذكي",
    addInfo: "أضف بياناتك",
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    edit: "تعديل",
    add: "إضافة",
    name: "الاسم",
    age: "العمر",
    bloodType: "فصيلة الدم",
    gender: "الجنس",
    male: "ذكر",
    female: "أنثى",
    notes: "ملاحظات",
    morning: "صباحاً",
    afternoon: "ظهراً",
    evening: "مساءً",
    night: "ليلاً",
    beforeMeal: "قبل الأكل",
    afterMeal: "بعد الأكل",
    withMeal: "مع الأكل",
    noMeal: "بدون",
    dosage: "الجرعة",
    description: "الوصف",
    timing: "التوقيت",
    glucoseValue: "قيمة السكر (mg/dL)",
    fasting: "صائم",
    afterMealReading: "بعد الأكل",
    random: "عشوائي",
    addReading: "أضف قراءة",
    yourReadings: "قراءاتك",
    high: "السكر مرتفع — يُنصح بمراجعة طبيبك وتجنب السكريات",
    low: "السكر منخفض — تناول شيئاً يحتوي على السكر فوراً",
    normal: "السكر في المعدل الطبيعي ✓",
    changePassword: "تغيير كلمة المرور",
    deleteAccount: "حذف الحساب",
    newPassword: "كلمة المرور الجديدة",
    confirm: "تأكيد",
    myPatients: "مرضاي",
    schedule: "جدول اليوم",
    searchPatient: "ابحث بالاسم أو الرقم...",
    profile: "الملف الشخصي",
    prescribeMedication: "وصف دواء",
    addLabTest: "إضافة فحص",
    prediction: "التنبؤ",
    visualization: "الرسوم البيانية",
    setAppointment: "تحديد موعد",
    today: "اليوم",
    askMe: "اسألني عن أي شيء طبي...",
    send: "إرسال",
    language: "اللغة",
    sendingDots: "...",
    riskAnalysis: "تحليل احتمالية الإصابة",
    noData: "لا توجد بيانات بعد",
    yourMedications: "أدويتك",
    yourLabs: "تحاليلك",
    medName: "اسم الدواء",
    testName: "اسم الفحص",
    testDate: "تاريخ الفحص",
    results: "النتائج",
    appointment: "موعد",
    reason: "السبب",
    date: "التاريخ",
    time: "الوقت",
    saved: "تم الحفظ",
    deleted: "تم الحذف",
    error: "حدث خطأ",
    saveProfile: "حفظ بياناتي",
    welcomeBack: "أهلاً بعودتك",
    welcomeNew: "مرحباً بك في Hemocare",
    loginSubtitle: "ادخل بياناتك للمتابعة",
    signupSubtitle: "ابدأ رحلتك الصحية معنا",
    haveAccount: "لديك حساب؟",
    noAccount: "ليس لديك حساب؟",
  },
  en: {
    appName: "Hemocare",
    login: "Sign In",
    signup: "Sign Up",
    logout: "Sign Out",
    phone: "Phone number",
    password: "Password",
    fullName: "Full name",
    iAm: "I am a",
    doctor: "Doctor",
    patient: "Patient",
    welcome: "Welcome",
    dashboard: "Home",
    medications: "Medications",
    labTests: "Lab Tests",
    glucose: "Glucose",
    appointments: "Appointments",
    settings: "Settings",
    chatbot: "AI Assistant",
    addInfo: "Add your info",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    name: "Name",
    age: "Age",
    bloodType: "Blood type",
    gender: "Gender",
    male: "Male",
    female: "Female",
    notes: "Notes",
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
    night: "Night",
    beforeMeal: "Before meal",
    afterMeal: "After meal",
    withMeal: "With meal",
    noMeal: "None",
    dosage: "Dosage",
    description: "Description",
    timing: "Timing",
    glucoseValue: "Glucose (mg/dL)",
    fasting: "Fasting",
    afterMealReading: "After meal",
    random: "Random",
    addReading: "Add reading",
    yourReadings: "Your readings",
    high: "Glucose is HIGH — consult your doctor and avoid sugars",
    low: "Glucose is LOW — eat something sugary immediately",
    normal: "Glucose in normal range ✓",
    changePassword: "Change password",
    deleteAccount: "Delete account",
    newPassword: "New password",
    confirm: "Confirm",
    myPatients: "My Patients",
    schedule: "Today's schedule",
    searchPatient: "Search by name or ID...",
    profile: "Profile",
    prescribeMedication: "Prescribe medication",
    addLabTest: "Add lab test",
    prediction: "Prediction",
    visualization: "Visualization",
    setAppointment: "Set appointment",
    today: "Today",
    askMe: "Ask me anything medical...",
    send: "Send",
    language: "Language",
    sendingDots: "...",
    riskAnalysis: "Disease risk analysis",
    noData: "No data yet",
    yourMedications: "Your medications",
    yourLabs: "Your labs",
    medName: "Medication name",
    testName: "Test name",
    testDate: "Test date",
    results: "Results",
    appointment: "Appointment",
    reason: "Reason",
    date: "Date",
    time: "Time",
    saved: "Saved",
    deleted: "Deleted",
    error: "Error",
    saveProfile: "Save my info",
    welcomeBack: "Welcome back",
    welcomeNew: "Welcome to Hemocare",
    loginSubtitle: "Enter your details to continue",
    signupSubtitle: "Start your health journey with us",
    haveAccount: "Have an account?",
    noAccount: "No account?",
  },
} as const;

type Dict = typeof dict.ar;
type Key = keyof Dict;

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key) => string;
  dir: "rtl" | "ltr";
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "ar";
    return (localStorage.getItem("lang") as Lang) || "ar";
  });

  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };

  const t = (k: Key) => dict[lang][k] ?? k;

  return <Ctx.Provider value={{ lang, setLang, t, dir }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n outside provider");
  return c;
}
