import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Pill, Sun, Moon, Sunset, Sunrise, UtensilsCrossed, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";

export const Route = createFileRoute("/patient/medications")({
  component: MedicationsPage,
});

interface Med {
  id: string;
  name: string;
  dosage: string | null;
  description: string | null;
  timing: string;
  meal_relation: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
}

function timingIcon(t: string) {
  if (t === "morning") return Sunrise;
  if (t === "afternoon") return Sun;
  if (t === "evening") return Sunset;
  return Moon;
}

function timingClass(t: string) {
  if (t === "morning") return "bg-morning text-morning-foreground";
  if (t === "afternoon") return "gradient-warm text-white";
  if (t === "evening") return "bg-evening text-evening-foreground";
  return "bg-secondary text-secondary-foreground";
}

function mealClass(m: string) {
  if (m === "before") return "bg-meal-before text-white";
  if (m === "after") return "bg-meal-after text-white";
  if (m === "with") return "gradient-cool text-white";
  return "bg-muted text-muted-foreground";
}

function getStartOfWeek(dateStr: string | null) {
  if (!dateStr) return "0000-00-00"; // Represents very old
  const d = new Date(dateStr);
  const day = d.getUTCDay();
  const offset = (day + 1) % 7; // Saturday as start of week
  const result = new Date(d);
  result.setUTCDate(d.getUTCDate() - offset);
  return result.toISOString().slice(0, 10);
}

