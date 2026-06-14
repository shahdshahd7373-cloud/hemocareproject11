import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FlaskConical, CalendarDays } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";

export const Route = createFileRoute("/patient/labs")({
  component: LabsPage,
});

interface Lab {
  id: string;
  test_name: string;
  test_date: string;
  results?: Record<string, any>;
  notes: string | null;
  created_at: string | null;
}

function getStartOfWeek(dateStr: string | null) {
  if (!dateStr) return "0000-00-00";
  const d = new Date(dateStr);
  // If the date string doesn't have a time, it might be interpreted as UTC.
  // We want to work with the date as it appears.
  const day = d.getUTCDay();
  const offset = (day + 1) % 7; // Saturday as start of week
  const result = new Date(d);
  result.setUTCDate(d.getUTCDate() - offset);
  return result.toISOString().slice(0, 10);
}

function LabsPage() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    test_name: "", test_date: new Date().toISOString().slice(0, 10), notes: "",
    fields: [{ key: "", value: "" }],
  });

  const load = async () => {
    if (!user) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/patients/${user.id}/lab-tests`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setLabs(data.map((l: any) => ({
          id: String(l.id),
          test_name: l.test_name,
          test_date: l.test_date,
          results: l.results || {},
          notes: l.notes,
          created_at: l.created_at,
        })));
      }
    } catch(err) { console.error(err); }
  };
  useEffect(() => { load(); }, [user]);

  const add = async () => {
    if (!user || !form.test_name) return;
    const results: Record<string, string> = {};
    form.fields.forEach((f) => { if (f.key) results[f.key] = f.value; });
    try {
      const res = await fetch(`http://127.0.0.1:8000/patients/${user.id}/lab-tests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordered_by: 1, test_name: form.test_name, test_date: form.test_date, results, notes: form.notes })
      });
      if (!res.ok) throw new Error("Failed to add lab test");
      toast.success(t("saved"));
      setForm({ test_name: "", test_date: new Date().toISOString().slice(0, 10), notes: "", fields: [{ key: "", value: "" }] });
      setShowForm(false);
      load();
    } catch(err: any) { toast.error(err.message); }
  };



  return (
    <div>
      <PageHeader
        title={t("yourLabs")}
        subtitle={lang === "ar" ? "كل تحاليلك في مكان واحد" : "All your tests in one place"}
        icon={<FlaskConical className="h-6 w-6" />}
      />

      {labs.length === 0 ? (
        <div className="rounded-3xl glass p-12 text-center text-muted-foreground">
          <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-40" />
          {t("noData")}
        </div>
      ) : (
        <div className="space-y-12">
          {Array.from(new Set(labs.map((l: any) => getStartOfWeek(l.test_date || l.created_at)))).sort().reverse().map((week) => {
            const weekLabs = labs.filter((l: any) => getStartOfWeek(l.test_date || l.created_at) === week);
            return (
              <div key={week} className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent to-muted" />
                  <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-4 py-1 rounded-full border border-muted glass">
                    {week === "0000-00-00" 
                      ? (lang === "ar" ? "سجلات قديمة" : "Older Records")
                      : (lang === "ar" ? `أسبوع ${week}` : `Week of ${week}`)}
                  </span>
                  <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent to-muted" />
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {weekLabs.map((lab) => {
                    const lDateStr = lab.test_date || (lab.created_at ? lab.created_at.split('T')[0] : "2000-01-01");
                    const today = new Date().toISOString().split('T')[0];
                    const isNew = lDateStr >= today;
                    const displayDate = lab.test_date
                      ? new Date(lab.test_date).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" })
                      : lab.created_at
                        ? new Date(lab.created_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" })
                        : "—";
                    return (
                      <motion.div key={lab.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        style={{ border: isNew ? `4px solid #22c55e` : `2px solid #ef4444` }}
                        className="rounded-2xl glass p-5 shadow-card shadow-glow">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                            style={{ backgroundColor: isNew ? "#f0fdf4" : "#fef2f2" }}>
                            <FlaskConical className="h-5 w-5" style={{ color: isNew ? "#16a34a" : "#dc2626" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-base leading-tight">{lab.test_name}</div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <CalendarDays className="h-3.5 w-3.5" style={{ color: isNew ? "#16a34a" : "#dc2626" }} />
                              <span
                                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                style={{
                                  color: isNew ? "#15803d" : "#b91c1c",
                                  backgroundColor: isNew ? "#dcfce7" : "#fee2e2",
                                }}>
                                {displayDate}
                              </span>
                              {isNew && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300">
                                  {lang === "ar" ? "جديد" : "New"}
                                </span>
                              )}
                            </div>
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
      )}
    </div>
  );
}
