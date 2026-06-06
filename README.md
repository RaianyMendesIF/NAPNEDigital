# NAPNE Digital

Plataforma web para o **Núcleo de Atendimento às Pessoas com Necessidades Educacionais Específicas (NAPNE)**. O sistema organiza o acompanhamento pedagógico de alunos com necessidades educacionais específicas, reunindo cadastros, prontuário, atendimentos e reuniões em um único lugar.

---

## Sobre o projeto

Instituições de ensino precisam registrar de forma segura e rastreável o histórico de cada estudante atendido pelo NAPNE — quem acompanha, quais atendimentos foram realizados, o que foi discutido em reuniões e quais documentos estão vinculados ao caso.

O NAPNE Digital resolve isso com:

- **Banco de dados centralizado** (SQLite em desenvolvimento) em vez de planilhas ou anotações soltas
- **Dois perfis de usuário** com permissões distintas
- **Prontuário eletrônico** com linha do tempo de atendimentos
- **API REST** documentada, consumida por uma interface React

---

## Funcionalidades

| Módulo | O que faz |
|--------|-----------|
| **Alunos** | Cadastro com dados pessoais, necessidade especial, CID, turma, responsável legal e acompanhante vinculado |
| **Prontuário** | Visão consolidada do aluno: histórico de atendimentos, documentação e linha do tempo |
| **Atendimentos** | Registro de sessões com ATA editável após a criação |
| **Reuniões** | Agendamento, agenda da semana e acompanhamento de status |
| **Corpo docente** | Cadastro e desativação de coordenadores e acompanhantes *(somente coordenador)* |
| **Perfil** | Atualização de nome e e-mail, troca de senha; SIAPE não pode ser alterado |

---

## Perfis de acesso

O login é feito com **SIAPE** (7 dígitos) e senha. A sessão usa token JWT.

### Coordenador
Acesso completo ao sistema: todos os alunos, gestão da equipe, reuniões e atendimentos de qualquer estudante.

### Acompanhante
Acesso restrito aos alunos **vinculados a ele**. Pode registrar atendimentos, consultar prontuários e participar de reuniões dos seus alunos, mas não gerencia o corpo docente.

---

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Python, FastAPI, SQLAlchemy, Alembic |
| Banco | SQLite (`backend/napne.db`) |
| Autenticação | JWT + bcrypt |

---

## Estrutura do repositório

```
NAPNE/
├── backend/
│   ├── app.py              # Entrada da API
│   ├── models/             # Entidades do banco (aluno, usuário, reunião…)
│   ├── routes/             # Endpoints REST
│   ├── services/           # Regras de negócio
│   ├── alembic/            # Migrações do banco
│   └── scripts/            # Utilitários (admin inicial, reset)
│
└── frontend/
    ├── src/app/            # Telas e componentes
    ├── src/services/api.ts # Cliente HTTP da API
    └── .env.local          # URL do backend (criar a partir do .env.example)
```

---

## Pré-requisitos

- **Python** 3.11 ou superior
- **Node.js** 18 ou superior (com npm)
- **Git**

---

## Como rodar

O sistema precisa de **dois terminais** abertos ao mesmo tempo: um para a API e outro para a interface.

### Passo 1 — Backend

```powershell
cd backend

python -m venv venv
.\venv\Scripts\Activate.ps1

pip install -r requirements.txt
copy .env.example .env

alembic upgrade head
python app.py
```

Na primeira execução, o sistema cria automaticamente a coordenadora **Eva Maria Testa Teles**.

| Serviço | URL |
|---------|-----|
| API | http://127.0.0.1:8000 |
| Documentação Swagger | http://127.0.0.1:8000/docs |

### Passo 2 — Frontend

Em um **novo terminal**:

```powershell
cd frontend

npm install
copy .env.example .env.local
npm run dev
```

Confirme que `frontend/.env.local` contém:

```env
VITE_API_URL=http://127.0.0.1:8000
```

| Serviço | URL |
|---------|-----|
| Interface | http://localhost:5173 |

### Passo 3 — Login

Acesse http://localhost:5173 e entre com a conta inicial:

| Campo | Valor |
|-------|-------|
| SIAPE | `1234567` |
| Senha | `mudar123` |

Depois do login, o coordenador pode cadastrar acompanhantes em **Corpo Docente**. Cada membro da equipe acessa o sistema com o próprio SIAPE.

---

## Variáveis de ambiente

### Backend (`backend/.env`)

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DATABASE_URL` | Conexão com o banco | `sqlite:///./napne.db` |
| `SECRET_KEY` | Chave do JWT | *(alterar em produção)* |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Duração do token | `60` |
| `CORS_ORIGINS` | Origens permitidas do frontend | `http://localhost:5173` |
| `APP_PORT` | Porta da API | `8000` |

### Frontend (`frontend/.env.local`)

| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL` | Endereço base da API |

---

## Scripts úteis

**Resetar o banco** — apaga todos os dados de teste e recria apenas a coordenadora Eva:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python scripts/reset_database.py
```

Reinicie o backend após o reset (`python app.py`).

---

## Problemas comuns

**Porta 8000 já em uso**

```powershell
netstat -ano | findstr ":8000"
taskkill /PID <pid> /F
python app.py
```

**Mudanças no backend não surtem efeito** — o servidor não recarrega sozinho. Pare com `Ctrl+C` e execute `python app.py` de novo.

**Frontend não conecta na API** — verifique se o backend está rodando e se `VITE_API_URL` em `.env.local` aponta para `http://127.0.0.1:8000`.

**Erro nas migrações** — confirme que rodou `alembic upgrade head` dentro de `backend/` com o ambiente virtual ativo.

---

## Colocar o backend no ar (Render — gratuito)

A forma mais simples é usar o [Render](https://render.com) conectado ao seu repositório no GitHub.

### Passo a passo

1. Faça **push** do projeto para o GitHub (incluindo o arquivo `render.yaml` na raiz).
2. Acesse [render.com](https://render.com) e crie uma conta (pode entrar com GitHub).
3. Clique em **New +** → **Blueprint**.
4. Conecte o repositório **NAPNE** e confirme a criação do serviço `napne-api`.
5. Aguarde o deploy (leva alguns minutos na primeira vez).
6. Copie a URL gerada, algo como:
   ```
   https://napne-api.onrender.com
   ```
7. Teste no navegador: `https://napne-api.onrender.com/docs` deve abrir o Swagger.
8. Na **Vercel**, adicione a variável de ambiente:
   ```
   VITE_API_URL = https://napne-api.onrender.com
   ```
9. Faça um **redeploy** do frontend na Vercel.

### Login após o deploy

| Campo | Valor |
|-------|-------|
| SIAPE | `1234567` |
| Senha | `mudar123` |

O sistema cria a coordenadora Eva automaticamente na primeira execução.

### Observações

- O plano gratuito do Render **hiberna** após ~15 min sem uso. O primeiro acesso depois disso pode demorar ~30 segundos.
- O banco usa **SQLite** no servidor. Os dados persistem, mas para produção séria o ideal é migrar para PostgreSQL.
- Se o domínio da Vercel for outro, atualize `CORS_ORIGINS` no painel do Render (Environment) com a URL correta do frontend.
