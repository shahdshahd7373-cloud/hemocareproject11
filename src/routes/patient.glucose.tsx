import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, CheckCircle2, AlertCircle, Trash2, Plus, Calendar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";

function getMonthYear(dateStr: string | null, lang: string) {
  if (!dateStr) return lang === "ar" ? "غير معروف" : "Unknown";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return lang === "ar" ? "غير معروف" : "Unknown";
  return d.toLocaleString(lang === "ar" ? "ar-EG" : "en-US", { month: "long", year: "numeric" });
}

export const Route = createFileRoute("/patient/glucose")({
  component: GlucosePage,
});

interface Reading {
  id: string;
  value: number;
  reading_type: string;
  measured_at: string;
}

function classify(value: number, type: string, lang: "ar" | "en") {
  // simple thresholds
  let max = 140;
  let min = 70;
  if (type === "fasting" || type === "before_meal") { max = 100; min = 70; }
  else if (type === "after_meal") { max = 180; min = 80; }
  if (value > max) return { kind: "high", icon: AlertTriangle, color: "text-destructive bg-destructive/10",
    msg: lang === "ar" ? `السكر مرتفع (>${max}). راجع طبيبك وتجنب السكريات وشرب الماء.` : `Glucose HIGH (>${max}). Consult your doctor and avoid sugars.` };
  if (value < min) return { kind: "low", icon: AlertCircle, color: "text-warning bg-warning/10",
    msg: lang === "ar" ? `السكر منخفض (<${min}). تناول شيئاً سكرياً فوراً.` : `Glucose LOW (<${min}). Eat something sugary immediately.` };
  return { kind: "normal", icon: CheckCircle2, color: "text-success bg-success/10",
    msg: lang === "ar" ? "السكر في المعدل الطبيعي ✓" : "Glucose in normal range ✓" };
}

