# Relatório de Fluxos Operacionais — NAPNE Digital

**Data:** 29/05/2026  
**Versão do modelo:** Proposta unificada (pós-correção das inconsistências críticas)  
**Objetivo:** Descrever, em ordem lógica de execução, todos os fluxos operacionais do sistema — incluindo a criação do primeiro usuário administrador e o cadastro dos demais servidores.

**Premissas do modelo:**

- Entidade única `Usuario` para todos os servidores (Professor, Psicólogo, Agente, Coordenador SINAPNE)
- PKs surrogate: `Usuario.id`, `Aluno.id`
- `Turma` representa o ciclo semestral do aluno
- Ocorrências, solicitações e reuniões vinculadas à `Turma`
- Atendimentos vinculados diretamente ao `Aluno`

---

## Hierarquia de cargos e permissões


| Cargo                   | Nível       | Pode criar usuários   | Principais ações                                                                 |
| ----------------------- | ----------- | --------------------- | -------------------------------------------------------------------------------- |
| **Coordenador SINAPNE** | Alto        | Sim — todos os cargos | Gestão completa: alunos, usuários, reuniões, documentos, análise de solicitações |
| **Agente**              | Médio       | Não                   | Apoio operacional: cadastro de alunos, documentação, consultas                   |
| **Psicólogo**           | Operacional | Não                   | Atendimentos, consulta de prontuários                                            |
| **Professor**           | Operacional | Não                   | Ocorrências (nas turmas vinculadas), solicitações, consulta limitada             |


> **Cargo inicial (bootstrap):** o primeiro usuário do sistema é criado manualmente (seed/migration ou script de instalação) com cargo **Coordenador SINAPNE**. Esse usuário é responsável por cadastrar todos os demais servidores. Não há auto-cadastro público.

---

## Índice dos fluxos (ordem de execução)


| Ordem | Fluxo                                 | Quem executa                                       |
| ----- | ------------------------------------- | -------------------------------------------------- |
| 0     | Instalação e primeiro usuário         | TI / equipe de implantação                         |
| 1     | Login                                 | Qualquer `Usuario` ativo                           |
| 2     | Cadastro de servidores                | Coordenador SINAPNE                                |
| 3     | Cadastro de responsável               | Coordenador SINAPNE ou Agente                      |
| 4     | Cadastro de aluno                     | Coordenador SINAPNE ou Agente                      |
| 5     | Abertura de turma (ciclo semestral)   | Coordenador SINAPNE ou Agente                      |
| 6     | Vínculo professor ↔ turma             | Coordenador SINAPNE ou Agente                      |
| 7     | Cadastro de documentação (PEI, laudo) | Coordenador SINAPNE ou Agente                      |
| 8     | Registro de atendimento               | Psicólogo ou Coordenador SINAPNE                   |
| 9     | Agendamento de reunião                | Coordenador SINAPNE                                |
| 10    | Registro de ocorrência                | Professor (turma vinculada) ou Coordenador SINAPNE |
| 11    | Abertura de solicitação               | Professor ou Coordenador SINAPNE                   |
| 12    | Análise de solicitação                | Coordenador SINAPNE                                |
| 13    | Consulta ao prontuário do aluno       | Conforme cargo                                     |
| 14    | Desativação de aluno ou servidor      | Coordenador SINAPNE                                |


---

## Fluxo 0 — Instalação e criação do primeiro usuário

**Executor:** equipe de implantação (TI / desenvolvimento)  
**Quando:** uma única vez, na instalação do sistema no servidor da faculdade  
**Não passa pela interface** — feito via script, migration ou comando administrativo

### Passos

```
1. Criar banco de dados (PostgreSQL) e aplicar migrations (schema vazio)
2. Executar seed de instalação com o primeiro Coordenador SINAPNE:
   - siape: definido pela instituição
   - nome, email institucional
   - senha: gerada de forma segura (entregue pessoalmente ao coordenador)
   - cargo: Coordenador SINAPNE
   - status: Ativo
3. Coordenador recebe credenciais e acessa o sistema pela primeira vez
4. Coordenador altera a senha no primeiro login (recomendado)
5. Coordenador cadastra os demais servidores (Fluxo 2)
```

### Regras

- Apenas **um ou poucos** usuários bootstrap (coordenadores de implantação)
- Senha nunca armazenada em texto puro — apenas hash (bcrypt/argon2)
- Sem endpoint público de registro (`POST /usuarios` exige autenticação de Coordenador)

---

## Fluxo 1 — Login

