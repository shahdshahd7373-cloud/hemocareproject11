import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Pill, FlaskConical, TrendingUp, BarChart3, Calendar, Plus, MessageSquare, Trash2, AlertCircle } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Legend, LabelList, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

function getStartOfWeek(dateStr: string | null) {
  if (!dateStr) return "0000-00-00";
  const d = new Date(dateStr);
  const day = d.getUTCDay();
  const offset = (day + 1) % 7; // Saturday as start of week
  const result = new Date(d);
  result.setUTCDate(d.getUTCDate() - offset);
  return result.toISOString().slice(0, 10);
}

export const Route = createFileRoute("/doctor/patient/$id")({
  component: PatientDetail,
});

type Tab = "profile" | "meds" | "labs" | "prediction" | "viz" | "appt";

function PatientDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<any>(null);
  const [meds, setMeds] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [glucose, setGlucose] = useState<any[]>([]);

  const reload = async () => {
    try {
      const pRes = await fetch(`http://127.0.0.1:8000/patients/${id}`);
      if (pRes.ok) {
        const pData = await pRes.json();
        setProfile({
          full_name: pData.Name,
          phone: pData.Phone,
          blood_type: pData.BloodType,
          gender: pData.Gender,
          date_of_birth: pData.DateOfBirth,
          notes: pData.Notes,
          has_diabetes: pData.HasDiabetes
        });
      }

      const mRes = await fetch(`http://127.0.0.1:8000/patients/${id}/medications`);
      if (mRes.ok) setMeds(await mRes.json());

      const lRes = await fetch(`http://127.0.0.1:8000/patients/${id}/lab-tests`);
      if (lRes.ok) setLabs(await lRes.json());

      const gRes = await fetch(`http://127.0.0.1:8000/patients/${id}/glucose`);
      if (gRes.ok) setGlucose(await gRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { reload(); }, [id]);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "profile", label: t("profile"), icon: ArrowLeft },
    { id: "meds", label: t("medications"), icon: Pill },
    { id: "labs", label: t("labTests"), icon: FlaskConical },
    { id: "prediction", label: t("prediction"), icon: TrendingUp },
    { id: "viz", label: t("visualization"), icon: BarChart3 },
    { id: "appt", label: t("setAppointment"), icon: Calendar },
  ];

  return (
    <div>
      <Link to="/doctor" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> {t("myPatients")}
      </Link>

      {profile && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl gradient-hero p-6 text-white shadow-glow mb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold">
              {(profile.full_name ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{profile.full_name || "—"}</h1>
              <div className="flex flex-wrap gap-3 mt-1 text-sm opacity-90">
                {profile.phone && <span>📱 {profile.phone}</span>}
                {profile.blood_type && <span>🩸 {profile.blood_type}</span>}
                {profile.gender && <span>{profile.gender === "male" ? "♂" : "♀"} {t(profile.gender as any)}</span>}
                {profile.date_of_birth && <span>🎂 {profile.date_of_birth}</span>}
                {profile.has_diabetes === 1 && <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">{lang === "ar" ? "مرض السكر" : "Diabetes"}</span>}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex gap-1 overflow-x-auto mb-6 pb-2">
        {tabs.map((tb) => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
              tab === tb.id ? "gradient-warm text-white shadow-glow" : "glass hover:shadow-soft"
            }`}>
            <tb.icon className="h-4 w-4" />
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "profile" && profile && (
        <div className="rounded-3xl glass p-6 shadow-card">
          <h3 className="font-bold mb-3">{t("notes")}</h3>
          <p className="text-sm text-muted-foreground">{profile.notes || (lang === "ar" ? "لا توجد ملاحظات" : "No notes")}</p>
        </div>
      )}

      {tab === "meds" && <MedsTab patientId={id} doctorId={user?.id ?? ""} meds={meds} reload={reload} />}
      {tab === "labs" && <LabsTab patientId={id} doctorId={user?.id ?? ""} labs={labs} reload={reload} />}
      {tab === "prediction" && <PredictionTab id={id} labs={labs} glucose={glucose} />}
      { tab === "viz" && <VizTab labs={labs} glucose={glucose} />}
      { tab === "appt" && <ApptTab patientId={id} doctorId={user?.id ?? ""} reload={reload} />}
    </div>
  );
}

function MedsTab({ patientId, doctorId, meds, reload }: any) {
  const { t, lang } = useI18n();
  const [form, setForm] = useState({ name: "", dosage: "", description: "", timing: "morning", meal_relation: "before" });
  const add = async () => {
    if (!form.name) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/patients/${patientId}/medications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prescribed_by: doctorId, ...form })
      });
      if (!res.ok) throw new Error("Failed to add medication");
      toast.success(t("saved"));
      setForm({ name: "", dosage: "", description: "", timing: "morning", meal_relation: "before" });
      reload();
    } catch(err: any) {
      toast.error(err.message);
    }
  };
  const deleteMed = async (medId: any) => {
    try {
      await fetch(`http://127.0.0.1:8000/patients/medications/${medId}`, { method: "DELETE" });
      toast.success(t("deleted"));
      reload();
    } catch(err) { console.error(err); }
  };
  return (
    <div className="space-y-4">
      <div className="rounded-3xl glass p-5 shadow-card">
        <h3 className="font-bold mb-3">{t("prescribeMedication")}</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("medName")}
            className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm" />
          <input value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder={t("dosage")}
            className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm" />
          <select value={form.timing} onChange={(e) => setForm({ ...form, timing: e.target.value })}
            className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm">
            <option value="morning">{t("morning")}</option><option value="afternoon">{t("afternoon")}</option>
            <option value="evening">{t("evening")}</option><option value="night">{t("night")}</option>
          </select>
          <select value={form.meal_relation} onChange={(e) => setForm({ ...form, meal_relation: e.target.value })}
            className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm">
            <option value="before">{t("beforeMeal")}</option><option value="after">{t("afterMeal")}</option>
            <option value="with">{t("withMeal")}</option><option value="none">{t("noMeal")}</option>
          </select>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder={t("description")} rows={2} className="md:col-span-2 rounded-xl border border-input bg-background px-4 py-2.5 text-sm" />
        </div>
        <button onClick={add} className="mt-3 inline-flex items-center gap-2 rounded-full gradient-warm px-5 py-2 text-sm font-semibold text-white shadow-glow">
          <Plus className="h-4 w-4" /> {t("add")}
        </button>
      </div>
      <div className="space-y-8">
        {(() => {
          const currentWeek = getStartOfWeek(new Date().toISOString());
          const lastWeekDate = new Date(currentWeek);
          lastWeekDate.setDate(lastWeekDate.getDate() - 7);
          const lastWeek = getStartOfWeek(lastWeekDate.toISOString());

          return Array.from(new Set(meds.map((m: any) => getStartOfWeek(m.created_at)))).sort().reverse().map((week: any) => {
            const weekMeds = meds.filter((m: any) => getStartOfWeek(m.created_at) === week);
            const isCurrentWeek = week === currentWeek;
            const isLastWeek = week === lastWeek;
            return (
              <div key={week} className="space-y-3">
              <div className={`text-xs font-bold uppercase px-3 py-1 rounded-md inline-block ${
                isCurrentWeek ? "bg-green-100 text-green-700" :
                isLastWeek ? "bg-red-100 text-red-700" :
                "text-muted-foreground bg-muted/30"
              }`}>
                {week === "0000-00-00" 
                  ? (lang === "ar" ? "سجلات قديمة" : "Older Records")
                  : (lang === "ar" 
                      ? (isCurrentWeek ? "هذا الأسبوع" : isLastWeek ? "الأسبوع الماضي" : `أسبوع ${week}`) 
                      : (isCurrentWeek ? "This Week" : isLastWeek ? "Last Week" : `Week of ${week}`))}
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {weekMeds.map((m: any) => {
                  return (
                    <div key={m.id} 
                      style={{ 
                        border: isCurrentWeek ? "3px solid #22c55e" : isLastWeek ? "3px solid #ef4444" : "1px solid rgba(0,0,0,0.1)",
                        backgroundColor: isCurrentWeek ? "rgba(34, 197, 94, 0.05)" : isLastWeek ? "rgba(239, 68, 68, 0.05)" : "transparent"
                      }}
                      className={`rounded-2xl glass p-4 shadow-card flex justify-between items-start gap-2 ${isCurrentWeek || isLastWeek ? "shadow-glow" : ""}`}>
                      <div>
                        <div className="font-bold">{m.name}</div>
                        {m.dosage && <div className="text-sm text-muted-foreground">{m.dosage}</div>}
                        <div className="flex gap-2 mt-2 text-xs">
                          <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5">{t(m.timing)}</span>
                          <span className="rounded-full bg-accent/10 text-accent px-2 py-0.5">
                            {t((m.meal_relation === "before" ? "beforeMeal" : m.meal_relation === "after" ? "afterMeal" : m.meal_relation === "with" ? "withMeal" : "noMeal") as any)}
                          </span>
                          {m.created_at && (
                            <span className={`px-2 py-0.5 rounded-full font-bold border-2`}
                              style={{ 
                                color: isCurrentWeek ? "#15803d" : isLastWeek ? "#b91c1c" : "inherit", 
                                borderColor: isCurrentWeek ? "#22c55e" : isLastWeek ? "#ef4444" : "rgba(0,0,0,0.1)",
                                backgroundColor: isCurrentWeek ? "#f0fdf4" : isLastWeek ? "#fef2f2" : "transparent"
                              }}>
                              {new Date(m.created_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")}
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => deleteMed(m.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-full">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
              );
            });
          })()}
        {meds.length === 0 && <div className="text-sm text-muted-foreground">{t("noData")}</div>}
      </div>
    </div>
  );
}

function LabsTab({ patientId, doctorId, labs, reload }: any) {
  const { t, lang } = useI18n();
  const [form, setForm] = useState({ test_name: "", test_date: new Date().toISOString().slice(0, 10), notes: "", fields: [{ key: "", value: "" }] });
  const add = async () => {
    if (!form.test_name) return;
    const results: Record<string, string> = {};
    form.fields.forEach((f) => { if (f.key) results[f.key] = f.value; });
    try {
      const res = await fetch(`http://127.0.0.1:8000/patients/${patientId}/lab-tests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
           ordered_by: doctorId, test_name: form.test_name, test_date: form.test_date, results, notes: form.notes
        })
      });
      if (!res.ok) throw new Error("Failed to add lab test");
      toast.success(t("saved"));
      setForm({ test_name: "", test_date: new Date().toISOString().slice(0, 10), notes: "", fields: [{ key: "", value: "" }] });
      reload();
    } catch(err: any) {
      toast.error(err.message);
    }
  };
  const deleteLab = async (labId: any) => {
    try {
      await fetch(`http://127.0.0.1:8000/patients/lab-tests/${labId}`, { method: "DELETE" });
      toast.success(t("deleted"));
      reload();
    } catch(err) { console.error(err); }
  };
  return (
    <div className="space-y-4">
      <div className="rounded-3xl glass p-5 shadow-card">
        <h3 className="font-bold mb-3">{t("addLabTest")}</h3>
        <div className="grid md:grid-cols-2 gap-3 mb-3">
          <input value={form.test_name} onChange={(e) => setForm({ ...form, test_name: e.target.value })} placeholder={t("testName")}
            className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm" />
          <input type="date" value={form.test_date} onChange={(e) => setForm({ ...form, test_date: e.target.value })}
            className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm" />
        </div>
        {form.fields.map((f, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 mb-2">
            <input value={f.key} onChange={(e) => { const fs = [...form.fields]; fs[i].key = e.target.value; setForm({ ...form, fields: fs }); }}
              placeholder={lang === "ar" ? "اسم القيمة" : "Key"} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" />
            <input value={f.value} onChange={(e) => { const fs = [...form.fields]; fs[i].value = e.target.value; setForm({ ...form, fields: fs }); }}
              placeholder={lang === "ar" ? "القيمة" : "Value"} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" />
          </div>
        ))}
        <button onClick={() => setForm({ ...form, fields: [...form.fields, { key: "", value: "" }] })}
          className="text-xs text-primary font-medium">+ {lang === "ar" ? "أضف قيمة" : "Add field"}</button>
        <div className="mt-3">
          <button onClick={add} className="inline-flex items-center gap-2 rounded-full gradient-warm px-5 py-2 text-sm font-semibold text-white shadow-glow">
            <Plus className="h-4 w-4" /> {t("add")}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {Array.from(new Set(labs.map((l: any) => getStartOfWeek(l.test_date || l.created_at)))).sort().reverse().map((week: any) => {
          const weekLabs = labs.filter((l: any) => getStartOfWeek(l.test_date || l.created_at) === week);
          return (
            <div key={week} className="space-y-3">
              <div className="text-xs font-bold text-muted-foreground uppercase bg-muted/30 px-3 py-1 rounded-md inline-block">
                {week === "0000-00-00" 
                  ? (lang === "ar" ? "سجلات قديمة" : "Older Records")
                  : (lang === "ar" ? `أسبوع ${week}` : `Week of ${week}`)}
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {weekLabs.map((lab: any) => {
                  const lDateStr = lab.test_date || (lab.created_at ? lab.created_at.split('T')[0] : "2000-01-01");
                  const today = new Date().toISOString().split('T')[0];
                  const isNew = lDateStr >= today;
                  const displayDate = lab.test_date
                    ? new Date(lab.test_date).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" })
                    : lab.created_at
                      ? new Date(lab.created_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" })
                      : "—";
                  return (
                    <div key={lab.id}
                      style={{ border: isNew ? `4px solid #22c55e` : `2px solid #ef4444` }}
                      className="rounded-2xl glass p-4 shadow-card shadow-glow flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                        style={{ backgroundColor: isNew ? "#f0fdf4" : "#fef2f2" }}>
                        <FlaskConical className="h-5 w-5" style={{ color: isNew ? "#16a34a" : "#dc2626" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm leading-tight">{lab.test_name}</div>
                        <div
                          className="text-xs font-semibold mt-1 px-2 py-0.5 rounded-full inline-block"
                          style={{
                            color: isNew ? "#15803d" : "#b91c1c",
                            backgroundColor: isNew ? "#dcfce7" : "#fee2e2",
                          }}>
                          {displayDate}
                        </div>
                      </div>
                      <button onClick={() => deleteLab(lab.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-full flex-shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {labs.length === 0 && <div className="text-sm text-muted-foreground">{t("noData")}</div>}
      </div>
    </div>
  );
}



function PredictionTab({ id, labs, glucose }: any) {
  const { t, lang } = useI18n();
  const { user, role } = useAuth();
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [chatSummary, setChatSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);

  const fetchPrediction = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/predictions/patient/${id}`, {
        headers: {
          'X-User-ID': user?.id?.toString() || '',
          'X-User-Role': role || ''
        }
      });
      if (res.ok) {
        setPrediction(await res.json());
      } else {
        const err = await res.json();
        toast.error(err.detail || "Prediction failed");
      }
    } catch (e) {
      toast.error("Failed to connect to prediction service");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/chat/analytics/${id}`, {
        headers: {
          'X-User-ID': user?.id?.toString() || '',
          'X-User-Role': role || ''
        }
      });
      const data = await res.json();
      setAnalytics(data.analytics || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchChatSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/chat/summary/${id}`, {
        headers: {
          'X-User-ID': user?.id?.toString() || '',
          'X-User-Role': role || ''
        }
      });
      const data = await res.json();
      setChatSummary(data.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchPrediction();
    fetchAnalytics();
    // fetchChatSummary(); // Removed as requested
  }, [id]);

  const averages = useMemo(() => {
    if (analytics.length === 0) return [];
    const sum = analytics.reduce((acc, curr) => ({
      pain: acc.pain + (curr.pain_level || 0),
      mood: acc.mood + (curr.mood_score || 0),
      activity: acc.activity + (curr.activity_level || 0)
    }), { pain: 0, mood: 0, activity: 0 });
    const n = analytics.length;
    return [
      { subject: lang === "ar" ? "الألم" : "Pain", A: sum.pain / n, fullMark: 10 },
      { subject: lang === "ar" ? "المزاج" : "Mood", A: sum.mood / n, fullMark: 10 },
      { subject: lang === "ar" ? "النشاط" : "Activity", A: sum.activity / n, fullMark: 10 },
    ];
  }, [analytics, lang]);

  const recentSymptoms = useMemo(() => {
    const all = analytics
      .map(a => a.symptoms)
      .filter(s => s && s !== "None")
      .join(", ")
      .split(", ")
      .filter((v, i, a) => a.indexOf(v) === i);
    return all.slice(0, 10);
  }, [analytics]);

  const compositeDataLastWeek = useMemo(() => {
    if (!prediction?.composite_report_last_week && !prediction?.composite_report) return [];
    const data = prediction.composite_report_last_week || prediction.composite_report;
    return data.map((r: any) => ({
      name: r.disease,
      value: r.percentage
    })).sort((a: any, b: any) => b.value - a.value);
  }, [prediction]);

  const compositeDataLastMonth = useMemo(() => {
    if (!prediction?.composite_report_last_month) return [];
    return prediction.composite_report_last_month.map((r: any) => ({
      name: r.disease,
      value: r.percentage
    })).sort((a: any, b: any) => b.value - a.value);
  }, [prediction]);

  const COLORS = ["#0ea5e9", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl glass p-6 shadow-card">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-bold text-xl">{lang === "ar" ? "تحليل التشخيص المتكامل (AI)" : "Integrated Diagnosis Analysis (AI)"}</h3>
            <p className="text-xs text-muted-foreground">
              {lang === "ar" ? "تحليل شامل يربط بين الفحوصات المخبرية، الأدوية، وتاريخ الدردشة." : "Comprehensive analysis linking lab tests, medications, and chat history."}
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => { fetchPrediction(); fetchAnalytics(); fetchChatSummary(); }} 
              disabled={loading || analyticsLoading || summaryLoading}
              className="p-3 rounded-full hover:bg-primary/10 transition-colors bg-primary/5"
            >
              <TrendingUp className={`h-5 w-5 ${(loading || analyticsLoading || summaryLoading) ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {prediction ? (
          <div className="space-y-8">
            {/* AI Patient Insights Section (Replaces Summary) */}
            {analytics.length > 0 && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-3xl glass border border-border/40 shadow-soft bg-white/30">
                  <h4 className="font-bold text-sm mb-4 text-primary uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {lang === "ar" ? "متوسطات الحالة (آخر 7 أيام)" : "Avg Condition (Last 7 Days)"}
                  </h4>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={averages}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fontWeight: 600 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                        <Radar
                          name="Patient"
                          dataKey="A"
                          stroke="#ef4444"
                          fill="#ef4444"
                          fillOpacity={0.5}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="p-6 rounded-3xl glass border border-border/40 shadow-soft bg-white/30">
                  <h4 className="font-bold text-sm mb-4 text-primary uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    {lang === "ar" ? "الأعراض المذكورة مؤخراً" : "Recently Mentioned Symptoms"}
                  </h4>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {recentSymptoms.length > 0 ? recentSymptoms.map((s, i) => (
                      <span key={i} className="px-4 py-2 rounded-2xl bg-primary/10 text-primary border border-primary/20 text-sm font-bold">
                        {s}
                      </span>
                    )) : (
                      <div className="text-sm text-muted-foreground italic">
                        {lang === "ar" ? "لم يتم رصد أعراض محددة." : "No specific symptoms detected."}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-6 font-medium">
                    {lang === "ar" 
                      ? "* يتم استخراج هذه الأعراض آلياً من محادثات المريض."
                      : "* These symptoms are automatically extracted from patient chat logs."}
                  </p>
                </div>
              </div>
            )}

            {/* Disease Probability Charts (Kept as requested) */}
            <div className="p-6 rounded-3xl glass border border-border/40 shadow-soft bg-white/30">
              <h4 className="font-bold text-sm mb-6 text-primary uppercase tracking-widest flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {lang === "ar" ? "نسب احتمالية الأمراض (الأسبوع الماضي)" : "Disease Probability (Last Week)"}
              </h4>
              
              {compositeDataLastWeek.length > 0 ? (
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={compositeDataLastWeek} 
                      layout="vertical" 
                      margin={{ left: 100, right: 60, top: 0, bottom: 0 }}
                    >
                      <XAxis type="number" hide domain={[0, 100]} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={150} 
                        tick={{ fontSize: 12, fontWeight: 700 }}
                      />
                      <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(val: any) => [`${Number(val).toFixed(1)}%`, lang === "ar" ? "الاحتمالية" : "Probability"]}
                      />
                      <Bar 
                        dataKey="value" 
                        radius={[0, 10, 10, 0]} 
                        barSize={24}
                      >
                        <LabelList 
                          dataKey="value" 
                          position="right" 
                          formatter={(v: any) => `${Number(v).toFixed(1)}%`} 
                          style={{ fontSize: '11px', fontWeight: 'bold', fill: 'currentColor', opacity: 0.8 }} 
                        />
                        {compositeDataLastWeek.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground italic text-sm">
                  {lang === "ar" ? "لا توجد بيانات كافية للأسبوع الماضي." : "Not enough data for last week."}
                </div>
              )}
            </div>

            <div className="p-6 rounded-3xl glass border border-border/40 shadow-soft bg-white/30">
              <h4 className="font-bold text-sm mb-6 text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {lang === "ar" ? "نسب احتمالية الأمراض (الشهر الماضي)" : "Disease Probability (Last Month)"}
              </h4>
              
              {compositeDataLastMonth.length > 0 ? (
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={compositeDataLastMonth} 
                      layout="vertical" 
                      margin={{ left: 100, right: 60, top: 0, bottom: 0 }}
                    >
                      <XAxis type="number" hide domain={[0, 100]} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={150} 
                        tick={{ fontSize: 12, fontWeight: 700 }}
                      />
                      <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(val: any) => [`${Number(val).toFixed(1)}%`, lang === "ar" ? "الاحتمالية" : "Probability"]}
                      />
                      <Bar 
                        dataKey="value" 
                        radius={[0, 10, 10, 0]} 
                        barSize={24}
                      >
                        <LabelList 
                          dataKey="value" 
                          position="right" 
                          formatter={(v: any) => `${Number(v).toFixed(1)}%`} 
                          style={{ fontSize: '11px', fontWeight: 'bold', fill: 'currentColor', opacity: 0.8 }} 
                        />
                        {compositeDataLastMonth.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground italic text-sm">
                  {lang === "ar" ? "لا توجد بيانات كافية للشهر الماضي." : "Not enough data for last month."}
                </div>
              )}
            </div>

            {/* Chat Analytics Trends (Full width) */}
            {analytics.length > 0 && (
              <div className="p-6 rounded-3xl glass border border-border/40 shadow-soft bg-white/30 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 relative z-10">
                  <div>
                    <h4 className="font-black text-lg text-primary uppercase tracking-tighter flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <TrendingUp className="h-5 w-5 text-primary" />
                      </div>
                      {lang === "ar" ? "تتبع الحالة عبر الزمن (من المحادثات)" : "Condition Trends Over Time (From Chat)"}
                    </h4>
                  </div>
                </div>

                <div className="h-[300px] relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics} margin={{ top: 20, right: 30, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.9 0.015 265)" opacity={0.5} />
                      <XAxis 
                        dataKey="date" 
                        fontSize={10} 
                        fontWeight={700}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val: string) => val.split('-').slice(1).join('/')}
                      />
                      <YAxis domain={[0, 10]} fontSize={10} fontWeight={700} axisLine={false} tickLine={false} ticks={[0, 5, 10]} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)' }}
                      />
                      <Legend verticalAlign="bottom" iconType="circle" />
                      <Line 
                        type="monotone" 
                        dataKey="pain_level" 
                        name={lang === "ar" ? "مستوى الألم" : "Pain Level"} 
                        stroke="#ef4444" 
                        strokeWidth={4} 
                        dot={{ r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="mood_score" 
                        name={lang === "ar" ? "المزاج" : "Mood Score"} 
                        stroke="#0ea5e9" 
                        strokeWidth={4} 
                        dot={{ r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="activity_level" 
                        name={lang === "ar" ? "النشاط" : "Activity"} 
                        stroke="#10b981" 
                        strokeWidth={4} 
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Complications & Change Frequency Section */}
            {analytics.length > 0 && (
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-6">
                  {/* Stability Indicator */}
                  <div className={`p-6 rounded-3xl glass border shadow-soft flex flex-col items-center justify-center text-center ${
                    analytics.every(a => a.status_stable !== false) 
                      ? "border-green-500/20 bg-green-50/30" 
                      : "border-amber-500/20 bg-amber-50/30"
                  }`}>
                    <div className={`p-4 rounded-full mb-4 ${
                      analytics.every(a => a.status_stable !== false) ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
                    }`}>
                      {analytics.every(a => a.status_stable !== false) ? <TrendingUp className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
                    </div>
                    <h4 className="font-bold text-lg mb-1">
                      {analytics.every(a => a.status_stable !== false) 
                        ? (lang === "ar" ? "حالة مستقرة" : "Stable Status") 
                        : (lang === "ar" ? "تم رصد تغيرات" : "Changes Detected")}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {analytics.every(a => a.status_stable !== false)
                        ? (lang === "ar" ? "لم يبلغ المريض عن أي أعراض جديدة مفاجئة." : "The patient reported no sudden new symptoms.")
                        : (lang === "ar" ? "أبلغ المريض عن تغيرات في حالته الصحية مؤخراً." : "The patient reported health changes recently.")}
                    </p>
                  </div>

                  {/* Change Frequency Card */}
                  <div className="p-6 rounded-3xl glass border border-border/40 shadow-soft bg-white/30 text-center">
                    <div className="text-4xl font-black text-primary mb-2">
                      {analytics.reduce((acc, curr) => acc + (curr.changes_count || 0), 0)}
                    </div>
                    <h4 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">
                      {lang === "ar" ? "إجمالي التحديثات/التغيرات" : "Total Updates/Changes"}
                    </h4>
                    <p className="text-[10px] mt-2 opacity-60">
                      {lang === "ar" ? "منذ بداية محادثات هذا الأسبوع" : "Since the start of this week's chat"}
                    </p>
                  </div>
                </div>

                {/* Complications Timeline */}
                <div className="md:col-span-2 p-6 rounded-3xl glass border border-border/40 shadow-soft bg-white/30">
                  <h4 className="font-bold text-sm mb-6 text-primary uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    {lang === "ar" ? "سجل المضاعفات والتجددات" : "Complications & Updates Log"}
                  </h4>
                  
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                    {(() => {
                      const allComp = analytics.flatMap(day => 
                        (day.complications || []).map((c: any) => ({ ...c, date: day.date }))
                      ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                      if (allComp.length === 0) {
                        return (
                          <div className="py-12 text-center text-muted-foreground italic text-sm">
                            {lang === "ar" ? "لا توجد مضاعفات مسجلة في المحادثات." : "No complications recorded in chats."}
                          </div>
                        );
                      }

                      return allComp.map((comp, i) => (
                        <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white/50 border border-border/20 shadow-sm transition hover:shadow-md">
                          <div className="flex flex-col items-center justify-center min-w-[70px] border-r pr-4 border-border/40">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{comp.date.split('-').slice(1).join('/')}</span>
                            <span className="text-xs font-black text-primary">{comp.time || "--:--"}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-foreground">{comp.description}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                              <span className="text-[10px] font-medium text-destructive/80 uppercase">
                                {lang === "ar" ? "مضاعفات تم رصدها" : "Detected Complication"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="py-12 text-center text-muted-foreground">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            {lang === "ar" ? "جاري التحليل..." : "Analyzing labs..."}
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-20" />
            {lang === "ar" ? "لا توجد نتائج توقع حالياً." : "No prediction results available."}
          </div>
        )}
      </div>
    </div>
  );
}

function VizTab({ labs, glucose }: any) {
  const { t, lang } = useI18n();

  // ─── Individual glucose readings (last 3 months) ───
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  const recentGlucose = glucose
    .filter((g: any) => new Date(g.MeasuredAt || g.measured_at) >= threeMonthsAgo)
    .sort((a: any, b: any) => new Date(a.MeasuredAt || a.measured_at).getTime() - new Date(b.MeasuredAt || b.measured_at).getTime())
    .map((g: any) => {
      const d = new Date(g.MeasuredAt || g.measured_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: 'short', day: 'numeric' });
      const v = Number(g.Value || g.value);
      return { date: d, value: v, label: `${v} mg/dL\n${d}` };
    });

  // Build series from numeric lab values across dates
  const labKeys = new Set<string>();
  labs.forEach((l: any) => Object.entries(l.results ?? {}).forEach(([k, v]) => { if (!isNaN(Number(v))) labKeys.add(k); }));
  const labSeries = [...labs].reverse().map((l) => {
    const row: any = { date: l.test_date };
    labKeys.forEach((k) => { row[k] = Number(l.results?.[k] ?? 0); });
    return row;
  });
  const firstKey = [...labKeys][0];

  return (
    <div className="space-y-8">

      {/* ─── Recent trend (last 3 months Area Chart) ─── */}
      <div className="rounded-3xl glass p-8 shadow-card overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="mb-6">
            <h3 className="font-bold text-xl text-primary mb-1">
              {lang === "ar" ? "📈 قياسات السكر (آخر 3 أشهر)" : "📈 Glucose Trend (Last 3 Months)"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {lang === "ar" ? "تتبع مستويات السكر في الدم خلال الـ 90 يوماً الماضية" : "Tracking blood glucose levels over the past 90 days"}
            </p>
          </div>

          {recentGlucose.length > 1 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={recentGlucose} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
                  <defs>
                    <linearGradient id="colorGlucose" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.9 0.015 265)" />
                  <XAxis 
                    dataKey="date" 
                    fontSize={12} 
                    fontWeight={600} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'currentColor', opacity: 0.7 }}
                    dy={10}
                  />
                  <YAxis 
                    fontSize={12} 
                    fontWeight={600} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'currentColor', opacity: 0.7 }}
                    domain={['auto', 'auto']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#0ea5e9" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorGlucose)" 
                    activeDot={{ r: 8, strokeWidth: 0, fill: "#0284c7" }}
                  >
                    <LabelList 
                      dataKey="label" 
                      position="top" 
                      offset={15} 
                      style={{ fontSize: '10px', fontWeight: 'bold', fill: '#0ea5e9', whiteSpace: 'pre-wrap' }} 
                    />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-muted">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">{lang === "ar" ? "لا توجد قياسات كافية في آخر 3 أشهر" : "Not enough readings in the last 3 months"}</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Glucose readings table ─── */}
      {glucose.length > 0 && (
        <div className="rounded-3xl glass p-6 shadow-card">
          <h3 className="font-bold mb-4">{lang === "ar" ? "📋 سجل قياسات السكر" : "📋 Glucose Readings Log"}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/40 uppercase">
                <tr>
                  <th className="px-4 py-3 rounded-tl-xl">{lang === "ar" ? "التاريخ والوقت" : "Date & Time"}</th>
                  <th className="px-4 py-3">{lang === "ar" ? "النوع" : "Type"}</th>
                  <th className="px-4 py-3">{lang === "ar" ? "القيمة (mg/dL)" : "Value (mg/dL)"}</th>
                  <th className="px-4 py-3 rounded-tr-xl">{lang === "ar" ? "ملاحظات" : "Notes"}</th>
                </tr>
              </thead>
              <tbody>
                {glucose.sort((a: any, b: any) => new Date(b.MeasuredAt || b.measured_at).getTime() - new Date(a.MeasuredAt || a.measured_at).getTime()).map((g: any, i: number) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{new Date(g.MeasuredAt || g.measured_at).toLocaleString(lang === "ar" ? "ar-EG" : "en")}</td>
                    <td className="px-4 py-3">
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-semibold">
                        {g.ReadingType || g.reading_type || (lang === "ar" ? "غير محدد" : "Unspecified")}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-base">{g.Value || g.value}</td>
                    <td className="px-4 py-3 text-muted-foreground">{g.Notes || g.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {firstKey && labSeries.length > 0 && (
        <div className="rounded-3xl glass p-6 shadow-card">
          <h3 className="font-bold mb-4">{lang === "ar" ? "🧪 قيم التحاليل عبر الزمن" : "🧪 Lab values over time"}</h3>
          <div className="h-64">
            <ResponsiveContainer><BarChart data={labSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.015 265)" />
              <XAxis dataKey="date" fontSize={12} /><YAxis fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 12 }} />
              {[...labKeys].slice(0, 4).map((k, i) => (
                <Bar key={k} dataKey={k} fill={["oklch(0.58 0.16 195)","oklch(0.62 0.22 295)","oklch(0.72 0.18 25)","oklch(0.7 0.16 155)"][i]} radius={[8, 8, 0, 0]} />
              ))}
            </BarChart></ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function ApptTab({ patientId, doctorId, reload }: any) {
  const { t } = useI18n();
  const [form, setForm] = useState({ appointment_date: new Date().toISOString().slice(0, 10), appointment_time: "10:00", reason: "" });
  const save = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/patients/${patientId}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: doctorId, ...form })
      });
      if (!res.ok) throw new Error("Failed to add appointment");
      toast.success(t("saved"));
      reload();
    } catch(err: any) {
      toast.error(err.message);
    }
  };
  return (
    <div className="rounded-3xl glass p-6 shadow-card">
      <h3 className="font-bold mb-3">{t("setAppointment")}</h3>
      <div className="grid md:grid-cols-2 gap-3">
        <input type="date" value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })}
          className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm" />
        <input type="time" value={form.appointment_time} onChange={(e) => setForm({ ...form, appointment_time: e.target.value })}
          className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm" />
        <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
          placeholder={t("reason")} rows={2} className="md:col-span-2 rounded-xl border border-input bg-background px-4 py-2.5 text-sm" />
      </div>
      <button onClick={save} className="mt-3 inline-flex items-center gap-2 rounded-full gradient-warm px-5 py-2 text-sm font-semibold text-white shadow-glow">
        <Calendar className="h-4 w-4" /> {t("save")}
      </button>
    </div>
  );
}


