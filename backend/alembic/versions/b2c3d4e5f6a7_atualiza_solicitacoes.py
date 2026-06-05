"""atualiza solicitacoes com solicitante

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-04 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _colunas_existentes() -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {col["name"] for col in inspector.get_columns("solicitacoes")}


def upgrade() -> None:
    colunas = _colunas_existentes()

    with op.batch_alter_table("solicitacoes", schema=None) as batch_op:
        if "usuario_solicitante_id" not in colunas:
            batch_op.add_column(sa.Column("usuario_solicitante_id", sa.Integer(), nullable=True))
            batch_op.create_foreign_key(
                "fk_solicitacoes_usuario_solicitante",
                "usuarios",
                ["usuario_solicitante_id"],
                ["id"],
            )


def downgrade() -> None:
    colunas = _colunas_existentes()

    with op.batch_alter_table("solicitacoes", schema=None) as batch_op:
        if "usuario_solicitante_id" in colunas:
            batch_op.drop_constraint("fk_solicitacoes_usuario_solicitante", type_="foreignkey")
            batch_op.drop_column("usuario_solicitante_id")
