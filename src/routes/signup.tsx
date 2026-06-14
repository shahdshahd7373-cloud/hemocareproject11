import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, Lock, User as UserIcon, Stethoscope, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const { t, lang } = useI18n();
  const { user, role, login } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<"patient" | "doctor">("patient");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && role) navigate({ to: role === "doctor" ? "/doctor" : "/patient" });
  }, [user, role, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = selectedRole === "patient" ? "/auth/register/patient" : "/auth/register/doctor";
      let payload: any = {
        Name: fullName,
        Phone: phone,
        Password: password
      };

      if (selectedRole === "patient") {
         payload.NationalID = "000" + Math.floor(Math.random() * 100000);
         payload.Age = 30;
         payload.BloodType = "A+";
         payload.DiseaseType = "None";
      } else {
         payload.Username = phone;
         payload.Specialization = "General";
         payload.Email = phone + "@hayat.app";
      }

      const res = await fetch(`http://127.0.0.1:8000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || "Signup failed");
      } else {
        toast.success(t("welcomeNew"));
        const loginRes = await fetch("http://127.0.0.1:8000/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, password })
        });
        const loginData = await loginRes.json();
        if (loginRes.ok && !loginData.error) {
           login(loginData);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full gradient-primary opacity-20 blur-3xl" />
      <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full gradient-warm opacity-20 blur-3xl" />

      <div className="absolute top-6 end-6"><LanguageToggle /></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-3xl glass p-8 shadow-glow">
          <div className="flex flex-col items-center mb-6">
            <div className="inline-flex items-center gap-2">
              <h1 className="text-3xl font-extrabold gradient-hero bg-clip-text text-transparent tracking-tight">Hemocare</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{t("signupSubtitle")}</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("iAm")}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole("patient")}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition ${
                    selectedRole === "patient"
                      ? "gradient-primary text-primary-foreground shadow-glow"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  <UserRound className="h-4 w-4" />
                  {t("patient")}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole("doctor")}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition ${
                    selectedRole === "doctor"
                      ? "gradient-warm text-white shadow-glow"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  <Stethoscope className="h-4 w-4" />
                  {t("doctor")}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("fullName")}</label>
              <div className="relative">
                <UserIcon className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background ps-10 pe-4 py-3 text-sm focus:ring-2 focus:ring-ring outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("phone")}</label>
              <div className="relative">
                <Phone className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background ps-10 pe-4 py-3 text-sm focus:ring-2 focus:ring-ring outline-none"
                  placeholder="01xxxxxxxxx"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("password")}</label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background ps-10 pe-4 py-3 text-sm focus:ring-2 focus:ring-ring outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "..." : t("signup")}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t("haveAccount")}{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              {t("login")}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
