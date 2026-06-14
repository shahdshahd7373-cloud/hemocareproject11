import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Languages } from "lucide-react";

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <button
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-medium hover:shadow-glow transition"
      aria-label="Toggle language"
      suppressHydrationWarning
    >
      <Languages className="h-4 w-4" />
      <span suppressHydrationWarning>{mounted ? (lang === "ar" ? "EN" : "ع") : ""}</span>
    </button>
  );
}
