from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from scripts import create_initial_admin_script
from routes import (
    auth_router,
    user_routes,
    responsavel_routes,
    aluno_routes,
    turma_routes,
    documentacao_routes,
    atendimento_routes,
)
from core.config import APP_HOST, APP_PORT, CORS_ORIGINS
from core.storage import ensure_upload_dirs
import uvicorn

create_initial_admin_script()
ensure_upload_dirs()

app = FastAPI(
    title="NAPNE Digital API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Hello, World!", "docs": "/docs"}

app.include_router(auth_router)
app.include_router(user_routes)
app.include_router(responsavel_routes)
app.include_router(aluno_routes)
app.include_router(turma_routes)
app.include_router(documentacao_routes)
app.include_router(atendimento_routes)

if __name__ == "__main__":
    uvicorn.run(app, host=APP_HOST, port=APP_PORT)