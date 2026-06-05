# Exemplo de Integração - Componente Acompanhantes

Este arquivo mostra como integrar o backend com o frontend, usando o componente Acompanhantes como exemplo.

## Mudanças Necessárias

### 1. Adicionar imports

```typescript
import { useAlunos, useReunioes, useOcorrencias } from "../hooks/useApi";
```

### 2. Usar os hooks no componente

```typescript
function AcompanhantesApp({
  currentUser,
  onLogout,
}: {
  currentUser: LoggedInUser;
  onLogout: () => void;
}) {
  // Estado do UI
  const [activeNav, setActiveNav] = useState<Screen>("overview");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  
  // Carregar dados do backend
  const { alunos: alunosBackend, loading: loadingAlunos, error: errorAlunos } = useAlunos();
  const { reunioes: reunioesBackend, loading: loadingReunioes } = useReunioes();
  const { ocorrencias: ocorrenciasBackend, loading: loadingOcorrencias } = useOcorrencias();
  
  // Converter dados do backend para o formato do frontend
  const students = useMemo(() => {
    return alunosBackend.map((aluno: any) => ({
      id: String(aluno.id),
      name: aluno.nome,
      registration: aluno.matricula,
      need: aluno.necessidade_especial,
      needColor: mapNeedToColor(aluno.necessidade_especial),
      course: aluno.curso,
      year: aluno.ano,
      status: aluno.status as "Ativo" | "Acompanhamento" | "Inativo",
      alert: aluno.status !== "Ativo",
      teachers: [], // Será populado de acordo com a lógica
    }));
  }, [alunosBackend]);

  const meetings = useMemo(() => {
    return reunioesBackend.map((reuniao: any) => ({
      id: reuniao.id,
      studentName: "Nome do Aluno", // Será populado com lookup
      date: reuniao.data,
      time: reuniao.horario_inicio,
      description: reuniao.descricao || "",
      teachers: [],
      type: reuniao.tipo,
      status: reuniao.status as "Agendada" | "Concluída" | "Pendente",
    }));
  }, [reunioesBackend]);

  const occurrences = useMemo(() => {
    return ocorrenciasBackend.map((ocorrencia: any) => ({
      id: ocorrencia.id,
      studentName: "Nome do Aluno",
      subject: "",
      title: ocorrencia.titulo,
      description: ocorrencia.descricao,
      date: ocorrencia.data_registro,
      author: "Autor",
    }));
  }, [ocorrenciasBackend]);

  // ... resto do componente
}
```

### 3. Função auxiliar para mapear necessidade para cor

```typescript
function mapNeedToColor(need: string): string {
  const colorMap: Record<string, string> = {
    "TEA": "blue",
    "Deficiência Visual": "purple",
    "TDAH": "amber",
    "Altas Habilidades": "teal",
    "Deficiência Auditiva": "indigo",
    "Dislexia": "rose",
  };
  return colorMap[need] || "gray";
}
```

### 4. Mostrar estados de carregamento

```typescript
if (loadingAlunos || loadingReunioes || loadingOcorrencias) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-foreground">Carregando dados...</p>
      </div>
    </div>
  );
}

if (errorAlunos || errorReunioes || errorOcorrencias) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-red-600">Erro ao carregar dados. Verifique se o backend está ativo.</p>
        <p className="text-sm text-muted-foreground mt-2">Certifique-se de executar: python -m uvicorn app:app --reload</p>
      </div>
    </div>
  );
}
```

### 5. Criar novo aluno (exemplo de integração)

```typescript
const handleAddStudent = async (studentData: any) => {
  try {
    const novoAluno = await createAluno({
      matricula: studentData.registration,
      nome: studentData.name,
      data_nascimento: studentData.birthDate,
      cpf: studentData.cpf,
      curso: studentData.course,
      ano: studentData.year,
      necessidade_especial: studentData.need,
      cid: studentData.cid,
      observacao: studentData.observation,
    });
    
    // O estado será atualizado automaticamente pelo hook
    // Mostrar mensagem de sucesso
    alert("Aluno criado com sucesso!");
  } catch (error) {
    alert("Erro ao criar aluno");
    console.error(error);
  }
};
```

---

## Estrutura de Pastas Recomendada

```
frontend/src/
├── app/
│   ├── App.tsx
│   ├── coordenador.tsx
│   └── acompanhantes.tsx
├── services/
│   └── api.ts              ✅ (já criado)
├── hooks/
│   └── useApi.ts           ✅ (já criado)
├── components/
│   ├── StudentList.tsx
│   ├── MeetingForm.tsx
│   └── OccurrenceForm.tsx
└── utils/
    └── formatters.ts
```

---

## Próximos Passos

1. **Testar a API**:
   ```bash
   # Terminal 1 - Backend
   cd backend
   python -m uvicorn app:app --reload
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

2. **Verificar dados no Swagger**:
   - Acesse: http://localhost:8000/docs
   - Teste os endpoints GET /alunos, GET /reunioes, GET /ocorrencias

3. **Verificar console do navegador**:
   - Abra DevTools (F12)
   - Vá para Network tab
   - Verifique as requisições para http://localhost:8000

4. **Implementar gradualmente**:
   - Comece com GET (listar dados)
   - Depois POST (criar)
   - Depois PUT (atualizar)
   - Depois DELETE (deletar)

---

## Troubleshooting

### Erro: "Cannot find module 'react'"
- Certifique-se de rodar `npm install` na pasta frontend

### Erro: "API Error: 404"
- Verifique se o backend está rodando em http://localhost:8000
- Verifique se a rota existe em app.py

### CORS Error
- Verifique se CORSMiddleware está configurado em app.py
- Por padrão, permite requisições de qualquer origem

### Dados não aparecem
- Verifique o Network tab no DevTools
- Verifique o console do Node.js (backend)
- Teste a API diretamente: http://localhost:8000/alunos
