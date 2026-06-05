import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, CalendarDays, FileText, AlertTriangle,
  BarChart2, Settings, Bell, ChevronDown, Search, Plus, Filter,
  Clock, Upload, CheckCircle, AlertCircle, X, ChevronRight,
  Eye, Download, User, LogOut, BookOpen, Home,
  Phone, Mail, Shield, Star, Activity, ChevronLeft,
  ArrowLeft, IdCard, GraduationCap, Edit2, Save, Trash2,
} from "lucide-react";
import { apiClient } from "../services/api";
import type { LoggedInUser } from "./App";
import type {
  Aluno as BackendAluno,
  Reuniao as BackendReuniao,
  Ocorrencia as BackendOcorrencia,
  Usuario as BackendUsuario,
} from "../services/api";


type Screen = "overview" | "students" | "servers" | "record" | "log" | "meetings" | "occurrences" | "profile";
type UserRole = "Acompanhadora" | "Coordenadora" | "Admin";
type MeetingStatus = "Agendada" | "ConcluÃ­da" | "Pendente";

interface User {
  id: string;
  siape: string;
  name: string;
  email: string;
  role: UserRole;
}

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
  lastCareDate?: string; // Data do Ãºltimo atendimento
  editable?: boolean; // Flag para controle de ediÃ§Ã£o
}

interface StaffMember {
  id: string;
  name: string;
  role: 'Professor' | 'Psicólogo' | 'Agente' | 'Coordenador';
  email: string;
  siape: string;
  students?: Student[];
}

