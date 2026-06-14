import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { t } = useI18n();
  const { user, role, login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && role) navigate({ to: role === "doctor" ? "/doctor" : "/patient" });
  }, [user, role, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || "Login failed");
      } else {
        login(data);
        toast.success(t("welcomeBack"));
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
            <p className="text-sm text-muted-foreground mt-2">{t("loginSubtitle")}</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
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
              {loading ? "..." : t("login")}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t("noAccount")}{" "}
            <Link to="/signup" className="font-semibold text-primary hover:underline">
              {t("signup")}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
