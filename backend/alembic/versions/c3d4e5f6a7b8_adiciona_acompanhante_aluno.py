"""adiciona acompanhante_id em alunos

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-08 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _colunas_existentes() -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {col["name"] for col in inspector.get_columns("alunos")}


def upgrade() -> None:
    colunas = _colunas_existentes()
    if "acompanhante_id" not in colunas:
        with op.batch_alter_table("alunos") as batch_op:
            batch_op.add_column(sa.Column("acompanhante_id", sa.Integer(), nullable=True))
            batch_op.create_foreign_key(
                "fk_alunos_acompanhante_id_usuarios",
                "usuarios",
                ["acompanhante_id"],
                ["id"],
            )


def downgrade() -> None:
    colunas = _colunas_existentes()
    if "acompanhante_id" in colunas:
        with op.batch_alter_table("alunos") as batch_op:
            batch_op.drop_constraint("fk_alunos_acompanhante_id_usuarios", type_="foreignkey")
            batch_op.drop_column("acompanhante_id")
