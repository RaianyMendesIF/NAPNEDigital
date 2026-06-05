# 🔗 Guia de Integração Frontend-Backend - NAPNE Digital

## ✅ O que foi criado

### Backend
1. ✅ **Schemas Pydantic** (`/backend/schemas/`)
   - `aluno_schemas.py` - Create, Update, Response
   - `reuniao_schemas.py` - Create, Update, Response
   - `ocorrencia_schemas.py` - Create, Update, Response

2. ✅ **Rotas CRUD** (`/backend/routes/`)
   - `alunos.py` - GET all, GET by id, POST, PUT, DELETE
   - `reunioes.py` - GET all, GET by id, POST, PUT, DELETE
   - `ocorrencias.py` - GET all, GET by id, POST, PUT, DELETE

3. ✅ **CORS Configuration**
   - Configurado em `app.py` para aceitar requisições de qualquer origem

### Frontend
1. ✅ **API Client** (`/frontend/src/services/api.ts`)
   - Classe `ApiClient` com métodos para cada entidade
   - Tipagem completa com TypeScript

2. ✅ **Custom Hooks** (`/frontend/src/hooks/useApi.ts`)
   - `useAlunos()` - Gerencia estado de alunos
   - `useReunioes()` - Gerencia estado de reuniões
   - `useOcorrencias()` - Gerencia estado de ocorrências

---

## 📝 Como Integrar no Componente Coordenador

### 1. Adicionar os hooks ao componente

No início do arquivo `coordenador.tsx`, adicione os imports:

```typescript
import { useAlunos, useReunioes, useOcorrencias } from "../hooks/useApi";
```

### 2. Usar os hooks na função App

Substitua esta parte:

```typescript
export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeNav, setActiveNav] = useState<Screen>("overview");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  // ... outros estados
  
  const [students, setStudents] = useState<Student[]>(STUDENTS);
  const [meetings, setMeetings] = useState<MeetingEvent[]>(INITIAL_MEETINGS);
  const [occurrences, setOccurrences] = useState<Occurrence[]>(INITIAL_OCCURRENCES);
```

Por isto:

```typescript
export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeNav, setActiveNav] = useState<Screen>("overview");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  // ... outros estados
  
  // Carregar dados do backend
  const { alunos: alunosBackend, createAluno, updateAluno, deleteAluno } = useAlunos();
  const { reunioes: reunioesBackend, createReuniao, updateReuniao, deleteReuniao } = useReunioes();
  const { ocorrencias: ocorrenciasBackend, createOcorrencia, updateOcorrencia, deleteOcorrencia } = useOcorrencias();
  
  // Converter dados do backend para o formato esperado pelo frontend
  const students = alunosBackend.map((aluno: any) => ({
    id: String(aluno.id),
    name: aluno.nome,
    registration: aluno.matricula,
    need: aluno.necessidade_especial,
    needColor: "blue", // Mapear dinamicamente
    course: aluno.curso,
    year: aluno.ano,
    status: aluno.status === "Ativo" ? "Ativo" : aluno.status === "Inativo" ? "Inativo" : "Acompanhamento",
    teachers: [], // Será populado separadamente
    lastCareDate: "", // Será calculado
  }));

  const [meetings, setMeetings] = useState<MeetingEvent[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
```

### 3. Converter Dados do Backend

Os dados do backend precisam ser convertidos para o formato esperado pelo frontend. Exemplo:

#### Alunos
```typescript
// Backend retorna:
{
  id: 1,
  matricula: "2023001",
  nome: "Lucas Henrique",
  data_nascimento: "2008-05-15",
  curso: "Técnico em Informática",
  ano: "2º Ano",
  status: "Ativo"
}

// Frontend espera:
{
  id: "1",
  name: "Lucas Henrique",
  registration: "2023001",
  course: "Técnico em Informática",
  year: "2º Ano",
  status: "Ativo"
}
```

#### Reuniões
```typescript
// Backend retorna:
{
  id: 1,
  tipo: "Revisão de PEI",
  descricao: "Revisão semestral",
  data: "2026-05-26",
  horario_inicio: "14:00",
  horario_fim: "14:45",
  status: "Agendada"
}

// Frontend espera:
{
  id: 1,
  studentName: "Lucas Henrique Moreira",
  date: "2026-05-26",
  time: "14:00",
  description: "Revisão semestral",
  type: "Revisão de PEI",
  status: "Agendada"
}
```

