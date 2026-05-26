import { useState } from "react";
import { User, Shield, AlertCircle } from "lucide-react";
import CoordenadorApp from "./coordenador";
import AcompanhantesApp from "./acompanhantes";

const USERS = [
  { siape: "8472910", password: "admin", role: "coordenador", name: "Rafael Mendes" },
  { siape: "1029384", password: "user", role: "acompanhante", name: "Camila Rocha" },
  { siape: "2048593", password: "user", role: "acompanhante", name: "Anderson Lima" },
  { siape: "9384751", password: "user", role: "acompanhante", name: "Juliana Castro" },
  { siape: "5729481", password: "user", role: "acompanhante", name: "Carlos Mendes" },
  { siape: "1234567", password: "user", role: "acompanhante", name: "Renata Souza" },
  { siape: "9876543", password: "user", role: "acompanhante", name: "Roberto Alves" },
  { siape: "5555555", password: "user", role: "acompanhante", name: "Fernanda Costa" },
  { siape: "6666666", password: "user", role: "acompanhante", name: "Diego Faria" },
];

export interface LoggedInUser {
  siape: string;
  name: string;
  role: "coordenador" | "acompanhante";
}

export default function App() {
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(null);

  if (loggedInUser) {
    if (loggedInUser.role === "coordenador") {
      return <CoordenadorApp />;
    }

    return (
      <AcompanhantesApp
        currentUser={loggedInUser}
        onLogout={() => setLoggedInUser(null)}
      />
    );
  }

  return <LoginScreen onLoginSuccess={setLoggedInUser} />;
}

function LoginScreen({
  onLoginSuccess,
}: {
  onLoginSuccess: (user: LoggedInUser) => void;
}) {
  const [siape, setSiape] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!siape.trim() || !pass.trim()) {
      setError("Informe SIAPE e senha");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const user = USERS.find((u) => u.siape === siape.trim());

      if (!user || user.password !== pass.trim()) {
        setLoading(false);
        setError("SIAPE ou senha inválidos");
        return;
      }

      setLoading(false);
      onLoginSuccess({
        siape: user.siape,
        name: user.name,
        role: user.role as "coordenador" | "acompanhante",
      });
    }, 900);
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--primary)" }}>
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, #0E9A8C 0%, transparent 50%), radial-gradient(circle at 80% 20%, #fff 0%, transparent 40%)",
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#63AB71" }}
            >
              <Shield size={20} className="text-white" />
            </div>

            <div>
              <p
                className="text-white font-bold text-lg leading-tight"
                style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
              >
                NAPNE Digital
              </p>
              <p className="text-white/60 text-xs">
                Instituto Federal de Mato Grosso do Sul
              </p>
            </div>
          </div>

          <h2
            className="text-white font-bold text-4xl leading-tight mb-4"
            style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
          >
            Inclusão com
            <br />
            tecnologia e cuidado.
          </h2>

          <p className="text-white/60 text-sm leading-relaxed max-w-sm">
            Plataforma de gestão e acompanhamento de estudantes com necessidades
            educacionais específicas do Campus Três Lagoas.
          </p>
        </div>
      </div>

      <div
        className="flex-1 flex items-center justify-center p-6"
        style={{ background: "#E6FFE7" }}
      >
        <div className="w-full max-w-md">
          <p
            className="text-2xl font-bold text-foreground mb-1"
            style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
          >
            Bem-vindo(a)
          </p>

          <p className="text-sm text-muted-foreground mb-6">
            Acesse o sistema com suas credenciais institucionais
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Matrícula SIAPE
              </label>

              <div className="relative">
                <User
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />

                <input
                  type="text"
                  value={siape}
                  onChange={(e) => setSiape(e.target.value)}
                  placeholder="Ex: 1029384"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-input-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Senha
              </label>

              <div className="relative">
                <Shield
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />

                <input
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="Digite sua senha"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              style={{ background: "var(--primary)" }}
            >
              {loading ? "Autenticando..." : "Entrar no sistema"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}