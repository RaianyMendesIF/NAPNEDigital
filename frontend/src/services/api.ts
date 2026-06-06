const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
const TOKEN_KEY = "napne_access_token";

function formatApiError(payload: unknown, status: number): string {
  if (!payload || typeof payload !== "object") {
    return `Erro ${status}`;
  }

  const data = payload as Record<string, unknown>;
  const detail = data.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg: string }).msg);
        }
        return String(item);
      })
      .join("; ");
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  return `Erro ${status}`;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data?: T;
  error_code?: number;
}

export interface LoginRequest {
  siape: string;
  senha: string;
}

export interface LoginData {
  usuario_id: number;
  siape: string;
  nome: string;
  cargo: string;
  access_token: string;
  token_type: string;
}

export type LoginResponse = ApiEnvelope<LoginData>;

export interface Usuario {
  id: number;
  siape: string;
  nome: string;
  cargo: string;
  email: string;
  status: string;
  ativo?: boolean;
}

export interface UsuarioMe {
  id: number;
  siape: string;
  nome: string;
  cargo: string;
  email: string;
  status: string;
  ativo: boolean;
}

export interface UsuarioMeUpdate {
  nome?: string;
  email?: string;
  senha_atual?: string;
  nova_senha?: string;
}

export interface UsuarioCreate {
  siape: string;
  nome: string;
  cargo: string;
  email: string;
  senha: string;
}

export interface Responsavel {
  id: number;
  nome: string;
  telefone: string;
  email?: string | null;
}

export type ResponsavelCreate = Omit<Responsavel, "id">;

export interface Aluno {
  id: number;
  matricula: string;
  nome: string;
  data_nascimento: string;
  cpf: string;
  telefone?: string | null;
  curso: string;
  ano: string;
  necessidade_especial: string;
  cid: string;
  observacao?: string | null;
  status: string;
  responsavel_id?: number | null;
  acompanhante_id?: number | null;
  acompanhante_nome?: string | null;
  ativo?: boolean;
}

export type AlunoCreate = Omit<Aluno, "id" | "status" | "ativo">;
export type AlunoUpdate = Partial<Omit<Aluno, "id" | "ativo">>;

export interface Turma {
  id: number;
  aluno_id: number;
  ano_letivo: number;
  semestre: string;
}

export interface TurmaCreate {
  aluno_id: number;
  ano_letivo: number;
  semestre: "1" | "2";
}

export interface ProfessorTurma {
  id: number;
  turma_id: number;
  usuario_id: number;
  materia: string;
  status: string;
}

export interface ProfessorTurmaCreate {
  usuario_id: number;
  materia: string;
  status?: "Ativo" | "Inativo" | "Pendente";
}

export interface Reuniao {
  id: number;
  turma_id: number;
  aluno_id?: number | null;
  titulo: string;
  descricao?: string | null;
  data_reuniao: string;
  horario_inicio: string;
  horario_fim: string;
  status: string;
  usuario_id: number;
  usuario_nome?: string | null;
  usuario_cargo?: string | null;
}

export interface ReuniaoCreate {
  turma_id: number;
  titulo: string;
  descricao?: string | null;
  data_reuniao: string;
  horario_inicio?: string | null;
  horario_fim?: string | null;
  responsavel_id?: number | null;
}

export type ReuniaoUpdate = Partial<Omit<ReuniaoCreate, "turma_id"> & { status: string; responsavel_id: number | null }>;

export interface Ocorrencia {
  id: number;
  turma_id: number;
  aluno_id?: number | null;
  semestre?: string | null;
  ano_letivo?: number | null;
  usuario_id: number;
  usuario_nome?: string | null;
  usuario_cargo?: string | null;
  titulo: string;
  descricao: string;
  data_registro: string;
}

export interface OcorrenciaCreate {
  turma_id: number;
  titulo?: string | null;
  descricao: string;
}

export type OcorrenciaUpdate = Partial<Pick<Ocorrencia, "titulo" | "descricao">>;

export interface Atendimento {
  id: number;
  aluno_id: number;
  usuario_id: number;
  usuario_nome?: string | null;
  usuario_cargo?: string | null;
  tipo: string;
  descricao?: string | null;
  data_atendimento: string;
}

export interface AtendimentoCreate {
  aluno_id: number;
  tipo?: string;
  descricao: string;
  data_atendimento?: string | null;
  responsavel_id?: number | null;
}

export type AtendimentoUpdate = Partial<Omit<AtendimentoCreate, "aluno_id">>;

export interface Solicitacao {
  id: number;
  turma_id: number;
  aluno_id?: number | null;
  descricao: string;
  status: string;
  data_solicitacao: string;
  usuario_solicitante_id: number;
}

export interface SolicitacaoCreate {
  turma_id: number;
  descricao: string;
}

export interface Prontuario {
  aluno: Aluno | null;
  responsavel: Responsavel | null;
  turmas: Turma[];
  professores: ProfessorTurma[];
  documentacoes: Documentacao[];
  atendimentos: Atendimento[];
  ocorrencias: Ocorrencia[];
  reunioes: Reuniao[];
  solicitacoes: Solicitacao[];
}

