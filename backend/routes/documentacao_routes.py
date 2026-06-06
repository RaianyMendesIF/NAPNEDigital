from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from core import require_document_upload_permission, get_current_user
from database import get_db
from services import upload_documento, list_documentacoes_service, get_documento_arquivo_service

router = APIRouter(prefix="/documentacoes", tags=["documentacoes"])


@router.get("")
def list_documentacoes(
    aluno_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return list_documentacoes_service(db, current_user, aluno_id=aluno_id)


@router.get("/{documentacao_id}/arquivo")
def get_documentacao_arquivo(
    documentacao_id: int,
    download: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    arquivo_path, nome = get_documento_arquivo_service(documentacao_id, current_user, db)
    disposition = "attachment" if download else "inline"
    return FileResponse(
        path=arquivo_path,
        media_type="application/pdf",
        filename=nome,
        headers={"Content-Disposition": f'{disposition}; filename="{nome}"'},
    )


@router.post("/upload")
async def upload_documentacao(
    arquivo: UploadFile = File(...),
    aluno_id: int = Form(...),
    tipo_documento: str = Form(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_document_upload_permission),
):
    return await upload_documento(
        arquivo=arquivo,
        aluno_id=aluno_id,
        tipo_documento=tipo_documento,
        usuario=current_user,
        db=db,
    )
