# 🚀 Deploy v1.7.0 - FAQ Multi-tenant e Melhorias

**Data:** 2025-01-XX  
**Versão:** v1.7.0  
**Status:** ✅ Pronto para Deploy

## 📋 Resumo das Mudanças

Esta versão inclui:
1. Sistema de FAQ multi-tenant por cliente
2. Integração do FAQ com Gemini AI para aprendizado
3. Visualização admin como cliente com seleção de empresa
4. Correções de bugs (select boxes, perfil do cliente, FAQ para managers)

## ✅ Checklist Pré-Deploy

### Código
- [x] Todas as funcionalidades implementadas e testadas localmente
- [x] Erros de lint corrigidos
- [x] Componentes novos criados (`AdminClientView.tsx`)
- [x] Logs de erro melhorados
- [x] Documentação atualizada

### Firestore
- [x] Collection `faq` existe e suporta campo `companyId`
- [x] Collection `companies` existe
- [x] Índices recomendados (opcional, mas melhora performance):
  - `faq`: `category` + `order` (composite)
  - `faq`: `companyId` + `active` + `order` (composite) - novo índice recomendado

### Variáveis de Ambiente
- [x] `VITE_GEMINI_API_KEY` - Configurada em produção
- [x] `VITE_POSTMARK_PROXY_URL` - Configurada
- [x] `VITE_AUTH_RESET_PROXY_URL` - Configurada

### Proxies Cloud Run
- [x] `cubbo-auth-proxy` - ✅ Funcionando
- [x] `postmark-email-proxy` - ✅ Funcionando
- [x] `firebase-auth-reset-proxy` - ✅ Funcionando

## 🔧 Comandos de Deploy

### Deploy Automático (Recomendado)

```bash
./deploy.sh
```

### Deploy Manual

```bash
# 1. Build e Deploy
gcloud builds submit --config cloudbuild.yaml --project suporte-7e68b

# 2. Deploy no Cloud Run
gcloud run deploy suporte-lojinha \
  --image gcr.io/suporte-7e68b/suporte-lojinha:latest \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --project suporte-7e68b
```

## 🧪 Testes Pós-Deploy

### FAQ Multi-tenant
- [ ] Admin geral pode criar FAQ e selecionar cliente no select box
- [ ] Admin geral pode criar FAQ como "Geral" (visível para todos)
- [ ] Manager pode criar/editar FAQs da sua empresa
- [ ] Cliente vê apenas FAQs da sua empresa + FAQs gerais
- [ ] Badges mostram corretamente qual cliente a FAQ pertence

### Integração FAQ com Gemini AI
- [ ] Chatbot usa contexto do FAQ nas respostas
- [ ] FAQ específica da empresa aparece no contexto do chatbot
- [ ] FAQ geral aparece para todos os clientes

### Visualização Admin como Cliente
- [ ] Select box de cliente aparece no AdminDashboard
- [ ] Admin pode selecionar cliente antes de visualizar
- [ ] Perfil mostra dados corretos do cliente selecionado
- [ ] Aba "Gerenciar FAQ" aparece quando admin visualiza como cliente
- [ ] Admin pode criar/editar FAQs do cliente selecionado

### Select Boxes
- [ ] Todos os select boxes abrem corretamente
- [ ] Select boxes funcionam dentro de Dialogs
- [ ] Select boxes aparecem sobre outros elementos (z-index correto)

### Managers
- [ ] Manager pode criar novas FAQs
- [ ] Manager pode editar FAQs existentes
- [ ] Manager só vê FAQs da sua empresa

## 📊 Novos Índices Firestore (Opcional)

Para melhorar performance, criar os seguintes índices:

```json
{
  "indexes": [
    {
      "collectionGroup": "faq",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "active", "order": "ASCENDING" },
        { "fieldPath": "order", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "faq",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "order", "order": "ASCENDING" }
      ]
    }
  ]
}
```

**Nota**: Os serviços têm fallback em memória se índices não existirem, mas índices melhoram performance significativamente.

## 🐛 Problemas Conhecidos e Soluções

### Select Boxes não abrem
- **Causa**: Z-index baixo ou problema com Portal dentro de Dialogs
- **Solução**: Já corrigido - z-index aumentado e `modal={false}` adicionado

### Perfil mostra dados do admin
- **Causa**: MockUser usando dados do admin
- **Solução**: Já corrigido - AdminClientView carrega dados da empresa

### Manager não consegue criar FAQ
- **Causa**: Lógica de companyId incorreta
- **Solução**: Já corrigido - Manager sempre usa seu companyId

## 📝 Notas de Deploy

1. **Sem Breaking Changes**: Todas as mudanças são retrocompatíveis
2. **Dados Existentes**: FAQs existentes sem `companyId` serão tratadas como "geral"
3. **Performance**: Índices Firestore melhoram performance mas não são obrigatórios
4. **Rollback**: Se necessário, versão anterior pode ser restaurada do histórico do Cloud Run

## 🔍 Verificação Pós-Deploy

Após o deploy, verificar:

1. **Logs do Cloud Run**: Verificar se há erros nos logs
2. **Console do Navegador**: Verificar erros no frontend
3. **Funcionalidades**: Testar todas as funcionalidades listadas acima
4. **Performance**: Verificar tempo de resposta das queries

## 📞 Suporte

Em caso de problemas:
1. Verificar logs do Cloud Run
2. Verificar console do navegador
3. Consultar documentação em `docs/specs/`
4. Verificar `CHANGELOG.md` para mudanças

---

**Última Atualização:** 2025-01-XX  
**Status:** ✅ Pronto para Deploy

