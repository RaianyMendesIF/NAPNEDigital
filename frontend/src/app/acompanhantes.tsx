import { useEffect, useMemo, useState } from "react";
import type { Dispatch, ElementType, FormEvent, SetStateAction } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  AlertTriangle,
  Activity,
  Search,
  Plus,
  Eye,
  Shield,
  Bell,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  Upload,
  Filter,
  Clock,
  ChevronDown,
} from "lucide-react";
import type { LoggedInUser } from "./App";
import { apiClient } from "../services/api";
import { appRoleLabel } from "../lib/auth";
import type {
  Aluno as BackendAluno,
  Reuniao as BackendReuniao,
  Ocorrencia as BackendOcorrencia,
  Atendimento as BackendAtendimento,
  Turma as BackendTurma,
} from "../services/api";

type Screen =
  | "overview"
  | "students"
  | "record"
  | "meetings"
  | "occurrences"
  | "profile";

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
  lastCareDate?: string;
  turmaId?: number;
}

interface MeetingEvent {
  id: number;
  studentName: string;
  date: string;
  time: string;
  description: string;
  teachers: string[];
  type: string;
  status?: "Agendada" | "Concluída" | "Pendente";
  completedAt?: string;
  completedBy?: string;
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
  userId?: number;
  studentName: string;
  date: string;
  time: string;
  type: string;
  staff: string;
  text: string;
}

const NAV_ITEMS = [
  { id: "overview", label: "Visão Geral", icon: LayoutDashboard },
  { id: "students", label: "Alunos", icon: Users },
  { id: "meetings", label: "Reuniões", icon: CalendarDays },
  { id: "occurrences", label: "Ocorrências", icon: AlertTriangle },
];

const normalizeStaffName = (name: string) =>
  name.replace("Coord. ", "").trim();

const formatDatePt = (dateTime: string) => {
  const date = new Date(dateTime);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).replace(".", "");
};

const needColorFor = (need: string) => {
  const palette = ["blue", "amber", "purple", "indigo", "teal", "rose", "green"];
  const index = Array.from(need).reduce((total, char) => total + char.charCodeAt(0), 0) % palette.length;
  return palette[index] ?? "green";
};

const toStudent = (aluno: BackendAluno, currentUserName: string, turmaByAluno: Map<number, BackendTurma> = new Map()): Student => ({
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
  teachers: [currentUserName],
  turmaId: turmaByAluno.get(aluno.id)?.id,
});

const toMeeting = (reuniao: BackendReuniao, currentUserName: string): MeetingEvent => {
  const [studentLine, ...descriptionLines] = (reuniao.descricao ?? "").split("\n");
  const studentName = studentLine.startsWith("Aluno: ")
    ? studentLine.replace("Aluno: ", "").trim()
    : "Aluno não informado";

  return {
    id: reuniao.id,
    studentName,
    date: reuniao.data_reuniao,
    time: reuniao.horario_inicio.slice(0, 5),
    description: descriptionLines.join("\n").trim(),
    teachers: [currentUserName],
    type: reuniao.titulo,
    status:
      reuniao.status === "Concluída" || reuniao.status === "Pendente"
        ? reuniao.status
        : "Agendada",
  };
};

const toCareLog = (atendimento: BackendAtendimento, studentsById: Map<number, Student>, currentUserName: string): CareLog => ({
  id: atendimento.id,
  userId: atendimento.usuario_id,
  studentName: studentsById.get(atendimento.aluno_id)?.name ?? `Aluno #${atendimento.aluno_id}`,
  date: new Date(`${atendimento.data_atendimento}T00:00:00`).toLocaleDateString("pt-BR"),
  time: "00:00",
  type: atendimento.tipo,
  staff: currentUserName,
  text: atendimento.descricao ?? "",
});

const toOccurrence = (
  ocorrencia: BackendOcorrencia,
  currentUserName: string,
  studentsById: Map<number, Student> = new Map()
): Occurrence => ({
  id: ocorrencia.id,
  studentName: ocorrencia.aluno_id
    ? studentsById.get(ocorrencia.aluno_id)?.name ?? `Aluno #${ocorrencia.aluno_id}`
    : "Aluno não informado",
  subject: "—",
  title: ocorrencia.titulo,
  description: ocorrencia.descricao,
  date: new Date(`${ocorrencia.data_registro}T00:00:00`).toLocaleDateString("pt-BR"),
  author: currentUserName,
});

