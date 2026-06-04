from fastapi import FastAPI
from scripts import create_initial_admin_script
from routes import auth_router
import uvicorn

create_initial_admin_script()

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello, World!"}

app.include_router(auth_router)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)