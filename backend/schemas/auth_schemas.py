from pydantic import BaseModel, Field

class authRequest(BaseModel):
    siape: int
    senha: str = Field(min_length=8)