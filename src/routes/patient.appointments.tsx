import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/patient/appointments")({
  component: AppointmentsPage,
});

interface Appt {
  id: string;
  appointment_date: string;
  appointment_time: string;
  reason: string | null;
  status: string;
}

function AppointmentsPage() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [appts, setAppts] = useState<Appt[]>([]);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!user) return;
    fetch(`http://127.0.0.1:8000/patients/${user.id}/appointments`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAppts(data.map((a: any) => ({
            id: String(a.AppointmentID),
            appointment_date: a.Date,
            appointment_time: a.Time,
            reason: a.Reason,
            status: a.Status || "scheduled"
          })));
        }
      })
      .catch(err => console.error(err));
  }, [user]);

  return (
    <div>
      <PageHeader
        title={t("appointments")}
        subtitle={lang === "ar" ? "مواعيدك القادمة مع طبيبك" : "Your upcoming visits"}
        icon={<Calendar className="h-6 w-6" />}
      />
      {appts.length === 0 ? (
        <div className="rounded-3xl glass p-12 text-center text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-40" />
          {t("noData")}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {appts.map((a) => {
            const isUpcoming = a.appointment_date >= today;
            return (
              <div
                key={a.id}
                className={`rounded-2xl glass p-5 shadow-card border-2 transition-all duration-300 ${
                  isUpcoming
                    ? "border-success/30 bg-success/5 shadow-soft"
                    : "border-destructive/30 bg-destructive/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-glow transition-all duration-300 ${
                    isUpcoming ? "bg-success" : "bg-destructive"
                  }`}>
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-bold">{a.appointment_date}</div>
                    <div className="text-sm text-muted-foreground">{a.appointment_time}</div>
                  </div>
                </div>
                {a.reason && <div className="text-sm mt-3">{a.reason}</div>}
                <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-medium ${
                  a.status === "completed" ? "bg-success/10 text-success" :
                  a.status === "cancelled" ? "bg-destructive/10 text-destructive" :
                  a.status === "scheduled" || a.status === "pending" || a.status === "new" ? "bg-success/10 text-success" :
                  "bg-primary/10 text-primary"
                }`}>{a.status}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
