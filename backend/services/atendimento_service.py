from datetime import date

from sqlalchemy.orm import Session

from models import Aluno, Atendimento, StatusAluno, Usuario
from schemas import AtendimentoCreate, AtendimentoUpdate
from utils import error_message, success_message


def _atendimento_data(atendimento: Atendimento) -> dict:
    return {
        "id": atendimento.id,
        "aluno_id": atendimento.aluno_id,
        "usuario_id": atendimento.usuario_id,
        "tipo": atendimento.tipo,
        "descricao": atendimento.descricao,
        "data_atendimento": atendimento.data_solicitacao,
    }


def create_atendimento_service(
    data: AtendimentoCreate, usuario: Usuario, db: Session
):
    aluno = db.query(Aluno).filter(Aluno.id == data.aluno_id).first()
    if not aluno:
        return error_message("Aluno não encontrado", 404)

    if aluno.status != StatusAluno.ATIVO:
        return error_message("Aluno inativo", 400)

    atendimento = Atendimento(
        aluno_id=data.aluno_id,
        usuario_id=usuario.id,
        tipo="Atendimento",
        descricao=data.descricao,
        data_solicitacao=data.data_atendimento or date.today(),
    )
    db.add(atendimento)
    db.commit()
    db.refresh(atendimento)
    return success_message(
        data=_atendimento_data(atendimento),
        message="Atendimento registrado com sucesso",
    )


def list_atendimentos_service(db: Session, aluno_id: int | None = None):
    query = db.query(Atendimento)
    if aluno_id is not None:
        query = query.filter(Atendimento.aluno_id == aluno_id)
    atendimentos = query.order_by(Atendimento.data_solicitacao.desc()).all()
    return success_message(
        data=[_atendimento_data(a) for a in atendimentos],
        message="Atendimentos listados com sucesso",
    )


def get_atendimento_service(atendimento_id: int, db: Session):
    atendimento = db.query(Atendimento).filter(Atendimento.id == atendimento_id).first()
    if not atendimento:
        return error_message("Atendimento não encontrado", 404)
    return success_message(
        data=_atendimento_data(atendimento),
        message="Atendimento encontrado",
    )


def update_atendimento_service(
    atendimento_id: int, data: AtendimentoUpdate, db: Session
):
    atendimento = db.query(Atendimento).filter(Atendimento.id == atendimento_id).first()
    if not atendimento:
        return error_message("Atendimento não encontrado", 404)

    updates = data.model_dump(exclude_unset=True)
    if "data_atendimento" in updates:
        updates["data_solicitacao"] = updates.pop("data_atendimento")

    for field, value in updates.items():
        setattr(atendimento, field, value)

    db.commit()
    db.refresh(atendimento)
    return success_message(
        data=_atendimento_data(atendimento),
        message="Atendimento atualizado com sucesso",
    )