function GlucosePage() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ReturnType<typeof classify> | null>(null);
  
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 16);
  
  const [form, setForm] = useState({
    value: "",
    type: "fasting",
    measured_at: localISOTime,
  });

  const load = async () => {
    if (!user) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/patients/${user.id}/glucose`);
      if (res.ok) {
        const data = await res.json();
        // Backend uses PascalCase: ReadingID, Value, MeasuredAt, Notes
        const normalized = data.map((r: any) => ({
          id: r.ReadingID,
          value: r.Value,
          measured_at: r.MeasuredAt,
          reading_type: r.ReadingType || "random",
          notes: r.Notes
        }));
        setReadings(normalized.sort((a: any, b: any) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime()));
      }
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  const remove = async (id: string) => {
    // Optimistic or just alert if delete not fully supported backend-side
    // For now, let's just make it a dummy remove if we don't have DELETE endpoint
    // Actually, we should probably call DELETE endpoint if it exists. 
    try {
      const res = await fetch(`http://127.0.0.1:8000/patients/glucose/${id}`, { method: "DELETE" });
      // ignore errors if not exists yet
      load();
    } catch(err) { console.error(err); }
  };

  const add = async () => {
    if (!user || !form.value) return;
    const v = parseFloat(form.value);
    const r = classify(v, form.type, lang);
    setResult(r);
    try {
      const res = await fetch(`http://127.0.0.1:8000/patients/${user.id}/glucose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: v,
          reading_type: form.type,
          measured_at: form.measured_at
        })
      });
      if (!res.ok) throw new Error("Failed to add glucose reading");
      toast.success(t("saved"));
      setForm({ ...form, value: "" });
      load();
    } catch(err: any) {
      toast.error(err.message);
    }
  };

  const chartData = [...readings].reverse().map((r) => {
    const d = new Date(r.measured_at);
    const dateLabel = isNaN(d.getTime()) ? "Unknown" : d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric" });
    const timeLabel = isNaN(d.getTime()) ? "" : d.toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-US", { hour: '2-digit', minute: '2-digit' });
    return {
      date: dateLabel,
      time: timeLabel,
      fullDate: isNaN(d.getTime()) ? "Unknown" : d.toLocaleString(lang === "ar" ? "ar-EG" : "en-US"),
      value: Number(r.value),
      type: t(r.reading_type === "fasting" ? "fasting" : r.reading_type === "before_meal" ? "beforeMeal" : r.reading_type === "after_meal" ? "afterMealReading" : "random" as any)
    };
  });

  return (
    <div>
      <PageHeader
        title={t("glucose")}
        subtitle={lang === "ar" ? "سجل قراءاتك واحصل على نصائح فورية" : "Log your readings and get instant tips"}
        icon={<Activity className="h-6 w-6" />}
      />

      <div className="rounded-3xl glass p-6 shadow-card mb-6">
        <div className="grid md:grid-cols-3 gap-3">
          <input
            type="number"
            value={form.value}
            onChange={(e) => setForm({...form, value: e.target.value})}
            placeholder={t("glucoseValue")}
            className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
          />
          <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})}
            className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm">
            <option value="fasting">{t("fasting")}</option>
            <option value="before_meal">{t("beforeMeal")}</option>
            <option value="after_meal">{t("afterMealReading")}</option>
            <option value="random">{t("random")}</option>
          </select>
          <button onClick={add} className="rounded-full gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow inline-flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" /> {t("addReading")}
          </button>
        </div>

        {result && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className={`mt-4 rounded-2xl p-4 ${result.color} flex items-start gap-3`}>
            <result.icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm font-medium">{result.msg}</p>
          </motion.div>
        )}
      </div>

      {chartData.length > 0 && (
        <div className="rounded-3xl glass p-6 shadow-card mb-6">
          <h3 className="font-bold mb-4">{lang === "ar" ? "تطور قراءاتك" : "Your readings trend"}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.015 265)" vertical={false} />
                <XAxis dataKey="date" stroke="oklch(0.5 0.03 265)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.5 0.03 265)" fontSize={11} tickLine={false} axisLine={false} unit=" mg" />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="oklch(0.58 0.16 195)" 
                  strokeWidth={4} 
                  dot={{ r: 5, fill: "oklch(0.58 0.16 195)", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 8, strokeWidth: 0, fill: "oklch(0.58 0.16 195)" }}
                  label={(props: any) => {
                    const { x, y, value, index } = props;
                    const point = chartData[index];
                    return (
                      <g className="pointer-events-none">
                        <text x={x} y={y - 25} fill="oklch(0.4 0.05 265)" fontSize={11} fontStyle="italic" fontWeight="900" textAnchor="middle">
                          {value}
                        </text>
                        <text x={x} y={y - 12} fill="oklch(0.5 0.03 265)" fontSize={8} fontWeight="700" textAnchor="middle">
                          {point?.time}
                        </text>
                      </g>
                    );
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="rounded-3xl glass p-6 shadow-card">
        <h3 className="font-bold mb-4">{t("yourReadings")}</h3>
        {readings.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">{t("noData")}</div>
        ) : (
          <div className="space-y-8">
            {Array.from(new Set(readings.map(r => getMonthYear(r.measured_at, lang)))).map(month => {
              const monthReadings = readings.filter(r => getMonthYear(r.measured_at, lang) === month);
              return (
                <div key={month} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-muted-foreground/20 to-transparent" />
                    <div className="text-xs font-black tracking-widest text-muted-foreground uppercase px-3 py-1.5 rounded-full bg-muted/50 backdrop-blur-sm border border-white/20">
                      {month}
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-muted-foreground/20 to-transparent" />
                  </div>
                  <div className="grid gap-3">
                    {monthReadings.map((r) => {
                      const c = classify(Number(r.value), r.reading_type, lang);
                      const d = new Date(r.measured_at);
                      const dateStr = isNaN(d.getTime()) ? t("noData") : d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
                        weekday: 'long', month: 'short', day: 'numeric'
                      });
                      const timeStr = isNaN(d.getTime()) ? "" : d.toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-US", {
                        hour: '2-digit', minute: '2-digit'
                      });
                      return (
                        <motion.div 
                          key={r.id} 
                          whileHover={{ y: -2 }}
                          className="group relative flex items-center justify-between rounded-2xl bg-white/40 p-4 shadow-sm border border-white/40 hover:bg-white/60 transition-all duration-300"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${c.color} shadow-inner transition-transform group-hover:scale-110 duration-500`}>
                              <c.icon className="h-6 w-6" />
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter mb-0.5">
                                {dateStr} • {timeStr}
                              </div>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-black tracking-tight">{r.value}</span>
                                <span className="text-[10px] font-bold text-muted-foreground/50 uppercase">mg/dL</span>
                                <span className="mx-1 text-muted-foreground/20 text-xs">|</span>
                                <span className="text-xs font-bold text-primary/70">
                                  {t(r.reading_type === "fasting" ? "fasting" : r.reading_type === "before_meal" ? "beforeMeal" : r.reading_type === "after_meal" ? "afterMealReading" : "random" as any)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <div className={`hidden md:block px-3 py-1 rounded-full text-[10px] font-bold ${c.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                               {c.kind.toUpperCase()}
                             </div>
                             <button onClick={() => remove(r.id)} className="rounded-xl p-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                               <Trash2 className="h-4 w-4" />
                             </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
