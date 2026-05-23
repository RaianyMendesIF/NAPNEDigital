import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, CalendarDays, FileText, AlertTriangle,
  BarChart2, Settings, Bell, ChevronDown, Search, Plus, Filter,
  Clock, Upload, CheckCircle, AlertCircle, X, ChevronRight,
  Eye, Download, User, LogOut, BookOpen, Home,
  Phone, Mail, Shield, Star, Activity, ChevronLeft,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
type Screen = "overview" | "students" | "record" | "log" | "meetings" | "occurrences" | "profile";

interface Student {
  id: string;
  name: string;
  registration: string;
  need: string;
  needColor: string;
  course: string;
  year: string;
  status: "Ativo" | "Acompanhamento" | "Inativo";
  alert?: boolean;
  teachers: string[];
}

interface MeetingEvent {
  id: number;
  studentName: string;
  date: string; // "YYYY-MM-DD"
  time: string;
  description: string;
  teachers: string[];
  type: string;
}

interface Occurrence {
  id: number;
  studentName: string;
  subject: string;
  title: string;
  description: string;
  date: string;
  author: string;
}

interface CareLog {
  id: number;
  studentName: string;
  date: string;
  time: string;
  type: string;
  staff: string;
  text: string;
}

// ── Data ───────────────────────────────────────────────────────────────────
const STUDENTS: Student[] = [
  { id: "1", name: "Lucas Henrique Moreira", registration: "2023001", need: "TEA", needColor: "blue", course: "Técnico em Informática", year: "2º Ano", status: "Ativo", alert: true, teachers: ["Profa. Camila Rocha", "Prof. Anderson Lima", "Profa. Juliana Castro"] },
  { id: "2", name: "Ana Clara Ferreira", registration: "2023045", need: "Deficiência Visual", needColor: "purple", course: "Técnico em Administração", year: "1º Ano", status: "Ativo", teachers: ["Prof. Carlos Mendes", "Profa. Renata Souza"] },
  { id: "3", name: "Matheus Souza Costa", registration: "2022088", need: "Altas Habilidades", needColor: "teal", course: "Técnico em Eletrotécnica", year: "3º Ano", status: "Acompanhamento", teachers: ["Prof. Roberto Alves", "Profa. Fernanda Costa"] },
  { id: "4", name: "Isabela Ramos Nunes", registration: "2023112", need: "TDAH", needColor: "amber", course: "Técnico em Química", year: "2º Ano", status: "Ativo", teachers: ["Profa. Camila Rocha", "Prof. Diego Faria"] },
  { id: "5", name: "Gabriel Pereira Lima", registration: "2021034", need: "Deficiência Auditiva", needColor: "indigo", course: "Técnico em Informática", year: "3º Ano", status: "Ativo", teachers: ["Prof. Anderson Lima", "Profa. Juliana Castro"] },
  { id: "6", name: "Vitória Almeida Santos", registration: "2023078", need: "Dislexia", needColor: "rose", course: "Técnico em Administração", year: "1º Ano", status: "Acompanhamento", teachers: ["Prof. Carlos Mendes", "Profa. Renata Souza"] },
];

const INITIAL_TIMELINE_EVENTS: CareLog[] = [
  { id: 1, studentName: "Lucas Henrique Moreira", date: "22 Mai 2026", time: "14:30", type: "Atendimento Individual", staff: "Profa. Camila Rocha", text: "Conversa sobre adaptações nas avaliações de Matemática. Aluno demonstrou progresso significativo na comunicação verbal. Revisados recursos de apoio disponíveis." },
  { id: 2, studentName: "Ana Clara Ferreira", date: "15 Mai 2026", time: "10:00", type: "Reunião com Pais", staff: "Coord. Rafael Mendes", text: "Reunião com a mãe, Sra. Patrícia Moreira. Discutidas estratégias de rotina em casa para reforçar os trabalhos realizados no campus." },
  { id: 3, studentName: "Lucas Henrique Moreira", date: "08 Mai 2026", time: "09:15", type: "Ocorrência Comportamental", staff: "Profa. Juliana Castro", text: "Aluno apresentou dificuldade de integração em atividade de grupo na aula de P.O.O. Equipe notificada. Plano de intervenção revisado." },
  { id: 4, studentName: "Matheus Souza Costa", date: "28 Abr 2026", time: "11:00", type: "Solicitação de Prorrogação", staff: "Coord. Rafael Mendes", text: "Prorrogação de 7 dias concedida para entrega do TCC semestral (Disciplina: Banco de Dados). Deferido conforme PEI vigente." },
  { id: 5, studentName: "Isabela Ramos Nunes", date: "10 Abr 2026", time: "15:45", type: "Atendimento Individual", staff: "Profa. Camila Rocha", text: "Sessão de acompanhamento pedagógico. Elaboração de mapa mental para organização dos conteúdos do semestre." },
];