#### Ocorrências
```typescript
// Backend retorna:
{
  id: 1,
  titulo: "Dificuldade de socialização",
  descricao: "Aluno apresentou resistência em participar de atividades em grupo",
  data_registro: "2025-05-08"
}

// Frontend espera:
{
  id: 1,
  studentName: "Gabriel Pereira Lima",
  subject: "Programação Orientada a Objetos",
  title: "Dificuldade de socialização",
  description: "Aluno apresentou resistência...",
  date: "08/05/2025",
  author: "Profa. Juliana Castro"
}
```

---

## 🚀 Endpoints da API

### Base URL
```
http://localhost:8000
```

### Alunos
- `GET /alunos` - Listar todos os alunos
- `GET /alunos/{id}` - Obter aluno específico
- `POST /alunos` - Criar novo aluno
- `PUT /alunos/{id}` - Atualizar aluno
- `DELETE /alunos/{id}` - Deletar aluno

### Reuniões
- `GET /reunioes` - Listar todas as reuniões
- `GET /reunioes/{id}` - Obter reunião específica
- `POST /reunioes` - Criar nova reunião
- `PUT /reunioes/{id}` - Atualizar reunião
- `DELETE /reunioes/{id}` - Deletar reunião

### Ocorrências
- `GET /ocorrencias` - Listar todas as ocorrências
- `GET /ocorrencias/{id}` - Obter ocorrência específica
- `POST /ocorrencias` - Criar nova ocorrência
- `PUT /ocorrencias/{id}` - Atualizar ocorrência
- `DELETE /ocorrencias/{id}` - Deletar ocorrência

---

## 🔧 Funções de CRUD

### Criar Aluno
```typescript
const novoAluno = await createAluno({
  matricula: "2023100",
  nome: "João Silva",
  data_nascimento: "2008-10-20",
  cpf: "123.456.789-00",
  curso: "Técnico em Informática",
  ano: "1º Ano",
  necessidade_especial: "TEA",
  cid: "F84.0"
});
```

### Atualizar Aluno
```typescript
const alunoAtualizado = await updateAluno(1, {
  nome: "João Silva Santos",
  ano: "2º Ano",
  status: "Acompanhamento"
});
```

### Deletar Aluno
```typescript
await deleteAluno(1);
```

### Criar Reunião
```typescript
const novaReuniao = await createReuniao({
  tipo: "Revisão de PEI",
  descricao: "Reunião semestral de revisão",
  data: "2026-06-01",
  horario_inicio: "14:00",
  horario_fim: "15:00",
  usuario_id: 1
});
```

### Criar Ocorrência
```typescript
const novaOcorrencia = await createOcorrencia({
  titulo: "Falta de concentração",
  descricao: "Aluno apresentou dificuldade de concentração",
  usuario_id: 1
});
```

---

## ⚙️ Configurações Importantes

### Backend (app.py)
```python
# CORS está configurado para aceitar requisições de qualquer origem
# Para produção, restrinja para domínios específicos:
allow_origins=["http://localhost:3000", "https://seudominio.com"]
```

### Frontend (.env)
Crie um arquivo `.env` na pasta frontend:
```
VITE_API_URL=http://localhost:8000
```

Então atualize `api.ts`:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
```

---

## 🧪 Como Testar

### 1. Iniciar o Backend
```bash
cd backend
python -m uvicorn app:app --reload
# Acesse: http://localhost:8000/docs
```

### 2. Iniciar o Frontend
```bash
cd frontend
npm run dev
# Acesse: http://localhost:5173
```

### 3. Teste a API com cURL
```bash
# Listar alunos
curl http://localhost:8000/alunos

# Criar aluno
curl -X POST http://localhost:8000/alunos \
  -H "Content-Type: application/json" \
  -d '{
    "matricula": "2023100",
    "nome": "João Silva",
    "data_nascimento": "2008-10-20",
    "cpf": "123.456.789-00",
    "curso": "Técnico em Informática",
    "ano": "1º Ano",
    "necessidade_especial": "TEA",
    "cid": "F84.0"
  }'
```

---

## ⚠️ Próximas Etapas

1. **Integrar autenticação**: Adicionar token JWT nas requisições
2. **Tratamento de erros**: Implementar fallback para dados locais
3. **Loading states**: Mostrar spinners enquanto carrega dados
4. **Cache**: Implementar cache de dados para melhor performance
5. **Paginação**: Adicionar paginação nas listas (alunos, reuniões, ocorrências)
6. **Filtros**: Implementar filtros por status, curso, etc.
