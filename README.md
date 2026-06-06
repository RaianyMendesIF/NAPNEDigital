# NAPNE Digital

## Pré-requisitos

- Python 3.11+
- Node.js 18+ e npm
- Git

---

## Como rodar do zero

Use **dois terminais**. O frontend só funciona com o backend rodando.

### 1. Backend

```powershell
cd backend

python -m venv venv
.\venv\Scripts\Activate.ps1

pip install -r requirements.txt

copy .env.example .env

alembic upgrade head

python app.py
```

API: **http://127.0.0.1:8000**

Na primeira execução, o sistema cria automaticamente a coordenadora **Eva Maria Testa Teles**.

### 2. Frontend

Em outro terminal:

```powershell
cd frontend

npm install

copy .env.example .env.local

npm run dev
```

Interface: **http://localhost:5173**

O arquivo `frontend/.env.local` deve conter:

```env
VITE_API_URL=http://127.0.0.1:8000
```

### 3. Login

| Campo | Valor |
|-------|-------|
| SIAPE | `1234567` |
| Senha | `mudar123` |

---

## Zerar o banco (opcional)

Para remover todos os dados de teste e manter apenas a coordenadora Eva:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
$env:PYTHONPATH="."
python scripts/reset_database.py
```

Depois, reinicie o backend (`python app.py`).
