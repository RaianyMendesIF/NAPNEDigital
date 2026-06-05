from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from scripts import create_initial_admin_script
from routes import auth_router
from routes.alunos import router as alunos_router
from routes.reunioes import router as reunioes_router
from routes.ocorrencias import router as ocorrencias_router
import uvicorn

create_initial_admin_script()

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Hello, World!"}

app.include_router(auth_router)
app.include_router(alunos_router)
app.include_router(reunioes_router)
app.include_router(ocorrencias_router)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
