const API_BASE_URL = "http://localhost:8000";

// Tipos
export interface Aluno {
  id: number;
  matricula: string;
  nome: string;
  data_nascimento: string;
  cpf: string;
  telefone?: string;
  curso: string;
  ano: string;
  necessidade_especial: string;
  cid: string;
  observacao?: string;
  status: string;
  responsavel_id?: number;
}

export type AlunoCreate = Omit<Aluno, "id" | "status">;

export interface Reuniao {
  id: number;
  tipo: string;
  descricao?: string;
  data: string;
  horario_inicio: string;
  horario_fim: string;
  status: string;
  turma_id?: number;
  usuario_id?: number;
}

export type ReuniaoCreate = Omit<Reuniao, "id" | "status">;

export interface Ocorrencia {
  id: number;
  titulo: string;
  descricao: string;
  data_registro: string;
  turma_id?: number;
  usuario_id?: number;
}

export type OcorrenciaCreate = Omit<Ocorrencia, "id" | "data_registro">;

export interface Usuario {
  id: number;
  siape: string;
  nome: string;
  email: string;
  cargo: string;
  status: string;
}

export interface UsuarioCreate {
  siape: string;
  nome: string;
  email: string;
  cargo: string;
  senha?: string;
  status?: string;
}

export interface LoginRequest {
  siape: number;
  senha: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    usuario_id: number;
    siape: string;
    nome: string;
    cargo: string;
    access_token: string;
    token_type: string;
  };
}

// Cliente de API
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>("/auth/login", "POST", data);
  }

  async getUsuarios(): Promise<Usuario[]> {
    return this.request<Usuario[]>("/usuarios/", "GET");
  }

  async createUsuario(data: UsuarioCreate): Promise<Usuario> {
    return this.request<Usuario>("/usuarios/", "POST", data);
  }

  // Alunos
  async getAlunos(): Promise<Aluno[]> {
    return this.request<Aluno[]>("/alunos/", "GET");
  }

  async getAluno(id: number): Promise<Aluno> {
    return this.request<Aluno>(`/alunos/${id}`, "GET");
  }

  async createAluno(data: AlunoCreate): Promise<Aluno> {
    return this.request<Aluno>("/alunos/", "POST", data);
  }

  async updateAluno(id: number, data: Partial<Aluno>): Promise<Aluno> {
    return this.request<Aluno>(`/alunos/${id}`, "PUT", data);
  }

  async deleteAluno(id: number): Promise<void> {
    await this.request(`/alunos/${id}`, "DELETE");
  }

  // Reuniões
  async getReunioes(): Promise<Reuniao[]> {
    return this.request<Reuniao[]>("/reunioes/", "GET");
  }

  async getReuniao(id: number): Promise<Reuniao> {
    return this.request<Reuniao>(`/reunioes/${id}`, "GET");
  }

  async createReuniao(data: ReuniaoCreate): Promise<Reuniao> {
    return this.request<Reuniao>("/reunioes/", "POST", data);
  }

  async updateReuniao(id: number, data: Partial<Reuniao>): Promise<Reuniao> {
    return this.request<Reuniao>(`/reunioes/${id}`, "PUT", data);
  }

  async deleteReuniao(id: number): Promise<void> {
    await this.request(`/reunioes/${id}`, "DELETE");
  }

  // Ocorrências
  async getOcorrencias(): Promise<Ocorrencia[]> {
    return this.request<Ocorrencia[]>("/ocorrencias/", "GET");
  }

  async getOcorrencia(id: number): Promise<Ocorrencia> {
    return this.request<Ocorrencia>(`/ocorrencias/${id}`, "GET");
  }

  async createOcorrencia(data: OcorrenciaCreate): Promise<Ocorrencia> {
    return this.request<Ocorrencia>("/ocorrencias/", "POST", data);
  }

  async updateOcorrencia(id: number, data: Partial<Ocorrencia>): Promise<Ocorrencia> {
    return this.request<Ocorrencia>(`/ocorrencias/${id}`, "PUT", data);
  }

  async deleteOcorrencia(id: number): Promise<void> {
    await this.request(`/ocorrencias/${id}`, "DELETE");
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
