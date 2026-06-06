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
  Atendimento as BackendAtendimento,
  Reuniao as BackendReuniao,
  Usuario as BackendUsuario,
  Prontuario,
  Documentacao,
} from "../services/api";
import { appRoleLabel, cargoDisplayLabel } from "../lib/auth";


const COURSE_SEMESTERS = Array.from({ length: 6 }, (_, i) => `${i + 1}º Semestre`);
const DOCUMENT_TYPES = ["anamnese - familia", "anamnese - estudante", "PEI"] as const;

const parseResponsavelFromObservacao = (observacao?: string | null) => {
  if (!observacao) return null;
  const match = observacao.match(/Responsável:\s*([^\n]+)/i);
  return match?.[1]?.trim() || null;
};

const formatCidDisplay = (cid?: string | null) => {
  const value = cid?.trim();
  if (!value || value === "Não informado") return "—";
  return value;
};

const staffDisplayName = (
  nome?: string | null,
  usuarioId?: number,
  cargo?: string | null
) => {
  if (nome?.trim()) return nome.trim();
  if (cargo === "Acompanhante" || cargo === "Agente") return "Acompanhante";
  if (usuarioId) return `Servidor #${usuarioId}`;
  return "—";
};

const staffTimelineLabel = (
  nome?: string | null,
  usuarioId?: number,
  cargo?: string | null
) => {
  const name = staffDisplayName(nome, usuarioId, cargo);
  const role = cargo === "Coordenador" ? "Coordenador" : "Acompanhante";
  return `${role}: ${name}`;
};

type Screen = "overview" | "students" | "servers" | "record" | "log" | "meetings" | "profile";
type AppMode = "coordenador" | "acompanhante";
type UserRole = "Coordenador" | "Acompanhante";
type MeetingStatus = "Agendada" | "Concluída" | "Pendente";

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
  lastCareDate?: string; // Data do último atendimento
  editable?: boolean; // Flag para controle de edição
  companionId?: string;
  companionName?: string;
  turmaId?: number;
}

interface StaffMember {
  id: string;
  name: string;
  role: "Acompanhante" | "Coordenador";
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
  completedAt?: string; // Data/hora de conclusão
  completedBy?: string; // Quem completou
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

type ActivityKind = "student" | "staff" | "meeting" | "care" | "removal";

interface RecentActivity {
  id: string;
  kind: ActivityKind;
  title: string;
  description: string;
  actor: string;
  date: string;
  time: string;
  createdAt: string;
}

type RecentActivityInput = Omit<RecentActivity, "id" | "createdAt" | "date" | "time"> &
  Partial<Pick<RecentActivity, "id" | "createdAt" | "date" | "time">>;

// Função utilitária para calcular dias desde última data
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
    "Deficiência Visual": "purple",
    "Deficiência Auditiva": "indigo",
    "Altas Habilidades": "teal",
    Dislexia: "rose",
  };

  return colors[need] ?? "green";
};

const toStudent = (
  aluno: BackendAluno,
  turmaByAluno: Map<number, { id: number }> = new Map()
): Student => ({
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
  turmaId: turmaByAluno.get(aluno.id)?.id,
  companionId: aluno.acompanhante_id ? String(aluno.acompanhante_id) : undefined,
  companionName: aluno.acompanhante_nome ?? undefined,
});

const toMeeting = (
  reuniao: BackendReuniao,
  studentsById: Map<number, Student> = new Map()
): MeetingEvent => {
  const studentName = reuniao.aluno_id
    ? studentsById.get(reuniao.aluno_id)?.name ?? `Aluno #${reuniao.aluno_id}`
    : "Aluno não informado";

  return {
    id: reuniao.id,
    studentName,
    date: reuniao.data_reuniao,
    time: reuniao.horario_inicio?.slice(0, 5) ?? "09:00",
    description: reuniao.descricao ?? "",
    teachers: [],
    type: reuniao.titulo,
    status:
      reuniao.status === "Realizada"
        ? "Concluída"
        : reuniao.status === "Pendente"
          ? "Pendente"
          : "Agendada",
  };
};

const dateParts = (dateValue?: string | null) => {
  const source = dateValue ? new Date(dateValue) : new Date();
  const valid = Number.isNaN(source.getTime()) ? new Date() : source;
  return {
    date: valid.toLocaleDateString("pt-BR"),
    time: valid.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    createdAt: valid.toISOString(),
  };
};

const toCareLog = (
  atendimento: BackendAtendimento,
  studentsById: Map<number, Student>,
  usersById: Map<number, BackendUsuario>
): CareLog => {
  const { date, time } = dateParts(atendimento.data_atendimento);
  return {
    id: atendimento.id,
    studentName: studentsById.get(atendimento.aluno_id)?.name ?? `Aluno #${atendimento.aluno_id}`,
    date,
    time,
    type: atendimento.tipo || "Atendimento",
    staff: staffTimelineLabel(
      atendimento.usuario_nome ?? usersById.get(atendimento.usuario_id)?.nome,
      atendimento.usuario_id,
      atendimento.usuario_cargo ?? usersById.get(atendimento.usuario_id)?.cargo
    ),
    text: atendimento.descricao ?? "",
  };
};

const activityFromCareLog = (log: CareLog): RecentActivity => ({
  id: `care-${log.id}`,
  kind: "care",
  title: `${log.type} registrado`,
  description: `${log.studentName}${log.text ? ` - ${log.text}` : ""}`,
  actor: log.staff,
  date: log.date,
  time: log.time,
  createdAt: `${log.date.split("/").reverse().join("-")}T${log.time || "00:00"}:00`,
});

const activityFromMeeting = (meeting: MeetingEvent): RecentActivity => ({
  id: `meeting-${meeting.id}`,
  kind: "meeting",
  title: `${meeting.type} agendada`,
  description: `${meeting.studentName}${meeting.description ? ` - ${meeting.description}` : ""}`,
  actor: "Coordenação",
  date: meeting.date.split("-").reverse().join("/"),
  time: meeting.time,
  createdAt: `${meeting.date}T${meeting.time || "00:00"}:00`,
});

const toStaffMember = (usuario: BackendUsuario): StaffMember | null => {
  if (usuario.cargo === "Coordenador") {
    return {
      id: String(usuario.id),
      name: usuario.nome,
      role: "Coordenador",
      email: usuario.email,
      siape: usuario.siape,
      students: [],
    };
  }

  if (usuario.cargo === "Acompanhante" || usuario.cargo === "Agente") {
    return {
      id: String(usuario.id),
      name: usuario.nome,
      role: "Acompanhante",
      email: usuario.email,
      siape: usuario.siape,
      students: [],
    };
  }

  return null;
};



//  Utility components 
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

//  Sidebar 
const NAV_ITEMS_COORDENADOR = [
  { id: "overview", label: "Visão Geral", icon: LayoutDashboard },
  { id: "students", label: "Alunos", icon: Users },
  { id: "servers", label: "Corpo Docente", icon: Users },
  { id: "log", label: "Atendimentos", icon: Activity },
  { id: "meetings", label: "Reuniões", icon: CalendarDays },
];

const NAV_ITEMS_ACOMPANHANTE = [
  { id: "overview", label: "Visão Geral", icon: LayoutDashboard },
  { id: "students", label: "Alunos", icon: Users },
  { id: "log", label: "Atendimentos", icon: Activity },
  { id: "meetings", label: "Reuniões", icon: CalendarDays },
];

