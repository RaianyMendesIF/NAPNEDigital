from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from scripts import create_initial_admin_script
<<<<<<< HEAD
from routes import auth_router
from routes.alunos import router as alunos_router
from routes.reunioes import router as reunioes_router
from routes.ocorrencias import router as ocorrencias_router
=======
from routes import auth_router, user_routes
from core.config import APP_HOST, APP_PORT, CORS_ORIGINS
>>>>>>> a683d17f2fe5ee5e49fb89cf20e780e409a7ed14
import uvicorn

create_initial_admin_script()

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
    return {"message": "Hello, World!", "docs": "/docs"}

app.include_router(auth_router)
<<<<<<< HEAD
app.include_router(alunos_router)
app.include_router(reunioes_router)
app.include_router(ocorrencias_router)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
=======
app.include_router(user_routes)

if __name__ == "__main__":
    uvicorn.run(app, host=APP_HOST, port=APP_PORT)
>>>>>>> a683d17f2fe5ee5e49fb89cf20e780e409a7ed14