const INITIAL_MEETINGS: MeetingEvent[] = [
  { id: 1, studentName: "Lucas Henrique Moreira", date: "2026-05-26", time: "14:00", description: "Revisão do PEI semestral com equipe docente.", teachers: ["Profa. Camila Rocha", "Coord. Rafael Mendes"], type: "Revisão de PEI" },
  { id: 2, studentName: "Ana Clara Ferreira", date: "2026-05-28", time: "09:30", description: "Discussão sobre adaptação nas provas de Contabilidade.", teachers: ["Prof. Carlos Mendes"], type: "Atendimento Pedagógico" },
  { id: 3, studentName: "Gabriel Pereira Lima", date: "2026-05-30", time: "10:00", description: "Reunião com os pais para alinhamento do plano de acompanhamento.", teachers: ["Prof. Anderson Lima", "Coord. Rafael Mendes"], type: "Reunião com Família" },
];

const INITIAL_OCCURRENCES: Occurrence[] = [
  { id: 1, studentName: "Lucas Henrique Moreira", subject: "Programação Orientada a Objetos", title: "Dificuldade em atividade em grupo", description: "Aluno apresentou dificuldade de integração durante atividade colaborativa. Isolou-se do grupo e não concluiu a tarefa.", date: "08/05/2026", author: "Profa. Juliana Castro" },
  { id: 2, studentName: "Isabela Ramos Nunes", subject: "Química Orgânica", title: "Distração recorrente em aula", description: "Aluna demonstrou dificuldade em manter o foco durante a explicação da aula prática, levantando-se repetidas vezes da bancada.", date: "14/05/2026", author: "Prof. Diego Faria" },
];

// ── Utility components ─────────────────────────────────────────────────────
const Badge = ({ text, color }: { text: string; color: string }) => {
  const map: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    purple: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
    teal: "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
    amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    indigo: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
    rose: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    green: "bg-green-50 text-green-700 ring-1 ring-green-200",
    red: "bg-red-50 text-red-700 ring-1 ring-red-200",
    gray: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-mono ${map[color] ?? map.gray}`}>{text}</span>;
};

const StatusBadge = ({ status }: { status: Student["status"] }) => {
  const map = { Ativo: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", Acompanhamento: "bg-amber-50 text-amber-700 ring-1 ring-amber-200", Inativo: "bg-gray-100 text-gray-500 ring-1 ring-gray-200" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${map[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === "Ativo" ? "bg-emerald-500" : status === "Acompanhamento" ? "bg-amber-500" : "bg-gray-400"}`} />
      {status}
    </span>
  );
};

const KpiCard = ({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string | number; sub: string; color: string }) => (
  <div className="bg-card rounded-lg border border-border p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
    <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon size={20} className="text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-0.5" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  </div>
);

// ── Sidebar ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "overview", label: "Visão Geral", icon: LayoutDashboard },
  { id: "students", label: "Alunos", icon: Users },
  { id: "log", label: "Atendimentos", icon: Activity },
  { id: "meetings", label: "Reuniões", icon: CalendarDays },
  { id: "occurrences", label: "Ocorrências", icon: AlertTriangle },
];

