import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart, Save, User, Calendar, Droplet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/patient/")({
  component: PatientHome,
});

interface Profile {
  full_name: string | null;
  phone: string | null;
  date_of_birth: string | null;
  blood_type: string | null;
  gender: string | null;
  notes: string | null;
  has_diabetes: number;
}

function PatientHome() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [profile, setProfile] = useState<Profile>({
    full_name: "", phone: "", date_of_birth: "", blood_type: "", gender: "", notes: "", has_diabetes: 0,
  });
  const [stats, setStats] = useState({ meds: 0, labs: 0, glucose: 0, appts: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Set profile from user session directly if available
    setProfile({
      full_name: user.Name || user.name || "",
      phone: user.Phone || user.phone || "",
      date_of_birth: user.DateOfBirth || "",
      blood_type: user.BloodType || user.blood_type || "",
      gender: user.Gender || "",
      notes: user.Notes || "",
      has_diabetes: user.HasDiabetes || 0,
    });

    // Fetch patient data from FastAPI
    fetch(`http://127.0.0.1:8000/patients/${user.id}`)
      .then(res => res.json())
      .then(data => {
        if (!data.detail) {
          setStats({ 
            meds: data.medication_count || 0, 
            labs: data.lab_test_count || 0, 
            glucose: data.glucose_count || 0, 
            appts: data.appointment_count || 0 
          });
          // Also merge profile data if needed
          setProfile(prev => ({
             ...prev,
             full_name: data.Name || prev.full_name,
             phone: data.Phone || prev.phone,
             blood_type: data.BloodType || prev.blood_type,
             gender: data.Gender || prev.gender,
             date_of_birth: data.DateOfBirth || prev.date_of_birth,
             has_diabetes: data.HasDiabetes ?? prev.has_diabetes,
             notes: data.Notes || prev.notes,
          }));
        }
      })
      .catch(err => console.error("Error fetching patient data:", err));

  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/patients/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Name: profile.full_name,
          Phone: profile.phone,
          DateOfBirth: profile.date_of_birth,
          BloodType: profile.blood_type,
          Gender: profile.gender,
          HasDiabetes: profile.has_diabetes,
          Notes: profile.notes
        })
      });
      if (!res.ok) throw new Error("Failed to update profile");
      toast.success(t("saved"));
    } catch(err: any) {
       toast.error(err.message);
    } finally {
       setSaving(false);
    }
  };

  const cards = [
    { label: t("medications"), value: stats.meds, color: "gradient-warm", icon: Heart },
    { label: t("labTests"), value: stats.labs, color: "gradient-primary", icon: Droplet },
    { label: t("glucose"), value: stats.glucose, color: "gradient-cool", icon: Calendar },
    { label: t("appointments"), value: stats.appts, color: "gradient-hero", icon: User },
  ];

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl gradient-hero p-8 text-white shadow-glow relative overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <h1 className="text-3xl font-bold">
          {t("welcome")} {profile.full_name ? `، ${profile.full_name}` : ""} 👋
        </h1>
        <p className="mt-2 opacity-90">
          {lang === "ar" ? "نتمنى لك يوماً صحياً سعيداً" : "Wishing you a healthy day"}
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl glass p-5 shadow-card">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.color} text-white mb-3`}>
              <c.icon className="h-5 w-5" />
            </div>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-sm text-muted-foreground">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl glass p-6 shadow-card">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          {t("addInfo")}
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label={t("fullName")} value={profile.full_name ?? ""} onChange={(v) => setProfile({ ...profile, full_name: v })} />
          <Field label={t("phone")} value={profile.phone ?? ""} onChange={(v) => setProfile({ ...profile, phone: v })} />
          <Field label={t("age")} type="date" value={profile.date_of_birth ?? ""} onChange={(v) => setProfile({ ...profile, date_of_birth: v })} />
          <Select label={t("bloodType")} value={profile.blood_type ?? ""} onChange={(v) => setProfile({ ...profile, blood_type: v })}
            options={["A+","A-","B+","B-","AB+","AB-","O+","O-"]} />
          <Select label={t("gender")} value={profile.gender ?? ""} onChange={(v) => setProfile({ ...profile, gender: v })}
            options={[{label: t("male"), value: "male"}, {label: t("female"), value: "female"}]} />
          <Select 
            label={lang === "ar" ? "هل تعاني من مرض السكر؟" : "Do you have diabetes?"} 
            value={profile.has_diabetes.toString()} 
            onChange={(v) => setProfile({ ...profile, has_diabetes: parseInt(v) })}
            options={[{label: lang === "ar" ? "نعم" : "Yes", value: "1"}, {label: lang === "ar" ? "لا" : "No", value: "0"}]} 
          />
          <div className="md:col-span-2">
            <label className="text-sm font-medium mb-1.5 block">{t("notes")}</label>
            <textarea
              value={profile.notes ?? ""}
              onChange={(e) => setProfile({ ...profile, notes: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-ring outline-none"
            />
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="mt-4 inline-flex items-center gap-2 rounded-full gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "..." : t("saveProfile")}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-ring outline-none"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: (string | {label:string;value:string})[] }) {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-ring outline-none"
      >
        <option value="">--</option>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </div>
  );
}