**Executor:** qualquer `Usuario` com `status = Ativo`  
**Pré-requisito:** usuário já cadastrado (Fluxo 0 ou Fluxo 2)

### Passos

```
1. Usuário acessa a tela de login
2. Informa SIAPE e senha
3. API valida:
   a. Existe Usuario com esse siape?
   b. status = Ativo?
   c. Senha confere com o hash?
4. API retorna JWT contendo: id_usuario, siape, nome, cargo
5. Frontend armazena token e carrega interface conforme cargo
6. Requisições subsequentes enviam: Authorization: Bearer <token>
```

### Saídas possíveis


| Resultado         | Ação                                        |
| ----------------- | ------------------------------------------- |
| Sucesso           | Redireciona ao dashboard                    |
| SIAPE inexistente | Mensagem genérica ("credenciais inválidas") |
| Usuário inativo   | "Conta desativada. Contate o coordenador."  |
| Senha incorreta   | Mensagem genérica                           |


---

## Fluxo 2 — Cadastro de servidores (demais usuários)

**Executor:** Coordenador SINAPNE  
**Pré-requisito:** Fluxo 1 (login como Coordenador)

### Passos

```
1. Coordenador acessa "Corpo Docente" / "Gerenciar Usuários"
2. Clica em "Novo servidor"
3. Preenche:
   - SIAPE (único)
   - Nome completo
   - Email institucional (único)
   - Cargo: Professor | Psicólogo | Agente | Coordenador SINAPNE
   - Senha inicial (ou geração automática + envio por email institucional)
4. API valida unicidade de siape e email
5. API persiste Usuario com status = Ativo e senha hasheada
6. Novo servidor pode fazer login (Fluxo 1)
```

### Regras

- Coordenador **pode** criar outro Coordenador SINAPNE (ex.: substituto)
- Agente, Psicólogo e Professor **não** cadastram usuários
- Edição e desativação: ver Fluxo 14

---

## Fluxo 3 — Cadastro de responsável

**Executor:** Coordenador SINAPNE ou Agente  
**Pré-requisito:** Fluxo 1

### Passos

```
1. Acessa cadastro de aluno (novo) ou seção de responsáveis
2. Verifica se responsável já existe (busca por nome/telefone/email)
3. Se não existir, cadastra Responsavel:
   - nome
   - telefone (contato)
   - email (opcional)
4. Sistema retorna id do Responsavel para vincular ao aluno
```

### Regras

- Um responsável pode estar vinculado a mais de um aluno (irmãos)
- Responsável **não** faz login no sistema (sem entidade Usuario)

---

## Fluxo 4 — Cadastro de aluno

**Executor:** Coordenador SINAPNE ou Agente  
**Pré-requisito:** Fluxos 1 e 3 (responsável cadastrado ou selecionado)

### Passos

```
1. Acessa "Alunos" → "Novo aluno"
2. Preenche dados pessoais:
   - matricula (única)
   - nome
   - data_nascimento
   - cpf (único)
   - telefone (opcional)
   - curso
   - ano/série (ex.: "2º Ano")
   - necessidade_especial (NEE)
   - cid (opcional)
   - observacao (opcional)
   - status: Ativo
3. Seleciona ou cadastra Responsavel (responsavel_id)
4. API valida unicidade de matricula e cpf
5. API persiste Aluno
6. Sistema sugere: "Abrir turma do semestre atual?" → Fluxo 5
```

---

## Fluxo 5 — Abertura de turma (ciclo semestral)

**Executor:** Coordenador SINAPNE ou Agente  
**Pré-requisito:** Fluxo 4 (aluno cadastrado)

### Passos

```
1. Seleciona aluno
2. Informa ciclo letivo:
   - ano_letivo (ex.: 2026)
   - semestre (1 ou 2)
3. API verifica se já existe Turma para aluno + ano + semestre
4. API cria Turma vinculada ao aluno_id
5. Sistema sugere: "Vincular professores?" → Fluxo 6
```

### Regras

- Um aluno pode ter **várias** turmas ao longo do tempo (histórico semestral)
- Apenas uma turma por combinação (aluno_id, ano_letivo, semestre)
- Ao iniciar novo semestre: criar nova Turma; turmas anteriores permanecem no histórico

---

## Fluxo 6 — Vínculo professor ↔ turma

**Executor:** Coordenador SINAPNE ou Agente  
**Pré-requisito:** Fluxos 2 (professores cadastrados) e 5 (turma aberta)

### Passos

