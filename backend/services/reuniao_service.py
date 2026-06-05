from datetime import time

from sqlalchemy.orm import Session

from models import Reuniao, StatusReuniao, Turma, Usuario
from schemas import ReuniaoCreate, ReuniaoUpdate
from utils import error_message, success_message

DEFAULT_INICIO = time(9, 0)
DEFAULT_FIM = time(10, 0)


def _reuniao_data(reuniao: Reuniao, db: Session) -> dict:
    turma = db.query(Turma).filter(Turma.id == reuniao.turma_id).first()
    status = reuniao.status.value if hasattr(reuniao.status, "value") else reuniao.status
    return {
        "id": reuniao.id,
        "turma_id": reuniao.turma_id,
        "aluno_id": turma.aluno_id if turma else None,
        "titulo": reuniao.tipo,
        "descricao": reuniao.descricao,
        "data_reuniao": reuniao.data,
        "horario_inicio": reuniao.horario_inicio.strftime("%H:%M"),
        "horario_fim": reuniao.horario_fim.strftime("%H:%M"),
        "status": status,
        "usuario_id": reuniao.usuario_id,
    }


def create_reuniao_service(data: ReuniaoCreate, usuario: Usuario, db: Session):
    turma = db.query(Turma).filter(Turma.id == data.turma_id).first()
    if not turma:
        return error_message("Turma não encontrada", 404)

    reuniao = Reuniao(
        turma_id=data.turma_id,
        tipo=data.titulo,
        descricao=data.descricao,
        data=data.data_reuniao,
        horario_inicio=DEFAULT_INICIO,
        horario_fim=DEFAULT_FIM,
        status=StatusReuniao.AGENDADA,
        usuario_id=usuario.id,
    )
    db.add(reuniao)
    db.commit()
    db.refresh(reuniao)
    return success_message(
        data=_reuniao_data(reuniao, db),
        message="Reunião agendada com sucesso",
    )


def update_reuniao_service(reuniao_id: int, data: ReuniaoUpdate, db: Session):
    reuniao = db.query(Reuniao).filter(Reuniao.id == reuniao_id).first()
    if not reuniao:
        return error_message("Reunião não encontrada", 404)

    updates = data.model_dump(exclude_unset=True)
    if "titulo" in updates:
        updates["tipo"] = updates.pop("titulo")
    if "data_reuniao" in updates:
        updates["data"] = updates.pop("data_reuniao")
    if "status" in updates:
        try:
            updates["status"] = StatusReuniao(updates["status"])
        except ValueError:
            return error_message("Status de reunião inválido", 400)

    for field, value in updates.items():
        setattr(reuniao, field, value)

    db.commit()
    db.refresh(reuniao)
    return success_message(
        data=_reuniao_data(reuniao, db),
        message="Reunião atualizada com sucesso",
    )


def list_reunioes_service(db: Session, turma_id: int | None = None):
    query = db.query(Reuniao)
    if turma_id is not None:
        query = query.filter(Reuniao.turma_id == turma_id)
    reunioes = query.order_by(Reuniao.data.desc()).all()
    return success_message(
        data=[_reuniao_data(r, db) for r in reunioes],
        message="Reuniões listadas com sucesso",
    )


def get_reuniao_service(reuniao_id: int, db: Session):
    reuniao = db.query(Reuniao).filter(Reuniao.id == reuniao_id).first()
    if not reuniao:
        return error_message("Reunião não encontrada", 404)
    return success_message(
        data=_reuniao_data(reuniao, db),
        message="Reunião encontrada",
    )
