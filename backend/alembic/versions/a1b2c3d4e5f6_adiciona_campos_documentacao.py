"""adiciona campos documentacao upload

Revision ID: a1b2c3d4e5f6
Revises: e4ca02a53bb1
Create Date: 2026-06-04 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "e4ca02a53bb1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _colunas_existentes() -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {col["name"] for col in inspector.get_columns("documentacoes")}


def upgrade() -> None:
    colunas = _colunas_existentes()

    with op.batch_alter_table("documentacoes", schema=None) as batch_op:
        if "tipo_documento" not in colunas:
            batch_op.add_column(
                sa.Column(
                    "tipo_documento",
                    sa.String(),
                    nullable=False,
                    server_default="Documento",
                )
            )
        if "caminho_arquivo" not in colunas:
            batch_op.add_column(
                sa.Column(
                    "caminho_arquivo",
                    sa.String(),
                    nullable=False,
                    server_default="",
                )
            )


def downgrade() -> None:
    colunas = _colunas_existentes()

    with op.batch_alter_table("documentacoes", schema=None) as batch_op:
        if "caminho_arquivo" in colunas:
            batch_op.drop_column("caminho_arquivo")
        if "tipo_documento" in colunas:
            batch_op.drop_column("tipo_documento")
