# Relatório de Inconsistências Críticas — Modelagem NAPNE Digital

**Data:** 27/05/2026  
**Destinatário:** Responsável pela modelagem e banco de dados  
**Objetivo:** Registrar conflitos que impedem ou comprometem a implementação do backend e solicitar decisão formal antes das migrations.  
**Escopo:** Apenas inconsistências **críticas**. Ajustes de interface (frontend) serão feitos posteriormente conforme o modelo corrigido.

**Documentos analisados:**

- Diagrama de classes UML (NAPNE)
- Arquivo `database.sql` (rascunho atual)
- Requisitos operacionais inferidos do protótipo (login, corpo docente, ocorrências, atendimentos)

---

## Resumo executivo

O diagrama UML e o `database.sql` convergem em vários pontos (entidades principais, `Turma` como ciclo semestral, vínculo de ocorrências/solicitações à turma). Porém, existem **5 inconsistências críticas** que precisam de decisão antes de codar o banco e a API.

Nenhuma delas impede o projeto como um todo, mas **implementar sem resolvê-las gera modelo incoerente, FKs inválidas ou fluxos de negócio impossíveis** (ex.: professor que registra ocorrência sem poder autenticar no sistema).

---

## 1. Identificador do Aluno — PK inconsistente no próprio diagrama

### O problema

O diagrama UML define `**matricula` como chave primária** de `Aluno`, mas referencia o aluno de formas diferentes nas demais entidades:


| Entidade       | Campo de ligação ao aluno | Tipo implícito |
| -------------- | ------------------------- | -------------- |
| `Reuniao`      | `aluno_matricula`         | string (PK)    |
| `Atendimento`  | `aluno_matricula`         | string (PK)    |
| `Documentacao` | `aluno_id`                | inteiro        |
| `Turma`        | `aluno_matricula`         | string (PK)    |


Isso é **internamente contraditório**: `Documentacao` aponta para um `aluno_id` numérico, enquanto `Aluno` não possui esse campo como identificador.

O `database.sql` resolve parcialmente com `id_aluno SERIAL` + `matricula UNIQUE`, mas o diagrama oficial ainda conflita consigo mesmo.

### Impacto se não decidir

- Impossível definir FKs consistentes em todas as tabelas
- Migrations e ORM (SQLAlchemy/Alembic) ficam ambíguos
- Risco de implementação parcial (metade das tabelas usando `matricula`, metade usando `id`)

### Decisão necessária

Escolher **uma** estratégia e aplicar em **todas** as entidades:


| Opção               | Descrição                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| **A (recomendada)** | PK surrogate `id_aluno` (SERIAL) + `matricula` UNIQUE como identificador de negócio                             |
| **B**               | PK natural `matricula` (string) em todas as FKs — exige corrigir `Documentacao.aluno_id` para `aluno_matricula` |


---

## 2. Entidade `Professor` separada de `Usuario` — conflito de autenticação e fluxo

### O problema


| Aspecto                      | Diagrama UML                          | `database.sql`                      |
| ---------------------------- | ------------------------------------- | ----------------------------------- |
| Quem é professor             | Entidade `Professor` (id, nome, area) | `Usuario` com `cargo = 'Professor'` |
| Quem faz login               | Apenas `Usuario` (SIAPE + senha)      | `Usuario` (todos os cargos)         |
| `Professor_Turma` referencia | `professor_id` → `Professor`          | `id_usuario` → `Usuario`            |


No diagrama, `**Professor` não possui credenciais** (SIAPE, senha, e-mail). Apenas `Usuario` autentica, e o cargo de `Usuario` está restrito a **Agente** e **Coordenador(a)** — sem Professor nem Psicólogo.

Na operação real do NAPNE:

- **Professores** registram ocorrências em sala de aula
- **Psicólogos** registram atendimentos
- **Coordenadores** gerenciam alunos, reuniões e documentação

Com o modelo do diagrama literal, professores e psicólogos **não conseguem autenticar** nem aparecem como `usuario_id` em `Atendimento` e `Ocorrencia`.

### Impacto se não decidir

- Dois cadastros paralelos (Professor + Usuario) para a mesma pessoa, ou professores “fantasma” sem login
- FKs de `Professor_Turma` e `Ocorrencia` apontam para entidades diferentes conforme a fonte (diagrama vs SQL)
- Backend de autenticação (JWT/login por SIAPE) fica indefinido

### Decisão necessária


| Opção               | Descrição                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A (recomendada)** | Eliminar entidade `Professor`; unificar em `Usuario` com campo `cargo`; `Professor_Turma.usuario_id` referencia `Usuario`                         |
| **B**               | Manter `Professor` separado, mas criar vínculo explícito `Usuario` ↔ `Professor` (1:1) e definir quem de fato autentica                           |
| **C**               | Manter `Professor` sem login e restringir registro de ocorrências apenas a Agentes/Coordenadores — **incompatível com o fluxo esperado do NAPNE** |


---

## 3. Domínio de `Usuario.cargo` incompleto no diagrama

### O problema


| Fonte             | Valores de `cargo`                                             |
| ----------------- | -------------------------------------------------------------- |
| Diagrama UML      | ENUM: `Agente`, `Coordenador(a)`                               |
| `database.sql`    | VARCHAR livre: Professor, Psicólogo, Coordenador SINAPNE, etc. |
| Operação do NAPNE | Professor, Psicólogo, Agente, Coordenador (mínimo)             |


