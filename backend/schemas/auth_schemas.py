from pydantic import BaseModel, Field

class authRequest(BaseModel):
    siape: str = Field(min_length=7, max_length=7)
    senha: str = Field(min_length=8)