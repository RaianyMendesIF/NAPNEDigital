# ✅ CHECKLIST - Integração Frontend-Backend NAPNE Digital

## 📋 VERIFIKAÇÃO DO QUE FOI CRIADO

### Backend - Schemas
- [ ] `backend/schemas/aluno_schemas.py` - Contém AlunoCreate, AlunoUpdate, AlunoResponse
- [ ] `backend/schemas/reuniao_schemas.py` - Contém ReuniaoCreate, ReuniaoUpdate, ReuniaoResponse
- [ ] `backend/schemas/ocorrencia_schemas.py` - Contém OcorrenciaCreate, OcorrenciaUpdate, OcorrenciaResponse

### Backend - Rotas
- [ ] `backend/routes/alunos.py` - Com GET, POST, PUT, DELETE
- [ ] `backend/routes/reunioes.py` - Com GET, POST, PUT, DELETE
- [ ] `backend/routes/ocorrencias.py` - Com GET, POST, PUT, DELETE

### Backend - Configuração
- [ ] `backend/app.py` - Importa CORSMiddleware
- [ ] `backend/app.py` - Adiciona CORSMiddleware ao app
- [ ] `backend/app.py` - Registra as rotas (alunos_router, reunioes_router, ocorrencias_router)

### Frontend - Services
- [ ] `frontend/src/services/api.ts` - Contém ApiClient com métodos CRUD

### Frontend - Hooks
- [ ] `frontend/src/hooks/useApi.ts` - Contém useAlunos, useReunioes, useOcorrencias

### Documentação
- [ ] `INTEGRACAO_FRONTEND_BACKEND.md` - Guia de integração
- [ ] `EXEMPLO_INTEGRACAO_ACOMPANHANTES.md` - Exemplo de implementação

---

## 🧪 TESTE RÁPIDO - Validar Integração

### 1. Iniciar Backend
```bash
cd backend
python -m uvicorn app:app --reload
```

✅ Esperado: Servidor rodando em http://localhost:8000

### 2. Testar API - Swagger
Abra: http://localhost:8000/docs

Você deve ver:
- `/alunos` (4 endpoints)
- `/reunioes` (4 endpoints)
- `/ocorrencias` (4 endpoints)

### 3. Testar com cURL - Listar Alunos
```bash
curl http://localhost:8000/alunos
```

✅ Esperado: `[]` (lista vazia ou com alunos existentes)

### 4. Testar com cURL - Criar Aluno
```bash
curl -X POST http://localhost:8000/alunos \
  -H "Content-Type: application/json" \
  -d '{
    "matricula": "TEST001",
    "nome": "Teste Silva",
    "data_nascimento": "2008-10-20",
    "cpf": "123.456.789-00",
    "curso": "Técnico em Informática",
    "ano": "1º Ano",
    "necessidade_especial": "TEA",
    "cid": "F84.0"
  }'
```

✅ Esperado: Retorna objeto com `id: 1` (ou número sequencial)

### 5. Iniciar Frontend
```bash
cd frontend
npm run dev
```

✅ Esperado: Frontend rodando em http://localhost:5173

### 6. Verificar Console do Navegador
Abra DevTools (F12) → Console

✅ Não deve haver erros relacionados a módulos não encontrados

### 7. Verificar Network Tab
Abra DevTools (F12) → Network

Você deve ver requisições GET para:
- `http://localhost:8000/alunos`
- `http://localhost:8000/reunioes`
- `http://localhost:8000/ocorrencias`

---

## 🔧 PRÓXIMAS ETAPAS - IMPLEMENTAÇÃO

### Fase 3: Integrar no Coordenador.tsx
- [ ] Adicionar imports dos hooks
- [ ] Usar useAlunos, useReunioes, useOcorrencias
- [ ] Mapear dados do backend para formato do frontend
- [ ] Teste de visualização
- [ ] Teste de criação
- [ ] Teste de atualização
- [ ] Teste de deleção

### Fase 4: Integrar no Acompanhantes.tsx
- [ ] Adicionar imports dos hooks
- [ ] Carregar dados do backend
- [ ] Implementar CRUD functions
- [ ] Teste completo

### Fase 5: Adicionar Funcionalidades Avançadas
- [ ] Autenticação/JWT
- [ ] Tratamento de erros robusto
- [ ] Loading states
- [ ] Paginação
- [ ] Filtros
- [ ] Busca

---

## 🆘 Troubleshooting

### "Cannot connect to http://localhost:8000"
- Verifique se o backend está rodando
- Use `python -m uvicorn app:app --reload`

### "CORS error" no console
- Verifique se CORSMiddleware está em app.py
- Verifique se as rotas estão importadas

### "Cannot find module" no frontend
- Execute `npm install` novamente
- Verifique se a pasta node_modules existe

### Dados não aparecem no frontend
- Abra DevTools → Network tab
- Verifique se há requisição GET para /alunos
- Verifique se o status é 200 (sucesso)

### Erro "Aluno não encontrado" no PUT/DELETE
- Verifique o ID enviado
- Primeiro crie um aluno com POST
- Depois atualize com o ID retornado

---

## 📞 Suporte

### Arquivos de Referência
- [INTEGRACAO_FRONTEND_BACKEND.md](./INTEGRACAO_FRONTEND_BACKEND.md) - Documentação completa
- [EXEMPLO_INTEGRACAO_ACOMPANHANTES.md](./EXEMPLO_INTEGRACAO_ACOMPANHANTES.md) - Exemplos de código

### Comandos Úteis
```bash
# Backend - Desenvolvimento
python -m uvicorn app:app --reload

# Backend - Verificar dependências
pip list

# Frontend - Desenvolvimento
npm run dev

# Frontend - Build para produção
npm run build

# Testar API via cURL
curl -X GET http://localhost:8000/alunos
curl -X POST http://localhost:8000/alunos -H "Content-Type: application/json" -d '{...}'
```

### URLs Importantes
- Swagger (API Docs): http://localhost:8000/docs
- Frontend: http://localhost:5173
- Backend: http://localhost:8000

---

## 📊 Status Final

| Componente | Status | Arquivo |
|-----------|--------|---------|
| Schemas Alunos | ✅ | backend/schemas/aluno_schemas.py |
| Schemas Reuniões | ✅ | backend/schemas/reuniao_schemas.py |
| Schemas Ocorrências | ✅ | backend/schemas/ocorrencia_schemas.py |
| Rotas Alunos | ✅ | backend/routes/alunos.py |
| Rotas Reuniões | ✅ | backend/routes/reunioes.py |
| Rotas Ocorrências | ✅ | backend/routes/ocorrencias.py |
| CORS | ✅ | backend/app.py |
| API Client | ✅ | frontend/src/services/api.ts |
| Hooks | ✅ | frontend/src/hooks/useApi.ts |
| Documentação | ✅ | INTEGRACAO_FRONTEND_BACKEND.md |
| Exemplos | ✅ | EXEMPLO_INTEGRACAO_ACOMPANHANTES.md |

**Total: 11 arquivos criados/modificados ✅**

---

Gerado em: 2026-06-05
Projeto: NAPNE Digital
Versão: 1.0 - Integração Frontend-Backend