O diagrama **não prevê Psicólogo** nem **Professor** como cargo de `Usuario`, embora `Atendimento` exija `usuario_id` de quem realizou o atendimento (tipicamente psicólogo ou coordenador).

### Impacto se não decidir

- ENUM ou CHECK constraint incorreto no banco
- Regras de autorização na API (quem pode criar/editar o quê) sem base no modelo
- Necessidade de migration posterior para alterar ENUM — custo alto em produção

### Decisão necessária

Definir a **lista fechada de cargos** que:

1. Possuem login no sistema
2. Podem ser referenciados em `Atendimento`, `Ocorrencia`, `Documentacao` e `Professor_Turma`

**Sugestão mínima:** `Professor`, `Psicólogo`, `Agente`, `Coordenador SINAPNE` (ou equivalente institucional).

---

## 4. `Ocorrencia` sem registrador no diagrama UML

### O problema


| Atributo                         | Diagrama UML | `database.sql` |
| -------------------------------- | ------------ | -------------- |
| `turma_id`                       | Sim          | Sim            |
| `titulo`, `descricao`            | Sim          | Sim            |
| `usuario_id` (autor/registrador) | **Ausente**  | **Presente**   |


Ocorrências em sala de aula precisam identificar **quem registrou** (professor ou servidor). Sem `usuario_id`:

- Não há rastreabilidade
- Dificulta auditoria e conformidade (LGPD — dados sensíveis de estudantes)
- O backend não consegue implementar permissões (“só o autor ou coordenador pode editar”)

### Impacto se não decidir

- Modelo incompleto para produção
- Retrabalho garantido ao incluir o campo depois

### Decisão necessária

Confirmar inclusão de `**usuario_id NOT NULL`** em `Ocorrencia`, referenciando a entidade unificada de servidores (ver item 2).

---

## 5. Chave primária de `Usuario` — `siape` vs `id` surrogate

### O problema


| Fonte          | PK de `Usuario`       | FKs nas relações                   |
| -------------- | --------------------- | ---------------------------------- |
| Diagrama UML   | `siape` (int)         | Campos nomeados `usuario_id` (int) |
| `database.sql` | `id_usuario` (SERIAL) | `id_usuario`                       |


O diagrama usa `siape` como PK, mas as associações (`Reuniao`, `Atendimento`, `Documentacao`) referenciam `usuario_id` — sem deixar claro se é o SIAPE ou um id interno.

### Impacto se não decidir

- Ambiguidade em todas as FKs que apontam para servidor
- ORM e migrations com nomenclatura inconsistente
- SIAPE como PK natural funciona, mas dificulta cenários de correção cadastral (SIAPE raramente muda, porém vínculos com int são padrão em ORMs)

### Decisão necessária


| Opção               | Descrição                                                                          |
| ------------------- | ---------------------------------------------------------------------------------- |
| **A (recomendada)** | PK `id_usuario` (SERIAL) + `siape` UNIQUE NOT NULL; todas as FKs usam `id_usuario` |
| **B**               | PK `siape`; renomear FKs para `siape` ou documentar que `usuario_id` = `siape`     |


---

## Matriz de decisão (para preenchimento)


| #   | Tema                 | Opção escolhida                                                                | Responsável | Data |
| --- | -------------------- | ------------------------------------------------------------------------------ | ----------- | ---- |
| 1   | PK do Aluno          | ☐ A — id + matricula unique ☐ B — matricula como PK                            |             |      |
| 2   | Professor vs Usuario | ☐ A — unificar ☐ B — entidades separadas com vínculo ☐ C — Professor sem login |             |      |
| 3   | Cargos de Usuario    | Lista definida: _________________________                                      |             |      |
| 4   | Autor em Ocorrencia  | ☐ Incluir usuario_id ☐ Não incluir                                             |             |      |
| 5   | PK de Usuario        | ☐ A — id + siape unique ☐ B — siape como PK                                    |             |      |


---

## Itens analisados e considerados não críticos

Estes pontos foram **deliberadamente excluídos** deste relatório por serem ajustáveis após a decisão do modelo, sem bloquear o banco:

- Nomenclatura `Documentacao` vs `Documentation`
- Valores de ENUM de status (`Ativo`/`Acompanhamento`/`Inativo`, status de reunião etc.)
- Lista de cursos no ENUM de `Aluno`
- `Reuniao` ligada ao aluno (diagrama) vs à turma (`database.sql`) — ambas são válidas; impacto principalmente em consultas, não em integridade
- Campos extras em `Professor_Turma` (`status`) presentes no diagrama e ausentes no SQL — melhoria, não bloqueio
- Sintaxe mista MySQL/PostgreSQL no `database.sql` — questão de SGBD escolhido, não de modelagem conceitual

---

## Próximo passo sugerido

Após o preenchimento da matriz de decisão:

1. Atualizar o diagrama UML oficial
2. Gerar versão final do schema (PostgreSQL recomendado)
3. Iniciar migrations (Alembic) e implementação do backend (FastAPI)

---

*Documento elaborado pela equipe de desenvolvimento do NAPNE Digital com base no diagrama UML, no arquivo `database.sql` e no protótipo frontend existente.*