import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Search, UserPlus, Phone, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";

export const Route = createFileRoute("/doctor/")({
  component: DoctorHome,
});

interface PatientRow {
  patient_id: string;
  full_name: string | null;
  phone: string | null;
  blood_type: string | null;
}

function DoctorHome() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!user) return;
    try {
      const res = await fetch("http://127.0.0.1:8000/patients/");
      const data = await res.json();
      if (Array.isArray(data)) {
        setPatients(data.map((p: any) => ({
          patient_id: String(p.PatientID || p.id || p.NationalID),
          full_name: p.Name,
          phone: p.Phone,
          blood_type: p.BloodType,
        })));
      }
    } catch(err) {
      console.error(err);
    }
  };
  useEffect(() => { load(); }, [user]);

  const filtered = patients.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (p.full_name?.toLowerCase().includes(s)) || (p.phone?.includes(s)) || p.patient_id.includes(s);
  });

  return (
    <div>
      <PageHeader title={t("myPatients")} subtitle={lang === "ar" ? "كل المرضى تحت رعايتك" : "All patients under your care"}
        icon={<Users className="h-6 w-6" />} />

      <div className="rounded-3xl glass p-4 shadow-card mb-6">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} 
            placeholder={lang === "ar" ? "ابحث بالاسم أو رقم الموبايل..." : "Search by name or phone..."}
            className="w-full rounded-xl border border-input bg-background ps-11 pe-4 py-3 text-sm" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl glass p-12 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
          {t("noData")}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Link key={p.patient_id} to="/doctor/patient/$id" params={{ id: p.patient_id }}>
              <motion.div whileHover={{ y: -2 }} className="rounded-2xl glass p-5 shadow-card hover:shadow-glow transition cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary text-white font-bold">
                    {(p.full_name ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{p.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground truncate">{p.phone}</div>
                  </div>
                  {p.blood_type && (
                    <span className="rounded-full bg-destructive/10 text-destructive px-2.5 py-1 text-xs font-bold">{p.blood_type}</span>
                  )}
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
