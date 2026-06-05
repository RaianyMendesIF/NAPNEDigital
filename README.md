# NAPNE Digital

Plataforma web para gestão administrativa e pedagógica do **Núcleo de Atendimento às Pessoas com Necessidades Educacionais Específicas (NAPNE)** do IFMS Campus Três Lagoas.

O sistema centraliza informações de estudantes atendidos pelo núcleo — atendimentos, ocorrências, reuniões, documentação, solicitações e prontuário — substituindo processos manuais por uma solução digital com controle de acesso por cargo.

---

## Sobre o sistema

O NAPNE Digital apoia o trabalho da equipe multidisciplinar (coordenação, agentes, psicólogos e professores) no acompanhamento de alunos com necessidades educacionais específicas.

**Principais funcionalidades:**

- Autenticação com JWT e perfis por cargo
- Cadastro de servidores, responsáveis e alunos
- Gestão de turmas semestrais e vínculo professor ↔ turma
- Upload de documentação (PEI, laudos, relatórios em PDF)
- Registro de atendimentos, ocorrências, solicitações e reuniões
- Prontuário consolidado do aluno com visibilidade conforme o cargo
- Análise de solicitações pelo coordenador

A documentação operacional completa dos fluxos está em [`docs/RELATORIO-FLUXOS-OPERACIONAIS.md`](docs/RELATORIO-FLUXOS-OPERACIONAIS.md).

---

## Estrutura do repositório

```
NAPNE/
├── backend/          # API REST (FastAPI + SQLAlchemy + SQLite)
├── frontend/         # Interface web (React + Vite)
└── docs/             # Documentação de fluxos operacionais
```

| Pasta | Tecnologias |
|-------|-------------|
| **backend** | Python, FastAPI, SQLAlchemy, Alembic, JWT, SQLite |
| **frontend** | React, Vite, Tailwind CSS, Material UI |

---

## Pré-requisitos

- **Python 3.11+** (recomendado)
- **Node.js 18+** e npm (ou pnpm)
- Git

---

## Como rodar o sistema

É necessário subir **backend** e **frontend** em terminais separados.

### 1. Backend (API)

```powershell
cd backend

# Ambiente virtual (recomendado)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Dependências
pip install -r requirements.txt

# Variáveis de ambiente
copy .env.example .env

# Banco de dados
alembic upgrade head

# Iniciar servidor
python app.py
```

A API ficará disponível em **http://127.0.0.1:8000**.

- Documentação interativa (Swagger): **http://127.0.0.1:8000/docs**
- Health check: **http://127.0.0.1:8000/**

Na primeira execução, o sistema cria automaticamente um usuário coordenador inicial (se ainda não existir).

| Campo | Valor padrão (desenvolvimento) |
|-------|--------------------------------|
| SIAPE | `1234567` |
| Senha | `mudar123` |

> Altere a senha após o primeiro acesso em ambiente real.

### 2. Frontend (interface)

```powershell
cd frontend

# Dependências
npm install

# Variáveis de ambiente
copy .env.example .env.local

# Servidor de desenvolvimento
npm run dev
```

A interface abre em **http://localhost:5173** (porta padrão do Vite).

O frontend aponta para a API via `VITE_API_URL` (padrão: `http://127.0.0.1:8000`). O guia de integração está em [`frontend/docs/INTEGRACAO-BACKEND.md`](frontend/docs/INTEGRACAO-BACKEND.md).

---

## Cargos e permissões (resumo)

| Cargo | Principais ações |
|-------|------------------|
| **Coordenador** | Gestão completa: usuários, alunos, turmas, reuniões, análise de solicitações |
| **Agente** | Apoio operacional: cadastro de alunos e responsáveis, upload de documentos |
| **Psicólogo** | Registro e consulta de atendimentos, prontuário |
| **Professor** | Ocorrências e solicitações nas turmas vinculadas, consulta limitada |

Não há auto-cadastro público. O primeiro coordenador é criado na instalação; os demais servidores são cadastrados por ele.

---

## Variáveis de ambiente

### Backend (`backend/.env`)

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DATABASE_URL` | Conexão com o banco | `sqlite:///./napne.db` |
| `SECRET_KEY` | Chave do JWT | *(definir em produção)* |
| `CORS_ORIGINS` | Origens permitidas do frontend | `http://localhost:5173,...` |
| `APP_HOST` / `APP_PORT` | Host e porta da API | `127.0.0.1` / `8000` |

### Frontend (`frontend/.env.local`)

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `VITE_API_URL` | URL base da API | `http://127.0.0.1:8000` |

---

## Comandos úteis

```powershell
# Backend — aplicar migrações após pull
cd backend
alembic upgrade head

# Frontend — build de produção
cd frontend
npm run build
```

---

## Documentação adicional

- [Fluxos operacionais](docs/RELATORIO-FLUXOS-OPERACIONAIS.md) — regras de negócio e ordem dos fluxos
- [Integração frontend ↔ backend](frontend/docs/INTEGRACAO-BACKEND.md) — endpoints, autenticação e consumo da API
- [Swagger / OpenAPI](http://127.0.0.1:8000/docs) — referência viva da API (com o backend rodando)

---

## Licença

Projeto acadêmico/institucional do IFMS Campus Três Lagoas. Consulte a equipe responsável para uso e distribuição.