function MedicationsPage() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [meds, setMeds] = useState<Med[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", dosage: "", description: "", timing: "morning", meal_relation: "before",
  });

  const load = async () => {
    if (!user) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/patients/${user.id}/medications`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMeds(data.map((m: any) => ({
          id: String(m.id),
          name: m.name,
          dosage: m.dosage,
          description: m.description,
          timing: m.timing || "morning",
          meal_relation: m.meal_relation || "before",
          is_active: true,
          start_date: null,
          end_date: null,
          created_at: m.created_at,
        })));
      }
    } catch(err) { console.error(err); }
  };

  useEffect(() => { load(); }, [user]);

  const add = async () => {
    if (!user || !form.name) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/patients/${user.id}/medications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prescribed_by: 1, ...form })
      });
      if (!res.ok) throw new Error("Failed to add medication");
      toast.success(t("saved"));
      setForm({ name: "", dosage: "", description: "", timing: "morning", meal_relation: "before" });
      setShowForm(false);
      load();
    } catch(err: any) { toast.error(err.message); }
  };



  const grouped = {
    morning: meds.filter((m) => m.timing === "morning"),
    afternoon: meds.filter((m) => m.timing === "afternoon"),
    evening: meds.filter((m) => m.timing === "evening"),
    night: meds.filter((m) => m.timing === "night"),
  };

  return (
    <div>
      <PageHeader
        title={t("yourMedications")}
        subtitle={lang === "ar" ? "كل أدويتك مع التوقيت والمواعيد" : "All your meds with timing and schedule"}
        icon={<Pill className="h-6 w-6" />}
      />

      {meds.length === 0 ? (
        <div className="rounded-3xl glass p-12 text-center text-muted-foreground">
          <Pill className="h-12 w-12 mx-auto mb-3 opacity-40" />
          {t("noData")}
        </div>
      ) : (
        <div className="space-y-10">
          {(() => {
            const currentWeek = getStartOfWeek(new Date().toISOString());
            const lastWeekDate = new Date(currentWeek);
            lastWeekDate.setDate(lastWeekDate.getDate() - 7);
            const lastWeek = getStartOfWeek(lastWeekDate.toISOString());

            return Array.from(new Set(meds.map(m => getStartOfWeek(m.created_at)))).sort().reverse().map(week => {
              const weekMeds = meds.filter(m => getStartOfWeek(m.created_at) === week);
                const isCurrentWeek = week === currentWeek;
                const isLastWeek = week === lastWeek;
                return (
                  <div key={week} className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className={`h-[2px] flex-1 ${
                        isCurrentWeek ? 'bg-gradient-to-r from-transparent to-green-500/50' : 
                        isLastWeek ? 'bg-gradient-to-r from-transparent to-red-500/50' : 
                        'bg-gradient-to-r from-transparent to-muted'
                      }`} />
                      <span className={`text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border glass ${
                        isCurrentWeek ? 'border-green-500/50 text-green-600 bg-green-50/50' : 
                        isLastWeek ? 'border-red-500/50 text-red-600 bg-red-50/50' : 
                        'border-muted text-muted-foreground'
                      }`}>
                        {week === "0000-00-00" 
                          ? (lang === "ar" ? "سجلات قديمة" : "Older Records")
                          : (lang === "ar" 
                              ? (isCurrentWeek ? "هذا الأسبوع" : isLastWeek ? "الأسبوع الماضي" : `أسبوع ${week}`) 
                              : (isCurrentWeek ? "This Week" : isLastWeek ? "Last Week" : `Week of ${week}`))}
                      </span>
                      <div className={`h-[2px] flex-1 ${
                        isCurrentWeek ? 'bg-gradient-to-l from-transparent to-green-500/50' : 
                        isLastWeek ? 'bg-gradient-to-l from-transparent to-red-500/50' : 
                        'bg-gradient-to-l from-transparent to-muted'
                      }`} />
                    </div>
                
                {(["morning", "afternoon", "evening", "night"] as const).map((time) => {
                  const timeMeds = weekMeds.filter(m => m.timing === time);
                  if (timeMeds.length === 0) return null;
                  const Icon = timingIcon(time);
                  return (
                    <div key={time}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${timingClass(time)}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <h3 className="font-bold text-lg">{t(time as any)}</h3>
                      </div>
                      <div className={`grid md:grid-cols-2 gap-3`}>
                        {timeMeds.map((m) => {
                          return (
                            <motion.div 
                              key={m.id} 
                              initial={{ opacity: 0, y: 10 }} 
                              animate={{ opacity: 1, y: 0 }}
                              whileHover={{ y: -4, transition: { duration: 0.2 } }}
                              className={`rounded-2xl glass p-6 shadow-card flex items-start justify-between gap-4 border-2 transition-all duration-300 ${
                                isCurrentWeek 
                                  ? "border-green-500 shadow-green-100/50 bg-green-50/10" 
                                  : isLastWeek
                                  ? "border-red-500 shadow-red-100/50 bg-red-50/10"
                                  : "border-muted/30 hover:border-muted/60"
                              }`}>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="font-bold text-xl text-primary">{m.name}</div>
                                  {isCurrentWeek && (
                                    <span className="text-[10px] font-black uppercase bg-green-500 text-white px-2 py-0.5 rounded-md animate-pulse">
                                      {lang === "ar" ? "جديد" : "New"}
                                    </span>
                                  )}
                                  {isLastWeek && (
                                    <span className="text-[10px] font-black uppercase bg-red-500 text-white px-2 py-0.5 rounded-md">
                                      {lang === "ar" ? "سابق" : "Past"}
                                    </span>
                                  )}
                                </div>
                                {m.dosage && <div className="text-sm font-medium text-muted-foreground/80">{m.dosage}</div>}
                                {m.description && <div className="text-sm mt-3 text-muted-foreground leading-relaxed">{m.description}</div>}
                                 <div className="flex flex-wrap gap-2 mt-5">
                                   <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${timingClass(m.timing)}`}>
                                     <Icon className="h-3.5 w-3.5" />
                                     {t(m.timing as any)}
                                   </span>
                                   <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${mealClass(m.meal_relation)}`}>
                                     <UtensilsCrossed className="h-3.5 w-3.5" />
                                     {t((m.meal_relation === "before" ? "beforeMeal" : m.meal_relation === "after" ? "afterMeal" : m.meal_relation === "with" ? "withMeal" : "noMeal") as any)}
                                   </span>
                                   {m.created_at && (
                                     <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black border-2 ${
                                       isCurrentWeek 
                                         ? "border-green-500 bg-green-500/10 text-green-700" 
                                         : isLastWeek
                                         ? "border-red-500 bg-red-500/10 text-red-700"
                                         : "border-muted/50 bg-muted/5 text-muted-foreground"
                                     }`}>
                                       {new Date(m.created_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: 'numeric', day: 'numeric', year: 'numeric' })}
                                     </span>
                                   )}
                                 </div>
                               </div>
                             </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