function Sidebar({
  current,
  onNav,
  onLogout,
  currentUser,
  studentCount,
  navItems,
  roleLabel,
}: {
  current: string;
  onNav: (s: Screen) => void;
  onLogout: () => void;
  currentUser: User;
  studentCount: number;
  navItems: typeof NAV_ITEMS_COORDENADOR;
  roleLabel: string;
}) {
  const initials = currentUser.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
            <p className="text-[10px] leading-tight" style={{ color: "var(--sidebar-foreground)" }}>IFMS · Campus Três Lagoas</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-2" style={{ color: "var(--sidebar-foreground)", opacity: 0.5 }}>Menu Principal</p>
        <ul className="space-y-0.5">
          {navItems.map(({ id, label, icon: Icon }) => {
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
                  {id === "students" && <span className="ml-auto text-[10px] font-mono text-white px-1.5 py-0.5 rounded" style={{ background: "var(--accent)" }}>{studentCount}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="px-3 pb-4">
        <div className="flex items-center gap-2.5 p-2.5 rounded-md" style={{ background: "var(--sidebar-accent)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent)" }}>
            <span className="text-white text-xs font-bold">{initials || "EM"}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-semibold leading-tight truncate">{currentUser.name}</p>
            <p className="text-[10px] leading-tight" style={{ color: "var(--sidebar-foreground)" }}>{roleLabel}</p>
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

//  Topbar 
function Topbar({ title, onOpenProfile, currentUser, roleLabel }: { title: string; onOpenProfile: () => void; currentUser: User; roleLabel: string }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const initials = currentUser.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
            <span className="text-white text-xs font-bold">{initials || "EM"}</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-foreground leading-tight">{currentUser.name}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{roleLabel}</p>
          </div>
          <ChevronDown size={14} className="text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}

//  SCREEN: Login 
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
            Inclusão com<br />tecnologia e cuidado.
          </h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-sm">
            Plataforma de gestão e acompanhamento de estudantes com necessidades educacionais específicas do Campus Três Lagoas.
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
              <label className="text-sm font-medium text-foreground block mb-1.5">Matrícula SIAPE</label>
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
                  placeholder=""
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
              <p className="text-xs font-semibold text-blue-900 mb-2"> Usuários de Teste</p>
              
            </div>
            <div className="p-3 rounded-lg bg-secondary/60 border border-border">
              <p className="text-xs text-muted-foreground text-center">
                <Shield size={12} className="inline mr-1" />
                Dados protegidos conforme LGPD · Acesso restrito a servidores autorizados
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

//  SCREEN: Overview (Dashboard) 
function OverviewScreen({
  students,
  meetings,
  careLogs,
  recentActivities,
  onNav,
}: {
  students: Student[];
  meetings: MeetingEvent[];
  careLogs: CareLog[];
  recentActivities: RecentActivity[];
  onNav: (s: Screen) => void;
}) {
  const [showPendingCareModal, setShowPendingCareModal] = useState(false);
  const activeStudents = students.filter((student) => student.status === "Ativo").length;
  const studentsPendingCare = students.filter(
    (student) => !careLogs.some((log) => log.studentName === student.name)
  );
  const pendingCareLogs = studentsPendingCare.length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const meetingsThisWeek = meetings.filter((meeting) => {
    const meetingDate = new Date(`${meeting.date}T00:00:00`);
    return meetingDate >= startOfWeek && meetingDate < endOfWeek;
  });
  const nextMeeting = [...meetings]
    .filter((meeting) => new Date(`${meeting.date}T${meeting.time || "00:00"}`) >= today)
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))[0];
  const overdueMeetings = meetings.filter((meeting) => {
    const meetingDate = new Date(`${meeting.date}T${meeting.time || "00:00"}`);
    return meetingDate < today && meeting.status !== "Concluída";
  });
  const studentsWithoutPei = students.filter(
    (student) => !careLogs.some((log) =>
      log.studentName === student.name &&
      `${log.type} ${log.text}`.toLowerCase().includes("pei")
    )
  );
  const studentsWithDocumentPending = students.filter((student) => student.alert);
  const criticalAlerts = [
    ...overdueMeetings.map((meeting) => ({
      id: `meeting-${meeting.id}`,
      title: `${meeting.type} não realizada`,
      description: `${meeting.studentName} - ${meeting.date.split("-").reverse().join("/")} às ${meeting.time}`,
    })),
    ...studentsWithoutPei.map((student) => ({
      id: `pei-${student.id}`,
      title: student.name,
      description: "Adicionar documento de PEI",
    })),
    ...studentsWithDocumentPending.map((student) => ({
      id: `doc-${student.id}`,
      title: student.name,
      description: "Pendência de documento",
    })),
  ];
  const sortedActivities = [...recentActivities]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);
  const activityIcon = (kind: ActivityKind) => {
    if (kind === "student") return <Users size={14} className="text-emerald-600" />;
    if (kind === "staff") return <Shield size={14} className="text-blue-600" />;
    if (kind === "meeting") return <CalendarDays size={14} className="text-indigo-600" />;
    if (kind === "removal") return <Trash2 size={14} className="text-red-600" />;
    return <Activity size={14} className="text-amber-600" />;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
            icon={Users}
            label="Alunos Ativos"
            value={activeStudents}
            sub={`${students.length} aluno${students.length !== 1 ? "s" : ""} cadastrado${students.length !== 1 ? "s" : ""}`}
            color="bg-primary"
            onClick={() => onNav("students")}
      />
        <KpiCard icon={Clock} label="Atend. Pendentes" value={pendingCareLogs} sub="Aguardando registro" color="bg-amber-500" onClick={() => setShowPendingCareModal(true)} />
        <KpiCard
          icon={CalendarDays}
          label="Reuniões na Semana"
          value={meetingsThisWeek.length}
          sub={nextMeeting ? `Próxima: ${nextMeeting.date.split("-").reverse().join("/")} às ${nextMeeting.time}` : "Nenhuma reunião agendada"}
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
            {sortedActivities.map((activity) => (
              <li key={activity.id} className="px-5 py-3.5 flex gap-4 hover:bg-secondary/30 transition-colors">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                  {activityIcon(activity.kind)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.actor}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">{activity.date} · {activity.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{activity.description}</p>
                </div>
              </li>
            ))}
            {sortedActivities.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-muted-foreground">
                Nenhuma atividade cadastrada.
              </li>
            )}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-3.5 border-b border-border flex items-center gap-2">
              <AlertCircle size={15} className="text-red-500" />
              <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Alertas Críticos</h2>
              <span className="ml-auto font-mono text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded">{criticalAlerts.length}</span>
            </div>
            {criticalAlerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="px-4 py-3 flex items-start gap-2.5 border-b border-border last:border-0">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-red-500" />
                <div>
                  <p className="text-xs font-medium text-foreground">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">{alert.description}</p>
                </div>
              </div>
            ))}
            {criticalAlerts.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                Nenhum alerta crítico no momento.
              </div>
            )}
          </div>

          <div className="bg-card rounded-lg border border-border">
            <div className="px-4 py-3.5 border-b border-border">
              <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Agenda da Semana</h2>
            </div>
            {meetingsThisWeek.map((m, i) => (
              <div key={i} className="px-4 py-3 flex gap-3 border-b border-border last:border-0">
                <div className="w-1 rounded-full self-stretch bg-blue-500" />
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground">{m.date.split("-").reverse().join("/")} · {m.time}</p>
                  <p className="text-xs font-medium text-foreground mt-0.5">{m.type} · {m.studentName.split(" ")[0]}</p>
                </div>
              </div>
            ))}
            {meetingsThisWeek.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                Nenhuma reunião na semana.
              </div>
            )}
          </div>

          <button onClick={() => onNav("students")} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90" style={{ background: "var(--primary)" }}>
            <Users size={16} /> Ver Alunos
          </button>
        </div>
      </div>

      {showPendingCareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(13,28,54,0.7)" }}>
          <div className="bg-card rounded-xl border border-border w-full max-w-lg shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <p className="font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Atendimentos Pendentes</p>
                <p className="text-xs text-muted-foreground mt-0.5">Alunos aguardando o primeiro registro de atendimento.</p>
              </div>
              <button onClick={() => setShowPendingCareModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-border">
              {studentsPendingCare.length > 0 ? studentsPendingCare.map((student) => (
                <div key={student.id} className="px-6 py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{student.name}</p>
                    <p className="text-xs text-muted-foreground">{student.course} - {student.year}</p>
                  </div>
                  <Badge text="Aguardando registro" color="amber" />
                </div>
              )) : (
                <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                  Nenhum atendimento pendente.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

//  SCREEN: Students 
function StudentsScreen({
  students,
  setStudents,
  staffList,
  setStaffList,
  onSelectStudent,
  onActivity,
  canDeleteStudent = false,
}: {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  staffList: StaffMember[];
  setStaffList: React.Dispatch<React.SetStateAction<StaffMember[]>>;
  onSelectStudent: (id: string) => void;
  onActivity: (activity: RecentActivityInput) => void;
  canDeleteStudent?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [filterCourse, setFilterCourse] = useState("Todos");
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);

  const [newStudentName, setNewStudentName] = useState("");
  const [newRegistration, setNewRegistration] = useState("");
  const [newCpf, setNewCpf] = useState("");
  const [newBirthDate, setNewBirthDate] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCourse, setNewCourse] = useState("Técnico em Informática");
  const [newYear, setNewYear] = useState(COURSE_SEMESTERS[0]);
  const [newNeed, setNewNeed] = useState("");
  const [newCid, setNewCid] = useState("");
  const [newResponsavel, setNewResponsavel] = useState("");
  const [newResponsavelEmail, setNewResponsavelEmail] = useState("");
  const [newHistorico, setNewHistorico] = useState("");
  const [newObservacao, setNewObservacao] = useState("");
  const [newCompanionId, setNewCompanionId] = useState("");
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [modalError, setModalError] = useState("");
  const [isSavingStudent, setIsSavingStudent] = useState(false);

  const normalizeCpf = (cpf: string) => cpf.replace(/\D/g, "");

  const isStep1Valid =
    newStudentName.trim().length >= 3 &&
    newRegistration.trim().length >= 1 &&
    normalizeCpf(newCpf).length === 11 &&
    newBirthDate !== "";

  const isStep2Valid =
    newCourse.trim().length >= 1 &&
    newYear.trim().length >= 1 &&
    newNeed.trim().length >= 1;

  const canSaveStudent = isStep1Valid && isStep2Valid;

  const resetStudentForm = () => {
    setNewStudentName("");
    setNewRegistration("");
    setNewCpf("");
    setNewBirthDate("");
    setNewPhone("");
    setNewCourse("Técnico em Informática");
    setNewYear(COURSE_SEMESTERS[0]);
    setNewNeed("");
    setNewCid("");
    setNewResponsavel("");
    setNewResponsavelEmail("");
    setNewHistorico("");
    setNewObservacao("");
    setNewCompanionId("");
    setModalError("");
    setModalStep(1);
  };

  const getStepValidationMessage = (step: number) => {
    if (step === 1) {
      if (newStudentName.trim().length < 3) return "Informe o nome completo (mínimo 3 caracteres).";
      if (!newRegistration.trim()) return "Informe a matrícula.";
      if (normalizeCpf(newCpf).length !== 11) return "Informe um CPF válido com 11 dígitos.";
      if (!newBirthDate) return "Informe a data de nascimento.";
    }
    if (step === 2) {
      if (!newCourse.trim()) return "Selecione o curso.";
      if (!newYear.trim()) return "Selecione o semestre.";
      if (!newNeed.trim()) return "Informe a NEE.";
    }
    return "";
  };

  const handleNextStep = () => {
    const message = getStepValidationMessage(modalStep);
    if (message) {
      setModalError(message);
      return;
    }
    setModalError("");
    setModalStep((step) => step + 1);
  };

  const needs = ["Todas", "TEA", "TDAH", "Deficiência Visual", "Deficiência Auditiva", "Altas Habilidades", "Dislexia"];
  const courseFilters = ["Todos", "Técnico em Informática", "Técnico em Eletrotécnica"];
  const companions = staffList.filter((member) => member.role === "Acompanhante");
  const filtered = students.filter(s =>
    (filterCourse === "Todos" || s.course === filterCourse) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || s.registration.includes(search))
  );

  const handleSaveStudent = async () => {
    setRequestMessage("");
    setModalError("");

    const step1Message = getStepValidationMessage(1);
    const step2Message = getStepValidationMessage(2);
    if (step1Message || step2Message) {
      setModalError(step1Message || step2Message);
      if (step1Message) setModalStep(1);
      else if (step2Message) setModalStep(2);
      return;
    }

    setIsSavingStudent(true);
    try {
    const selectedCompanion = companions.find((member) => member.id === newCompanionId);
    const observacaoParts = [newHistorico.trim(), newObservacao.trim()].filter(Boolean);
    const responsavelNome = newResponsavel.trim();
    const telefoneContato = newPhone.trim();
    const telefoneDigits = telefoneContato.replace(/\D/g, "");
    let responsavelId: number | undefined;

    if (responsavelNome && telefoneDigits.length >= 8) {
      const responsavel = await apiClient.createResponsavel({
        nome: responsavelNome,
        telefone: telefoneContato,
        email: newResponsavelEmail.trim() || undefined,
      });
      responsavelId = responsavel.id;
    } else if (responsavelNome) {
      observacaoParts.unshift(`Responsável: ${responsavelNome}`);
    }

    const savedStudent = await apiClient.createAluno({
      matricula: newRegistration.trim(),
      nome: newStudentName.trim(),
      data_nascimento: newBirthDate,
      cpf: normalizeCpf(newCpf),
      telefone: telefoneContato || undefined,
      curso: newCourse,
      ano: newYear,
      necessidade_especial: newNeed,
      cid: newCid.trim() || "Não informado",
      observacao: observacaoParts.join("\n\n") || undefined,
      responsavel_id: responsavelId,
      acompanhante_id: selectedCompanion ? Number(selectedCompanion.id) : undefined,
    });

    const now = new Date();
    const semestre = now.getMonth() < 6 ? "1" : "2" as const;
    let turmaId: number | undefined;
    try {
      const turma = await apiClient.createTurma({
        aluno_id: savedStudent.id,
        ano_letivo: now.getFullYear(),
        semestre,
      });
      turmaId = turma.id;
    } catch {
      // turma pode já existir para o ciclo
    }

    const newStudent: Student = {
      ...toStudent(savedStudent, turmaId ? new Map([[savedStudent.id, { id: turmaId }]]) : new Map()),
      needColor: needColorFor(newNeed),
      teachers: selectedCompanion ? [selectedCompanion.name] : [],
      companionId: selectedCompanion?.id,
      companionName: selectedCompanion?.name,
      turmaId,
    };

    setStudents(prev => [...prev, newStudent]);
    onActivity({
      kind: "student",
      title: "Aluno adicionado",
      description: `${newStudent.name} - ${newStudent.course} ${newStudent.year}`,
      actor: "Coordenação",
    });
    if (selectedCompanion) {
      setStaffList(prev => prev.map((member) =>
        member.id === selectedCompanion.id
          ? { ...member, students: [...(member.students ?? []), newStudent] }
          : member
      ));
    }

    resetStudentForm();
    setShowModal(false);
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Erro ao cadastrar aluno");
    } finally {
      setIsSavingStudent(false);
    }
  };

  const handleRemoveStudent = async (student: Student) => {
    const confirmed = window.confirm(`Remover o aluno ${student.name}? Ele deixara de aparecer nas listagens ativas.`);
    if (!confirmed) return;

    setRequestMessage("");
    setRemovingStudentId(student.id);
    try {
      await apiClient.deleteAluno(Number(student.id));
      setStudents(prev => prev.filter((current) => current.id !== student.id));
      setStaffList(prev => prev.map((member) => ({
        ...member,
        students: member.students?.filter((current) => current.id !== student.id),
      })));
      onActivity({
        kind: "removal",
        title: "Aluno removido",
        description: `${student.name} saiu das listagens ativas`,
        actor: "Coordenação",
      });
    } catch (error) {
      setRequestMessage(error instanceof Error ? error.message : "Erro ao remover aluno");
    } finally {
      setRemovingStudentId(null);
    }
  };

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
            <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} className="pl-9 pr-8 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer">
              {courseFilters.map(course => <option key={course}>{course}</option>)}
            </select>
          </div>
          <button onClick={() => { resetStudentForm(); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white whitespace-nowrap transition-all hover:opacity-90" style={{ background: "var(--accent)" }}>
            <Plus size={15} /> Adicionar Aluno
          </button>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Estudantes Cadastrados</p>
            {requestMessage && <p className="text-xs text-red-600 mt-1">{requestMessage}</p>}
          </div>
          <span className="font-mono text-xs text-muted-foreground">{filtered.length} resultado{filtered.length !== 1 && "s"}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["Nome / Matrícula", "NEE", "Curso / Turma", "Ano", "Acompanhante", "Status", "Ações"].map(h => (
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
                  <td className="px-5 py-3.5 text-xs text-foreground">{s.companionName || "—"}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={s.status} /></td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => onSelectStudent(s.id)} className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md hover:bg-secondary" style={{ color: "var(--accent)" }}>
                        <Eye size={13} /> Prontuário
                      </button>
                      {canDeleteStudent && (
                        <button
                          onClick={() => handleRemoveStudent(s)}
                          disabled={removingStudentId === s.id}
                          title="Remover aluno"
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-8 h-8 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={`Remover aluno ${s.name}`}
                        >
                          {removingStudentId === s.id ? <Clock size={13} /> : <Trash2 size={13} />}
                        </button>
                      )}
                    </div>
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
                <p className="text-xs text-muted-foreground mt-0.5">Etapa {modalStep} de 3: {modalStep === 1 ? "Dados Pessoais" : modalStep === 2 ? "Informações Acadêmicas" : "Anamnese Inicial"}</p>
              </div>
              <button onClick={() => { setShowModal(false); resetStudentForm(); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"><X size={16} className="text-muted-foreground" /></button>
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
                          placeholder="Ex: João Carlos da Silva"
                          className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        /></div>
                  <div><label className="text-xs font-medium text-foreground block mb-1">Matrícula *</label><input
  value={newRegistration}
  onChange={e => setNewRegistration(e.target.value)}
  placeholder="2025001"
  className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
 /></div>
                  <div><label className="text-xs font-medium text-foreground block mb-1">CPF *</label><input value={newCpf} onChange={e => setNewCpf(e.target.value)} placeholder="000.000.000-00" className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  <div><label className="text-xs font-medium text-foreground block mb-1">Data de Nascimento *</label><input type="date" value={newBirthDate} onChange={e => setNewBirthDate(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  <div><label className="text-xs font-medium text-foreground block mb-1">Contato / WhatsApp</label><input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="(67) 9 9999-9999" className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                </div>
              )}
              {modalStep === 2 && (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-foreground block mb-1">Curso *</label><select value={newCourse} onChange={e => setNewCourse(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"><option>Técnico em Informática</option><option>Técnico em Eletrotécnica</option></select></div>
                  <div><label className="text-xs font-medium text-foreground block mb-1">Semestre *</label><select value={newYear} onChange={e => setNewYear(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">{COURSE_SEMESTERS.map((semester) => <option key={semester}>{semester}</option>)}</select></div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-foreground block mb-1">NEE *</label>
                    <input
                      value={newNeed}
                      onChange={e => setNewNeed(e.target.value)}
                      placeholder="Ex: TEA, TDAH, Deficiência Visual..."
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="col-span-2"><label className="text-xs font-medium text-foreground block mb-1">Acompanhante</label><select value={newCompanionId} onChange={e => setNewCompanionId(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"><option value="">Selecione um acompanhante...</option>{companions.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></div>
                  <div className="col-span-2"><label className="text-xs font-medium text-foreground block mb-1">CID-10</label><input value={newCid} onChange={e => setNewCid(e.target.value)} placeholder="Ex: F84.0" className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                </div>
              )}
              {modalStep === 3 && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Informações da entrevista familiar inicial (Anamnese).</p>
                  <div><label className="text-xs font-medium text-foreground block mb-1">Nome do Responsável Principal</label><input value={newResponsavel} onChange={e => setNewResponsavel(e.target.value)} placeholder="Nome completo" className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  <div><label className="text-xs font-medium text-foreground block mb-1">E-mail do Responsável</label><input type="email" value={newResponsavelEmail} onChange={e => setNewResponsavelEmail(e.target.value)} placeholder="email@exemplo.com" className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  <div><label className="text-xs font-medium text-foreground block mb-1">Histórico Médico / Diagnóstico Resumido</label><textarea value={newHistorico} onChange={e => setNewHistorico(e.target.value)} rows={3} placeholder="Descreva o histórico do aluno..." className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  <div><label className="text-xs font-medium text-foreground block mb-1">Observações / Preferências de Comunicação</label><textarea value={newObservacao} onChange={e => setNewObservacao(e.target.value)} rows={2} placeholder="Outras informações relevantes..." className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                </div>
              )}
            </div>
            {modalError && (
              <div className="px-6 pb-2">
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{modalError}</p>
              </div>
            )}
            <div className="px-6 pb-5 flex items-center justify-between gap-3">
              <button onClick={() => modalStep > 1 ? (setModalError(""), setModalStep(s => s - 1)) : (setShowModal(false), resetStudentForm())} className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">{modalStep > 1 ? "Voltar" : "Cancelar"}</button>
              <button
                onClick={() => modalStep < 3 ? handleNextStep() : handleSaveStudent()}
                disabled={
                  isSavingStudent ||
                  (modalStep === 1 && !isStep1Valid) ||
                  (modalStep === 2 && !isStep2Valid) ||
                  (modalStep === 3 && !canSaveStudent)
                }
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: modalStep === 3 ? "var(--accent)" : "var(--primary)" }}
              >
                {isSavingStudent ? "Salvando..." : modalStep === 3 ? "Salvar Cadastro" : "Próxima Etapa"}
              </button>
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
  onActivity,
}: {
  staffList: StaffMember[];
  setStaffList: React.Dispatch<React.SetStateAction<StaffMember[]>>;
  onActivity: (activity: RecentActivityInput) => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<"Todos" | "Acompanhante" | "Coordenador">("Todos");
  
  // Estado para controlar a navegação interna do perfil
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // Estados para o formulário de cadastro
  const [newName, setNewName] = useState('');
  const [newCargo, setNewCargo] = useState<"Acompanhante" | "Coordenador">("Acompanhante");
  const coordenadorCount = staffList.filter((m) => m.role === "Coordenador").length;

  const openAddMemberModal = () => {
    setNewCargo("Acompanhante");
    setRequestMessage("");
    setIsModalOpen(true);
  };
  const [newEmail, setNewEmail] = useState('');
  const [newSiape, setNewSiape] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [requestMessage, setRequestMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestMessage("");
    if (!newName.trim() || !newEmail.trim() || !newSiape.trim() || !newPassword.trim()) return;

    const siapeDigits = newSiape.replace(/\D/g, "");
    if (siapeDigits.length !== 7) {
      setRequestMessage("O SIAPE deve ter exatamente 7 dígitos.");
      return;
    }
    if (newPassword.trim().length < 8) {
      setRequestMessage("A senha inicial deve ter no mínimo 8 caracteres.");
      return;
    }
    if (newCargo === "Coordenador" && coordenadorCount >= 1) {
      setRequestMessage("Já existe um coordenador cadastrado. A equipe NAPNE tem apenas 1 coordenador.");
      return;
    }
    try {
      setIsSaving(true);
      const created = await apiClient.createUsuario({
        nome: newName.trim(),
        cargo: newCargo,
        email: newEmail.trim(),
        siape: siapeDigits,
        senha: newPassword.trim(),
      });

      const member = toStaffMember(created);
      if (member) {
        setStaffList((current) => [...current, member]);
        onActivity({
          kind: "staff",
          title: "Novo membro adicionado",
          description: `${member.name} - ${member.role}`,
          actor: "Coordenação",
        });
      }
      setNewName("");
      setNewEmail("");
      setNewSiape("");
      setNewPassword("");
      setIsModalOpen(false);
    } catch (error) {
      setRequestMessage(error instanceof Error ? error.message : "Erro ao cadastrar usuário");
    } finally {
      setIsSaving(false);
    }
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
        {/* Botão de Voltar e Nome */}
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

        {/* Informações Gerais em Barra Horizontal Completa */}
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
              <p className="text-[10px] font-bold text-gray-400 uppercase">Matrícula SIAPE</p>
              <p className="text-sm text-gray-700 font-mono">{currentStaff.siape}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><GraduationCap size={18} /></div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Alunos Vinculados</p>
              <p className="text-sm text-gray-700 font-bold">{currentStaff.students?.length || 0} alunos neste período</p>
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
                    <th className="py-3 px-4">Matrícula</th>
                    <th className="py-3 px-4">Curso / Ano</th>
                    <th className="py-3 px-4">Condição/Necessidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {currentStaff.students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-gray-700">{student.name}</td>
                      <td className="py-3 px-4 text-gray-500 font-mono text-xs">#{student.registration}</td>
                      <td className="py-3 px-4 text-gray-600">{student.course}  {student.year}</td>
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
              Nenhum aluno vinculado a este profissional no período selecionado.
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- TELA DE LISTAGEM PRINCIPAL (OCUPA A TELA TODA) ---
  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Equipe e Corpo Docente</h2>
          <p className="text-xs text-gray-500 mt-0.5">Gerencie os acessos, cargos e visualize as turmas de cada profissional.</p>
        </div>
        <button 
          onClick={openAddMemberModal}
          className="text-white px-4 py-2 rounded-lg font-medium text-sm transition shadow-sm hover:opacity-90"
          style={{ background: "var(--primary)" }}
        >
          + Adicionar Membro
        </button>
      </div>

      {/* Filtro por Tipo de Usuário */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["Todos", "Acompanhante", "Coordenador"] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setSelectedFilter(filter)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap ${
              selectedFilter === filter 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {filter === "Acompanhante" ? "Acompanhantes" : filter}
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
                <th className="py-3.5 px-6">Cargo / Função</th>
                <th className="py-3.5 px-6">SIAPE</th>
                <th className="py-3.5 px-6">E-mail Institucional</th>
                <th className="py-3.5 px-6 text-center">Ações</th>
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
                      member.role === 'Coordenador' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'
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

      {/* Modal / Formulário de Cadastro */}
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
                    onChange={(e) => setNewSiape(e.target.value.replace(/\D/g, "").slice(0, 7))}
                    placeholder="7 dígitos"
                    inputMode="numeric"
                    maxLength={7}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-[10px] text-gray-500 mt-1">O acompanhante usará o SIAPE e a senha inicial para entrar no sistema.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                  <select
                    value={newCargo}
                    onChange={(e) => setNewCargo(e.target.value as "Acompanhante" | "Coordenador")}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Acompanhante">Acompanhante</option>
                    <option value="Coordenador" disabled={coordenadorCount >= 1}>
                      Coordenador{coordenadorCount >= 1 ? " (já cadastrado)" : ""}
                    </option>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha inicial</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo de 8 caracteres"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {requestMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {requestMessage}
                </div>
              )}

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
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  {isSaving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


function AtendimentoModal({
  students,
  currentUser,
  staffList,
  mode,
  onClose,
  onSaved,
}: {
  students: Student[];
  currentUser: User;
  staffList: StaffMember[];
  mode: AppMode;
  onClose: () => void;
  onSaved: (log: CareLog) => void;
}) {
  const responsaveis = [
    { id: currentUser.id, name: currentUser.name, role: currentUser.role },
    ...staffList
      .filter((member) => member.role === "Acompanhante")
      .map((member) => ({ id: member.id, name: member.name, role: member.role })),
  ];

  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [responsavelId, setResponsavelId] = useState(currentUser.id);
  const [interactionType, setInteractionType] = useState("Atendimento Individual");
  const [interactionDate, setInteractionDate] = useState(new Date().toISOString().slice(0, 16));
  const [description, setDescription] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const canSave = students.length > 0 && studentId && description.trim().length >= 3;

  const handleSave = async () => {
    if (!canSave) return;
    setRequestMessage("");
    setIsSaving(true);
    try {
      const student = students.find((s) => s.id === studentId);
      if (!student) {
        setRequestMessage("Selecione um aluno válido.");
        return;
      }
      const savedLog = await apiClient.createAtendimento({
        aluno_id: Number(student.id),
        tipo: interactionType,
        descricao: description.trim(),
        data_atendimento: interactionDate.slice(0, 10),
        responsavel_id:
          mode === "coordenador" ? Number(responsavelId) : Number(currentUser.id),
      });
      const { date, time } = dateParts(savedLog.data_atendimento ?? interactionDate);
      const newLog: CareLog = {
        id: savedLog.id,
        studentName: student.name,
        date,
        time,
        type: savedLog.tipo || interactionType,
        staff: staffTimelineLabel(
          savedLog.usuario_nome,
          savedLog.usuario_id,
          savedLog.usuario_cargo
        ),
        text: savedLog.descricao ?? description.trim(),
      };
      onSaved(newLog);
      onClose();
    } catch (error) {
      setRequestMessage(error instanceof Error ? error.message : "Erro ao registrar atendimento");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(13,28,54,0.7)" }}>
      <div className="bg-card rounded-xl border border-border w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between" style={{ background: "var(--primary)" }}>
          <div>
            <p className="font-bold text-white">Registrar Atendimento</p>
            <p className="text-white/60 text-xs mt-0.5">O registro fará parte do prontuário do aluno.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
            <X size={16} className="text-white" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {requestMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle size={16} /> {requestMessage}
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Aluno *</label>
            {students.length === 0 ? (
              <p className="text-sm text-muted-foreground">Cadastre um aluno antes de registrar atendimentos.</p>
            ) : (
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione o aluno</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} · #{s.registration}</option>
                ))}
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Tipo *</label>
              <select
                value={interactionType}
                onChange={(e) => setInteractionType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {["Atendimento Individual", "Reunião com Pais", "Incidente Acadêmico", "Ocorrência Comportamental", "Revisão de PEI", "Contato Telefônico"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Data *</label>
              <input
                type="datetime-local"
                value={interactionDate}
                onChange={(e) => setInteractionDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Responsável *</label>
            {mode === "coordenador" ? (
              <select
                value={responsavelId}
                onChange={(e) => setResponsavelId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {responsaveis.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} · {member.role}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-secondary/40 text-sm text-muted-foreground">
                <Shield size={14} />
                <span>{currentUser.name} · Acompanhante</span>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Relato descritivo *</label>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o atendimento realizado..."
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <div className="px-6 pb-5 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--accent)" }}
          >
            <CheckCircle size={15} /> {isSaving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

//  SCREEN: Care Log & Management (Atendimentos Screen) 
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
                        <span className="text-foreground font-semibold">{log.type}</span> · {log.staff}
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


///  SCREEN: Student Record 
function StudentRecord({ student, onBack, onLog, onScheduleMeeting }: {
  student: Student;
  onBack: () => void;
  onLog?: () => void;
  onScheduleMeeting?: (student: Student) => void;
}) {
  const [tab, setTab] = useState<"timeline" | "pei">("timeline");
  const [prontuario, setProntuario] = useState<Prontuario | null>(null);
  const [loadingProntuario, setLoadingProntuario] = useState(true);
  const [prontuarioError, setProntuarioError] = useState("");
  const [isAnexoModalOpen, setIsAnexoModalOpen] = useState(false);
  const [anexoTipo, setAnexoTipo] = useState<string>(DOCUMENT_TYPES[0]);
  const [anexoFile, setAnexoFile] = useState<File | null>(null);
  const [anexoError, setAnexoError] = useState("");
  const [isUploadingAnexo, setIsUploadingAnexo] = useState(false);
  const [documentoActionId, setDocumentoActionId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingProntuario(true);
    apiClient.getProntuario(Number(student.id))
      .then((data) => {
        if (!active) return;
        setProntuario(data);
      })
      .catch((err) => {
        if (active) setProntuarioError(err instanceof Error ? err.message : "Erro ao carregar prontuário");
      })
      .finally(() => {
        if (active) setLoadingProntuario(false);
      });
    return () => { active = false; };
  }, [student.id]);

  const timelineEvents = [
    ...(prontuario?.atendimentos ?? []).map((a) => ({
      type: a.tipo,
      staff: staffTimelineLabel(a.usuario_nome, a.usuario_id, a.usuario_cargo),
      date: new Date(a.data_atendimento).toLocaleDateString("pt-BR"),
      time: "00:00",
      text: a.descricao ?? "",
    })),
    ...(prontuario?.ocorrencias ?? []).map((o) => ({
      type: `Ocorrência: ${o.titulo}`,
      staff: staffTimelineLabel(o.usuario_nome, o.usuario_id, o.usuario_cargo),
      date: new Date(o.data_registro).toLocaleDateString("pt-BR"),
      time: "00:00",
      text: o.descricao,
    })),
    ...(prontuario?.reunioes ?? []).map((r) => ({
      type: `Reunião: ${r.titulo}`,
      staff: staffTimelineLabel(r.usuario_nome, r.usuario_id, r.usuario_cargo),
      date: new Date(r.data_reuniao).toLocaleDateString("pt-BR"),
      time: r.horario_inicio?.slice(0, 5) ?? "09:00",
      text: r.descricao ?? "",
    })),
  ];

  const typeStyle = (type: string) => {
    if (type.includes("Ocorrência")) return { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50" };
    if (type.includes("Reunião")) return { icon: CalendarDays, color: "text-blue-500", bg: "bg-blue-50" };
    if (type.includes("Prorrogação")) return { icon: Clock, color: "text-teal-500", bg: "bg-teal-50" };
    return { icon: Activity, color: "text-indigo-500", bg: "bg-indigo-50" };
  };

  const resetAnexoForm = () => {
    setAnexoTipo(DOCUMENT_TYPES[0]);
    setAnexoFile(null);
    setAnexoError("");
  };

  const handleUploadAnexo = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnexoError("");
    if (!anexoFile) {
      setAnexoError("Selecione um arquivo PDF.");
      return;
    }
    if (anexoFile.type !== "application/pdf" && !anexoFile.name.toLowerCase().endsWith(".pdf")) {
      setAnexoError("Apenas arquivos PDF são permitidos.");
      return;
    }

    setIsUploadingAnexo(true);
    try {
      await apiClient.uploadDocumentacao({
        arquivo: anexoFile,
        aluno_id: Number(student.id),
        tipo_documento: anexoTipo,
      });
      const refreshed = await apiClient.getProntuario(Number(student.id));
      setProntuario(refreshed);
      setIsAnexoModalOpen(false);
      resetAnexoForm();
    } catch (err) {
      setAnexoError(err instanceof Error ? err.message : "Erro ao enviar anexo");
    } finally {
      setIsUploadingAnexo(false);
    }
  };

  const handleViewDocumento = async (documento: Documentacao) => {
    setDocumentoActionId(documento.id);
    try {
      const blob = await apiClient.fetchDocumentacaoArquivo(documento.id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Erro ao visualizar documento");
    } finally {
      setDocumentoActionId(null);
    }
  };

  const handleDownloadDocumento = async (documento: Documentacao) => {
    setDocumentoActionId(documento.id);
    try {
      const blob = await apiClient.fetchDocumentacaoArquivo(documento.id, true);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = documento.nome_arquivo;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Erro ao baixar documento");
    } finally {
      setDocumentoActionId(null);
    }
  };

  if (loadingProntuario) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando prontuário...</div>;
  }
  if (prontuarioError) {
    return <div className="p-6 text-sm text-red-600">{prontuarioError}</div>;
  }

  const alunoInfo = prontuario?.aluno;
  const responsavel = prontuario?.responsavel;
  const responsavelNome =
    responsavel?.nome ??
    parseResponsavelFromObservacao(alunoInfo?.observacao) ??
    "Não informado";
  const contatoResponsavel = responsavel?.telefone ?? "—";
  const contatoAluno = alunoInfo?.telefone?.trim() || "—";
  const emailResponsavel = responsavel?.email ?? "—";
  const cidDisplay = formatCidDisplay(alunoInfo?.cid);
  const displayNeed = alunoInfo?.necessidade_especial ?? student.need;
  const displayCourse = alunoInfo?.curso ?? student.course;
  const displayYear = alunoInfo?.ano ?? student.year;
  const dataNascimento = alunoInfo?.data_nascimento
    ? new Date(alunoInfo.data_nascimento).toLocaleDateString("pt-BR")
    : "—";

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
                {student.alert && <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded ring-1 ring-red-200"><AlertTriangle size={11} /> Atenção</span>}
                <StatusBadge status={student.status} />
              </div>
              <p className="font-mono text-xs text-muted-foreground mt-0.5">Matrícula #{student.registration}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge text={displayNeed} color={needColorFor(displayNeed)} />
                <Badge text={displayCourse} color="gray" />
                <Badge text={displayYear} color="gray" />
              </div>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              {onLog && (
                <button onClick={onLog} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 whitespace-nowrap" style={{ background: "var(--accent)" }}>
                  <Plus size={13} /> Registrar Atendimento
                </button>
              )}
              {onScheduleMeeting && (
                <button
                  onClick={() => onScheduleMeeting(student)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border hover:bg-secondary transition-colors whitespace-nowrap text-foreground"
                >
                  <CalendarDays size={13} /> Agendar Reunião
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
            <div className="rounded-lg border border-border bg-secondary/10 p-4">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold mb-3">Dados do Aluno</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Data de Nascimento", value: dataNascimento, icon: CalendarDays },
                  { label: "NEE", value: displayNeed, icon: Star },
                  { label: "Curso", value: displayCourse, icon: GraduationCap },
                  { label: "Semestre", value: displayYear, icon: BookOpen },
                  { label: "CID-10", value: cidDisplay, icon: Activity },
                  { label: "Contato", value: contatoAluno, icon: Phone },
                ].map((f) => (
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
            <div className="rounded-lg border border-border bg-secondary/10 p-4">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold mb-3">Dados do Responsável</p>
              <div className="space-y-3">
                {[
                  { label: "Nome", value: responsavelNome, icon: User },
                  { label: "Contato", value: contatoResponsavel, icon: Phone },
                  { label: "E-mail", value: emailResponsavel, icon: Mail },
                ].map((f) => (
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
        </div>
      </div>

      {/* Container de Abas */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="border-b border-border flex flex-wrap">
          {[
            { key: "timeline", label: "Histórico / Linha do Tempo" },
            { key: "pei", label: "Documentos" },
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
                {timelineEvents.map((ev, i) => {
                  const { icon: Icon, color, bg } = typeStyle(ev.type);
                  return (
                    <li key={i} className="relative">
                      <div className={`absolute -left-10 w-7 h-7 rounded-full flex items-center justify-center ${bg} ring-2 ring-card`}><Icon size={13} className={color} /></div>
                      <div className="bg-secondary/30 rounded-lg p-4">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div><span className={`text-xs font-semibold ${color}`}>{ev.type}</span><span className="text-muted-foreground text-xs mx-1.5">·</span><span className="text-xs text-muted-foreground">{ev.staff}</span></div>
                          <span className="font-mono text-[10px] text-muted-foreground">{ev.date} · {ev.time}</span>
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
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { resetAnexoForm(); setIsAnexoModalOpen(true); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
                  style={{ background: "var(--accent)" }}
                >
                  <Upload size={14} /> ADICIONAR ANEXOS
                </button>
              </div>
              {(prontuario?.documentacoes ?? []).map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-secondary/20 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0"><FileText size={18} className="text-blue-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{p.nome_arquivo}</p>
                    <p className="text-xs text-muted-foreground">{p.tipo_documento} · {new Date(p.data_upload).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleViewDocumento(p)}
                      disabled={documentoActionId === p.id}
                      title="Visualizar"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-secondary transition-colors disabled:opacity-50"
                    >
                      <Eye size={14} /> Visualizar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadDocumento(p)}
                      disabled={documentoActionId === p.id}
                      title="Baixar"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-secondary transition-colors disabled:opacity-50"
                    >
                      <Download size={14} /> Baixar
                    </button>
                  </div>
                </div>
              ))}
              {(prontuario?.documentacoes ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum documento cadastrado.</p>
              )}
            </div>
          )}
          
        </div>
      </div>

      {isAnexoModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl p-5 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Adicionar Anexos</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Envie documentos (PDF).</p>
              </div>
              <button
                type="button"
                onClick={() => { setIsAnexoModalOpen(false); resetAnexoForm(); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"
              >
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleUploadAnexo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Tipo de documento *</label>
                <select
                  value={anexoTipo}
                  onChange={(e) => setAnexoTipo(e.target.value)}
                  className="w-full border border-border bg-input-background rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {DOCUMENT_TYPES.map((tipo) => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Arquivo PDF *</label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setAnexoFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-foreground file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border file:border-border file:bg-secondary file:text-xs file:font-semibold file:text-foreground file:cursor-pointer"
                />
                {anexoFile && (
                  <p className="text-xs text-muted-foreground mt-1.5">{anexoFile.name}</p>
                )}
              </div>

              {anexoError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                  <AlertCircle size={14} /> {anexoError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => { setIsAnexoModalOpen(false); resetAnexoForm(); }}
                  className="px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!anexoFile || isUploadingAnexo}
                  className="px-4 py-2 text-xs font-bold text-white rounded-lg disabled:opacity-50"
                  style={{ background: "var(--accent)" }}
                >
                  {isUploadingAnexo ? "Enviando..." : "Enviar Anexo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

//  SCREEN: Log Interaction 
function LogScreen({
  onBack,
  currentUser,
  student,
  staffList,
  mode,
  setCareLogs,
  onActivity,
}: {
  onBack: () => void;
  currentUser: User;
  student: Student;
  staffList: StaffMember[];
  mode: AppMode;
  setCareLogs: React.Dispatch<React.SetStateAction<CareLog[]>>;
  onActivity: (activity: RecentActivityInput) => void;
}) {
  const responsaveis = [
    { id: currentUser.id, name: currentUser.name, role: currentUser.role },
    ...staffList
      .filter((member) => member.role === "Acompanhante")
      .map((member) => ({ id: member.id, name: member.name, role: member.role })),
  ];
  const [dragOver, setDragOver] = useState(false);
  const [saved, setSaved] = useState(false);
  const [responsavelId, setResponsavelId] = useState(currentUser.id);
  const [interactionType, setInteractionType] = useState("Atendimento Individual");
  const [interactionDate, setInteractionDate] = useState(new Date().toISOString().slice(0, 16));
  const [description, setDescription] = useState("");
  const [requestMessage, setRequestMessage] = useState("");

  const handleSave = async () => {
    if (!description.trim()) return;
    setRequestMessage("");
    try {
      const savedLog = await apiClient.createAtendimento({
        aluno_id: Number(student.id),
        tipo: interactionType,
        descricao: description.trim(),
        data_atendimento: interactionDate.slice(0, 10),
        responsavel_id:
          mode === "coordenador" ? Number(responsavelId) : Number(currentUser.id),
      });
      const { date, time } = dateParts(savedLog.data_atendimento ?? interactionDate.slice(0, 10));
      const newLog: CareLog = {
        id: savedLog.id,
        studentName: student.name,
        date,
        time,
        type: savedLog.tipo || interactionType,
        staff: staffTimelineLabel(
          savedLog.usuario_nome,
          savedLog.usuario_id,
          savedLog.usuario_cargo
        ),
        text: savedLog.descricao ?? description.trim(),
      };
      setCareLogs((current) => [newLog, ...current]);
      onActivity(activityFromCareLog(newLog));
      setSaved(true);
      setDescription("");
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      setRequestMessage(error instanceof Error ? error.message : "Erro ao registrar atendimento");
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border" style={{ background: "var(--primary)" }}>
            <p className="font-bold text-white" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Registrar Atendimento / Ocorrência</p>
            <p className="text-white/60 text-xs mt-0.5">Todos os registros são auditáveis e fazem parte do prontuário permanente.</p>
          </div>
          <div className="p-6 space-y-5">
            {saved && <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium"><CheckCircle size={16} /> Registro salvo com sucesso!</div>}
            {requestMessage && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium"><AlertCircle size={16} /> {requestMessage}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Aluno *</label>
                <div className="w-full px-3 py-2.5 rounded-lg border border-border bg-secondary/40 text-sm text-muted-foreground">{student.name}  #{student.registration}</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Tipo de Interação *</label>
                <select value={interactionType} onChange={e => setInteractionType(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  {["Atendimento Individual", "Reunião com Pais", "Incidente Acadêmico", "Ocorrência Comportamental", "Revisão de PEI", "Contato Telefônico"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Data e Hora *</label>
                <input type="datetime-local" value={interactionDate} onChange={e => setInteractionDate(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Responsável *</label>
                {mode === "coordenador" ? (
                  <select
                    value={responsavelId}
                    onChange={(e) => setResponsavelId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {responsaveis.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} · {member.role}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-secondary/40 text-sm text-muted-foreground">
                    <Shield size={14} />
                    <span>{currentUser.name} · Acompanhante</span>
                    <span className="ml-auto text-[10px] font-mono bg-secondary px-1.5 py-0.5 rounded">Somente leitura</span>
                  </div>
                )}
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Relato Descritivo *</label>
                <textarea rows={6} value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva detalhadamente o atendimento, observações do aluno, estratégias utilizadas e próximos passos..." className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Documentos Anexos</label>
                <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); }} className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${dragOver ? "border-accent bg-teal-50" : "border-border bg-secondary/20 hover:bg-secondary/40"}`} style={dragOver ? { borderColor: "var(--accent)" } : {}}>
                  <Upload size={20} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-foreground">Arraste arquivos ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground mt-0.5">PDF, JPG, PNG  máx. 10MB por arquivo</p>
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

//  SCREEN: Meetings Calendar 
const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function MeetingsScreen({ meetings, setMeetings, prefilledStudent, students, onActivity, canCreate = true }: {
  meetings: MeetingEvent[];
  setMeetings: React.Dispatch<React.SetStateAction<MeetingEvent[]>>;
  prefilledStudent: Student | null;
  students: Student[];
  onActivity: (activity: RecentActivityInput) => void;
  canCreate?: boolean;
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
  const [formType, setFormType] = useState("Reunião com Família");
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

  const [requestError, setRequestError] = useState("");

  const handleSave = async () => {
    if (!formStudent || !formDate || !formTime) return;
    setRequestError("");
    const selected = students.find((s) => s.name === formStudent);
    if (!selected?.turmaId) {
      setRequestError("Este aluno ainda não possui turma cadastrada. Abra uma turma no prontuário do aluno.");
      return;
    }
    const savedMeeting = await apiClient.createReuniao({
      titulo: formType,
      descricao: formDesc,
      data_reuniao: formDate,
      horario_inicio: formTime,
      horario_fim: formTime,
      turma_id: selected.turmaId,
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
    onActivity({
      kind: "meeting",
      title: `${formType} agendada`,
      description: `${formStudent}${formDesc ? ` - ${formDesc}` : ""}`,
      actor: "Coordenação",
    });
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
          <h2 className="text-base font-bold text-foreground min-w-[180px] text-center" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{MONTH_NAMES[month]} · {year}</h2>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors"><ChevronRight size={16} className="text-muted-foreground" /></button>
        </div>
        {canCreate && (
          <button onClick={() => { setShowForm(true); setFormStudent(""); setFormTeachers([]); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90" style={{ background: "var(--accent)" }}>
            <Plus size={15} /> Nova Reunião
          </button>
        )}
      </div>

      {requestError && <p className="text-sm text-red-600">{requestError}</p>}

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
                            {m.time} · {m.studentName.split(" ")[0]}
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
                  <p className="text-xs text-muted-foreground">Nenhuma reunião neste dia.</p>
                  <button onClick={() => { setShowForm(true); setFormDate(selectedDayStr ?? ""); }} className="mt-3 text-xs font-medium hover:underline" style={{ color: "var(--accent)" }}>+ Criar reunião aqui</button>
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
                      <p className="text-xs text-muted-foreground mt-0.5">{m.description || ""}</p>
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
                <p className="text-sm font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Próximas Reuniões</p>
              </div>
              <ul className="divide-y divide-border">
                {meetings.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5).map(m => (
                  <li key={m.id} className="px-4 py-3 hover:bg-secondary/20 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[10px] text-muted-foreground">{m.date.split("-").reverse().join("/")} · {m.time}</span>
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
              <p className="font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Agendar Reunião</p>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {saved && <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium"><CheckCircle size={16} /> Reunião agendada com sucesso!</div>}

              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Aluno *</label>
                <select value={formStudent} onChange={e => { setFormStudent(e.target.value); const s = students.find(st => st.name === e.target.value); setFormTeachers(s?.teachers ?? []); }} className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Selecione o aluno...</option>
                  {students.map(s => <option key={s.id} value={s.name}>{s.name}  #{s.registration}</option>)}
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
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Tipo de Reunião</label>
                <select value={formType} onChange={e => setFormType(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  {["Reunião com Família", "Revisão de PEI", "Atendimento Pedagógico", "Conselho de Classe", "Outra"].map(t => <option key={t}>{t}</option>)}
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
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Descrição / Pauta</label>
                <textarea rows={3} value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Descreva o objetivo da reunião, temas a tratar, documentos necessários..." className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
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


//  SCREEN: Profile 
function ProfileScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cargo, setCargo] = useState("");
  const [status, setStatus] = useState("");
  const [siape, setSiape] = useState("");
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileMessage, setProfileMessage] = useState("");
  const [sessionStartedAt] = useState(() => new Date());

  const handleSave = () => {
    setProfileMessage("O backend ainda não possui endpoint para atualizar perfil. As informações foram carregadas do banco, mas não podem ser salvas sem uma rota PUT/PATCH de usuário.");
  };

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        setLoadingProfile(true);
        setProfileMessage("");
        const me = await apiClient.getMe();
        if (!active) return;
        setName(me.nome);
        setEmail(me.email);
        setCargo(me.cargo);
        setStatus(me.status);
        setSiape(me.siape);
      } catch (error) {
        if (active) {
          setProfileMessage(error instanceof Error ? error.message : "Erro ao carregar perfil");
        }
      } finally {
        if (active) {
          setLoadingProfile(false);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

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
      {loadingProfile && (
        <div className="mb-4 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Carregando perfil do backend...
        </div>
      )}
      {profileMessage && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {profileMessage}
        </div>
      )}
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
                  {name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "ND"}
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
              <p className="text-sm text-muted-foreground">{cargoDisplayLabel(cargo)}</p>
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

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Cargo / Função</label>
              <p className="text-sm text-foreground">{cargoDisplayLabel(cargo)}</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-sm font-bold text-foreground mb-3" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Informações da Conta</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Cargo no Sistema</p>
                  <p className="text-sm text-foreground font-medium">{cargoDisplayLabel(cargo)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Status da Conta</p>
                  <p className="text-sm text-foreground font-medium">{status || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <Activity size={14} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Sessão Atual</p>
                  <p className="text-sm text-foreground font-medium">
                    {sessionStartedAt.toLocaleDateString("pt-BR")} às{" "}
                    {sessionStartedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

//  Placeholder screens 
function PlaceholderScreen({ label }: { label: string }) {
  return (
    <div className="p-12 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
        <Star size={28} className="text-muted-foreground" />
      </div>
      <p className="font-bold text-foreground text-lg" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{label}</p>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">Esta seção está em desenvolvimento e estará disponível em breve.</p>
    </div>
  );
}

//  Root App 
export default function App({
  currentUser: loggedInUser,
  onLogout,
  mode = "coordenador",
}: {
  currentUser: LoggedInUser;
  onLogout: () => void;
  mode?: AppMode;
}) {
  const currentUser: User = {
    id: String(loggedInUser.id || loggedInUser.siape),
    siape: loggedInUser.siape,
    name: loggedInUser.name,
    email: loggedInUser.email,
    role: loggedInUser.cargo === "Coordenador" ? "Coordenador" : "Acompanhante",
  };
  const [activeNav, setActiveNav] = useState<Screen>("overview");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [careLogs, setCareLogs] = useState<CareLog[]>([]);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [meetings, setMeetings] = useState<MeetingEvent[]>([]);
  const [meetingPrefilledStudent, setMeetingPrefilledStudent] = useState<Student | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  const addRecentActivity = (activity: RecentActivityInput) => {
    const fallback = dateParts();
    setRecentActivities((current) => [
      {
        ...activity,
        id: activity.id ?? `local-${Date.now()}`,
        date: activity.date ?? fallback.date,
        time: activity.time ?? fallback.time,
        createdAt: activity.createdAt ?? fallback.createdAt,
      },
      ...current,
    ]);
  };

  useEffect(() => {
    let active = true;

    const loadBackendData = async () => {
      try {
        const [backendStudents, backendMeetings, backendTurmas] = await Promise.all([
          apiClient.getAlunos(),
          apiClient.getReunioes(),
          apiClient.getTurmas(),
        ]);

        let backendUsers: BackendUsuario[] = [];
        const backendAtendimentos = await apiClient.getAtendimentos();
        if (mode === "coordenador") {
          backendUsers = await apiClient.getUsuarios({ apenas_ativos: true });
        }

        if (!active) return;

        const turmaByAluno = new Map(backendTurmas.map((t) => [t.aluno_id, t]));
        const mappedStudents = backendStudents.map((s) => toStudent(s, turmaByAluno));
        const studentsById = new Map(mappedStudents.map((student) => [Number(student.id), student]));
        const mappedMeetings = backendMeetings.map((m) => toMeeting(m, studentsById));
        const usersById = new Map(backendUsers.map((user) => [user.id, user]));
        const mappedCareLogs = backendAtendimentos.map((atendimento) => toCareLog(atendimento, studentsById, usersById));

        setStudents(mappedStudents);
        setMeetings(mappedMeetings);
        setCareLogs(mappedCareLogs);
        setStaffList(backendUsers.map(toStaffMember).filter((member): member is StaffMember => Boolean(member)));
        setRecentActivities([
          ...mappedCareLogs.map(activityFromCareLog),
          ...mappedMeetings.map(activityFromMeeting),
        ]);
      } catch (error) {
        console.error("Erro ao carregar dados do backend:", error);
      }
    };

    loadBackendData();

    return () => {
      active = false;
    };
  }, [mode]);

  const handleNav = (s: Screen) => {
    setActiveNav(s);
    setSelectedStudent(null);
    setShowLog(false);
    setMeetingPrefilledStudent(null);
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

  const handleOpenProfile = () => {
    setActiveNav("profile");
    setSelectedStudent(null);
    setShowLog(false);
    setMeetingPrefilledStudent(null);
  };

  const handleLogout = () => {
    setActiveNav("overview");
    setSelectedStudent(null);
    setShowLog(false);
    setMeetingPrefilledStudent(null);
    onLogout();
  };


  const navItems = mode === "coordenador" ? NAV_ITEMS_COORDENADOR : NAV_ITEMS_ACOMPANHANTE;
  const roleLabel = appRoleLabel(loggedInUser.role);
  const availableStudents =
    mode === "acompanhante"
      ? students.filter((student) => student.companionId === String(loggedInUser.id))
      : students;

  const TITLES: Record<Screen, string> = {
    overview: "Visão Geral",
    students: selectedStudent ? "Prontuário Eletrônico" : "Gestão de Alunos",
    servers: "Corpo Docente",
    log: "Registrar Atendimento",
    meetings: "Reuniões",
    profile: "Meu Perfil",
    record: "Prontuário",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="w-60 flex-shrink-0">
        <Sidebar current={activeNav} onNav={handleNav} onLogout={handleLogout} currentUser={currentUser} studentCount={students.length} navItems={navItems} roleLabel={roleLabel} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title={TITLES[activeNav]} onOpenProfile={handleOpenProfile} currentUser={currentUser} roleLabel={roleLabel} />

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
            <button onClick={() => setShowLog(false)} className="hover:text-foreground transition-colors flex items-center gap-1"><ChevronLeft size={12} /> Prontuário</button>
            <ChevronRight size={12} />
            <span className="text-foreground font-medium">Novo Atendimento</span>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          {activeNav === "overview" && (
            <OverviewScreen
              students={students}
              meetings={meetings}
              careLogs={careLogs}
              recentActivities={recentActivities}
              onNav={handleNav}
            />
          )}
          {activeNav === "students" && !selectedStudent && <StudentsScreen
              students={students}
              setStudents={setStudents}
              staffList={staffList}
              setStaffList={setStaffList}
              onSelectStudent={handleSelectStudent}
              onActivity={addRecentActivity}
              canDeleteStudent={mode === "coordenador"}
            />}
          {activeNav === "students" && selectedStudent && !showLog && (
            <StudentRecord
              student={students.find((student) => student.id === selectedStudent)!}
              onBack={() => setSelectedStudent(null)}
              onLog={() => setShowLog(true)}
              onScheduleMeeting={mode === "coordenador" ? handleScheduleMeeting : undefined}
            />
          )}
          {activeNav === "students" && selectedStudent && showLog && (
            <LogScreen
              onBack={() => setShowLog(false)}
              currentUser={currentUser}
              student={students.find((student) => student.id === selectedStudent)!}
              staffList={staffList}
              mode={mode}
              setCareLogs={setCareLogs}
              onActivity={addRecentActivity}
            />
          )}
          {activeNav === "log" && (
            <CareLogScreen 
              careLogs={careLogs} 
              onAddLogClick={() => setIsLogModalOpen(true)} 
            />
          )}
          {activeNav === "servers" && mode === "coordenador" && (
            <CorpoDocenteView staffList={staffList} setStaffList={setStaffList} onActivity={addRecentActivity} />
          )}
          {activeNav === "meetings" && (
            <MeetingsScreen
              meetings={meetings}
              setMeetings={setMeetings}
              prefilledStudent={meetingPrefilledStudent}
              students={students}
              onActivity={addRecentActivity}
              canCreate={mode === "coordenador"}
            />
          )}
          {activeNav === "profile" && <ProfileScreen />}
        </main>
      </div>

      {isLogModalOpen && (
        <AtendimentoModal
          students={availableStudents}
          currentUser={currentUser}
          staffList={staffList}
          mode={mode}
          onClose={() => setIsLogModalOpen(false)}
          onSaved={(log) => {
            setCareLogs((current) => [log, ...current]);
            addRecentActivity(activityFromCareLog(log));
          }}
        />
      )}
    </div>
  );
}