interface MeetingEvent {
  id: number;
  studentName: string;
  date: string; // "YYYY-MM-DD"
  time: string;
  description: string;
  teachers: string[];
  type: string;
  status?: MeetingStatus; // Novo campo para status
  completedAt?: string; // Data/hora de conclusÃ£o
  completedBy?: string; // Quem completou
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

interface ClassHistory {
  id: string;
  course: string;
  gradeYear: string;   // Ex: "2Âº Ano" ou "3Âº Semestre"
  schoolYear: number;  // Ex: 2026
  semester: number;    // Ex: 1 ou 2
  status: 'Ativo' | 'Acompanhamento' | 'ConcluÃ­do' | 'Evadido' | 'Trancado';
  teachers: string[];  // Nomes dos professores vinculados neste semestre
}

// â”€â”€ Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STUDENTS: Student[] = [];
const INITIAL_TIMELINE_EVENTS: CareLog[] = [];
const TIMELINE_EVENTS: CareLog[] = [];
const INITIAL_MEETINGS: MeetingEvent[] = [];
const INITIAL_OCCURRENCES: Occurrence[] = [];
const INITIAL_STAFF: StaffMember[] = [];
const AVAILABLE_TEACHERS: string[] = [];
const INITIAL_HISTORY: ClassHistory[] = [];
const USERS: User[] = [];
const ACOMPANHADORA_STUDENTS: Record<string, string[]> = {};

// FunÃ§Ã£o utilitÃ¡ria para calcular dias desde Ãºltima data
const calculateDaysSince = (dateString?: string): number => {
  if (!dateString) return -1;
  const today = new Date();
  const lastDate = new Date(dateString);
  const diffTime = Math.abs(today.getTime() - lastDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const needColorFor = (need: string) => {
  const colors: Record<string, string> = {
    TEA: "blue",
    TDAH: "amber",
    "DeficiÃªncia Visual": "purple",
    "DeficiÃªncia Auditiva": "indigo",
    "Altas Habilidades": "teal",
    Dislexia: "rose",
  };

  return colors[need] ?? "green";
};

const toStudent = (aluno: BackendAluno): Student => ({
  id: String(aluno.id),
  name: aluno.nome,
  registration: aluno.matricula,
  need: aluno.necessidade_especial,
  needColor: needColorFor(aluno.necessidade_especial),
  course: aluno.curso,
  year: aluno.ano,
  status:
    aluno.status === "Inativo"
      ? "Inativo"
      : aluno.status === "Acompanhamento"
        ? "Acompanhamento"
        : "Ativo",
  teachers: [],
});

const toMeeting = (reuniao: BackendReuniao): MeetingEvent => {
  const [studentLine, ...descriptionLines] = (reuniao.descricao ?? "").split("\n");

  return {
    id: reuniao.id,
    studentName: studentLine.startsWith("Aluno: ")
      ? studentLine.replace("Aluno: ", "").trim()
      : "Aluno nÃ£o informado",
    date: reuniao.data,
    time: reuniao.horario_inicio.slice(0, 5),
    description: descriptionLines.join("\n").trim(),
    teachers: [],
    type: reuniao.tipo,
    status:
      reuniao.status === "ConcluÃ­da" || reuniao.status === "Pendente"
        ? reuniao.status
        : "Agendada",
  };
};

const toOccurrence = (ocorrencia: BackendOcorrencia): Occurrence => {
  const [studentLine, subjectLine, ...descriptionLines] = ocorrencia.descricao.split("\n");

  return {
    id: ocorrencia.id,
    studentName: studentLine?.startsWith("Aluno: ")
      ? studentLine.replace("Aluno: ", "").trim()
      : "Aluno nÃ£o informado",
    subject: subjectLine?.startsWith("Disciplina: ")
      ? subjectLine.replace("Disciplina: ", "").trim()
      : "NÃ£o especificado",
    title: ocorrencia.titulo,
    description: descriptionLines.join("\n").trim() || ocorrencia.descricao,
    date: new Date(`${ocorrencia.data_registro}T00:00:00`).toLocaleDateString("pt-BR"),
    author: "Sistema",
  };
};

const toStaffMember = (usuario: BackendUsuario): StaffMember => ({
  id: String(usuario.id),
  name: usuario.nome,
  role:
    usuario.cargo === "Psicólogo"
      ? "Psicólogo"
      : usuario.cargo === "Agente"
        ? "Agente"
        : usuario.cargo === "Coordenador"
          ? "Coordenador"
          : "Professor",
  email: usuario.email,
  siape: usuario.siape,
  students: [],
});


// â”€â”€ Utility components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

const KpiCard = ({
  icon: Icon,
  label,
  value,
  sub,
  color,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub: string;
  color: string;
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`bg-card rounded-lg border border-border p-5 flex items-start gap-4 hover:shadow-md transition-shadow text-left w-full ${
      onClick ? "cursor-pointer" : "cursor-default"
    }`}
  >
    <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon size={20} className="text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-0.5" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  </button>
);

// â”€â”€ Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const NAV_ITEMS = [
  { id: "overview", label: "VisÃ£o Geral", icon: LayoutDashboard },
  { id: "students", label: "Alunos", icon: Users },
  { id: "servers", label: "Corpo Docente", icon: Users },
  { id: "log", label: "Atendimentos", icon: Activity },
  { id: "meetings", label: "ReuniÃµes", icon: CalendarDays },
  { id: "occurrences", label: "OcorrÃªncias", icon: AlertTriangle },
];

function Sidebar({
  current,
  onNav,
  onLogout,
}: {
  current: string;
  onNav: (s: Screen) => void;
  onLogout: () => void;
}) {
  return (
    <aside className="w-60 flex-shrink-0 flex flex-col h-screen sticky top-0" style={{ background: "var(--sidebar)" }}>
      <div className="px-5 py-5 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: "#63AB71" }}
          >
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>NAPNE Digital</p>
            <p className="text-[10px] leading-tight" style={{ color: "var(--sidebar-foreground)" }}>IFMS Â· Campus TrÃªs Lagoas</p>
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
            <p className="text-white text-xs font-semibold leading-tight truncate">Usuário</p>
            <p className="text-[10px] leading-tight" style={{ color: "var(--sidebar-foreground)" }}>Coordenador NAPNE</p>
          </div>
          <button
            onClick={onLogout}
            className="opacity-50 hover:opacity-100 transition-opacity"
          >
            <LogOut size={14} style={{ color: "var(--sidebar-foreground)" }} />
          </button>
        </div>
      </div>
    </aside>
  );
}

// â”€â”€ Topbar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Topbar({ title, onOpenProfile }: { title: string; onOpenProfile: () => void }) {
  const [notifOpen, setNotifOpen] = useState(false);
  return (
    <header className="bg-card border-b border-border px-6 py-3.5 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 className="text-base font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{title}</h1>
        <p className="text-xs text-muted-foreground">NAPNE Digital Â· {new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
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
                <p className="text-sm font-semibold text-foreground">NotificaÃ§Ãµes</p>
                <span className="text-xs font-mono bg-red-50 text-red-600 px-1.5 py-0.5 rounded">3 novas</span>
              </div>
              {([] as { icon: typeof AlertCircle; color: string; title: string; sub: string; time: string }[]).map((n, i) => (
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
            <p className="text-xs font-semibold text-foreground leading-tight">Usuário</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Coordenador</p>
          </div>
          <ChevronDown size={14} className="text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}

// â”€â”€ SCREEN: Login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LoginScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [siape, setSiape] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(false);
    setError("Use o login principal integrado ao backend.");
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--primary)" }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #0E9A8C 0%, transparent 50%), radial-gradient(circle at 80% 20%, #fff 0%, transparent 40%)" }} />
        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#63AB71" }}>
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>NAPNE Digital</p>
              <p className="text-white/60 text-xs">Instituto Federal de Mato Grosso do Sul</p>
            </div>
          </div>
          <h2 className="text-white font-bold text-4xl leading-tight mb-4" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            InclusÃ£o com<br />tecnologia e cuidado.
          </h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-sm">
            Plataforma de gestÃ£o e acompanhamento de estudantes com necessidades educacionais especÃ­ficas do Campus TrÃªs Lagoas.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div
        className="flex-1 flex items-center justify-center p-6"
        style={{ background: "#E6FFE7" }}
      >
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--accent)" }}>
              <Shield size={18} className="text-white" />
            </div>
            <p className="font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>NAPNE Digital</p>
          </div>

          <p className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Bem-vindo(a)</p>
          <p className="text-sm text-muted-foreground mb-6">Acesse o sistema com suas credenciais institucionais</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">MatrÃ­cula SIAPE</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={siape}
                  onChange={e => setSiape(e.target.value)}
                  placeholder="Ex: 0000000"
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
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-input-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent transition-all"
                />
              </div>
            </div>
            
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}
            
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

          <div className="mt-6 space-y-3">
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-xs font-semibold text-blue-900 mb-2">ðŸ‘¤ UsuÃ¡rios de Teste</p>
              
            </div>
            <div className="p-3 rounded-lg bg-secondary/60 border border-border">
              <p className="text-xs text-muted-foreground text-center">
                <Shield size={12} className="inline mr-1" />
                Dados protegidos conforme LGPD Â· Acesso restrito a servidores autorizados
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// â”€â”€ SCREEN: Overview (Dashboard) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function OverviewScreen({ onNav }: { onNav: (s: Screen) => void }) {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
            icon={Users}
            label="Alunos Ativos"
            value={47}
            sub="+3 este semestre"
            color="bg-primary"
            onClick={() => onNav("students")}
      />
        <KpiCard icon={Clock} label="Atend. Pendentes" value={8} sub="Aguardando registro" color="bg-amber-500" />
        <KpiCard icon={FileText} label="ProrrogaÃ§Ãµes" value={5} sub="Concedidas este mÃªs" color="bg-teal-600" />
        <KpiCard
          icon={CalendarDays}
          label="ReuniÃµes na Semana"
          value={3}
          sub="PrÃ³xima: 26/05 Ã s 14h"
          color="bg-indigo-600"
          onClick={() => onNav("meetings")}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-lg border border-border">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Atividade Recente</h2>
            <button className="text-xs font-medium hover:underline" style={{ color: "var(--accent)" }}>Ver todas</button>
          </div>
          <ul className="divide-y divide-border">
            {TIMELINE_EVENTS.slice(0, 4).map((ev, i) => (
              <li key={i} className="px-5 py-3.5 flex gap-4 hover:bg-secondary/30 transition-colors">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                  {ev.type.includes("OcorrÃªncia") ? <AlertTriangle size={14} className="text-amber-500" /> :
                   ev.type.includes("ReuniÃ£o") ? <CalendarDays size={14} className="text-blue-500" /> :
                   ev.type.includes("ProrrogaÃ§Ã£o") ? <Clock size={14} className="text-teal-500" /> :
                   <Activity size={14} className="text-indigo-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-foreground">Nenhum aluno cadastrado</p>
                      <p className="text-xs text-muted-foreground">{ev.type} Â· {ev.staff}</p>
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
              <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Alertas CrÃ­ticos</h2>
              <span className="ml-auto font-mono text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded">2</span>
            </div>
            {[
              { name: "Nenhum aluno", msg: "Laudo mÃ©dico vencido", color: "text-red-500" },
              { name: "Isabela R. Nunes", msg: "PEI nÃ£o atualizado em 90d", color: "text-amber-500" },
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
                  <p className="text-[10px] font-mono text-muted-foreground">{m.date.split("-").reverse().join("/")} Â· {m.time}</p>
                  <p className="text-xs font-medium text-foreground mt-0.5">{m.type} Â· {m.studentName.split(" ")[0]}</p>
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

// â”€â”€ SCREEN: Students â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StudentsScreen({
  students,
  setStudents,
  onSelectStudent,
}: {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  onSelectStudent: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filterNeed, setFilterNeed] = useState("Todas");
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);

  const [newStudentName, setNewStudentName] = useState("");
  const [newRegistration, setNewRegistration] = useState("");
  const [newCourse, setNewCourse] = useState("TÃ©cnico em InformÃ¡tica");
  const [newYear, setNewYear] = useState("1Âº Ano");
  const [newNeed, setNewNeed] = useState("TEA");

  const needs = ["Todas", "TEA", "TDAH", "DeficiÃªncia Visual", "DeficiÃªncia Auditiva", "Altas Habilidades", "Dislexia"];
  const filtered = students.filter(s =>
    (filterNeed === "Todas" || s.need === filterNeed) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || s.registration.includes(search))
  );

  const handleSaveStudent = async () => {
    if (!newStudentName.trim() || !newRegistration.trim()) return;
    const savedStudent = await apiClient.createAluno({
      matricula: newRegistration.trim(),
      nome: newStudentName.trim(),
      data_nascimento: "2000-01-01",
      cpf: `000${newRegistration.trim()}`.slice(-11),
      telefone: "",
      curso: newCourse,
      ano: newYear,
      necessidade_especial: newNeed,
      cid: "NÃ£o informado",
      observacao: "",
    });

    const newStudent: Student = {
      ...toStudent(savedStudent),
      needColor: needColorFor(newNeed),
      teachers: [],
    };

    setStudents(prev => [...prev, newStudent]);

    setNewStudentName("");
    setNewRegistration("");
    setNewCourse("TÃ©cnico em InformÃ¡tica");
    setNewYear("1Âº Ano");
    setNewNeed("TEA");
    setShowModal(false);
    setModalStep(1);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou matrÃ­cula..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select value={filterNeed} onChange={e => setFilterNeed(e.target.value)} className="pl-9 pr-8 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer">
              {needs.map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
          <button onClick={() => { setShowModal(true); setModalStep(1); }} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white whitespace-nowrap transition-all hover:opacity-90" style={{ background: "var(--accent)" }}>
            <Plus size={15} /> Adicionar Aluno
          </button>
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
                {["Nome / MatrÃ­cula", "NEE", "Curso / Turma", "Ano", "Status", "AÃ§Ãµes"].map(h => (
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
                      <Eye size={13} /> ProntuÃ¡rio
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(13,28,54,0.7)" }}>
          <div className="bg-card rounded-xl border border-border w-full max-w-xl shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <p className="font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Adicionar Novo Aluno</p>
                <p className="text-xs text-muted-foreground mt-0.5">Etapa {modalStep} de 3: {modalStep === 1 ? "Dados Pessoais" : modalStep === 2 ? "InformaÃ§Ãµes AcadÃªmicas" : "Anamnese Inicial"}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="px-6 pt-5 flex items-center gap-2">
              {[1, 2, 3].map(step => (
                <div key={step} className="flex-1 h-1.5 rounded-full transition-all" style={step <= modalStep ? { background: "var(--accent)" } : { background: "var(--secondary)" }} />
              ))}
            </div>
            <div className="px-6 py-5 space-y-4">
              {modalStep === 1 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><label className="text-xs font-medium text-foreground block mb-1">Nome Completo *</label><input
                          value={newStudentName}
                          onChange={e => setNewStudentName(e.target.value)}
                          placeholder="Ex: JoÃ£o Carlos da Silva"
                          className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        /></div>
                  <div><label className="text-xs font-medium text-foreground block mb-1">MatrÃ­cula *</label><input
  value={newRegistration}
  onChange={e => setNewRegistration(e.target.value)}
  placeholder="2025001"
  className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
 /></div>
                  <div><label className="text-xs font-medium text-foreground block mb-1">CPF</label><input placeholder="000.000.000-00" className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  <div><label className="text-xs font-medium text-foreground block mb-1">Data de Nascimento</label><input type="date" className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  <div><label className="text-xs font-medium text-foreground block mb-1">Contato / WhatsApp</label><input placeholder="(67) 9 9999-9999" className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                </div>
              )}
              {modalStep === 2 && (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-foreground block mb-1">Curso *</label><select className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"><option>TÃ©cnico em InformÃ¡tica</option><option>TÃ©cnico em EletrotÃ©cnica</option></select></div>
                  <div><label className="text-xs font-medium text-foreground block mb-1">Ano / Turma *</label><select className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"><option>1Âº Ano</option><option>2Âº Ano</option><option>3Âº Ano</option></select></div>
                  <div className="col-span-2"><label className="text-xs font-medium text-foreground block mb-1">NEE *</label><select className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">{needs.slice(1).map(n => <option key={n}>{n}</option>)}</select></div>
                  <div className="col-span-2"><label className="text-xs font-medium text-foreground block mb-1">CID-10</label><input placeholder="Ex: F84.0" className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                </div>
              )}
              {modalStep === 3 && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">InformaÃ§Ãµes da entrevista familiar inicial (Anamnese).</p>
                  <div><label className="text-xs font-medium text-foreground block mb-1">Nome do ResponsÃ¡vel Principal</label><input placeholder="Nome completo" className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  <div><label className="text-xs font-medium text-foreground block mb-1">HistÃ³rico MÃ©dico / DiagnÃ³stico Resumido</label><textarea rows={3} placeholder="Descreva o histÃ³rico do aluno..." className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  <div><label className="text-xs font-medium text-foreground block mb-1">ObservaÃ§Ãµes / PreferÃªncias de ComunicaÃ§Ã£o</label><textarea rows={2} placeholder="Outras informaÃ§Ãµes relevantes..." className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                </div>
              )}
            </div>
            <div className="px-6 pb-5 flex items-center justify-between gap-3">
              <button onClick={() => modalStep > 1 ? setModalStep(s => s - 1) : setShowModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">{modalStep > 1 ? "Voltar" : "Cancelar"}</button>
              <button onClick={() => modalStep < 3 ? setModalStep(s => s + 1) : handleSaveStudent()}className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90" style={{ background: modalStep === 3 ? "var(--accent)" : "var(--primary)" }}>{modalStep === 3 ? "Salvar Cadastro" : "PrÃ³xima Etapa"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function CorpoDocenteView({
  staffList,
  setStaffList,
}: {
  staffList: StaffMember[];
  setStaffList: React.Dispatch<React.SetStateAction<StaffMember[]>>;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('Todos');
  
  // Estado para controlar a navegaÃ§Ã£o interna do perfil
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // Estados para o formulÃ¡rio de cadastro
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<StaffMember['role']>('Professor');
  const [newEmail, setNewEmail] = useState('');
  const [newSiape, setNewSiape] = useState('');

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newSiape.trim()) return;

    const savedUser = await apiClient.createUsuario({
      nome: newName.trim(),
      email: newEmail.trim(),
      siape: newSiape.trim(),
      cargo: newRole,
      senha: "mudar123",
      status: "Ativo",
    });

    const newMember = toStaffMember(savedUser);

    setStaffList([...staffList, newMember]);
    setNewName('');
    setNewEmail('');
    setNewSiape('');
    setNewRole('Professor');
    setIsModalOpen(false);
  };

  const filteredStaff = selectedFilter === 'Todos' 
    ? staffList 
    : staffList.filter(member => member.role === selectedFilter);

  // Encontra os dados do membro selecionado para a tela de Perfil
  const currentStaff = staffList.find(m => m.id === selectedStaffId);

  // --- TELA DE PERFIL DO PROFESSOR / MEMBRO DA EQUIPE ---
  if (currentStaff) {
    return (
      <div className="p-6 space-y-6 animate-fade-in">
        {/* BotÃ£o de Voltar e Nome */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSelectedStaffId(null)}
            className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{currentStaff.role}</span>
            <h2 className="text-2xl font-bold text-gray-800">{currentStaff.name}</h2>
          </div>
        </div>

        {/* InformaÃ§Ãµes Gerais em Barra Horizontal Completa */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><Mail size={18} /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase">E-mail Institucional</p>
              <p className="text-sm text-gray-700 truncate">{currentStaff.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><IdCard size={18} /></div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">MatrÃ­cula SIAPE</p>
              <p className="text-sm text-gray-700 font-mono">{currentStaff.siape}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><GraduationCap size={18} /></div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Alunos Vinculados</p>
              <p className="text-sm text-gray-700 font-bold">{currentStaff.students?.length || 0} alunos neste perÃ­odo</p>
            </div>
          </div>
        </div>

        {/* Tabela de Alunos sob a Responsabilidade/Acompanhamento */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-gray-800 text-sm">Alunos Atendidos / Enturmados neste Semestre</h3>
          </div>
          
          {currentStaff.students && currentStaff.students.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase bg-gray-50/20">
                    <th className="py-3 px-4">Nome do Aluno</th>
                    <th className="py-3 px-4">MatrÃ­cula</th>
                    <th className="py-3 px-4">Curso / Ano</th>
                    <th className="py-3 px-4">CondiÃ§Ã£o/Necessidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {currentStaff.students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-gray-700">{student.name}</td>
                      <td className="py-3 px-4 text-gray-500 font-mono text-xs">#{student.registration}</td>
                      <td className="py-3 px-4 text-gray-600">{student.course} â€” {student.year}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                          {student.need}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-gray-400">
              Nenhum aluno vinculado a este profissional no perÃ­odo selecionado.
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- TELA DE LISTAGEM PRINCIPAL (OCUPA A TELA TODA) ---
  return (
    <div className="p-6 space-y-6">
      {/* CabeÃ§alho */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Equipe e Corpo Docente</h2>
          <p className="text-xs text-gray-500 mt-0.5">Gerencie os acessos, cargos e visualize as turmas de cada profissional.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="text-white px-4 py-2 rounded-lg font-medium text-sm transition shadow-sm hover:opacity-90"
          style={{ background: "var(--primary)" }}
        >
          + Adicionar Membro
        </button>
      </div>

      {/* Filtro por Tipo de UsuÃ¡rio */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['Todos', 'ResponsÃ¡vel', 'PsicÃ³logo', 'Agente', 'Coordenador NAPNE'].map((filter) => (
          <button
            key={filter}
            onClick={() => setSelectedFilter(filter)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap ${
              selectedFilter === filter 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Lista em Formato de Tabela Ocupando Tela Inteira */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Nome Completo</th>
                <th className="py-3.5 px-6">Cargo / FunÃ§Ã£o</th>
                <th className="py-3.5 px-6">SIAPE</th>
                <th className="py-3.5 px-6">E-mail Institucional</th>
                <th className="py-3.5 px-6 text-center">AÃ§Ãµes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredStaff.map((member) => (
                <tr key={member.id} className="hover:bg-blue-50/20 transition-colors group">
                  <td className="py-4 px-6 font-semibold text-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 uppercase">
                        {member.name.split(" ").map(n => n[0]).slice(0,2).join("")}
                      </div>
                      <span>{member.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      member.role === 'Coordenador SINAPNE' ? 'bg-purple-100 text-purple-700' :
                      member.role === 'PsicÃ³logo' ? 'bg-teal-100 text-teal-700' :
                      member.role === 'Agente' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-mono text-xs text-gray-600">{member.siape}</td>
                  <td className="py-4 px-6 text-gray-500">{member.email}</td>
                  <td className="py-4 px-6 text-center">
                    <button
                      onClick={() => setSelectedStaffId(member.id)}
                      className="px-3 py-1.5 bg-gray-50 hover:bg-blue-600 hover:text-white border border-gray-200 text-gray-600 rounded-md text-xs font-semibold transition"
                    >
                      Ver Alunos
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / FormulÃ¡rio de Cadastro */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Cadastrar Novo Integrante</h3>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Maria Silva"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SIAPE</label>
                  <input 
                    type="text" 
                    value={newSiape}
                    onChange={(e) => setNewSiape(e.target.value)}
                    placeholder="Ex: 1234567"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de UsuÃ¡rio</label>
                  <select 
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as StaffMember['role'])}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Professor">Professor(a)</option>
                    <option value="Psicólogo">Psicólogo(a)</option>
                    <option value="Agente">Agente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail Institucional</label>
                <input 
                  type="email" 
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nome.sobrenome@instituto.edu.br"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


// â”€â”€ SCREEN: Care Log & Management (Atendimentos Screen) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          <p className="text-sm font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>HistÃ³rico Coletivo de Atendimentos</p>
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
                        <span className="text-foreground font-semibold">{log.type}</span> Â· Registrado por {log.staff}
                      </p>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded">{log.date} Ã s {log.time}</span>
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

      {/* BotÃ£o flutuante no canto inferior direito */}
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


/// â”€â”€ SCREEN: Student Record â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StudentRecord({ studentId, onBack, onLog, onScheduleMeeting, onCreateOccurrence }: {
  studentId: string;
  onBack: () => void;
  onLog: () => void;
  onScheduleMeeting: (student: Student) => void;
  onCreateOccurrence: (student: Student) => void;
}) {
  // 1. Atualizado o Estado da Tab para incluir "classes"
  const [tab, setTab] = useState<"timeline" | "pei" | "requests" | "classes">("timeline");

  // 2. Estados adicionados para gerenciar o histÃ³rico de turmas e modal local
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [classHistory, setClassHistory] = useState<ClassHistory[]>([]);
  
  // Estados do formulÃ¡rio de nova turma
  const [newGradeYear, setNewGradeYear] = useState('');
  const [newSchoolYear, setNewSchoolYear] = useState(new Date().getFullYear());
  const [newSemester, setNewSemester] = useState(1);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);

  // Lista de docentes disponÃ­veis para o checkbox do modal (Baseado no seu corpo docente)
  const AVAILABLE_TEACHERS: string[] = [];

  const typeStyle = (type: string) => {
    if (type.includes("OcorrÃªncia")) return { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50" };
    if (type.includes("ReuniÃ£o")) return { icon: CalendarDays, color: "text-blue-500", bg: "bg-blue-50" };
    if (type.includes("ProrrogaÃ§Ã£o")) return { icon: Clock, color: "text-teal-500", bg: "bg-teal-50" };
    return { icon: Activity, color: "text-indigo-500", bg: "bg-indigo-50" };
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGradeYear.trim() || selectedTeachers.length === 0) return;

    // Conclui a turma ativa anterior automaticamente
    const archivedHistory = classHistory.map(c => c.status === 'Ativo' ? { ...c, status: 'ConcluÃ­do' } : c);

    const newClass = {
      id: String(Date.now()),
      course: student.course, // Herda o curso atual do aluno
      gradeYear: newGradeYear,
      schoolYear: newSchoolYear,
      semester: newSemester,
      status: "Ativo",
      teachers: selectedTeachers
    };

    setClassHistory([newClass, ...archivedHistory]);
    setNewGradeYear('');
    setSelectedTeachers([]);
    setIsClassModalOpen(false);
  };

  return (
    <div className="p-6 space-y-5">
      {/* Card superior de dados do Aluno */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="h-2" style={{ background: student.alert ? "var(--destructive)" : "var(--accent)" }} />
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 text-xl font-bold text-muted-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              {student.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-foreground text-xl" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{student.name}</h2>
                {student.alert && <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded ring-1 ring-red-200"><AlertTriangle size={11} /> AtenÃ§Ã£o</span>}
                <StatusBadge status={student.status} />
              </div>
              <p className="font-mono text-xs text-muted-foreground mt-0.5">MatrÃ­cula #{student.registration}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge text={student.need} color={student.needColor} />
                <Badge text={student.course} color="gray" />
                <Badge text={student.year} color="gray" />
              </div>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button onClick={onLog} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 whitespace-nowrap" style={{ background: "var(--accent)" }}>
                <Plus size={13} /> Registrar Atendimento
              </button>
              <button
                onClick={() => onScheduleMeeting(student)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border hover:bg-secondary transition-colors whitespace-nowrap text-foreground"
              >
                <CalendarDays size={13} /> Agendar ReuniÃ£o
              </button>
              <button
                onClick={() => onCreateOccurrence(student)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border hover:bg-secondary transition-colors whitespace-nowrap text-foreground"
              >
                <AlertTriangle size={13} /> Nova OcorrÃªncia
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
            {[
              { label: "ResponsÃ¡vel", value: "Sra. PatrÃ­cia Moreira", icon: User },
              { label: "Contato", value: "(67) 9 9874-3321", icon: Phone },
              { label: "E-mail", value: "patricia.m@email.com", icon: Mail },
              { label: "CID-10", value: "F84.0 (TEA)", icon: BookOpen },
            ].map(f => (
              <div key={f.label}>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{f.label}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <f.icon size={11} className="text-muted-foreground flex-shrink-0" />
                  <p className="text-xs text-foreground truncate">{f.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Container de Abas */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="border-b border-border flex flex-wrap">
          {[
            { key: "timeline", label: "HistÃ³rico / Linha do Tempo" }, 
            { key: "pei", label: "Planos de Ensino (PEI)" }, 
            { key: "requests", label: "SolicitaÃ§Ãµes" },
            { key: "classes", label: "Turmas / Semestres" } // <-- Inserido o item na navegaÃ§Ã£o
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)} className={`px-5 py-3.5 text-sm font-medium transition-all border-b-2 -mb-px ${tab === t.key ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`} style={tab === t.key ? { borderBottomColor: "var(--accent)" } : {}}>
              {t.label}
            </button>
          ))}
        </div>
        
        <div className="p-5">
          {tab === "timeline" && (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              <ul className="space-y-5 pl-10">
                {TIMELINE_EVENTS.map((ev, i) => {
                  const { icon: Icon, color, bg } = typeStyle(ev.type);
                  return (
                    <li key={i} className="relative">
                      <div className={`absolute -left-10 w-7 h-7 rounded-full flex items-center justify-center ${bg} ring-2 ring-card`}><Icon size={13} className={color} /></div>
                      <div className="bg-secondary/30 rounded-lg p-4">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div><span className={`text-xs font-semibold ${color}`}>{ev.type}</span><span className="text-muted-foreground text-xs mx-1.5">Â·</span><span className="text-xs text-muted-foreground">{ev.staff}</span></div>
                          <span className="font-mono text-[10px] text-muted-foreground">{ev.date} Â· {ev.time}</span>
                        </div>
                        <p className="text-sm text-foreground mt-1.5 leading-relaxed">{ev.text}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          
          {tab === "pei" && (
            <div className="space-y-3">
              {([] as { title: string; date: string; author: string; status: "Ativo" | "Inativo" }[]).map((p, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-secondary/20 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0"><FileText size={18} className="text-blue-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{p.title}</p>
                    <p className="text-xs text-muted-foreground">Criado em {p.date} Â· {p.author}</p>
                  </div>
                  <div className="flex items-center gap-2"><StatusBadge status={p.status} /><button className="p-1.5 rounded-md hover:bg-secondary transition-colors"><Download size={14} className="text-muted-foreground" /></button></div>
                </div>
              ))}
              <button className="flex items-center gap-2 text-sm font-medium mt-2 px-4 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:bg-secondary transition-colors w-full justify-center"><Plus size={14} /> Carregar Novo PEI</button>
            </div>
          )}
          
          {tab === "requests" && (
            <div className="space-y-3">
              {[
                { type: "ProrrogaÃ§Ã£o de Prazo", subject: "TCC Semestral â€” Banco de Dados", days: 7, date: "28/04/2025", status: "Deferida", statusColor: "green" },
                { type: "ProrrogaÃ§Ã£o de Prazo", subject: "AvaliaÃ§Ã£o Unidade II â€” MatemÃ¡tica", days: 5, date: "10/03/2025", status: "Deferida", statusColor: "green" },
                { type: "AdaptaÃ§Ã£o de AvaliaÃ§Ã£o", subject: "FÃ­sica â€” Prova P2", days: null, date: "01/03/2025", status: "Pendente", statusColor: "amber" },
              ].map((r, i) => (
                <div key={i} className="p-4 rounded-lg border border-border flex items-start gap-3">
                  <Clock size={16} className="text-teal-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap"><p className="text-sm font-semibold text-foreground">{r.type}</p><Badge text={r.status} color={r.statusColor} /></div>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.subject} {r.days ? `Â· +${r.days} dias` : ""}</p>
                    <p className="font-mono text-[10px] text-muted-foreground mt-1">Solicitado em {r.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. RenderizaÃ§Ã£o da nova Aba de Turmas / Semestres */}
          {tab === "classes" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h4 className="text-sm font-bold text-foreground">HistÃ³rico de EnturmaÃ§Ã£o Semestral</h4>
                  <p className="text-xs text-muted-foreground">Acompanhe as turmas pelas quais o aluno passou.</p>
                </div>
                <button 
                  onClick={() => setIsClassModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                >
                  <Plus size={12} /> Criar Turma
                </button>
              </div>

              {/* Lista das Turmas */}
              <div className="space-y-3">
                {classHistory.map((item) => {
                  const isActive = item.status === "Ativo";
                  return (
                    <div key={item.id} className={`p-4 rounded-lg border ${isActive ? 'bg-blue-50/30 border-blue-200/80' : 'bg-transparent border-border'} flex flex-col gap-2`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`inline-block text-[10px] font-bold uppercase px-1.5 py-0.5 rounded mr-2 ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-secondary text-muted-foreground'}`}>
                            {item.schoolYear}.{item.semester}
                          </span>
                          <span className="text-sm font-bold text-foreground">{item.course} â€” {item.gradeYear}</span>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-secondary text-muted-foreground'}`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-dashed border-border/60 flex flex-wrap gap-1.5 items-center">
                        <span className="text-xs text-muted-foreground font-medium mr-1">Professores:</span>
                        {item.teachers.map((teacher, idx) => (
                          <span key={idx} className="text-xs bg-card border border-border px-2 py-0.5 rounded text-foreground font-medium shadow-2xs">
                            {teacher}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Modal para o cadastro/vÃ­nculo da nova turma */}
      {isClassModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl p-5 max-w-md w-full shadow-xl">
            <h3 className="text-base font-bold text-foreground mb-1">Enturmar em Novo Semestre</h3>
            <p className="text-xs text-muted-foreground mb-4">Insira os parÃ¢metros da nova fase e selecione os professores atuais.</p>
            
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Fase/Ano</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 3Âº Ano" 
                    value={newGradeYear}
                    onChange={(e) => setNewGradeYear(e.target.value)}
                    className="w-full border border-border bg-secondary/20 rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Ano Letivo</label>
                  <input 
                    type="number" 
                    value={newSchoolYear}
                    onChange={(e) => setNewSchoolYear(Number(e.target.value))}
                    className="w-full border border-border bg-secondary/20 rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Semestre</label>
                  <select 
                    value={newSemester}
                    onChange={(e) => setNewSemester(Number(e.target.value))}
                    className="w-full border border-border bg-secondary/20 rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                  >
                    <option value={1}>1Âº Sem.</option>
                    <option value={2}>2Âº Sem.</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Professores do Semestre Atual</label>
                <div className="border border-border bg-secondary/10 rounded-md p-2.5 max-h-36 overflow-y-auto space-y-1.5">
                  {AVAILABLE_TEACHERS.map((teacher) => {
                    const checked = selectedTeachers.includes(teacher);
                    return (
                      <label key={teacher} className="flex items-center gap-2 text-xs text-foreground cursor-pointer hover:bg-secondary/30 p-1 rounded">
                        <input 
                          type="checkbox" 
                          checked={checked}
                          onChange={() => setSelectedTeachers(prev => checked ? prev.filter(t => t !== teacher) : [...prev, teacher])}
                          className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5"
                        />
                        <span>{teacher}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button 
                  type="button" 
                  onClick={() => setIsClassModalOpen(false)} 
                  className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary rounded-md"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={selectedTeachers.length === 0}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                >
                  Confirmar MatrÃ­cula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€ SCREEN: Log Interaction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LogScreen({ onBack }: { onBack: () => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [saved, setSaved] = useState(false);
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 3000); };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border" style={{ background: "var(--primary)" }}>
            <p className="font-bold text-white" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Registrar Atendimento / OcorrÃªncia</p>
            <p className="text-white/60 text-xs mt-0.5">Todos os registros sÃ£o auditÃ¡veis e fazem parte do prontuÃ¡rio permanente.</p>
          </div>
          <div className="p-6 space-y-5">
            {saved && <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium"><CheckCircle size={16} /> Registro salvo com sucesso!</div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Aluno *</label>
                <select className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">{([] as Student[]).map(s => <option key={s.id}>{s.name} — #{s.registration}</option>)}</select>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Tipo de InteraÃ§Ã£o *</label>
                <select className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  {["Atendimento Individual", "ReuniÃ£o com Pais", "Incidente AcadÃªmico", "OcorrÃªncia Comportamental", "RevisÃ£o de PEI", "Contato TelefÃ´nico"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Data e Hora *</label>
                <input type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Servidor ResponsÃ¡vel</label>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-secondary/40 text-sm text-muted-foreground"><Shield size={14} /><span>Usuário â€” Coordenador NAPNE</span><span className="ml-auto text-[10px] font-mono bg-secondary px-1.5 py-0.5 rounded">Somente leitura</span></div>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Relato Descritivo *</label>
                <textarea rows={6} placeholder="Descreva detalhadamente o atendimento, observaÃ§Ãµes do aluno, estratÃ©gias utilizadas e prÃ³ximos passos..." className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Documentos Anexos</label>
                <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); }} className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${dragOver ? "border-accent bg-teal-50" : "border-border bg-secondary/20 hover:bg-secondary/40"}`} style={dragOver ? { borderColor: "var(--accent)" } : {}}>
                  <Upload size={20} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-foreground">Arraste arquivos ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground mt-0.5">PDF, JPG, PNG â€” mÃ¡x. 10MB por arquivo</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <button onClick={onBack} className="px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">Cancelar</button>
              <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90" style={{ background: "var(--accent)" }}><CheckCircle size={15} /> Salvar Registro</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// â”€â”€ SCREEN: Meetings Calendar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MONTH_NAMES = ["Janeiro", "Fevereiro", "MarÃ§o", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "SÃ¡b"];

function MeetingsScreen({ meetings, setMeetings, prefilledStudent, students }: {
  meetings: MeetingEvent[];
  setMeetings: React.Dispatch<React.SetStateAction<MeetingEvent[]>>;
  prefilledStudent: Student | null;
  students: Student[];
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(!!prefilledStudent);

  // Form state
  const [formStudent, setFormStudent] = useState(prefilledStudent?.name ?? "");
  const [formDate, setFormDate] = useState(prefilledStudent ? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}` : "");
  const [formTime, setFormTime] = useState("09:00");
  const [formType, setFormType] = useState("ReuniÃ£o com FamÃ­lia");
  const [formDesc, setFormDesc] = useState("");
  const [formTeachers, setFormTeachers] = useState<string[]>(prefilledStudent?.teachers ?? []);
  const [saved, setSaved] = useState(false);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const meetingsOnDay = (day: number) => {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return meetings.filter(m => m.date === key);
  };

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const handleSave = async () => {
    if (!formStudent || !formDate || !formTime) return;
    const savedMeeting = await apiClient.createReuniao({
      tipo: formType,
      descricao: `Aluno: ${formStudent}\n${formDesc}`,
      data: formDate,
      horario_inicio: formTime,
      horario_fim: formTime,
      turma_id: undefined,
      usuario_id: undefined,
    });

    const newMeeting: MeetingEvent = {
      id: savedMeeting.id,
      studentName: formStudent,
      date: formDate,
      time: formTime,
      description: formDesc,
      teachers: formTeachers,
      type: formType,
    };
    setMeetings(prev => [...prev, newMeeting]);
    setSaved(true);
    setTimeout(() => { setSaved(false); setShowForm(false); setFormStudent(""); setFormDate(""); setFormDesc(""); setFormTeachers([]); }, 1500);
  };

  const selectedDayStr = selectedDay ? `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}` : null;
  const selectedDayMeetings = selectedDay ? meetingsOnDay(selectedDay) : [];

  const studentForForm = students.find(s => s.name === formStudent);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors"><ChevronLeft size={16} className="text-muted-foreground" /></button>
          <h2 className="text-base font-bold text-foreground min-w-[180px] text-center" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{MONTH_NAMES[month]} Â· {year}</h2>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors"><ChevronRight size={16} className="text-muted-foreground" /></button>
        </div>
        <button onClick={() => { setShowForm(true); setFormStudent(""); setFormTeachers([]); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90" style={{ background: "var(--accent)" }}>
          <Plus size={15} /> Nova ReuniÃ£o
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-card rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {DAY_NAMES.map(d => (
              <div key={d} className="py-2.5 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: totalCells }, (_, i) => {
              const day = i - firstDay + 1;
              const isValid = day >= 1 && day <= daysInMonth;
              const isToday = isValid && day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSelected = isValid && day === selectedDay;
              const dayMeetings = isValid ? meetingsOnDay(day) : [];

              return (
                <div
                  key={i}
                  onClick={() => isValid && setSelectedDay(day)}
                  className={`min-h-[72px] p-2 border-b border-r border-border cursor-pointer transition-colors ${
                    !isValid ? "bg-secondary/20 cursor-default" :
                    isSelected ? "bg-blue-50" :
                    "hover:bg-secondary/30"
                  }`}
                >
                  {isValid && (
                    <>
                      <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "text-white font-bold" : "text-foreground"}`} style={isToday ? { background: "var(--accent)" } : {}}>
                        {day}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {dayMeetings.slice(0, 2).map((m, j) => (
                          <div key={j} className="text-[10px] font-medium px-1.5 py-0.5 rounded truncate" style={{ background: "var(--primary)", color: "#fff", opacity: 0.9 }}>
                            {m.time} Â· {m.studentName.split(" ")[0]}
                          </div>
                        ))}
                        {dayMeetings.length > 2 && <div className="text-[10px] text-muted-foreground px-1">+{dayMeetings.length - 2}</div>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Day detail / upcoming */}
        <div className="space-y-4">
          {selectedDay ? (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="px-4 py-3.5 border-b border-border flex items-center justify-between">
                <p className="text-sm font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                  {String(selectedDay).padStart(2, "0")}/{String(month + 1).padStart(2, "0")}/{year}
                </p>
                <button onClick={() => setSelectedDay(null)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-secondary transition-colors"><X size={13} className="text-muted-foreground" /></button>
              </div>
              {selectedDayMeetings.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <CalendarDays size={28} className="mx-auto text-muted-foreground mb-2 opacity-40" />
                  <p className="text-xs text-muted-foreground">Nenhuma reuniÃ£o neste dia.</p>
                  <button onClick={() => { setShowForm(true); setFormDate(selectedDayStr ?? ""); }} className="mt-3 text-xs font-medium hover:underline" style={{ color: "var(--accent)" }}>+ Criar reuniÃ£o aqui</button>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {selectedDayMeetings.map(m => (
                    <li key={m.id} className="px-4 py-3.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-semibold text-foreground">{m.time}</span>
                        <Badge text={m.type} color="blue" />
                      </div>
                      <p className="text-xs font-medium text-foreground">{m.studentName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{m.description || "â€”"}</p>
                      {m.teachers.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {m.teachers.map(t => <span key={t} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">{t}</span>)}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="px-4 py-3.5 border-b border-border">
                <p className="text-sm font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>PrÃ³ximas ReuniÃµes</p>
              </div>
              <ul className="divide-y divide-border">
                {meetings.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5).map(m => (
                  <li key={m.id} className="px-4 py-3 hover:bg-secondary/20 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[10px] text-muted-foreground">{m.date.split("-").reverse().join("/")} Â· {m.time}</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground">{m.studentName}</p>
                    <p className="text-xs text-muted-foreground">{m.type}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* New meeting modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(13,28,54,0.7)" }}>
          <div className="bg-card rounded-xl border border-border w-full max-w-lg shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <p className="font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Agendar ReuniÃ£o</p>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {saved && <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium"><CheckCircle size={16} /> ReuniÃ£o agendada com sucesso!</div>}

              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Aluno *</label>
                <select value={formStudent} onChange={e => { setFormStudent(e.target.value); const s = students.find(st => st.name === e.target.value); setFormTeachers(s?.teachers ?? []); }} className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Selecione o aluno...</option>
                  {students.map(s => <option key={s.id} value={s.name}>{s.name} — #{s.registration}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Data *</label>
                  <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Hora *</label>
                  <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Tipo de ReuniÃ£o</label>
                <select value={formType} onChange={e => setFormType(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  {["ReuniÃ£o com FamÃ­lia", "RevisÃ£o de PEI", "Atendimento PedagÃ³gico", "Conselho de Classe", "Outra"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              {formTeachers.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Professores do Aluno</label>
                  <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-secondary/40 border border-border">
                    {formTeachers.map(t => (
                      <span key={t} className="flex items-center gap-1 text-xs bg-card border border-border px-2 py-1 rounded-full text-foreground">
                        <User size={11} className="text-muted-foreground" /> {t}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Professores vinculados ao aluno selecionado.</p>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">DescriÃ§Ã£o / Pauta</label>
                <textarea rows={3} value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Descreva o objetivo da reuniÃ£o, temas a tratar, documentos necessÃ¡rios..." className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
            </div>
            <div className="px-6 pb-5 flex items-center justify-end gap-3 border-t border-border pt-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">Cancelar</button>
              <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90" style={{ background: "var(--accent)" }}><CheckCircle size={14} /> Agendar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/// â”€â”€ SCREEN: Occurrences â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function OccurrencesScreen({ occurrences, setOccurrences, prefilledStudent, students }: {
  occurrences: Occurrence[];
  setOccurrences: React.Dispatch<React.SetStateAction<Occurrence[]>>;
  prefilledStudent?: Student | null;
  students: Student[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [formStudent, setFormStudent] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [saved, setSaved] = useState(false);

  const SUBJECTS = ["Banco de Dados", "ProgramaÃ§Ã£o Orientada a Objetos", "MatemÃ¡tica", "FÃ­sica", "QuÃ­mica OrgÃ¢nica", "Contabilidade", "EletrotÃ©cnica", "InglÃªs", "Redes de Computadores"];

  useEffect(() => {
    if (prefilledStudent) {
      setShowForm(true);
      setFormStudent(prefilledStudent.name);
    }
  }, [prefilledStudent]);

  const handleSave = async () => {
    if (!formStudent || !formTitle || !formDesc) return;
    const subject = formSubject || "Não especificado";
    const savedOccurrence = await apiClient.createOcorrencia({
      titulo: formTitle,
      descricao: `Aluno: ${formStudent}\nDisciplina: ${subject}\n${formDesc}`,
      turma_id: undefined,
      usuario_id: undefined,
    });

    const occ: Occurrence = {
      id: savedOccurrence.id,
      studentName: formStudent,
      subject,
      title: formTitle,
      description: formDesc,
      date: new Date(`${savedOccurrence.data_registro}T00:00:00`).toLocaleDateString("pt-BR"),
      author: "Sistema",
    };    setOccurrences(prev => [occ, ...prev]);
    setSaved(true);
    setTimeout(() => { setSaved(false); setShowForm(false); setFormStudent(""); setFormSubject(""); setFormTitle(""); setFormDesc(""); }, 1500);
  };

  const filtered = occurrences.filter(o =>
    o.studentName.toLowerCase().includes(search.toLowerCase()) ||
    o.title.toLowerCase().includes(search.toLowerCase()) ||
    o.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por aluno, tÃ­tulo ou disciplina..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white whitespace-nowrap transition-all hover:opacity-90" style={{ background: "var(--destructive)" }}>
          <Plus size={15} /> Nova OcorrÃªncia
        </button>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <AlertTriangle size={32} className="mx-auto text-muted-foreground opacity-30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma ocorrÃªncia registrada.</p>
          </div>
        )}
        {filtered.map(occ => (
          <div key={occ.id} className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-4 p-5">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-sm font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{occ.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs font-medium text-foreground">{occ.studentName}</span>
                      <span className="text-muted-foreground text-xs">Â·</span>
                      <Badge text={occ.subject} color="amber" />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-[10px] text-muted-foreground">{occ.date}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{occ.author}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed">{occ.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(13,28,54,0.7)" }}>
          <div className="bg-card rounded-xl border border-border w-full max-w-lg shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <p className="font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Registrar OcorrÃªncia</p>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {saved && <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium"><CheckCircle size={16} /> OcorrÃªncia registrada!</div>}
              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Aluno *</label>
                <select value={formStudent} onChange={e => setFormStudent(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Selecione o aluno...</option>
                  {students.map(s => <option key={s.id} value={s.name}>{s.name} — #{s.registration}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Disciplina</label>
                <select value={formSubject} onChange={e => setFormSubject(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Selecione a disciplina...</option>
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">TÃ­tulo da OcorrÃªncia *</label>
                <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Ex: Dificuldade em atividade em grupo" className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">DescriÃ§Ã£o da SituaÃ§Ã£o *</label>
                <textarea rows={4} value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Descreva detalhadamente o que ocorreu, o contexto, comportamentos observados e possÃ­veis impactos..." className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
            </div>
            <div className="px-6 pb-5 flex items-center justify-end gap-3 border-t border-border pt-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">Cancelar</button>
              <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90" style={{ background: "var(--destructive)" }}><AlertTriangle size={14} /> Registrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€ SCREEN: Profile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ProfileScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("Usuário");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("(67) 9 9234-5678");
  const [role, setRole] = useState("Coordenador NAPNE");
  const [siape, setSiape] = useState("2145678");
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);

  const handleSave = () => {
    setIsEditing(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div
          className="h-32 relative"
          style={{
            background:
              "linear-gradient(90deg,rgba(15, 61, 26, 1) 1%, rgba(31, 110, 42, 1) 50%, rgba(50, 160, 65, 1) 100%)",
          }}
        >
          <div className="absolute -bottom-14 left-6">
            <div className="relative">
              {tempPhoto ? (
                <img src={tempPhoto} alt="Profile" className="w-28 h-28 rounded-full border-4 border-card object-cover" />
              ) : (
                <div className="w-28 h-28 rounded-full border-4 border-card flex items-center justify-center text-3xl font-bold text-white" style={{ background: "var(--primary)" }}>
                  RM
                </div>
              )}
              {isEditing && (
                <label className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-accent hover:opacity-90 flex items-center justify-center cursor-pointer shadow-lg transition-opacity">
                  <Upload size={16} className="text-white" />
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="pt-16 px-6 pb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{name}</h2>
              <p className="text-sm text-muted-foreground">{role}</p>
            </div>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "var(--accent)" }}
              >
                <User size={15} /> Editar Perfil
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: "var(--accent)" }}
                >
                  <CheckCircle size={15} /> Salvar
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Nome Completo</label>
              {isEditing ? (
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ) : (
                <p className="text-sm text-foreground">{name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">SIAPE</label>
              {isEditing ? (
                <input
                  type="text"
                  value={siape}
                  onChange={e => setSiape(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ) : (
                <p className="text-sm text-foreground font-mono">{siape}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">E-mail Institucional</label>
              {isEditing ? (
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ) : (
                <p className="text-sm text-foreground">{email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Telefone</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ) : (
                <p className="text-sm text-foreground">{phone}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Cargo / FunÃ§Ã£o</label>
              {isEditing ? (
                <input
                  type="text"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ) : (
                <p className="text-sm text-foreground">{role}</p>
              )}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-sm font-bold text-foreground mb-3" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>InformaÃ§Ãµes da Conta</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">NÃ­vel de Acesso</p>
                  <p className="text-sm text-foreground font-medium">Administrador</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Ãšltimo Acesso</p>
                  <p className="text-sm text-foreground font-medium">{new Date().toLocaleDateString("pt-BR")} Ã s 14:32</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// â”€â”€ Placeholder screens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PlaceholderScreen({ label }: { label: string }) {
  return (
    <div className="p-12 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
        <Star size={28} className="text-muted-foreground" />
      </div>
      <p className="font-bold text-foreground text-lg" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{label}</p>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">Esta seÃ§Ã£o estÃ¡ em desenvolvimento e estarÃ¡ disponÃ­vel em breve.</p>
    </div>
  );
}

// â”€â”€ Root App â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function App({
  currentUser: loggedInUser,
  onLogout,
}: {
  currentUser: LoggedInUser;
  onLogout: () => void;
}) {
  const currentUser: User = {
    id: loggedInUser.siape,
    siape: loggedInUser.siape,
    name: loggedInUser.name,
    email: "",
    role: "Coordenadora",
  };
  const [activeNav, setActiveNav] = useState<Screen>("overview");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [careLogs, setCareLogs] = useState<CareLog[]>(INITIAL_TIMELINE_EVENTS);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [meetings, setMeetings] = useState<MeetingEvent[]>(INITIAL_MEETINGS);
  const [occurrences, setOccurrences] = useState<Occurrence[]>(INITIAL_OCCURRENCES);
  const [meetingPrefilledStudent, setMeetingPrefilledStudent] = useState<Student | null>(null);
  const [occurrencePrefilledStudent, setOccurrencePrefilledStudent] = useState<Student | null>(null);

  const [students, setStudents] = useState<Student[]>(STUDENTS);

  const [staffList, setStaffList] = useState<StaffMember[]>(
    INITIAL_STAFF.map(member => ({
      ...member,
      students: STUDENTS.filter(student => student.teachers.includes(member.name)),
    }))
  );

  useEffect(() => {
    let active = true;

    const loadBackendData = async () => {
      try {
        const [backendStudents, backendMeetings, backendOccurrences, backendUsuarios] = await Promise.all([
          apiClient.getAlunos(),
          apiClient.getReunioes(),
          apiClient.getOcorrencias(),
          apiClient.getUsuarios(),
        ]);

        if (!active) return;

        setStudents(backendStudents.map(toStudent));
        setMeetings(backendMeetings.map(toMeeting));
        setOccurrences(backendOccurrences.map(toOccurrence));
        setStaffList(
          backendUsuarios
            .filter((usuario) => usuario.cargo !== "Coordenador")
            .map(toStaffMember)
        );
      } catch (error) {
        console.error("Erro ao carregar dados do backend:", error);
      }
    };

    loadBackendData();

    return () => {
      active = false;
    };
  }, []);

  // Filtrar estudantes baseado no role do usuÃ¡rio
  const getVisibleStudents = (): Student[] => {
    if (!currentUser) return [];
    if (currentUser.role === "Coordenadora") {
      return students; // Coordenadora vÃª todos
    } else if (currentUser.role === "Acompanhadora") {
      // Acompanhadora vÃª apenas seus alunos
      const accompStudentIds = ACOMPANHADORA_STUDENTS[currentUser.id] || [];
      return students.filter(s => accompStudentIds.includes(s.id));
    }
    return [];
  };


  const handleNav = (s: Screen) => {
    setActiveNav(s);
    setSelectedStudent(null);
    setShowLog(false);
    setMeetingPrefilledStudent(null);
    setOccurrencePrefilledStudent(null);
  };

  const handleSelectStudent = (id: string) => {
    setSelectedStudent(id);
    setActiveNav("students");
    setShowLog(false);
  };

  const handleScheduleMeeting = (student: Student) => {
    setMeetingPrefilledStudent(student);
    setActiveNav("meetings");
    setSelectedStudent(null);
    setShowLog(false);
  };

  const handleCreateOccurrence = (student: Student) => {
    setOccurrencePrefilledStudent(student);
    setActiveNav("occurrences");
    setSelectedStudent(null);
    setShowLog(false);
  };

  const handleOpenProfile = () => {
    setActiveNav("profile");
    setSelectedStudent(null);
    setShowLog(false);
    setMeetingPrefilledStudent(null);
    setOccurrencePrefilledStudent(null);
  };

  const handleLogout = () => {
    setActiveNav("overview");
    setSelectedStudent(null);
    setShowLog(false);
    setMeetingPrefilledStudent(null);
    setOccurrencePrefilledStudent(null);
    onLogout();
  };


  const TITLES: Record<Screen, string> = {
    overview: "VisÃ£o Geral",
    students: selectedStudent ? "ProntuÃ¡rio EletrÃ´nico" : "GestÃ£o de Alunos",
    servers: "Corpo Docente",
    log: "Registrar Atendimento",
    meetings: "ReuniÃµes",
    occurrences: "OcorrÃªncias",
    profile: "Meu Perfil",
    record: "ProntuÃ¡rio",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="w-60 flex-shrink-0">
        <Sidebar current={activeNav} onNav={handleNav} onLogout={handleLogout} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title={TITLES[activeNav]} onOpenProfile={handleOpenProfile} />

        {/* Breadcrumb for student record */}
        {activeNav === "students" && selectedStudent && !showLog && (
          <div className="px-6 py-2.5 bg-card border-b border-border flex items-center gap-1.5 text-xs text-muted-foreground">
            <button onClick={() => setSelectedStudent(null)} className="hover:text-foreground transition-colors flex items-center gap-1"><ChevronLeft size={12} /> Alunos</button>
            <ChevronRight size={12} />
            <span className="text-foreground font-medium">{students.find(s => s.id === selectedStudent)?.name}</span>
          </div>
        )}
        {showLog && (
          <div className="px-6 py-2.5 bg-card border-b border-border flex items-center gap-1.5 text-xs text-muted-foreground">
            <button onClick={() => setShowLog(false)} className="hover:text-foreground transition-colors flex items-center gap-1"><ChevronLeft size={12} /> ProntuÃ¡rio</button>
            <ChevronRight size={12} />
            <span className="text-foreground font-medium">Novo Atendimento</span>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          {activeNav === "overview" && <OverviewScreen onNav={handleNav} />}
          {activeNav === "students" && !selectedStudent && <StudentsScreen
              students={students}
              setStudents={setStudents}
              onSelectStudent={handleSelectStudent}
            />}
          {activeNav === "students" && selectedStudent && !showLog && (
            <StudentRecord
              student={students.find((student) => student.id === selectedStudent)!}
              onBack={() => setSelectedStudent(null)}
              onLog={() => setShowLog(true)}
              onScheduleMeeting={handleScheduleMeeting}
              onCreateOccurrence={handleCreateOccurrence}
            />
          )}
          {activeNav === "students" && selectedStudent && showLog && (
            <LogScreen onBack={() => setShowLog(false)} />
          )}
          {activeNav === "log" && (
            <CareLogScreen 
              careLogs={careLogs} 
              onAddLogClick={() => setIsLogModalOpen(true)} 
            />
          )}
          {activeNav === "servers" && (
            <CorpoDocenteView staffList={staffList} setStaffList={setStaffList} />
          )}
          {activeNav === "meetings" && (
            <MeetingsScreen
              meetings={meetings}
              setMeetings={setMeetings}
              prefilledStudent={meetingPrefilledStudent}
            />
          )}
          {activeNav === "occurrences" && (
            <OccurrencesScreen occurrences={occurrences} setOccurrences={setOccurrences} prefilledStudent={occurrencePrefilledStudent} students={students} />
          )}
          {activeNav === "profile" && <ProfileScreen />}
        </main>
      </div>
    </div>
  );
}











