from datetime import date

from pydantic import BaseModel, Field


class DocumentacaoResponse(BaseModel):
    id: int
    nome_arquivo: str
    tipo_documento: str
    caminho_arquivo: str
    aluno_id: int
    usuario_id: int
    data_upload: date
