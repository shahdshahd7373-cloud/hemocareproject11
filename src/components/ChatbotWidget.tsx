import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Sparkles, TrendingUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useLocation } from "@tanstack/react-router";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";

type Msg = { role: "user" | "assistant"; content: string };

export function ChatbotWidget() {
  const { t, lang, dir } = useI18n();
  const { user, role } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Determine if we are viewing a specific patient (for doctors)
  const patientIdMatch = location.pathname.match(/\/doctor\/patient\/(\d+)/);
  const viewingPatientId = patientIdMatch ? patientIdMatch[1] : null;

  useEffect(() => {
    if (open && role === "patient" && user?.id) {
      fetchHistory();
    } else if (open && role === "doctor" && viewingPatientId) {
      fetchSummary();
    }
  }, [open, role, user?.id, viewingPatientId]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/chat/history/${user?.id}`, {
        headers: {
          'X-User-ID': user?.id?.toString() || '',
          'X-User-Role': role || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.map((m: any) => ({
          role: m.sender === "patient" ? "user" : "assistant",
          content: m.message
        })));
      }
    } catch (e) { console.error("Chatbot Fetch History Error:", e); }
  };

  const fetchSummary = async () => {
    setLoading(true);
    setSummary(null);
    try {
      const headers = {
        'X-User-ID': user?.id?.toString() || '',
        'X-User-Role': role || ''
      };
      
      const [resSummary, resAnalytics] = await Promise.all([
        fetch(`http://127.0.0.1:8000/chat/summary/${viewingPatientId}`, { headers }),
        fetch(`http://127.0.0.1:8000/chat/analytics/${viewingPatientId}`, { headers })
      ]);
      
      if (resSummary.ok) {
        const data = await resSummary.json();
        setSummary(data.summary || "");
      } else {
        const errData = await resSummary.json().catch(() => ({}));
        setSummary(`Error: ${resSummary.status} - ${errData.detail || "Failed to fetch summary"}`);
      }
      
      if (resAnalytics.ok) {
        const data = await resAnalytics.json();
        setAnalytics(data.analytics || []);
      }
    } catch (e: any) { 
      console.error("Chatbot Fetch Summary Error:", e);
      setSummary(`Connection Error: ${e.message}`);
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);

    try {
      const resp = await fetch("http://127.0.0.1:8000/chat/send", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'X-User-ID': user?.id?.toString() || '',
          'X-User-Role': role || ''
        },
        body: JSON.stringify({ patient_id: user?.id, message: text }),
      });

      if (resp.ok) {
        const data = await resp.json();
        setMessages((p) => [...p, { role: "assistant", content: data.reply }]);
      } else {
        setMessages((p) => [...p, { role: "assistant", content: lang === "ar" ? "حدث خطأ في الاتصال" : "Connection error" }]);
      }
    } catch (e) {
      setMessages((p) => [...p, { role: "assistant", content: lang === "ar" ? "حدث خطأ في الاتصال" : "Connection error" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 end-6 z-50 flex h-14 w-14 items-center justify-center rounded-full gradient-primary text-white shadow-glow"
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            dir={dir}
            className="fixed bottom-24 end-6 z-50 w-[92vw] max-w-md h-[70vh] rounded-3xl glass shadow-glow overflow-hidden flex flex-col"
          >
            <div className="gradient-primary p-4 flex flex-col gap-2 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  <span className="font-semibold">{t("chatbot")}</span>
                </div>
                <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-white/20">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <button 
                onClick={async () => {
                  try {
                    const res = await fetch("http://127.0.0.1:8000/");
                    const data = await res.json();
                    alert(`Connection Success: ${JSON.stringify(data)}`);
                  } catch (e: any) {
                    alert(`Connection Failed: ${e.message}. Try opening http://127.0.0.1:8000/ in a new tab.`);
                  }
                }}
                className="text-[9px] bg-white/20 hover:bg-white/30 px-2 py-1 rounded-full w-fit transition-colors"
              >
                Test Connection
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {role === "doctor" ? (
                <div className="space-y-4">
                   <div className="rounded-2xl gradient-warm p-4 text-white text-sm shadow-soft">
                      {lang === "ar" ? "ملخص الحالة الصحية للمريض (ذكاء اصطناعي)" : "Patient Health Summary (AI)"}
                   </div>
                   {loading ? (
                      <div className="animate-pulse space-y-2 p-2">
                        <div className="h-3 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                        <div className="h-3 bg-muted rounded w-5/6"></div>
                      </div>
                   ) : (
                      <div className="space-y-4">
                        <div className="prose prose-sm max-w-none dark:prose-invert bg-white/50 dark:bg-black/20 p-4 rounded-2xl">
                          <ReactMarkdown>{summary || (lang === "ar" ? "لا توجد بيانات كافية لعمل ملخص." : "Not enough data for summary.")}</ReactMarkdown>
                        </div>
                        {analytics.length > 0 && (
                          <div className="space-y-6">
                            {/* Main Trends Chart */}
                            {/* Main Trends Chart */}
                            <div className="bg-white/50 dark:bg-black/20 p-4 rounded-2xl border border-white/20">
                              <h4 className="font-bold text-[10px] mb-2 text-primary uppercase tracking-widest flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                {lang === "ar" ? "اتجاهات الألم والمزاج (مقياس 0-10)" : "Pain & Mood Trends (Scale 0-10)"}
                              </h4>
                              <p className="text-[9px] text-muted-foreground mb-4 leading-tight">
                                {lang === "ar" 
                                  ? "الخط الأحمر يمثل مستوى الألم (الأعلى يعني ألم أكثر)، والخط الأزرق يمثل الحالة المزاجية."
                                  : "Red line represents pain level (higher is more pain), blue line represents emotional mood."}
                              </p>
                              <div className="h-[180px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={analytics} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.015 265)" vertical={false} />
                                    <XAxis dataKey="date" fontSize={9} tickFormatter={(val) => val.split("-").slice(2).join("/")} />
                                    <YAxis domain={[0, 10]} fontSize={9} ticks={[0, 5, 10]} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Line type="monotone" dataKey="pain_level" name={lang === "ar" ? "الألم" : "Pain"} stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="mood_score" name={lang === "ar" ? "المزاج" : "Mood"} stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            {/* Secondary Visualizations */}
                            <div className="grid grid-cols-2 gap-3">
                              {/* Mood Pie Chart */}
                              <div className="bg-white/50 dark:bg-black/20 p-3 rounded-2xl border border-white/20 flex flex-col items-center">
                                <h4 className="font-bold text-[8px] mb-2 text-muted-foreground uppercase">{lang === "ar" ? "توزيع المزاج" : "Mood Dist."}</h4>
                                <div className="h-[80px] w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie
                                        data={[
                                          { name: 'Pos', value: analytics.filter(a => a.mood_score > 6).length },
                                          { name: 'Neu', value: analytics.filter(a => a.mood_score >= 4 && a.mood_score <= 6).length },
                                          { name: 'Neg', value: analytics.filter(a => a.mood_score < 4).length },
                                        ]}
                                        innerRadius={15}
                                        outerRadius={30}
                                        paddingAngle={2}
                                        dataKey="value"
                                      >
                                        <Cell fill="#0ea5e9" />
                                        <Cell fill="#f59e0b" />
                                        <Cell fill="#ef4444" />
                                      </Pie>
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>
                                <div className="mt-2 space-y-1 w-full">
                                  <div className="flex justify-between text-[8px] font-bold">
                                    <span className="text-sky-500">{lang === "ar" ? "إيجابي" : "Pos"}</span>
                                    <span>{Math.round((analytics.filter(a => a.mood_score > 6).length / analytics.length) * 100)}%</span>
                                  </div>
                                  <div className="flex justify-between text-[8px] font-bold">
                                    <span className="text-amber-500">{lang === "ar" ? "متعادل" : "Neu"}</span>
                                    <span>{Math.round((analytics.filter(a => a.mood_score >= 4 && a.mood_score <= 6).length / analytics.length) * 100)}%</span>
                                  </div>
                                  <div className="flex justify-between text-[8px] font-bold">
                                    <span className="text-red-500">{lang === "ar" ? "سلبي" : "Neg"}</span>
                                    <span>{Math.round((analytics.filter(a => a.mood_score < 4).length / analytics.length) * 100)}%</span>
                                  </div>
                                </div>
                              </div>

                              {/* Activity Bar Chart */}
                              <div className="bg-white/50 dark:bg-black/20 p-3 rounded-2xl border border-white/20">
                                <h4 className="font-bold text-[8px] mb-1 text-muted-foreground uppercase text-center">{lang === "ar" ? "مستوى النشاط" : "Activity"}</h4>
                                <p className="text-[7px] text-center text-muted-foreground/60 mb-2">{lang === "ar" ? "مقياس 0-10 للطاقة" : "0-10 energy scale"}</p>
                                <div className="h-[80px] w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analytics}>
                                      <Bar dataKey="activity_level" fill="#10b981" radius={[3, 3, 0, 0]} />
                                      <XAxis dataKey="date" hide />
                                      <YAxis hide domain={[0, 10]} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                                <div className="mt-2 text-center">
                                  <span className="text-[10px] font-black text-emerald-600">
                                    {Math.round((analytics.reduce((acc, c) => acc + c.activity_level, 0) / analytics.length) * 10)}%
                                  </span>
                                  <span className="text-[7px] block font-bold text-muted-foreground">{lang === "ar" ? "متوسط النشاط" : "Avg Activity"}</span>
                                </div>
                              </div>
                            </div>

                            {/* Symptoms Tag Cloud */}
                            {analytics.some(a => a.symptoms && a.symptoms !== "None") && (
                              <div className="bg-white/50 dark:bg-black/20 p-4 rounded-2xl border border-white/20">
                                <h4 className="font-bold text-[10px] mb-3 text-muted-foreground uppercase tracking-widest">{lang === "ar" ? "الأعراض المذكورة" : "Reported Symptoms"}</h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {Array.from(new Set(analytics.flatMap(a => (a.symptoms || "").split(",").map((s: string) => s.trim())))).filter(s => s && s !== "None").map((sym: any, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full border border-primary/20">
                                      {sym}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                   )}
                </div>
              ) : (
                <>
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm mt-12">
                      {lang === "ar" ? "👋 اسألني أي سؤال طبي" : "👋 Ask me anything medical"}
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        m.role === "user" ? "gradient-primary text-primary-foreground" : "bg-muted text-foreground"
                      }`}>
                        {m.role === "assistant"
                          ? <div className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{m.content || "..."}</ReactMarkdown></div>
                          : m.content}
                      </div>
                    </div>
                  ))}
                  {loading && messages[messages.length - 1]?.role === "user" && (
                    <div className="flex justify-start"><div className="rounded-2xl bg-muted px-4 py-2.5 text-sm">...</div></div>
                  )}
                </>
              )}
            </div>

            {role === "patient" && (
              <div className="p-3 border-t border-border bg-background/50">
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder={t("askMe")}
                    className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm focus:ring-2 focus:ring-ring outline-none"
                  />
                  <button
                    onClick={send}
                    disabled={loading}
                    className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary text-white shadow-glow disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
