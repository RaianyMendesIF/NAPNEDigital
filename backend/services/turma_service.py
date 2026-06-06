from sqlalchemy.orm import Session

from models import (
    Aluno,
    Cargo,
    ProfessorTurma,
    Semestre,
    StatusAluno,
    StatusProfessorTurma,
    StatusUsuario,
    Turma,
    Usuario,
)
from schemas import TurmaCreate, ProfessorTurmaCreate
from utils import error_message, success_message


def _turma_data(turma: Turma) -> dict:
    semestre = turma.semestre.value if hasattr(turma.semestre, "value") else turma.semestre
    return {
        "id": turma.id,
        "aluno_id": turma.aluno_id,
        "ano_letivo": turma.ano_letivo,
        "semestre": semestre,
    }


def _professor_turma_data(vinculo: ProfessorTurma) -> dict:
    status = vinculo.status.value if hasattr(vinculo.status, "value") else vinculo.status
    return {
        "id": vinculo.id,
        "turma_id": vinculo.turma_id,
        "usuario_id": vinculo.usuario_id,
        "materia": vinculo.materia,
        "status": status,
    }


def _parse_semestre(semestre: str) -> Semestre:
    return Semestre.PRIMEIRO if semestre == "1" else Semestre.SEGUNDO


def _parse_status_professor(status: str) -> StatusProfessorTurma:
    return StatusProfessorTurma(status)


def create_turma_service(data: TurmaCreate, db: Session):
    aluno = db.query(Aluno).filter(Aluno.id == data.aluno_id).first()
    if not aluno:
        return error_message("Aluno não encontrado", 404)

    if aluno.status != StatusAluno.ATIVO:
        return error_message("Aluno inativo", 400)

    semestre = _parse_semestre(data.semestre)
    existing = (
        db.query(Turma)
        .filter(
            Turma.aluno_id == data.aluno_id,
            Turma.ano_letivo == data.ano_letivo,
            Turma.semestre == semestre,
        )
        .first()
    )
    if existing:
        return error_message(
            "Já existe turma para este aluno no ano letivo e semestre informados",
            400,
        )

    turma = Turma(
        aluno_id=data.aluno_id,
        ano_letivo=data.ano_letivo,
        semestre=semestre,
    )
    db.add(turma)
    db.commit()
    db.refresh(turma)
    return success_message(
        data=_turma_data(turma),
        message="Turma criada com sucesso",
    )


def list_turmas_service(db: Session, usuario: Usuario):
    query = db.query(Turma)

    turmas = query.order_by(Turma.ano_letivo.desc(), Turma.id.desc()).all()
    return success_message(
        data=[_turma_data(t) for t in turmas],
        message="Turmas listadas com sucesso",
    )


def get_turma_service(turma_id: int, db: Session):
    turma = db.query(Turma).filter(Turma.id == turma_id).first()
    if not turma:
        return error_message("Turma não encontrada", 404)
    return success_message(
        data=_turma_data(turma),
        message="Turma encontrada",
    )


def vincular_professor_service(
    turma_id: int, data: ProfessorTurmaCreate, db: Session
):
    turma = db.query(Turma).filter(Turma.id == turma_id).first()
    if not turma:
        return error_message("Turma não encontrada", 404)

    professor = db.query(Usuario).filter(Usuario.id == data.usuario_id).first()
    if not professor:
        return error_message("Usuário não encontrado", 404)

    if professor.cargo != Cargo.ACOMPANHANTE:
        return error_message("Apenas acompanhantes podem ser vinculados à turma", 400)

    if professor.status != StatusUsuario.ATIVO:
        return error_message("Acompanhante inativo", 400)

    status = _parse_status_professor(data.status)
    existing = (
        db.query(ProfessorTurma)
        .filter(
            ProfessorTurma.turma_id == turma_id,
            ProfessorTurma.usuario_id == data.usuario_id,
            ProfessorTurma.materia == data.materia,
        )
        .first()
    )
    if existing:
        return error_message("Professor já vinculado a esta turma para esta matéria", 400)

    vinculo = ProfessorTurma(
        turma_id=turma_id,
        usuario_id=data.usuario_id,
        materia=data.materia,
        status=status,
    )
    db.add(vinculo)
    db.commit()
    db.refresh(vinculo)
    return success_message(
        data=_professor_turma_data(vinculo),
        message="Professor vinculado à turma com sucesso",
    )


def list_professores_turma_service(turma_id: int, db: Session):
    turma = db.query(Turma).filter(Turma.id == turma_id).first()
    if not turma:
        return error_message("Turma não encontrada", 404)

    vinculos = (
        db.query(ProfessorTurma)
        .filter(ProfessorTurma.turma_id == turma_id)
        .order_by(ProfessorTurma.materia)
        .all()
    )
    return success_message(
        data=[_professor_turma_data(v) for v in vinculos],
        message="Professores da turma listados com sucesso",
    )
