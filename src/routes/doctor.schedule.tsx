import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/doctor/schedule")({
  component: SchedulePage,
});

interface ApptRow {
  id: string;
  appointment_date: string;
  appointment_time: string;
  reason: string | null;
  status: string;
  patient_id: string;
  patient_name?: string;
}

function SchedulePage() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [appts, setAppts] = useState<ApptRow[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/doctors/${user.id}/appointments`);
        if (!res.ok) return;
        const data = await res.json();
        
        const rows = (data ?? []) as ApptRow[];
        const ids = Array.from(new Set(rows.map((r) => r.patient_id)));
        if (ids.length) {
          // Fetch names for patients
          const map = new Map<string, string>();
          for (const pid of ids) {
             const pRes = await fetch(`http://127.0.0.1:8000/patients/${pid}`);
             if (pRes.ok) {
                const pData = await pRes.json();
                map.set(pid, pData.Name || pData.full_name || "Unknown");
             }
          }
          rows.forEach((r) => { r.patient_name = map.get(r.patient_id) ?? "—"; });
        }
        
        setAppts(rows);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [user]);

  const today = new Date().toISOString().slice(0, 10);
  const groups = appts.reduce((acc, a) => {
    const key = a.appointment_date === today ? "today" : a.appointment_date < today ? "past" : "upcoming";
    (acc[key] ||= []).push(a); return acc;
  }, {} as Record<string, ApptRow[]>);

  return (
    <div>
      <PageHeader title={t("schedule")} subtitle={lang === "ar" ? "كل مواعيد عيادتك" : "All your clinic appointments"}
        icon={<Calendar className="h-6 w-6" />} />

      {appts.length === 0 ? (
        <div className="rounded-3xl glass p-12 text-center text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-40" />
          {t("noData")}
        </div>
      ) : (
        <div className="space-y-6">
          {(["today", "upcoming", "past"] as const).map((k) => (
            groups[k]?.length ? (
              <div key={k}>
                <h3 className="font-bold text-lg mb-3">
                  {k === "today" ? t("today") : k === "upcoming" ? (lang === "ar" ? "القادمة" : "Upcoming") : (lang === "ar" ? "السابقة" : "Past")}
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {groups[k].map((a) => (
                    <div key={a.id} className="rounded-2xl glass p-4 shadow-card flex items-center gap-3">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-glow ${
                        k === "today" ? "gradient-warm" : k === "upcoming" ? "gradient-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        <Calendar className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold">{a.patient_name}</div>
                        <div className="text-sm text-muted-foreground">{a.appointment_date} · {a.appointment_time}</div>
                        {a.reason && <div className="text-xs mt-1">{a.reason}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          ))}
        </div>
      )}
    </div>
  );
}
