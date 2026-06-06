import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Activity,
  Shield,
  LogOut,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  User,
  Phone,
  Mail,
  BookOpen,
  CalendarDays,
  AlertTriangle,
} from "lucide-react";
import type { LoggedInUser } from "./App";
import { apiClient } from "../services/api";
import type { Aluno, Atendimento, Prontuario } from "../services/api";
import { appRoleLabel } from "../lib/auth";

type Screen = "overview" | "students" | "log" | "profile";

interface Student {
  id: string;
  name: string;
  registration: string;
  need: string;
  course: string;
  year: string;
  status: string;
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

const NAV_ITEMS = [
  { id: "overview", label: "Visão Geral", icon: LayoutDashboard },
  { id: "students", label: "Alunos", icon: Users },
  { id: "log", label: "Atendimentos", icon: Activity },
];

const toStudent = (aluno: Aluno): Student => ({
  id: String(aluno.id),
  name: aluno.nome,
  registration: aluno.matricula,
  need: aluno.necessidade_especial,
  course: aluno.curso,
  year: aluno.ano,
  status: aluno.status,
});

const toCareLog = (atendimento: Atendimento, studentsById: Map<number, Student>, staffName: string): CareLog => ({
  id: atendimento.id,
  studentName: studentsById.get(atendimento.aluno_id)?.name ?? `Aluno #${atendimento.aluno_id}`,
  date: new Date(`${atendimento.data_atendimento}T00:00:00`).toLocaleDateString("pt-BR"),
  time: "00:00",
  type: atendimento.tipo,
  staff: staffName,
  text: atendimento.descricao ?? "",
});

function Sidebar({
  current,
  onNav,
  onLogout,
  currentUser,
}: {
  current: Screen;
  onNav: (s: Screen) => void;
  onLogout: () => void;
  currentUser: LoggedInUser;
}) {
  const initials = currentUser.name.split(" ").map((p) => p[0]).slice(0, 2).join("");

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col h-screen sticky top-0" style={{ background: "var(--sidebar)" }}>
      <div className="px-5 py-5 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
        <p className="text-white font-bold text-sm">NAPNE Digital</p>
        <p className="text-[10px]" style={{ color: "var(--sidebar-foreground)" }}>IFMS · Campus Três Lagoas</p>
      </div>
      <nav className="flex-1 py-4 px-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <button
                onClick={() => onNav(id as Screen)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium ${current === id ? "bg-white/10 text-white" : "hover:bg-white/5"}`}
                style={{ color: current === id ? "#fff" : "var(--sidebar-foreground)" }}
              >
                <Icon size={16} />
                {label}
              </button>
            </li>
          ))}
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
          <button type="button" onClick={onLogout}><LogOut size={14} style={{ color: "var(--sidebar-foreground)" }} /></button>
        </div>
      </div>
    </aside>
  );
}

function ProntuarioView({ student, onBack }: { student: Student; onBack: () => void }) {
  const [prontuario, setProntuario] = useState<Prontuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiClient.getProntuario(Number(student.id))
      .then((data) => { if (active) setProntuario(data); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Erro ao carregar prontuário"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [student.id]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Carregando prontuário...</div>;
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;

  const responsavel = prontuario?.responsavel;

  return (
    <div className="p-6 space-y-5">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft size={14} /> Voltar
      </button>
      <div className="bg-card rounded-lg border border-border p-5">
        <h2 className="text-xl font-bold">{student.name}</h2>
        <p className="text-xs text-muted-foreground font-mono">#{student.registration}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
          <div><p className="text-[10px] uppercase text-muted-foreground">Responsável</p><p className="text-xs">{responsavel?.nome ?? "—"}</p></div>
          <div><p className="text-[10px] uppercase text-muted-foreground">Contato</p><p className="text-xs">{responsavel?.telefone ?? "—"}</p></div>
          <div><p className="text-[10px] uppercase text-muted-foreground">E-mail</p><p className="text-xs">{responsavel?.email ?? "—"}</p></div>
          <div><p className="text-[10px] uppercase text-muted-foreground">CID</p><p className="text-xs">{prontuario?.aluno?.cid ?? "—"}</p></div>
        </div>
      </div>
      <div className="bg-card rounded-lg border border-border p-5">
        <h3 className="text-sm font-bold mb-3">Atendimentos</h3>
        {(prontuario?.atendimentos ?? []).map((a) => (
          <div key={a.id} className="py-2 border-b border-border last:border-0 text-sm">
            <p className="font-medium">{a.tipo} · {new Date(a.data_atendimento).toLocaleDateString("pt-BR")}</p>
            <p className="text-muted-foreground text-xs mt-1">{a.descricao}</p>
          </div>
        ))}
        {(prontuario?.atendimentos ?? []).length === 0 && <p className="text-xs text-muted-foreground">Nenhum atendimento registrado.</p>}
      </div>
      <div className="bg-card rounded-lg border border-border p-5">
        <h3 className="text-sm font-bold mb-3">Ocorrências e reuniões</h3>
        {(prontuario?.ocorrencias ?? []).map((o) => (
          <p key={`o-${o.id}`} className="text-xs py-1">{o.titulo} · {o.data_registro}</p>
        ))}
        {(prontuario?.reunioes ?? []).map((r) => (
          <p key={`r-${r.id}`} className="text-xs py-1">{r.titulo} · {r.data_reuniao}</p>
        ))}
      </div>
    </div>
  );
}

export default function PsicologoApp({
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
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formStudentId, setFormStudentId] = useState("");
  const [formTipo, setFormTipo] = useState("Atendimento Psicológico");
  const [formDesc, setFormDesc] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [saveMsg, setSaveMsg] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [alunos, atendimentos] = await Promise.all([
          apiClient.getAlunos({ apenas_ativos: true }),
          apiClient.getAtendimentos(),
        ]);
        if (!active) return;
        const mapped = alunos.map(toStudent);
        const byId = new Map(mapped.map((s) => [Number(s.id), s]));
        setStudents(mapped);
        setCareLogs(atendimentos.map((a) => toCareLog(a, byId, currentUser.name)));
      } catch (err) {
        if (active) setLoadError(err instanceof Error ? err.message : "Erro ao carregar dados");
      }
    };
    load();
    return () => { active = false; };
  }, [currentUser.name]);

  const filteredStudents = useMemo(
    () => students.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.registration.includes(search)),
    [students, search]
  );

  const handleSaveAtendimento = async () => {
    setSaveMsg("");
    if (!formStudentId || !formDesc.trim()) return;
    try {
      const saved = await apiClient.createAtendimento({
        aluno_id: Number(formStudentId),
        tipo: formTipo,
        descricao: formDesc.trim(),
        data_atendimento: formDate,
      });
      const student = students.find((s) => s.id === formStudentId);
      const log = toCareLog(saved, new Map(students.map((s) => [Number(s.id), s])), currentUser.name);
      setCareLogs((prev) => [log, ...prev]);
      setShowForm(false);
      setFormDesc("");
      setSaveMsg("Atendimento registrado com sucesso.");
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Erro ao salvar");
    }
  };

  const titles: Record<Screen, string> = {
    overview: "Visão Geral",
    students: selectedStudent ? "Prontuário" : "Alunos",
    log: "Atendimentos",
    profile: "Meu Perfil",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar current={activeNav} onNav={(s) => { setActiveNav(s); setSelectedStudent(null); }} onLogout={onLogout} currentUser={currentUser} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-card border-b border-border px-6 py-3.5">
          <h1 className="text-base font-bold">{titles[activeNav]}</h1>
        </header>
        <main className="flex-1 overflow-y-auto">
          {loadError && <div className="p-6 text-sm text-red-600">{loadError}</div>}

          {activeNav === "overview" && !loadError && (
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-lg p-5">
                <p className="text-xs text-muted-foreground">Alunos ativos</p>
                <p className="text-2xl font-bold">{students.length}</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-5">
                <p className="text-xs text-muted-foreground">Atendimentos registrados</p>
                <p className="text-2xl font-bold">{careLogs.length}</p>
              </div>
            </div>
          )}

          {activeNav === "students" && !selectedStudent && (
            <div className="p-6 space-y-4">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar aluno..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border text-sm" />
              </div>
              <div className="bg-card border border-border rounded-lg divide-y divide-border">
                {filteredStudents.map((s) => (
                  <button key={s.id} onClick={() => setSelectedStudent(s.id)} className="w-full text-left px-5 py-3 hover:bg-secondary/30">
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.course} · {s.need}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeNav === "students" && selectedStudent && (
            <ProntuarioView student={students.find((s) => s.id === selectedStudent)!} onBack={() => setSelectedStudent(null)} />
          )}

          {activeNav === "log" && (
            <div className="p-6 space-y-4">
              <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--accent)" }}>
                <Plus size={15} /> Novo atendimento
              </button>
              {saveMsg && <p className="text-sm text-muted-foreground">{saveMsg}</p>}
              <div className="bg-card border border-border rounded-lg divide-y divide-border">
                {careLogs.map((log) => (
                  <div key={log.id} className="px-5 py-3">
                    <p className="text-sm font-medium">{log.studentName} · {log.type}</p>
                    <p className="text-xs text-muted-foreground">{log.date} — {log.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeNav === "profile" && (
            <div className="p-6">
              <div className="bg-card border border-border rounded-lg p-5 max-w-lg">
                <p className="font-bold">{currentUser.name}</p>
                <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                <p className="text-sm text-muted-foreground font-mono">SIAPE {currentUser.siape}</p>
                <p className="text-sm mt-2">{appRoleLabel(currentUser.role)}</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl p-5 max-w-md w-full space-y-4">
            <h3 className="font-bold">Registrar atendimento</h3>
            <select value={formStudentId} onChange={(e) => setFormStudentId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border text-sm">
              <option value="">Selecione o aluno</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border text-sm" />
            <input value={formTipo} onChange={(e) => setFormTipo(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border text-sm" placeholder="Tipo" />
            <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={4} className="w-full px-3 py-2 rounded-lg border border-border text-sm" placeholder="Descrição" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm">Cancelar</button>
              <button onClick={handleSaveAtendimento} className="px-4 py-2 text-sm text-white rounded-lg" style={{ background: "var(--accent)" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
