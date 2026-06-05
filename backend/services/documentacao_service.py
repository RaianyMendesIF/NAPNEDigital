import shutil
import uuid
from datetime import date

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from core.storage import DOCUMENTOS_DIR, ensure_upload_dirs
from core.dependencies import usuario_pode_ver_prontuario
from models import Aluno, Documentacao, StatusAluno, Usuario
from utils import error_message, success_message

ALLOWED_CONTENT_TYPE = "application/pdf"


def _documentacao_data(documento: Documentacao) -> dict:
    return {
        "id": documento.id,
        "nome_arquivo": documento.nome,
        "tipo_documento": documento.tipo_documento,
        "caminho_arquivo": documento.caminho_arquivo,
        "aluno_id": documento.aluno_id,
        "usuario_id": documento.usuario_id,
        "data_upload": documento.data_criacao,
    }


def _ciclo_atual() -> tuple[int, int]:
    hoje = date.today()
    semestre = 1 if hoje.month <= 6 else 2
    return hoje.year, semestre


async def upload_documento(
    arquivo: UploadFile,
    aluno_id: int,
    tipo_documento: str,
    usuario: Usuario,
    db: Session,
):
    if arquivo.content_type != ALLOWED_CONTENT_TYPE:
        raise HTTPException(status_code=400, detail="Tipo de arquivo não permitido.")

    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
    if not aluno:
        return error_message("Aluno não encontrado", 404)

    if aluno.status != StatusAluno.ATIVO:
        return error_message("Aluno inativo", 400)

    ensure_upload_dirs()

    extensao = ".pdf"
    nome_unico = f"{uuid.uuid4().hex}{extensao}"
    caminho_absoluto = DOCUMENTOS_DIR / nome_unico
    caminho_relativo = f"uploads/documentos/{nome_unico}"

    with caminho_absoluto.open("wb") as buffer:
        shutil.copyfileobj(arquivo.file, buffer)

    ano_letivo, semestre = _ciclo_atual()
    nome_original = arquivo.filename or nome_unico

    documento = Documentacao(
        nome=nome_original,
        tipo_documento=tipo_documento,
        caminho_arquivo=caminho_relativo,
        ano_letivo=ano_letivo,
        semestre=semestre,
        aluno_id=aluno_id,
        usuario_id=usuario.id,
    )
    db.add(documento)
    db.commit()
    db.refresh(documento)

    return success_message(
        data=_documentacao_data(documento),
        message="Documento enviado com sucesso",
    )


def list_documentacoes_service(
    db: Session,
    usuario: Usuario,
    aluno_id: int,
):
    if not usuario_pode_ver_prontuario(usuario, aluno_id, db):
        return error_message("Sem permissão para visualizar documentos deste aluno", 403)

    query = db.query(Documentacao).filter(Documentacao.aluno_id == aluno_id)

    documentos = query.order_by(Documentacao.data_criacao.desc()).all()
    return success_message(
        data=[_documentacao_data(d) for d in documentos],
        message="Documentações listadas com sucesso",
    )
