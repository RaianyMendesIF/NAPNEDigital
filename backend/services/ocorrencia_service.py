from datetime import date

from sqlalchemy.orm import Session

from models import (
    Cargo,
    Ocorrencia,
    ProfessorTurma,
    StatusProfessorTurma,
    Turma,
    Usuario,
)
from schemas import OcorrenciaCreate, OcorrenciaUpdate
from core.dependencies import usuario_pode_registrar_em_turma, usuario_tem_acesso_turma
from utils import error_message, success_message


def _ocorrencia_data(
    ocorrencia: Ocorrencia, turma: Turma | None = None, db: Session | None = None
) -> dict:
    if turma is None and ocorrencia.turma_id and db is not None:
        turma = db.query(Turma).filter(Turma.id == ocorrencia.turma_id).first()

    semestre = None
    ano_letivo = None
    aluno_id = None
    if turma:
        semestre = turma.semestre.value if hasattr(turma.semestre, "value") else turma.semestre
        ano_letivo = turma.ano_letivo
        aluno_id = turma.aluno_id

    usuario_nome = None
    usuario_cargo = None
    if db is not None:
        usuario = db.query(Usuario).filter(Usuario.id == ocorrencia.usuario_id).first()
        if usuario:
            usuario_nome = usuario.nome
            usuario_cargo = usuario.cargo.value if hasattr(usuario.cargo, "value") else usuario.cargo

    return {
        "id": ocorrencia.id,
        "turma_id": ocorrencia.turma_id,
        "aluno_id": aluno_id,
        "semestre": semestre,
        "ano_letivo": ano_letivo,
        "usuario_id": ocorrencia.usuario_id,
        "usuario_nome": usuario_nome,
        "usuario_cargo": usuario_cargo,
        "titulo": ocorrencia.titulo,
        "descricao": ocorrencia.descricao,
        "data_registro": ocorrencia.data_registro,
    }


def _titulo_from_descricao(descricao: str) -> str:
    titulo = descricao.strip()[:100]
    return titulo or "Ocorrência acadêmica"


def create_ocorrencia_service(
    data: OcorrenciaCreate, usuario: Usuario, db: Session
):
    turma = db.query(Turma).filter(Turma.id == data.turma_id).first()
    if not turma:
        return error_message("Turma não encontrada", 404)

    if not usuario_pode_registrar_em_turma(usuario, data.turma_id, db):
        return error_message("Sem permissão para registrar ocorrência nesta turma", 403)

    titulo = (
        data.titulo.strip()
        if data.titulo
        else _titulo_from_descricao(data.descricao)
    )

    ocorrencia = Ocorrencia(
        turma_id=data.turma_id,
        usuario_id=usuario.id,
        titulo=titulo,
        descricao=data.descricao,
    )
    db.add(ocorrencia)
    db.commit()
    db.refresh(ocorrencia)
    return success_message(
        data=_ocorrencia_data(ocorrencia, turma, db=db),
        message="Ocorrência registrada com sucesso",
    )


def _turmas_acessiveis(usuario: Usuario, db: Session) -> list[int] | None:
    if usuario.cargo in (Cargo.COORDENADOR, Cargo.ACOMPANHANTE):
        return None
    return []


def list_ocorrencias_service(
    db: Session,
    usuario: Usuario,
    turma_id: int | None = None,
    aluno_id: int | None = None,
    semestre: str | None = None,
):
    query = db.query(Ocorrencia).join(Turma, Ocorrencia.turma_id == Turma.id)

    turmas_permitidas = _turmas_acessiveis(usuario, db)
    if turmas_permitidas is not None:
        if not turmas_permitidas:
            return success_message(data=[], message="Ocorrências listadas com sucesso")
        query = query.filter(Ocorrencia.turma_id.in_(turmas_permitidas))

    if turma_id is not None:
        query = query.filter(Ocorrencia.turma_id == turma_id)

    if aluno_id is not None:
        query = query.filter(Turma.aluno_id == aluno_id)

    if semestre is not None:
        query = query.filter(Turma.semestre == semestre)

    ocorrencias = query.order_by(Ocorrencia.data_registro.desc()).all()
    return success_message(
        data=[_ocorrencia_data(o, db=db) for o in ocorrencias],
        message="Ocorrências listadas com sucesso",
    )


def get_ocorrencia_service(ocorrencia_id: int, usuario: Usuario, db: Session):
    ocorrencia = db.query(Ocorrencia).filter(Ocorrencia.id == ocorrencia_id).first()
    if not ocorrencia:
        return error_message("Ocorrência não encontrada", 404)

    if not usuario_tem_acesso_turma(usuario, ocorrencia.turma_id, db):
        return error_message("Sem acesso a esta ocorrência", 403)

    return success_message(
        data=_ocorrencia_data(ocorrencia, db=db),
        message="Ocorrência encontrada",
    )


def update_ocorrencia_service(
    ocorrencia_id: int, data: OcorrenciaUpdate, usuario: Usuario, db: Session
):
    ocorrencia = db.query(Ocorrencia).filter(Ocorrencia.id == ocorrencia_id).first()
    if not ocorrencia:
        return error_message("Ocorrência não encontrada", 404)

    if not usuario_pode_registrar_em_turma(usuario, ocorrencia.turma_id, db):
        return error_message("Sem permissão para editar esta ocorrência", 403)

    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(ocorrencia, field, value)

    db.commit()
    db.refresh(ocorrencia)
    return success_message(
        data=_ocorrencia_data(ocorrencia, db=db),
        message="Ocorrência atualizada com sucesso",
    )