function Sidebar({ current, onNav }: { current: string; onNav: (s: Screen) => void }) {
  return (
    <aside className="w-60 flex-shrink-0 flex flex-col h-screen sticky top-0" style={{ background: "var(--sidebar)" }}>
      <div className="px-5 py-5 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent)" }}>
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>NAPNE Digital</p>
            <p className="text-[10px] leading-tight" style={{ color: "var(--sidebar-foreground)" }}>IFMS · Campus Três Lagoas</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-2" style={{ color: "var(--sidebar-foreground)", opacity: 0.5 }}>Menu Principal</p>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = current === id;
            return (
              <li key={id}>
                <button
                  onClick={() => onNav(id as Screen)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all group ${active ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"}`}
                  style={{ color: active ? "#fff" : "var(--sidebar-foreground)" }}
                >
                  <Icon size={16} className={active ? "" : "opacity-60 group-hover:opacity-100"} style={active ? { color: "var(--accent)" } : {}} />
                  {label}
                  {id === "students" && <span className="ml-auto text-[10px] font-mono text-white px-1.5 py-0.5 rounded" style={{ background: "var(--accent)" }}>6</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="px-3 pb-4">
        <div className="flex items-center gap-2.5 p-2.5 rounded-md" style={{ background: "var(--sidebar-accent)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent)" }}>
            <span className="text-white text-xs font-bold">RM</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-semibold leading-tight truncate">Rafael Mendes</p>
            <p className="text-[10px] leading-tight" style={{ color: "var(--sidebar-foreground)" }}>Coordenador NAPNE</p>
          </div>
          <button className="opacity-50 hover:opacity-100 transition-opacity">
            <LogOut size={14} style={{ color: "var(--sidebar-foreground)" }} />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ── Topbar ─────────────────────────────────────────────────────────────────
function Topbar({ title, onOpenProfile }: { title: string; onOpenProfile: () => void }) {
  const [notifOpen, setNotifOpen] = useState(false);
  return (
    <header className="bg-card border-b border-border px-6 py-3.5 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 className="text-base font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{title}</h1>
        <p className="text-xs text-muted-foreground">NAPNE Digital · {new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <button onClick={() => setNotifOpen(v => !v)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors relative">
            <Bell size={18} className="text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-card" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-11 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Notificações</p>
                <span className="text-xs font-mono bg-red-50 text-red-600 px-1.5 py-0.5 rounded">3 novas</span>
              </div>
              {[
                { icon: AlertCircle, color: "text-red-500", title: "Documentação pendente", sub: "Lucas Moreira · Laudo médico vencido", time: "Agora" },
                { icon: CalendarDays, color: "text-blue-500", title: "Reunião confirmada", sub: "Pais de Ana Clara · 28/05 às 09h30", time: "2h atrás" },
                { icon: FileText, color: "text-teal-500", title: "Novo PEI submetido", sub: "Matheus Costa · Revisão pendente", time: "Ontem" },
              ].map((n, i) => (
                <div key={i} className="px-4 py-3 hover:bg-secondary/40 transition-colors flex gap-3 border-b border-border last:border-0 cursor-pointer">
                  <n.icon size={16} className={`mt-0.5 flex-shrink-0 ${n.color}`} />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.sub}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={onOpenProfile} className="flex items-center gap-2 pl-3 border-l border-border hover:bg-secondary/50 transition-colors rounded-lg py-1 pr-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--primary)" }}>
            <span className="text-white text-xs font-bold">RM</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-foreground leading-tight">Rafael Mendes</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Coordenador</p>
          </div>
          <ChevronDown size={14} className="text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}

// ── SCREEN: Login ──────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [siape, setSiape] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 900);
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--primary)" }}>
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #0E9A8C 0%, transparent 50%), radial-gradient(circle at 80% 20%, #fff 0%, transparent 40%)" }} />
        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--accent)" }}>
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>NAPNE Digital</p>
              <p className="text-white/60 text-xs">Instituto Federal de Mato Grosso do Sul</p>
            </div>
          </div>
          <h2 className="text-white font-bold text-4xl leading-tight mb-4" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            Inclusão com<br />tecnologia e cuidado.
          </h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-sm">
            Plataforma de gestão e acompanhamento de estudantes com necessidades educacionais específicas do Campus Três Lagoas.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--accent)" }}>
              <Shield size={18} className="text-white" />
            </div>
            <p className="font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>NAPNE Digital</p>
          </div>

          <p className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Bem-vindo(a)</p>
          <p className="text-sm text-muted-foreground mb-6">Acesse o system com suas credenciais institucionais</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Matrícula SIAPE</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={siape}
                  onChange={e => setSiape(e.target.value)}
                  placeholder="Ex: 1234567"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-input-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Senha</label>
              <div className="relative">
                <Shield size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-input-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent transition-all"
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                <input type="checkbox" className="rounded border-border" />
                Manter-me conectado
              </label>
              <button type="button" className="hover:underline" style={{ color: "var(--primary)" }}>Esqueci a senha</button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              style={{ background: "var(--primary)" }}
            >
              {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Autenticando...</> : "Entrar no sistema"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── SCREEN: Overview (Dashboard) ───────────────────────────────────────────
function OverviewScreen({ onNav, careLogs }: { onNav: (s: Screen) => void; careLogs: CareLog[] }) {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="Alunos Ativos" value={47} sub="+3 este semestre" color="bg-primary" />
        <KpiCard icon={Clock} label="Atend. Realizados" value={careLogs.length} sub="Histórico total registrado" color="bg-amber-500" />
        <KpiCard icon={FileText} label="Prorrogações" value={5} sub="Concedidas este mês" color="bg-teal-600" />
        <KpiCard icon={CalendarDays} label="Reuniões na Semana" value={3} sub="Próxima: 26/05 às 14h" color="bg-indigo-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-lg border border-border">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Atividade Recente</h2>
            <button onClick={() => onNav("log")} className="text-xs font-medium hover:underline" style={{ color: "var(--accent)" }}>Ver todas</button>
          </div>
          <ul className="divide-y divide-border">
            {careLogs.slice(0, 4).map((ev) => (
              <li key={ev.id} className="px-5 py-3.5 flex gap-4 hover:bg-secondary/30 transition-colors">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                  {ev.type.includes("Ocorrência") ? <AlertTriangle size={14} className="text-amber-500" /> :
                   ev.type.includes("Reunião") ? <CalendarDays size={14} className="text-blue-500" /> :
                   ev.type.includes("Prorrogação") ? <Clock size={14} className="text-teal-500" /> :
                   <Activity size={14} className="text-indigo-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{ev.studentName}</p>
                      <p className="text-xs text-muted-foreground">{ev.type} · {ev.staff}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">{ev.date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{ev.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-3.5 border-b border-border flex items-center gap-2">
              <AlertCircle size={15} className="text-red-500" />
              <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Alertas Críticos</h2>
              <span className="ml-auto font-mono text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded">2</span>
            </div>
            {[
              { name: "Lucas H. Moreira", msg: "Laudo médico vencido", color: "text-red-500" },
              { name: "Isabela R. Nunes", msg: "PEI não atualizado em 90d", color: "text-amber-500" },
            ].map((a, i) => (
              <div key={i} className="px-4 py-3 flex items-start gap-2.5 border-b border-border last:border-0">
                <AlertCircle size={14} className={`mt-0.5 flex-shrink-0 ${a.color}`} />
                <div>
                  <p className="text-xs font-medium text-foreground">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.msg}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-lg border border-border">
            <div className="px-4 py-3.5 border-b border-border">
              <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Agenda da Semana</h2>
            </div>
            {INITIAL_MEETINGS.map((m, i) => (
              <div key={i} className="px-4 py-3 flex gap-3 border-b border-border last:border-0">
                <div className="w-1 rounded-full self-stretch bg-blue-500" />
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground">{m.date.split("-").reverse().join("/")} · {m.time}</p>
                  <p className="text-xs font-medium text-foreground mt-0.5">{m.type} · {m.studentName.split(" ")[0]}</p>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => onNav("students")} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90" style={{ background: "var(--primary)" }}>
            <Users size={16} /> Ver Alunos
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SCREEN: Students ───────────────────────────────────────────────────────
function StudentsScreen({ onSelectStudent }: { onSelectStudent: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [filterNeed, setFilterNeed] = useState("Todas");

  const needs = ["Todas", "TEA", "TDAH", "Deficiência Visual", "Deficiência Auditiva", "Altas Habilidades", "Dislexia"];
  const filtered = STUDENTS.filter(s =>
    (filterNeed === "Todas" || s.need === filterNeed) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || s.registration.includes(search))
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou matrícula..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select value={filterNeed} onChange={e => setFilterNeed(e.target.value)} className="pl-9 pr-8 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer">
              {needs.map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <p className="text-sm font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Estudantes Cadastrados</p>
          <span className="font-mono text-xs text-muted-foreground">{filtered.length} resultado{filtered.length !== 1 && "s"}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["Nome / Matrícula", "NEE", "Curso / Turma", "Ano", "Status", "Ações"].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-secondary/20 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 font-semibold text-xs text-muted-foreground">
                        {s.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-foreground text-sm">{s.name}</p>
                          {s.alert && <AlertTriangle size={12} className="text-amber-500" />}
                        </div>
                        <p className="font-mono text-[10px] text-muted-foreground">#{s.registration}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><Badge text={s.need} color={s.needColor} /></td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground max-w-xs truncate">{s.course}</td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono">{s.year}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={s.status} /></td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => onSelectStudent(s.id)} className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md hover:bg-secondary" style={{ color: "var(--accent)" }}>
                      <Eye size={13} /> Prontuário
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── SCREEN: Care Log & Management (Atendimentos Screen) ──────────────────────
function CareLogScreen({ careLogs, onAddLogClick }: { careLogs: CareLog[]; onAddLogClick: () => void }) {
  const [search, setSearch] = useState("");

  const filteredLogs = careLogs.filter(log => 
    log.studentName.toLowerCase().includes(search.toLowerCase()) || 
    log.type.toLowerCase().includes(search.toLowerCase()) ||
    log.staff.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5 relative min-h-[calc(100vh-70px)] pb-24">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Filtrar por aluno, tipo de atendimento ou servidor..." 
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" 
          />
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <p className="text-sm font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Histórico Coletivo de Atendimentos</p>
          <span className="font-mono text-xs text-muted-foreground">{filteredLogs.length} registro(s)</span>
        </div>
        
        <div className="divide-y divide-border">
          {filteredLogs.length > 0 ? (
            filteredLogs.map(log => (
              <div key={log.id} className="p-5 hover:bg-secondary/10 transition-colors flex gap-4">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Activity size={16} className="text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{log.studentName}</h3>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">
                        <span className="text-foreground font-semibold">{log.type}</span> · Registrado por {log.staff}
                      </p>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded">{log.date} às {log.time}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 bg-secondary/30 p-3 rounded-lg border border-border/40 leading-relaxed">
                    {log.text}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Nenhum atendimento corresponde aos filtros aplicados.
            </div>
          )}
        </div>
      </div>

      {/* Botão flutuante no canto inferior direito */}
      <button 
        onClick={onAddLogClick}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold text-white shadow-xl hover:scale-105 transition-all z-40 active:scale-95" 
        style={{ background: "var(--accent)" }}
      >
        <Plus size={18} /> Registrar Atendimento
      </button>
    </div>
  );
}

// ── SCREEN: Student Record (Prontuário) ────────────────────────────────────
function StudentRecordScreen({ student, careLogs, onAddLogClick }: { student: Student; careLogs: CareLog[]; onAddLogClick: () => void }) {
  const studentLogs = careLogs.filter(log => log.studentName === student.name);

  return (
    <div className="p-6 space-y-6">
      {/* Student Profile Box */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary font-bold text-xl flex items-center justify-center">
            {student.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{student.name}</h2>
              <StatusBadge status={student.status} />
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">Matrícula: #{student.registration} | {student.course} ({student.year})</p>
            <div className="mt-1.5 flex gap-2">
              <Badge text={student.need} color={student.needColor} />
            </div>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={onAddLogClick}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90" 
            style={{ background: "var(--accent)" }}
          >
            <Plus size={14} /> Adicionar Atendimento
          </button>
        </div>
      </div>

      {/* Timeline view */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">Histórico Focado do Estudante</h3>
        </div>
        <div className="p-5 space-y-6 relative before:absolute before:inset-y-0 before:left-9 before:w-0.5 before:bg-border">
          {studentLogs.length > 0 ? (
            studentLogs.map((ev) => (
              <div key={ev.id} className="flex gap-6 relative">
                <div className="w-8 h-8 rounded-full bg-card border-2 border-border flex items-center justify-center z-10 flex-shrink-0 text-accent">
                  <Activity size={12} />
                </div>
                <div className="flex-1 bg-secondary/20 border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className="text-xs font-bold text-foreground">{ev.type}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{ev.date} às {ev.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{ev.text}</p>
                  <p className="text-[10px] text-muted-foreground/80 font-medium mt-2">Registrado por: {ev.staff}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-xs text-muted-foreground py-4">Nenhum atendimento registrado para este aluno.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MODAL: Add Care Log (Modal Compartilhado) ──────────────────────────────
function AddCareLogModal({ isOpen, onClose, onSave }: { isOpen: boolean; onClose: () => void; onSave: (data: { studentName: string; type: string; text: string }) => void }) {
  const [studentName, setStudentName] = useState("");
  const [type, setType] = useState("Atendimento Individual");
  const [text, setText] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !text) return;
    onSave({ studentName, type, text });
    setStudentName("");
    setText("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(13,28,54,0.7)" }}>
      <div className="bg-card rounded-xl border border-border w-full max-w-xl shadow-2xl">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <p className="font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Registrar Novo Atendimento</p>
            <p className="text-xs text-muted-foreground mt-0.5">Insira as informações coletadas no atendimento institucional</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground block mb-1.5">Selecione o Aluno</label>
            <select value={studentName} onChange={e => setStudentName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" required>
              <option value="">Selecione um aluno da listagem...</option>
              {STUDENTS.map(s => <option key={s.id} value={s.name}>{s.name} ({s.need})</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1.5">Tipo de Interação</label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option>Atendimento Individual</option>
              <option>Reunião com Pais</option>
              <option>Ocorrência Comportamental</option>
              <option>Solicitação de Prorrogação</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1.5">Relato Descritivo</label>
            <textarea 
              rows={4} 
              value={text} 
              onChange={e => setText(e.target.value)}
              placeholder="Digite detalhadamente o relato descritivo do atendimento..." 
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold rounded-lg hover:bg-secondary text-muted-foreground transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg text-white transition-all hover:opacity-90" style={{ background: "var(--accent)" }}>Salvar Registro</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── MAIN APP CONTAINER ─────────────────────────────────────────────────────
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [screen, setScreen] = useState<Screen>("overview");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  
  // Estado Dinâmico dos Atendimentos unificado
  const [careLogs, setCareLogs] = useState<CareLog[]>(INITIAL_TIMELINE_EVENTS);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Mapeamento dinâmico de títulos para a Topbar
  const titles: Record<Screen, string> = {
    overview: "Visão Geral",
    students: "Gerenciamento de Alunos",
    record: "Prontuário de Acompanhamento",
    log: "Histórico de Atendimentos",
    meetings: "Reuniões e Prazos",
    occurrences: "Ocorrências Acadêmicas",
    profile: "Meu Perfil",
  };

  const handleSelectStudent = (id: string) => {
    setSelectedStudentId(id);
    setScreen("record");
  };

  const handleAddNewLog = (data: { studentName: string; type: string; text: string }) => {
    const newLog: CareLog = {
      id: Date.now(),
      studentName: data.studentName,
      date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      type: data.type,
      staff: "Coord. Rafael Mendes",
      text: data.text
    };
    setCareLogs([newLog, ...careLogs]);
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  const currentStudent = STUDENTS.find(s => s.id === selectedStudentId);

  return (
    <div className="flex bg-background min-h-screen text-foreground">
      <Sidebar current={screen} onNav={(s) => setScreen(s)} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={titles[screen]} onOpenProfile={() => setScreen("profile")} />
        
        <main className="flex-1 overflow-y-auto">
          {screen === "overview" && <OverviewScreen onNav={setScreen} careLogs={careLogs} />}
          {screen === "students" && <StudentsScreen onSelectStudent={handleSelectStudent} />}
          {screen === "log" && (
            <CareLogScreen 
              careLogs={careLogs} 
              onAddLogClick={() => setIsLogModalOpen(true)} 
            />
          )}
          {screen === "record" && currentStudent && (
            <StudentRecordScreen 
              student={currentStudent} 
              careLogs={careLogs}
              onAddLogClick={() => setIsLogModalOpen(true)} 
            />
          )}
          {screen !== "overview" && screen !== "students" && screen !== "log" && screen !== "record" && (
            <div className="p-6 text-sm text-muted-foreground">
              Módulo <strong>{titles[screen]}</strong> carregado com sucesso. Estrutura de visualização padrão em desenvolvimento.
            </div>
          )}
        </main>
      </div>

      {/* Modal Único e Unificado de Atendimento */}
      <AddCareLogModal 
        isOpen={isLogModalOpen} 
        onClose={() => setIsLogModalOpen(false)} 
        onSave={handleAddNewLog} 
      />
    </div>
  );
}