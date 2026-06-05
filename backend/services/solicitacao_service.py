from sqlalchemy.orm import Session

from models import Solicitacao, StatusSolicitacao, Turma, Usuario
from schemas import SolicitacaoCreate, SolicitacaoStatusUpdate
from core.dependencies import usuario_tem_acesso_turma
from utils import error_message, success_message


def _solicitacao_data(solicitacao: Solicitacao, db: Session) -> dict:
    turma = db.query(Turma).filter(Turma.id == solicitacao.turma_id).first()
    status = (
        solicitacao.status.value
        if hasattr(solicitacao.status, "value")
        else solicitacao.status
    )
    return {
        "id": solicitacao.id,
        "turma_id": solicitacao.turma_id,
        "aluno_id": turma.aluno_id if turma else None,
        "descricao": solicitacao.descricao,
        "status": status,
        "data_solicitacao": solicitacao.data_solicitacao,
        "usuario_solicitante_id": solicitacao.usuario_solicitante_id,
    }


def create_solicitacao_service(
    data: SolicitacaoCreate, usuario: Usuario, db: Session
):
    turma = db.query(Turma).filter(Turma.id == data.turma_id).first()
    if not turma:
        return error_message("Turma não encontrada", 404)

    if not usuario_tem_acesso_turma(usuario, data.turma_id, db):
        return error_message("Sem acesso a esta turma", 403)

    solicitacao = Solicitacao(
        turma_id=data.turma_id,
        descricao=data.descricao,
        status=StatusSolicitacao.EM_ANALISE,
        usuario_solicitante_id=usuario.id,
    )
    db.add(solicitacao)
    db.commit()
    db.refresh(solicitacao)
    return success_message(
        data=_solicitacao_data(solicitacao, db),
        message="Solicitação registrada com sucesso",
    )


def update_status_service(
    solicitacao_id: int, data: SolicitacaoStatusUpdate, db: Session
):
    solicitacao = db.query(Solicitacao).filter(Solicitacao.id == solicitacao_id).first()
    if not solicitacao:
        return error_message("Solicitação não encontrada", 404)

    if solicitacao.status != StatusSolicitacao.EM_ANALISE:
        return error_message("Solicitação já foi analisada", 400)

    solicitacao.status = StatusSolicitacao(data.status)
    db.commit()
    db.refresh(solicitacao)
    return success_message(
        data=_solicitacao_data(solicitacao, db),
        message="Status da solicitação atualizado com sucesso",
    )


def list_solicitacoes_service(
    db: Session,
    turma_id: int | None = None,
    status: str | None = None,
):
    query = db.query(Solicitacao)
    if turma_id is not None:
        query = query.filter(Solicitacao.turma_id == turma_id)
    if status is not None:
        query = query.filter(Solicitacao.status == status)
    solicitacoes = query.order_by(Solicitacao.data_solicitacao.desc()).all()
    return success_message(
        data=[_solicitacao_data(s, db) for s in solicitacoes],
        message="Solicitações listadas com sucesso",
    )


def get_solicitacao_service(solicitacao_id: int, db: Session):
    solicitacao = db.query(Solicitacao).filter(Solicitacao.id == solicitacao_id).first()
    if not solicitacao:
        return error_message("Solicitação não encontrada", 404)
    return success_message(
        data=_solicitacao_data(solicitacao, db),
        message="Solicitação encontrada",
    )