```
1. Seleciona Turma do aluno
2. Busca Usuarios com cargo = Professor
3. Para cada professor do semestre, adiciona vínculo:
   - turma_id
   - usuario_id (professor)
   - materia (ex.: "Programação Orientada a Objetos")
   - status: Em andamento | Concluída | Pendente
4. API persiste Professor_Turma
5. Professores vinculados passam a ver o aluno/turma em suas permissões
```

### Regras

- Um professor pode estar em várias turmas (vários alunos NAPNE)
- Uma turma pode ter vários professores (várias disciplinas)

---

## Fluxo 7 — Cadastro de documentação (PEI, laudo, relatório)

**Executor:** Coordenador SINAPNE ou Agente  
**Pré-requisito:** Fluxo 4 (aluno cadastrado)

### Passos

```
1. Seleciona Aluno
2. Preenche metadados:
   - nome (ex.: "Plano Educacional Individualizado 2026/1")
   - ano_letivo, semestre
   - status: Pendente | Aprovado | Vencido
3. Faz upload do arquivo (PDF, etc.) — armazenado no servidor de arquivos
4. API persiste Documentacao:
   - aluno_id
   - usuario_id (quem enviou)
   - data_criacao (automática)
   - caminho/referência do arquivo
5. Documento aparece na aba "PEI / Documentos" do prontuário
```

### Regras

- Metadados no banco; arquivo binário fora do banco (disco/object storage)
- Apenas servidores autorizados podem fazer upload (Coordenador, Agente)

---

## Fluxo 8 — Registro de atendimento

**Executor:** Psicólogo ou Coordenador SINAPNE  
**Pré-requisito:** Fluxo 4 (aluno cadastrado), Fluxo 1

### Passos

```
1. Acessa "Atendimentos" ou prontuário do aluno
2. Seleciona Aluno
3. Preenche:
   - tipo (ex.: "Atendimento Individual", "Encaminhamento", "Reunião com família")
   - descricao (registro do atendimento)
   - data (padrão: agora)
4. API persiste Atendimento:
   - aluno_id
   - usuario_id (psicólogo/coordenador logado)
   - tipo, descricao, data
5. Registro aparece na timeline / aba Atendimentos do aluno
```

### Regras

- Vinculado ao **aluno**, não à turma (atendimento transcende o semestre)
- Professor e Agente: apenas consulta, salvo regra institucional diferente

---

## Fluxo 9 — Agendamento de reunião

**Executor:** Coordenador SINAPNE  
**Pré-requisito:** Fluxo 5 (turma aberta)

### Passos

```
1. Seleciona Turma (semestre + aluno)
2. Sistema lista professores vinculados (Professor_Turma) para referência
3. Preenche:
   - tipo (ex.: "Revisão de PEI", "Reunião com família", "Alinhamento pedagógico")
   - descricao
   - data, horario_inicio, horario_fim
   - status: Agendada
4. API persiste Reuniao:
   - turma_id
   - usuario_id (coordenador que agendou)
   - demais campos
5. Reunião aparece no calendário / módulo Reuniões
6. Após realização: atualizar status → Realizada ou Cancelada
```

### Regras

- Vinculada à **turma** para manter contexto semestral e professores envolvidos
- Participantes (professores) são informativos ou via lista derivada de Professor_Turma

---

## Fluxo 10 — Registro de ocorrência em sala

**Executor:** Professor (turma vinculada) ou Coordenador SINAPNE  
**Pré-requisito:** Fluxos 5 e 6 (turma com professores vinculados)

### Passos

```
1. Professor logado acessa "Ocorrências" → "Nova ocorrência"
2. Sistema lista apenas Turmas em que o professor está em Professor_Turma
   (Coordenador vê todas as turmas)
3. Seleciona Turma
4. Preenche:
   - titulo (ex.: "Dificuldade em atividade em grupo")
   - descricao
5. API persiste Ocorrencia:
   - turma_id
   - usuario_id (autor — professor ou coordenador logado)
   - titulo, descricao
   - data_registro (automática)
6. Ocorrência aparece no prontuário do aluno e no módulo Ocorrências
```

### Regras

- **Professor só registra em turmas onde está vinculado**
- Coordenador pode registrar em qualquer turma
- Ocorrência sempre tem autor (`usuario_id`) — rastreabilidade / LGPD

---

## Fluxo 11 — Abertura de solicitação

**Executor:** Professor ou Coordenador SINAPNE  
**Pré-requisito:** Fluxo 5 (turma aberta)

### Passos

```
1. Seleciona Turma (professor: apenas turmas vinculadas)
2. Descreve solicitação:
   - ex.: prorrogação de prazo, adaptação de prova, sala reservada
3. API persiste Solicitacao:
   - turma_id
   - descricao
   - data_solicitacao (automática)
   - status: Em Análise
4. Solicitação entra na fila do coordenador
```