const Badge = ({ text, color = "blue" }: { text: string; color?: string }) => {
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

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[color] ?? map.gray}`}>
      {text}
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
  icon: ElementType;
  label: string;
  value: string | number;
  sub: string;
  color: string;
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="bg-card rounded-lg border border-border p-5 flex items-start gap-4 hover:shadow-md transition-shadow text-left w-full"
  >
    <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon size={20} className="text-white" />
    </div>
    <div>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  </button>
);

function Sidebar({
  current,
  onNav,
  currentUser,
  onLogout,
}: {
  current: string;
  onNav: (s: Screen) => void;
  currentUser: LoggedInUser;
  onLogout: () => void;
}) {
  const initials = currentUser.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col h-screen sticky top-0" style={{ background: "var(--sidebar)" }}>
      <div className="px-5 py-5 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "#63AB71" }}>
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">NAPNE Digital</p>
            <p className="text-[10px]" style={{ color: "var(--sidebar-foreground)" }}>IFMS · Campus Três Lagoas</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-2" style={{ color: "var(--sidebar-foreground)", opacity: 0.5 }}>
          Menu Principal
        </p>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = current === id;
            return (
              <li key={id}>
                <button
                  onClick={() => onNav(id as Screen)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                    active ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"
                  }`}
                  style={{ color: active ? "#fff" : "var(--sidebar-foreground)" }}
                >
                  <Icon size={16} style={active ? { color: "var(--accent)" } : {}} />
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-3 pb-4">
        <div className="flex items-center gap-2.5 p-2.5 rounded-md" style={{ background: "var(--sidebar-accent)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--accent)" }}>
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-semibold truncate">{currentUser.name}</p>
            <p className="text-[10px]" style={{ color: "var(--sidebar-foreground)" }}>{appRoleLabel(currentUser.role)}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="opacity-70 hover:opacity-100 transition-opacity"
            title="Sair"
          >
            <LogOut size={14} style={{ color: "var(--sidebar-foreground)" }} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function Topbar({
  title,
  currentUser,
  onOpenProfile,
}: {
  title: string;
  currentUser: LoggedInUser;
  onOpenProfile: () => void;
}) {
  const initials = currentUser.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <header className="bg-card border-b border-border px-6 py-3.5 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 className="text-base font-bold text-foreground">{title}</h1>
        <p className="text-xs text-muted-foreground">
          NAPNE Digital ·{" "}
          {new Date().toLocaleDateString("pt-BR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors relative"
          title="Notificações"
        >
          <Bell size={18} className="text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-card" />
        </button>

        <button
          type="button"
          onClick={onOpenProfile}
          className="flex items-center gap-2 pl-3 border-l border-border hover:bg-secondary/50 transition-colors rounded-lg py-1 pr-2"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "var(--primary)" }}
          >
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>

          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-foreground leading-tight">
              {currentUser.name}
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight">
              {appRoleLabel(currentUser.role)}
            </p>
          </div>

          <ChevronDown size={14} className="text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}

function OverviewScreen({
  students,
  meetings,
  occurrences,
  onNav,
}: {
  students: Student[];
  meetings: MeetingEvent[];
  occurrences: Occurrence[];
  onNav: (s: Screen) => void;
}) {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard icon={Users} label="Alunos" value={students.length} sub="Turmas vinculadas" color="bg-primary" onClick={() => onNav("students")} />
        <KpiCard icon={CalendarDays} label="Reuniões" value={meetings.length} sub="Agenda do NAPNE" color="bg-indigo-600" onClick={() => onNav("meetings")} />
        <KpiCard icon={AlertTriangle} label="Ocorrências" value={occurrences.length} sub="Registradas" color="bg-red-500" onClick={() => onNav("occurrences")} />
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-bold text-foreground">Ocorrências recentes</h2>
        </div>
        <div className="divide-y divide-border">
          {occurrences.slice(0, 5).map((occurrence) => (
            <div key={occurrence.id} className="p-5">
              <p className="text-sm font-bold text-foreground">{occurrence.studentName}</p>
              <p className="text-xs text-muted-foreground">{occurrence.title} · {occurrence.date}</p>
              <p className="text-sm text-muted-foreground mt-2">{occurrence.description}</p>
            </div>
          ))}
          {occurrences.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma ocorrência registrada.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StudentsScreen({
  students,
  setStudents,
  currentUser,
  onSelectStudent,
}: {
  students: Student[];
  setStudents: Dispatch<SetStateAction<Student[]>>;
  currentUser: LoggedInUser;
  onSelectStudent: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filterNeed, setFilterNeed] = useState("Todas");

  const needs = ["Todas", ...Array.from(new Set(students.map((student) => student.need).filter(Boolean)))];

  const filtered = students.filter(
    (student) =>
      (filterNeed === "Todas" || student.need === filterNeed) &&
      (student.name.toLowerCase().includes(search.toLowerCase()) ||
        student.registration.includes(search))
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou matrícula..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select
              value={filterNeed}
              onChange={(e) => setFilterNeed(e.target.value)}
              className="pl-9 pr-8 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
            >
              {needs.map((need) => (
                <option key={need}>{need}</option>
              ))}
            </select>
          </div>

          
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <p className="text-sm font-bold text-foreground">Meus Estudantes</p>
          <span className="font-mono text-xs text-muted-foreground">
            {filtered.length} resultado{filtered.length !== 1 && "s"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Nome / Matrícula</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">NEE</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Curso / Turma</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {filtered.map((student) => (
                <tr key={student.id} className="hover:bg-secondary/20 transition-colors group">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-foreground">{student.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">#{student.registration}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge text={student.need} />
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">
                    {student.course} · {student.year}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => onSelectStudent(student.id)}
                      className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md hover:bg-secondary"
                      style={{ color: "var(--accent)" }}
                    >
                      <Eye size={13} /> Prontuário
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum estudante encontrado.
          </div>
        )}
      </div>

    </div>
  );
}

function StudentRecord({
  student,
  onBack,
}: {
  student: Student;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [prontuario, setProntuario] = useState<Awaited<ReturnType<typeof apiClient.getProntuario>> | null>(null);

  useEffect(() => {
    let active = true;
    apiClient.getProntuario(Number(student.id))
      .then((data) => { if (active) setProntuario(data); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Erro ao carregar prontuário"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [student.id]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Carregando prontuário...</div>;
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-5">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground">
        <ChevronLeft size={14} /> Voltar para alunos
      </button>

      <div className="bg-card rounded-lg border border-border p-5">
        <h2 className="font-bold text-xl text-foreground">{student.name}</h2>
        <p className="font-mono text-xs text-muted-foreground">Matrícula #{student.registration}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge text={student.need} />
          <Badge text={student.course} />
          <Badge text={student.year} />
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">Ocorrências</h3>
        </div>
        <div className="divide-y divide-border p-5 space-y-3">
          {(prontuario?.ocorrencias ?? []).map((o) => (
            <p key={o.id} className="text-sm"><strong>{o.titulo}</strong> · {o.data_registro}</p>
          ))}
          {(prontuario?.ocorrencias ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma ocorrência registrada.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function CareLogFormModal({
  students,
  currentUser,
  onClose,
  onSave,
}: {
  students: Student[];
  currentUser: LoggedInUser;
  onClose: () => void;
  onSave: (log: CareLog) => void;
}) {
  const [interactionType, setInteractionType] = useState("Atendimento Individual");
  const [studentName, setStudentName] = useState(students[0]?.name ?? "");
  const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 16));
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [requestError, setRequestError] = useState("");

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setRequestError("");

    if (!studentName || !dateTime || !text.trim()) return;

    const student = students.find((item) => item.name === studentName);
    if (!student) {
      setRequestError("Selecione um aluno cadastrado.");
      return;
    }

    try {
      const savedLog = await apiClient.createAtendimento({
        aluno_id: Number(student.id),
        tipo: interactionType,
        descricao: text.trim(),
        data_atendimento: dateTime.slice(0, 10),
      });

      onSave({
        id: savedLog.id,
        userId: currentUser.id,
        studentName,
        date: formatDatePt(dateTime),
        time: dateTime.slice(11, 16),
        type: savedLog.tipo,
        staff: currentUser.name,
        text: savedLog.descricao ?? "",
      });

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 900);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Erro ao registrar atendimento");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(13,28,54,0.7)" }}
    >
      <div className="bg-card rounded-xl border border-border overflow-hidden w-full max-w-lg shadow-2xl">
        <div
          className="px-6 py-4 border-b border-border flex items-center justify-between"
          style={{ background: "var(--primary)" }}
        >
          <div>
            <p className="font-bold text-white" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              Registrar Atendimento
            </p>
            <p className="text-white/60 text-xs mt-0.5">
              Preencha os dados abaixo. Todos os registros são auditáveis.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {saved && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
              <CheckCircle size={16} /> Registro salvo com sucesso!
            </div>
          )}
          {requestError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {requestError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">
                Aluno *
              </label>
              <select
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {students.map((student) => (
                  <option key={student.id} value={student.name}>
                    {student.name} — #{student.registration}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">
                Tipo de Interação *
              </label>
              <select
                value={interactionType}
                onChange={(e) => setInteractionType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {[
                  "Atendimento Individual",
                  "Reunião com Pais",
                  "Incidente Acadêmico",
                  "Ocorrência Comportamental",
                  "Revisão de PEI",
                  "Contato Telefônico",
                ].map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">
                Data e Hora *
              </label>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">
                Servidor Responsável
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-secondary/40 text-sm text-muted-foreground">
                <Shield size={14} />
                <span>{currentUser.name} — Acompanhante</span>
                <span className="ml-auto text-[10px] font-mono bg-secondary px-1.5 py-0.5 rounded">
                  Somente leitura
                </span>
              </div>
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">
                Relato Descritivo *
              </label>
              <textarea
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Descreva detalhadamente o atendimento, observações do aluno, estratégias utilizadas e próximos passos..."
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Seja específico e objetivo. Este registro fará parte do prontuário permanente do aluno.
              </p>
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">
                Documentos Anexos
              </label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                }}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
                  dragOver
                    ? "border-accent bg-teal-50"
                    : "border-border bg-secondary/20 hover:bg-secondary/40"
                }`}
                style={dragOver ? { borderColor: "var(--accent)" } : {}}
              >
                <Upload size={20} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">
                  Arraste arquivos ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  PDF, JPG, PNG — máx. 10MB por arquivo
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Ex: ata de reunião, laudo médico, relatório pedagógico
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: "var(--accent)" }}
            >
              <CheckCircle size={15} /> Salvar Registro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CareLogScreen({
  careLogs,
  students,
  currentUser,
  setCareLogs,
}: {
  careLogs: CareLog[];
  students: Student[];
  currentUser: LoggedInUser;
  setCareLogs: Dispatch<SetStateAction<CareLog[]>>;
}) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const filteredLogs = careLogs.filter((log) =>
    log.studentName.toLowerCase().includes(search.toLowerCase()) ||
    log.type.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaveLog = (log: CareLog) => {
    setCareLogs((prev) => [log, ...prev]);
  };

  return (
    <div className="p-6 space-y-5 relative min-h-[calc(100vh-70px)] pb-24">
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrar meus atendimentos..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm"
        />
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <p className="text-sm font-bold text-foreground">Meus Atendimentos</p>
        </div>

        <div className="divide-y divide-border">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-5">
              <h3 className="text-sm font-bold text-foreground">{log.studentName}</h3>
              <p className="text-xs text-muted-foreground">{log.type} · {log.date} às {log.time}</p>
              <p className="text-sm text-muted-foreground mt-2">{log.text}</p>
            </div>
          ))}
          {filteredLogs.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhum atendimento registrado por você.
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold text-white shadow-xl hover:scale-105 transition-all z-40 active:scale-95"
        style={{ background: "var(--accent)" }}
      >
        <Plus size={18} /> Registrar Atendimento
      </button>

      {showForm && (
        <CareLogFormModal
          students={students}
          currentUser={currentUser}
          onClose={() => setShowForm(false)}
          onSave={handleSaveLog}
        />
      )}
    </div>
  );
}

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function MeetingsScreen({
  meetings,
  setMeetings,
  students,
  currentUser,
}: {
  meetings: MeetingEvent[];
  setMeetings: Dispatch<SetStateAction<MeetingEvent[]>>;
  students: Student[];
  currentUser: LoggedInUser;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formStudent, setFormStudent] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("09:00");
  const [formType, setFormType] = useState("Reunião com Família");
  const [formDesc, setFormDesc] = useState("");
  const [formTeachers, setFormTeachers] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [requestError, setRequestError] = useState("");

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const meetingsOnDay = (day: number) => {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return meetings.filter((meeting) => meeting.date === key);
  };

  const prevMonth = () => {
    if (month === 0) {
      setYear((current) => current - 1);
      setMonth(11);
    } else {
      setMonth((current) => current - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setYear((current) => current + 1);
      setMonth(0);
    } else {
      setMonth((current) => current + 1);
    }
  };

  const handleSave = async () => {
    setRequestError("");
    if (!formStudent || !formDate || !formTime) return;

    const teachers = Array.from(new Set([...formTeachers, currentUser.name]));
    const selected = students.find((student) => student.name === formStudent);
    if (!selected?.turmaId) {
      setRequestError("Este aluno ainda não possui turma cadastrada no backend.");
      return;
    }

    const savedMeeting = await apiClient.createReuniao({
      titulo: formType,
      descricao: `Aluno: ${formStudent}\n${formDesc}`,
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
      teachers,
      type: formType,
      status: "Agendada",
    };

    setMeetings((prev) => [...prev, newMeeting]);
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
      setShowForm(false);
      setFormStudent("");
      setFormDate("");
      setFormTime("09:00");
      setFormType("Reunião com Família");
      setFormDesc("");
      setFormTeachers([]);
    }, 1200);
  };

  const selectedDayStr = selectedDay
    ? `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : null;

  const selectedDayMeetings = selectedDay ? meetingsOnDay(selectedDay) : [];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors">
            <ChevronLeft size={16} className="text-muted-foreground" />
          </button>

          <h2 className="text-base font-bold text-foreground min-w-[180px] text-center">
            {MONTH_NAMES[month]} · {year}
          </h2>

          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors">
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        </div>

      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-card rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {DAY_NAMES.map((day) => (
              <div key={day} className="py-2.5 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {Array.from({ length: totalCells }, (_, index) => {
              const day = index - firstDay + 1;
              const isValid = day >= 1 && day <= daysInMonth;
              const isToday = isValid && day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSelected = isValid && day === selectedDay;
              const dayMeetings = isValid ? meetingsOnDay(day) : [];

              return (
                <div
                  key={index}
                  onClick={() => isValid && setSelectedDay(day)}
                  className={`min-h-[72px] p-2 border-b border-r border-border cursor-pointer transition-colors ${
                    !isValid ? "bg-secondary/20 cursor-default" :
                    isSelected ? "bg-blue-50" :
                    "hover:bg-secondary/30"
                  }`}
                >
                  {isValid && (
                    <>
                      <span
                        className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday ? "text-white font-bold" : "text-foreground"
                        }`}
                        style={isToday ? { background: "var(--accent)" } : {}}
                      >
                        {day}
                      </span>

                      <div className="mt-1 space-y-0.5">
                        {dayMeetings.slice(0, 2).map((meeting) => (
                          <div
                            key={meeting.id}
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded truncate"
                            style={{ background: "var(--primary)", color: "#fff", opacity: 0.9 }}
                          >
                            {meeting.time} · {meeting.studentName.split(" ")[0]}
                          </div>
                        ))}

                        {dayMeetings.length > 2 && (
                          <div className="text-[10px] text-muted-foreground px-1">
                            +{dayMeetings.length - 2}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          {selectedDay ? (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="px-4 py-3.5 border-b border-border flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">
                  {String(selectedDay).padStart(2, "0")}/{String(month + 1).padStart(2, "0")}/{year}
                </p>
                <button onClick={() => setSelectedDay(null)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-secondary transition-colors">
                  <X size={13} className="text-muted-foreground" />
                </button>
              </div>

              {selectedDayMeetings.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <CalendarDays size={28} className="mx-auto text-muted-foreground mb-2 opacity-40" />
                  <p className="text-xs text-muted-foreground">Nenhuma reunião neste dia.</p>
                  <button
                    onClick={() => {
                      setShowForm(true);
                      setFormDate(selectedDayStr ?? "");
                    }}
                    className="mt-3 text-xs font-medium hover:underline"
                    style={{ color: "var(--accent)" }}
                  >
                    + Criar reunião aqui
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {selectedDayMeetings.map((meeting) => (
                    <li key={meeting.id} className="px-4 py-3.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-semibold text-foreground">{meeting.time}</span>
                        <Badge text={meeting.type} color="blue" />
                      </div>
                      <p className="text-xs font-medium text-foreground">{meeting.studentName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{meeting.description || "—"}</p>

                      {meeting.teachers.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {meeting.teachers.map((teacher) => (
                            <span key={teacher} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                              {teacher}
                            </span>
                          ))}
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
                <p className="text-sm font-bold text-foreground">Próximas Reuniões</p>
              </div>

              <ul className="divide-y divide-border">
                {[...meetings].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5).map((meeting) => (
                  <li key={meeting.id} className="px-4 py-3 hover:bg-secondary/20 transition-colors cursor-pointer">
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {meeting.date.split("-").reverse().join("/")} · {meeting.time}
                    </p>
                    <p className="text-xs font-semibold text-foreground">{meeting.studentName}</p>
                    <p className="text-xs text-muted-foreground">{meeting.type}</p>
                  </li>
                ))}

                {meetings.length === 0 && (
                  <li className="px-4 py-8 text-center text-xs text-muted-foreground">
                    Nenhuma reunião vinculada a você.
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(13,28,54,0.7)" }}>
          <div className="bg-card rounded-xl border border-border w-full max-w-lg shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <p className="font-bold text-foreground">Agendar Reunião</p>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {saved && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
                  <CheckCircle size={16} /> Reunião agendada com sucesso!
                </div>
              )}
              {requestError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {requestError}
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Aluno *</label>
                <select
                  value={formStudent}
                  onChange={(event) => {
                    setFormStudent(event.target.value);
                    const selectedStudent = students.find((student) => student.name === event.target.value);
                    setFormTeachers(selectedStudent?.teachers ?? []);
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione o aluno...</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.name}>
                      {student.name} — #{student.registration}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Data *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(event) => setFormDate(event.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Hora *</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(event) => setFormTime(event.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Tipo de Reunião</label>
                <select
                  value={formType}
                  onChange={(event) => setFormType(event.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {["Reunião com Família", "Revisão de PEI", "Atendimento Pedagógico", "Conselho de Classe", "Outra"].map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </div>

              {formTeachers.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Acompanhantes do Aluno</label>
                  <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-secondary/40 border border-border">
                    {formTeachers.map((teacher) => (
                      <span key={teacher} className="flex items-center gap-1 text-xs bg-card border border-border px-2 py-1 rounded-full text-foreground">
                        <User size={11} className="text-muted-foreground" /> {teacher}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Descrição / Pauta</label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(event) => setFormDesc(event.target.value)}
                  placeholder="Descreva o objetivo da reunião, temas a tratar, documentos necessários..."
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </div>

            <div className="px-6 pb-5 flex items-center justify-end gap-3 border-t border-border pt-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90" style={{ background: "var(--accent)" }}>
                <CheckCircle size={14} /> Agendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OccurrencesScreen({
  occurrences,
  setOccurrences,
  students,
  currentUser,
}: {
  occurrences: Occurrence[];
  setOccurrences: Dispatch<SetStateAction<Occurrence[]>>;
  students: Student[];
  currentUser: LoggedInUser;
}) {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [formStudent, setFormStudent] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [saved, setSaved] = useState(false);
  const [requestError, setRequestError] = useState("");

  const SUBJECTS = [
    "Banco de Dados",
    "Programação Orientada a Objetos",
    "Matemática",
    "Física",
    "Química Orgânica",
    "Contabilidade",
    "Eletrotécnica",
    "Inglês",
    "Redes de Computadores",
  ];

  const handleSave = async () => {
    if (!formStudent || !formTitle || !formDesc) return;
    setRequestError("");
    const selectedStudent = students.find((student) => student.name === formStudent);
    if (!selectedStudent?.turmaId) {
      setRequestError("Este aluno ainda não possui turma cadastrada no backend.");
      return;
    }
    const subject = formSubject || "Não especificado";
    const savedOccurrence = await apiClient.createOcorrencia({
      titulo: formTitle,
      descricao: `Aluno: ${formStudent}\nDisciplina: ${subject}\n${formDesc}`,
      turma_id: selectedStudent.turmaId,
    });

    const occurrence: Occurrence = {
      id: savedOccurrence.id,
      studentName: formStudent,
      subject,
      title: formTitle,
      description: formDesc,
      date: new Date(`${savedOccurrence.data_registro}T00:00:00`).toLocaleDateString("pt-BR"),
      author: currentUser.name,
    };

    setOccurrences((prev) => [occurrence, ...prev]);
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
      setShowForm(false);
      setFormStudent("");
      setFormSubject("");
      setFormTitle("");
      setFormDesc("");
    }, 1200);
  };

  const filtered = occurrences.filter(
    (occurrence) =>
      occurrence.studentName.toLowerCase().includes(search.toLowerCase()) ||
      occurrence.title.toLowerCase().includes(search.toLowerCase()) ||
      occurrence.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por aluno, título ou disciplina..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white whitespace-nowrap transition-all hover:opacity-90"
          style={{ background: "var(--destructive)" }}
        >
          <Plus size={15} /> Nova Ocorrência
        </button>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <AlertTriangle size={32} className="mx-auto text-muted-foreground opacity-30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma ocorrência registrada por você.</p>
          </div>
        )}

        {filtered.map((occurrence) => (
          <div key={occurrence.id} className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-4 p-5">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle size={18} className="text-red-500" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-sm font-bold text-foreground">{occurrence.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs font-medium text-foreground">{occurrence.studentName}</span>
                      <span className="text-muted-foreground text-xs">·</span>
                      <Badge text={occurrence.subject} color="amber" />
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-[10px] text-muted-foreground">{occurrence.date}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{occurrence.author}</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed">
                  {occurrence.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(13,28,54,0.7)" }}>
          <div className="bg-card rounded-xl border border-border w-full max-w-lg shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <p className="font-bold text-foreground">Registrar Ocorrência</p>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {saved && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
                  <CheckCircle size={16} /> Ocorrência registrada!
                </div>
              )}
              {requestError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {requestError}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Aluno *</label>
                <select
                  value={formStudent}
                  onChange={(event) => setFormStudent(event.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione o aluno...</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.name}>
                      {student.name} — #{student.registration}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Disciplina</label>
                <select
                  value={formSubject}
                  onChange={(event) => setFormSubject(event.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione a disciplina...</option>
                  {SUBJECTS.map((subject) => (
                    <option key={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Título da Ocorrência *</label>
                <input
                  value={formTitle}
                  onChange={(event) => setFormTitle(event.target.value)}
                  placeholder="Ex: Dificuldade em atividade em grupo"
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Descrição da Situação *</label>
                <textarea
                  rows={4}
                  value={formDesc}
                  onChange={(event) => setFormDesc(event.target.value)}
                  placeholder="Descreva detalhadamente o que ocorreu, o contexto, comportamentos observados e possíveis impactos..."
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </div>

            <div className="px-6 pb-5 flex items-center justify-end gap-3 border-t border-border pt-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90" style={{ background: "var(--destructive)" }}>
                <AlertTriangle size={14} /> Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileScreen({ currentUser }: { currentUser: LoggedInUser }) {
  const defaultEmail = `${currentUser.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ".")}@ifms.edu.br`;

  const initials = currentUser.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState("(67) 9 9234-5678");
  const [role, setRole] = useState("Acompanhante");
  const [siape, setSiape] = useState(currentUser.siape);
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setTempPhoto(reader.result as string);
    reader.readAsDataURL(file);
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
                <img src={tempPhoto} alt="Perfil" className="w-28 h-28 rounded-full border-4 border-card object-cover" />
              ) : (
                <div className="w-28 h-28 rounded-full border-4 border-card flex items-center justify-center text-3xl font-bold text-white" style={{ background: "var(--primary)" }}>
                  {initials}
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
              <h2 className="text-xl font-bold text-foreground">{name}</h2>
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
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: "var(--accent)" }}
                >
                  <CheckCircle size={15} /> Salvar
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              ["Nome Completo", name, setName, "text"],
              ["SIAPE", siape, setSiape, "text"],
              ["E-mail Institucional", email, setEmail, "email"],
              ["Telefone", phone, setPhone, "tel"],
              ["Cargo / Função", role, setRole, "text"],
            ].map(([label, value, setter, type]) => (
              <div key={label as string} className={label === "Cargo / Função" ? "md:col-span-2" : ""}>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  {label as string}
                </label>

                {isEditing ? (
                  <input
                    type={type as string}
                    value={value as string}
                    onChange={(e) => (setter as React.Dispatch<React.SetStateAction<string>>)(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                ) : (
                  <p className={`text-sm text-foreground ${label === "SIAPE" ? "font-mono" : ""}`}>
                    {value as string}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-sm font-bold text-foreground mb-3">Informações da Conta</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Nível de Acesso</p>
                  <p className="text-sm text-foreground font-medium">Acompanhante</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock size={14} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Último Acesso</p>
                  <p className="text-sm text-foreground font-medium">
                    {new Date().toLocaleDateString("pt-BR")} às 14:32
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

export default function AcompanhantesApp({
  currentUser,
  onLogout,
}: {
  currentUser: LoggedInUser;
  onLogout: () => void;
}) {
  const [activeNav, setActiveNav] = useState<Screen>("overview");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [careLogs, setCareLogs] = useState<CareLog[]>([]);
  const [meetings, setMeetings] = useState<MeetingEvent[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState("");

  const currentUserName = currentUser.name;

  useEffect(() => {
    let active = true;

    const loadBackendData = async () => {
      setIsLoadingData(true);
      setLoadError("");
      try {
        const [backendStudents, backendMeetings, backendOccurrences, backendTurmas] = await Promise.all([
          apiClient.getAlunos(),
          apiClient.getReunioes(),
          apiClient.getOcorrencias(),
          apiClient.getTurmas(),
        ]);

        if (!active) return;

        const turmaByAluno = new Map(backendTurmas.map((turma) => [turma.aluno_id, turma]));
        const mappedStudents = backendStudents.map((student) => toStudent(student, currentUserName, turmaByAluno));
        const studentsById = new Map(mappedStudents.map((student) => [Number(student.id), student]));
        setStudents(mappedStudents);
        setMeetings(backendMeetings.map((meeting) => toMeeting(meeting, currentUserName)));
        setOccurrences(backendOccurrences.map((occurrence) => toOccurrence(occurrence, currentUserName, studentsById)));
        setCareLogs([]);
      } catch (error) {
        console.error("Erro ao carregar dados do backend:", error);
        if (active) {
          setLoadError(error instanceof Error ? error.message : "Erro ao carregar dados do backend");
        }
      } finally {
        if (active) {
          setIsLoadingData(false);
        }
      }
    };

    loadBackendData();

    return () => {
      active = false;
    };
  }, [currentUserName]);

  const visibleStudents = students;

  const visibleMeetings = meetings;

  const visibleOccurrences = occurrences;

  const selectedStudentData =
    visibleStudents.find((student) => student.id === selectedStudent) ?? null;

  const titles: Record<Screen, string> = {
    overview: "Visão Geral",
    students: selectedStudent ? "Prontuário Eletrônico" : "Meus Alunos",
    record: "Prontuário",
    meetings: "Reuniões",
    occurrences: "Ocorrências",
    profile: "Meu Perfil",
  };

  const handleNav = (screen: Screen) => {
    setActiveNav(screen);
    setSelectedStudent(null);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background" style={{ fontFamily: "Inter, sans-serif" }}>
      <Sidebar
        current={activeNav}
        onNav={handleNav}
        currentUser={currentUser}
        onLogout={onLogout}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
        title={titles[activeNav]}
        currentUser={currentUser}
        onOpenProfile={() => handleNav("profile")}
        />

        <main className="flex-1 overflow-y-auto">
          {isLoadingData && (
            <div className="p-6">
              <div className="bg-card rounded-lg border border-border p-6 text-sm text-muted-foreground">
                Carregando dados do backend...
              </div>
            </div>
          )}

          {!isLoadingData && loadError && (
            <div className="p-6">
              <div className="bg-red-50 rounded-lg border border-red-200 p-4 text-sm text-red-700">
                {loadError}
              </div>
            </div>
          )}

          {!isLoadingData && !loadError && activeNav === "overview" && (
            <OverviewScreen
              students={visibleStudents}
              meetings={visibleMeetings}
              occurrences={visibleOccurrences}
              onNav={handleNav}
            />
          )}

          {!isLoadingData && !loadError && activeNav === "students" && !selectedStudent && (
            <StudentsScreen
            students={visibleStudents}
            setStudents={setStudents}
            currentUser={currentUser}
            onSelectStudent={(id) => setSelectedStudent(id)}
            />
          )}

          {!isLoadingData && !loadError && activeNav === "students" && selectedStudentData && (
            <StudentRecord
              student={selectedStudentData}
              onBack={() => setSelectedStudent(null)}
            />
          )}

          {!isLoadingData && !loadError && activeNav === "meetings" && (
            <MeetingsScreen
              meetings={visibleMeetings}
              setMeetings={setMeetings}
              students={visibleStudents}
              currentUser={currentUser}
            />
          )}

          {!isLoadingData && !loadError && activeNav === "occurrences" && (
            <OccurrencesScreen
                occurrences={visibleOccurrences}
                setOccurrences={setOccurrences}
                students={visibleStudents}
                currentUser={currentUser}
            />
          )}

          {!isLoadingData && !loadError && activeNav === "profile" && (
            <ProfileScreen currentUser={currentUser} />
          )}
        </main>
      </div>
    </div>
  );
}