export interface Documentacao {
  id: number;
  nome_arquivo: string;
  tipo_documento: string;
  caminho_arquivo: string;
  aluno_id: number;
  usuario_id: number;
  data_upload: string;
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  private async request<T>(
    endpoint: string,
    method: HttpMethod = "GET",
    body?: unknown,
    options: { auth?: boolean; multipart?: boolean } = {}
  ): Promise<T> {
    const headers: HeadersInit = {};
    const token = this.getToken();

    if (!options.multipart) {
      headers["Content-Type"] = "application/json";
    }

    if (options.auth !== false && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : null;

    if (response.status === 401) {
      this.clearToken();
    }

    if (!response.ok) {
      throw new Error(formatApiError(payload, response.status));
    }

    if (payload && typeof payload === "object" && "success" in payload) {
      const envelope = payload as ApiEnvelope<T>;
      if (!envelope.success) {
        throw new Error(envelope.message);
      }
      return envelope.data as T;
    }

    return payload as T;
  }

  private async requestEnvelope<T>(
    endpoint: string,
    method: HttpMethod = "GET",
    body?: unknown,
    options: { auth?: boolean; multipart?: boolean } = {}
  ): Promise<ApiEnvelope<T>> {
    const headers: HeadersInit = {};

    if (!options.multipart) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : null;

    if (!response.ok) {
      throw new Error(formatApiError(payload, response.status));
    }

    return payload as ApiEnvelope<T>;
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    return this.requestEnvelope<LoginData>("/auth/login", "POST", data, { auth: false });
  }

  async getMe(): Promise<UsuarioMe> {
    return this.request<UsuarioMe>("/users/me");
  }

  async updateMe(data: UsuarioMeUpdate): Promise<UsuarioMe> {
    return this.request<UsuarioMe>("/users/me", "PATCH", data);
  }

  async getUsuarios(params?: { cargo?: string; apenas_ativos?: boolean }): Promise<Usuario[]> {
    const search = new URLSearchParams();
    if (params?.cargo) search.set("cargo", params.cargo);
    if (params?.apenas_ativos !== undefined) search.set("apenas_ativos", String(params.apenas_ativos));
    const query = search.toString();
    return this.request<Usuario[]>(`/users${query ? `?${query}` : ""}`);
  }

  async createUsuario(data: UsuarioCreate): Promise<Usuario> {
    return this.request<Usuario>("/users/create", "POST", data);
  }

  async deleteUsuario(id: number): Promise<Usuario> {
    return this.request<Usuario>(`/users/${id}`, "DELETE");
  }

  async getResponsaveis(busca?: string): Promise<Responsavel[]> {
    const query = busca ? `?busca=${encodeURIComponent(busca)}` : "";
    return this.request<Responsavel[]>(`/responsaveis${query}`);
  }

  async createResponsavel(data: ResponsavelCreate): Promise<Responsavel> {
    return this.request<Responsavel>("/responsaveis", "POST", data);
  }

  async updateResponsavel(id: number, data: Partial<ResponsavelCreate>): Promise<Responsavel> {
    return this.request<Responsavel>(`/responsaveis/${id}`, "PUT", data);
  }

  async deleteResponsavel(id: number): Promise<Responsavel> {
    return this.request<Responsavel>(`/responsaveis/${id}`, "DELETE");
  }

  async getAlunos(params?: { apenas_ativos?: boolean; busca?: string }): Promise<Aluno[]> {
    const search = new URLSearchParams();
    if (params?.apenas_ativos !== undefined) search.set("apenas_ativos", String(params.apenas_ativos));
    if (params?.busca) search.set("busca", params.busca);
    const query = search.toString();
    return this.request<Aluno[]>(`/alunos${query ? `?${query}` : ""}`);
  }

  async getAluno(id: number): Promise<Aluno> {
    return this.request<Aluno>(`/alunos/${id}`);
  }

  async getProntuario(alunoId: number): Promise<Prontuario> {
    return this.request<Prontuario>(`/alunos/${alunoId}/prontuario`);
  }

  async createAluno(data: AlunoCreate): Promise<Aluno> {
    return this.request<Aluno>("/alunos", "POST", data);
  }

  async updateAluno(id: number, data: AlunoUpdate): Promise<Aluno> {
    return this.request<Aluno>(`/alunos/${id}`, "PUT", data);
  }

  async deleteAluno(id: number): Promise<Aluno> {
    return this.request<Aluno>(`/alunos/${id}`, "DELETE");
  }

  async getTurmas(): Promise<Turma[]> {
    return this.request<Turma[]>("/turmas");
  }

  async createTurma(data: TurmaCreate): Promise<Turma> {
    return this.request<Turma>("/turmas", "POST", data);
  }

  async getProfessoresTurma(turmaId: number): Promise<ProfessorTurma[]> {
    return this.request<ProfessorTurma[]>(`/turmas/${turmaId}/professores`);
  }

  async vincularProfessor(turmaId: number, data: ProfessorTurmaCreate): Promise<ProfessorTurma> {
    return this.request<ProfessorTurma>(`/turmas/${turmaId}/professores`, "POST", data);
  }

  async getReunioes(params?: { turma_id?: number; semestre?: string; ano_letivo?: number }): Promise<Reuniao[]> {
    const search = new URLSearchParams();
    if (params?.turma_id) search.set("turma_id", String(params.turma_id));
    if (params?.semestre) search.set("semestre", params.semestre);
    if (params?.ano_letivo) search.set("ano_letivo", String(params.ano_letivo));
    const query = search.toString();
    return this.request<Reuniao[]>(`/reunioes${query ? `?${query}` : ""}`);
  }

  async createReuniao(data: ReuniaoCreate): Promise<Reuniao> {
    return this.request<Reuniao>("/reunioes", "POST", data);
  }

  async updateReuniao(id: number, data: ReuniaoUpdate): Promise<Reuniao> {
    return this.request<Reuniao>(`/reunioes/${id}`, "PATCH", data);
  }

  async getOcorrencias(params?: { turma_id?: number; aluno_id?: number; semestre?: string }): Promise<Ocorrencia[]> {
    const search = new URLSearchParams();
    if (params?.turma_id) search.set("turma_id", String(params.turma_id));
    if (params?.aluno_id) search.set("aluno_id", String(params.aluno_id));
    if (params?.semestre) search.set("semestre", params.semestre);
    const query = search.toString();
    return this.request<Ocorrencia[]>(`/ocorrencias${query ? `?${query}` : ""}`);
  }

  async createOcorrencia(data: OcorrenciaCreate): Promise<Ocorrencia> {
    return this.request<Ocorrencia>("/ocorrencias", "POST", data);
  }

  async updateOcorrencia(id: number, data: OcorrenciaUpdate): Promise<Ocorrencia> {
    return this.request<Ocorrencia>(`/ocorrencias/${id}`, "PATCH", data);
  }

  async getAtendimentos(params?: { aluno_id?: number; data_inicial?: string; data_final?: string }): Promise<Atendimento[]> {
    const search = new URLSearchParams();
    if (params?.aluno_id) search.set("aluno_id", String(params.aluno_id));
    if (params?.data_inicial) search.set("data_inicial", params.data_inicial);
    if (params?.data_final) search.set("data_final", params.data_final);
    const query = search.toString();
    return this.request<Atendimento[]>(`/atendimentos${query ? `?${query}` : ""}`);
  }

  async createAtendimento(data: AtendimentoCreate): Promise<Atendimento> {
    return this.request<Atendimento>("/atendimentos", "POST", data);
  }

  async updateAtendimento(id: number, data: AtendimentoUpdate): Promise<Atendimento> {
    return this.request<Atendimento>(`/atendimentos/${id}`, "PATCH", data);
  }

  async getSolicitacoes(params?: { turma_id?: number; aluno_id?: number; status?: string }): Promise<Solicitacao[]> {
    const search = new URLSearchParams();
    if (params?.turma_id) search.set("turma_id", String(params.turma_id));
    if (params?.aluno_id) search.set("aluno_id", String(params.aluno_id));
    if (params?.status) search.set("status", params.status);
    const query = search.toString();
    return this.request<Solicitacao[]>(`/solicitacoes${query ? `?${query}` : ""}`);
  }

  async createSolicitacao(data: SolicitacaoCreate): Promise<Solicitacao> {
    return this.request<Solicitacao>("/solicitacoes", "POST", data);
  }

  async updateSolicitacaoStatus(id: number, data: { status: "DEFERIDO" | "INDEFERIDO"; motivo?: string }): Promise<Solicitacao> {
    return this.request<Solicitacao>(`/solicitacoes/${id}/status`, "PATCH", data);
  }

  async getDocumentacoes(alunoId: number): Promise<Documentacao[]> {
    return this.request<Documentacao[]>(`/documentacoes?aluno_id=${alunoId}`);
  }

  async uploadDocumentacao(data: { arquivo: File; aluno_id: number; tipo_documento: string }): Promise<Documentacao> {
    const formData = new FormData();
    formData.append("arquivo", data.arquivo);
    formData.append("aluno_id", String(data.aluno_id));
    formData.append("tipo_documento", data.tipo_documento);
    return this.request<Documentacao>("/documentacoes/upload", "POST", formData, { multipart: true });
  }

  async fetchDocumentacaoArquivo(id: number, download = false): Promise<Blob> {
    const token = this.getToken();
    const query = download ? "?download=true" : "";
    const response = await fetch(`${this.baseUrl}/documentacoes/${id}/arquivo${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (response.status === 401) {
      this.clearToken();
    }

    if (!response.ok) {
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const payload = await response.json();
        throw new Error(formatApiError(payload, response.status));
      }
      throw new Error(`Erro ${response.status}`);
    }

    return response.blob();
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