---

## Fluxo 12 — Análise de solicitação

**Executor:** Coordenador SINAPNE  
**Pré-requisito:** Fluxo 11 (solicitação aberta)

### Passos

```
1. Coordenador acessa solicitações pendentes
2. Visualiza detalhes: aluno (via Turma), autor implícito, descrição
3. Decide:
   - Deferido → status atualizado
   - Indeferido → status atualizado (com motivo opcional em descricao/nota)
4. API persiste alteração de status
5. Solicitante pode consultar resultado (consulta)
```

---

## Fluxo 13 — Consulta ao prontuário do aluno

**Executor:** conforme cargo  
**Pré-requisito:** aluno cadastrado

### Passos

```
1. Usuário busca aluno (nome, matricula, curso, NEE)
2. API verifica permissão conforme cargo
3. Abre prontuário consolidado:

   Aluno
   ├── Dados pessoais + Responsavel
   ├── Turmas (histórico semestral)
   │     ├── Professores (Professor_Turma)
   │     ├── Ocorrências
   │     ├── Solicitações
   │     └── Reuniões
   ├── Atendimentos
   └── Documentações

4. Ações disponíveis dependem do cargo (criar ocorrência, atendimento, etc.)
```

### Matriz de consulta


| Cargo               | Ver prontuário         | Ver atendimentos  | Ver documentos    |
| ------------------- | ---------------------- | ----------------- | ----------------- |
| Coordenador SINAPNE | Todos os alunos        | Sim               | Sim               |
| Agente              | Todos os alunos        | Conforme política | Sim               |
| Psicólogo           | Todos os alunos        | Sim               | Conforme política |
| Professor           | Alunos das suas turmas | Não (padrão)      | Conforme política |


---

## Fluxo 14 — Desativação de aluno ou servidor

**Executor:** Coordenador SINAPNE  
**Pré-requisito:** Fluxo 1 (login como Coordenador)

### Passos — desativar servidor

```
1. Coordenador acessa Corpo Docente
2. Seleciona Usuario
3. Altera status: Ativo → Inativo
4. API impede novo login; registros históricos permanecem
5. Coordenador não pode desativar a si mesmo se for o único ativo
```

### Passos — desativar aluno

```
1. Coordenador acessa ficha do aluno
2. Altera status: Ativo → Inativo (ou Acompanhamento, conforme ENUM final)
3. Turmas e histórico permanecem; aluno sai de listagens ativas
```

### Regras

- Desativação é **lógica** (status), não exclusão física — preserva histórico e LGPD
- Não apagar registros com FK RESTRICT sem avaliação (ex.: documentos)

---

## Diagrama da ordem de implantação operacional

```
[Fluxo 0] Seed → Coordenador bootstrap
      ↓
[Fluxo 1] Login do Coordenador
      ↓
[Fluxo 2] Cadastro dos demais servidores
      ↓
[Fluxo 3] Responsáveis  →  [Fluxo 4] Alunos
                                  ↓
                           [Fluxo 5] Turmas
                                  ↓
                           [Fluxo 6] Professor_Turma
                                  ↓
        ┌─────────────────────────┼─────────────────────────┐
        ↓                         ↓                         ↓
 [Fluxo 7] Documentação    [Fluxo 8] Atendimento    [Fluxo 9] Reuniões
        ↓                         ↓                         ↓
 [Fluxo 10] Ocorrências    [Fluxo 11] Solicitações ←─────────┘
                                  ↓
                           [Fluxo 12] Análise (Coordenador)
                                  ↓
                           [Fluxo 13] Consultas (contínuo)
                                  ↓
                           [Fluxo 14] Desativações (quando necessário)
```

---

## Resumo para validação

Confirme se esta ordem e estas regras refletem o que a instituição espera:

1. **Primeiro usuário** criado fora do sistema (seed), cargo **Coordenador SINAPNE**
2. **Somente Coordenador** cadastra novos servidores
3. **Responsável** não acessa o sistema
4. **Turma** é criada por semestre após cadastro do aluno
5. **Professores** vinculados à turma antes de registrar ocorrências
6. **Atendimento** ligado ao aluno; **ocorrência/reunião/solicitação** ligados à turma
7. **Professor** só age nas turmas em que está vinculado
8. **Desativação** lógica, sem apagar histórico

---

*Documento elaborado para alinhamento entre equipe de desenvolvimento, modelagem de banco e coordenação do NAPNE — IFMS Campus Três Lagoas.*