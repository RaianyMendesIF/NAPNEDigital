from sqlalchemy.orm import Session

from models import (
    Cargo,
    ProfessorTurma,
    Solicitacao,
    StatusProfessorTurma,
    StatusSolicitacao,
    Turma,
    Usuario,
)
from schemas import SolicitacaoCreate, SolicitacaoStatusUpdate
from core.dependencies import usuario_pode_registrar_em_turma, usuario_tem_acesso_turma
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

    if not usuario_pode_registrar_em_turma(usuario, data.turma_id, db):
        return error_message("Sem permissão para registrar solicitação nesta turma", 403)

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
    if data.status == "INDEFERIDO" and data.motivo:
        solicitacao.descricao = f"{solicitacao.descricao}\n\nMotivo do indeferimento: {data.motivo}"
    db.commit()
    db.refresh(solicitacao)
    return success_message(
        data=_solicitacao_data(solicitacao, db),
        message="Status da solicitação atualizado com sucesso",
    )


def _turmas_solicitacao_visiveis(usuario: Usuario, db: Session) -> list[int] | None:
    if usuario.cargo == Cargo.COORDENADOR:
        return None

    if usuario.cargo == Cargo.PROFESSOR:
        rows = (
            db.query(ProfessorTurma.turma_id)
            .filter(
                ProfessorTurma.usuario_id == usuario.id,
                ProfessorTurma.status == StatusProfessorTurma.ATIVO,
            )
            .distinct()
            .all()
        )
        return [row[0] for row in rows]

    return []


def list_solicitacoes_service(
    db: Session,
    usuario: Usuario,
    turma_id: int | None = None,
    status: str | None = None,
    aluno_id: int | None = None,
):
    turmas_permitidas = _turmas_solicitacao_visiveis(usuario, db)
    if turmas_permitidas is not None and not turmas_permitidas:
        return success_message(data=[], message="Solicitações listadas com sucesso")

    query = db.query(Solicitacao).join(Turma, Solicitacao.turma_id == Turma.id)

    if turmas_permitidas is not None:
        query = query.filter(Solicitacao.turma_id.in_(turmas_permitidas))

    if turma_id is not None:
        query = query.filter(Solicitacao.turma_id == turma_id)
    if status is not None:
        query = query.filter(Solicitacao.status == status)
    if aluno_id is not None:
        query = query.filter(Turma.aluno_id == aluno_id)

    solicitacoes = query.order_by(Solicitacao.data_solicitacao.desc()).all()
    return success_message(
        data=[_solicitacao_data(s, db) for s in solicitacoes],
        message="Solicitações listadas com sucesso",
    )


def get_solicitacao_service(solicitacao_id: int, usuario: Usuario, db: Session):
    solicitacao = db.query(Solicitacao).filter(Solicitacao.id == solicitacao_id).first()
    if not solicitacao:
        return error_message("Solicitação não encontrada", 404)

    if not usuario_tem_acesso_turma(usuario, solicitacao.turma_id, db):
        return error_message("Sem acesso a esta solicitação", 403)

    if usuario.cargo not in (Cargo.COORDENADOR, Cargo.PROFESSOR):
        return error_message("Sem permissão para visualizar solicitações", 403)

    return success_message(
        data=_solicitacao_data(solicitacao, db),
        message="Solicitação encontrada",
    )
