import { createFileRoute, Outlet, redirect, Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ChatbotWidget } from "@/components/ChatbotWidget";
import { Users, Calendar, LogOut } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/doctor")({
  component: DoctorLayout,
});

function DoctorLayout() {
  const { user, role, loading, signOut } = useAuth();
  const { t } = useI18n();
  const location = useLocation();

  if (loading) return <div className="min-h-screen flex items-center justify-center">...</div>;
  if (!user) { throw redirect({ to: "/login" }); }
  if (role && role !== "doctor") { throw redirect({ to: "/patient" }); }

  const nav = [
    { to: "/doctor", label: t("myPatients"), icon: Users },
    { to: "/doctor/schedule", label: t("schedule"), icon: Calendar },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/doctor" className="flex items-center gap-2">
            <span className="font-bold">{t("appName")}</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button onClick={signOut} className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-medium hover:shadow-soft">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t("logout")}</span>
            </button>
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {nav.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
                  active ? "gradient-warm text-white shadow-glow" : "hover:bg-muted"
                }`}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <Outlet />
      </motion.main>

      <ChatbotWidget />
    </div>
  );
}
