import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Settings, Lock, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";

export const Route = createFileRoute("/patient/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useAuth();
  const { t, lang } = useI18n();
  const [newPassword, setNewPassword] = useState("");
  const [confirming, setConfirming] = useState(false);

  const changePassword = async () => {
    if (newPassword.length < 6) { toast.error(lang === "ar" ? "6 أحرف على الأقل" : "At least 6 chars"); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message); else { toast.success(t("saved")); setNewPassword(""); }
  };

  const deleteAccount = async () => {
    if (!user) return;
    // Delete profile (cascades to all data via FKs)
    const { error } = await supabase.from("profiles").delete().eq("id", user.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("deleted"));
    await signOut();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title={t("settings")} icon={<Settings className="h-6 w-6" />} />

      <div className="rounded-3xl glass p-6 shadow-card mb-4">
        <h3 className="font-bold flex items-center gap-2 mb-3"><Lock className="h-4 w-4 text-primary" />{t("changePassword")}</h3>
        <div className="flex gap-2">
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t("newPassword")} className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm" />
          <button onClick={changePassword} className="rounded-full gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
            {t("save")}
          </button>
        </div>
      </div>

      <div className="rounded-3xl glass p-6 shadow-card border border-destructive/20">
        <h3 className="font-bold flex items-center gap-2 mb-3 text-destructive"><AlertTriangle className="h-4 w-4" />{t("deleteAccount")}</h3>
        <p className="text-sm text-muted-foreground mb-3">
          {lang === "ar" ? "سيتم حذف كل بياناتك نهائياً. لا يمكن التراجع." : "All your data will be permanently deleted. Cannot be undone."}
        </p>
        {!confirming ? (
          <button onClick={() => setConfirming(true)}
            className="inline-flex items-center gap-2 rounded-full bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground">
            <Trash2 className="h-4 w-4" /> {t("delete")}
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={deleteAccount} className="rounded-full bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground">
              {t("confirm")}
            </button>
            <button onClick={() => setConfirming(false)} className="rounded-full glass px-5 py-2.5 text-sm font-semibold">
              {t("cancel")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
