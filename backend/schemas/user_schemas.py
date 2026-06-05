from pydantic import BaseModel, Field, EmailStr

class UserCreate(BaseModel):
    id: int
    siape: int = Field(min_length=7, max_length=7)
    nome: str = Field(min_length=3)
    cargo: str
    email: EmailStr
    senha: str = Field(min_length=8)
    status: str

class UserUpdate(BaseModel):
    nome: str = Field(min_length=3)
    cargo: str
    email: EmailStr
    status: str

class UserResponse(BaseModel):
    id: int
    siape: int
    nome: str
    cargo: str
    email: EmailStr
    status: str