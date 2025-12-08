# 🔧 Troubleshooting - Sistema de Suporte

Este documento lista os problemas conhecidos, suas causas e soluções.

## 📋 Índice

1. [Select Boxes não abrem](#select-boxes-não-abrem)
2. [Perfil mostra dados do admin ao visualizar como cliente](#perfil-mostra-dados-do-admin)
3. [Manager não consegue criar/editar FAQ](#manager-não-consegue-criar-editar-faq)
4. [FAQ não aparece para cliente específico](#faq-não-aparece-para-cliente-específico)
5. [Gemini AI não usa contexto do FAQ](#gemini-ai-não-usa-contexto-do-faq)
6. [Erros de Firestore](#erros-de-firestore)
7. [Erros de Autenticação](#erros-de-autenticação)
8. [Boas Práticas para Evitar Bugs](#boas-práticas-para-evitar-bugs)

---

## Select Boxes não abrem

### Sintomas
- Select boxes não abrem quando clicados
- Select boxes não aparecem sobre outros elementos (Dialogs, Modals)
- Select boxes ficam "travados" ou não respondem

### Causa
- Z-index baixo fazendo com que o SelectContent fique atrás de outros elementos
- Problema com Portal dentro de Dialogs (modal blocking)

### Solução Implementada
1. **Z-index aumentado**: De `z-50` para `z-[9999]` no componente base
2. **Modal false**: Adicionado `modal={false}` no `SelectPrimitive.Content` para funcionar dentro de Dialogs
3. **Z-index explícito**: Todos os `SelectContent` em componentes críticos têm `z-[10000]`

### Arquivos Afetados
- `components/ui/select.tsx` - Componente base corrigido
- `components/AdminFAQ.tsx` - SelectContent com z-index alto
- `components/AdminKnowledgeBase.tsx` - SelectContent com z-index alto
- `components/TicketForm.tsx` - SelectContent com z-index alto
- `components/SupportTicketFormAdvanced.tsx` - SelectContent com z-index alto

### Verificação
```typescript
// Verificar se SelectContent tem z-index alto
<SelectContent className="z-[10000]">
```

---

## Perfil mostra dados do admin ao visualizar como cliente

### Sintomas
- Quando admin usa "Ver como Cliente", o perfil mostra nome/email do admin
- Perfil não reflete a empresa selecionada

### Causa
- MockUser usando dados do admin ao invés dos dados da empresa selecionada
- `adminSelectedCompanyId` não estava sendo usado corretamente

### Solução Implementada
1. **AdminClientView**: Novo componente que carrega dados da empresa selecionada
2. **MockUser dinâmico**: MockUser agora usa nome e email baseados na empresa selecionada
3. **ProfileModal atualizado**: Atualiza quando user muda

### Arquivos Afetados
- `components/AdminClientView.tsx` - Novo componente criado
- `App.tsx` - Gerencia `adminSelectedCompanyId` e passa para UserDashboard
- `components/UserDashboard.tsx` - Aceita `adminSelectedCompanyId` e `adminMode`

### Verificação
```typescript
// Verificar se adminSelectedCompanyId está sendo passado
<UserDashboard 
  adminMode={true}
  adminSelectedCompanyId={adminSelectedCompanyId}
/>
```

---

## Manager não consegue criar/editar FAQ

### Sintomas
- Manager não consegue criar novas FAQs
- Manager não consegue editar FAQs existentes
- Formulário não salva quando manager tenta criar/editar

### Causa
- Lógica de `companyId` incorreta no `handleCreate` e `handleEdit`
- `finalCompanyId` não estava sendo determinado corretamente para managers

### Solução Implementada
1. **handleCreate**: Agora sempre usa `companyId` do manager quando presente
2. **handleEdit**: Preserva `companyId` do manager ao editar
3. **handleSubmit**: Lógica corrigida para sempre usar `companyId` do manager quando presente

### Arquivos Afetados
- `components/AdminFAQ.tsx` - Lógica de `companyId` corrigida

### Código Corrigido
```typescript
// handleCreate
companyId: companyId || undefined, // Manager sempre usa seu companyId

// handleSubmit
const finalCompanyId = companyId 
  ? companyId  // Manager sempre usa seu companyId
  : (formData.companyId === 'general' || !formData.companyId ? undefined : formData.companyId); // Admin usa o selecionado
```

---

## FAQ não aparece para cliente específico

### Sintomas
- Cliente não vê FAQs da sua empresa
- FAQs gerais não aparecem
- FAQs aparecem para clientes errados

### Causa
- Filtragem por `companyId` incorreta
- FAQs sem `companyId` não sendo tratadas como "geral"

### Solução Implementada
1. **Filtragem corrigida**: Clientes veem FAQs da sua empresa + FAQs gerais
2. **Tratamento de undefined**: FAQs sem `companyId` são tratadas como "geral"
3. **Badges visuais**: Listagem mostra qual cliente a FAQ pertence

### Arquivos Afetados
- `services/faqService.ts` - Filtragem por `companyId` corrigida
- `components/AdminFAQ.tsx` - Badges visuais adicionados

### Lógica de Filtragem
```typescript
// Cliente vê: FAQs da sua empresa + FAQs gerais
if (companyId) {
  allEntries = allEntries.filter(entry => 
    !entry.companyId || entry.companyId === companyId || entry.companyId === 'general'
  );
}
```

---

## Gemini AI não usa contexto do FAQ

### Sintomas
- Chatbot não usa informações do FAQ nas respostas
- FAQ não aparece no contexto do Gemini
- Respostas genéricas mesmo com FAQ disponível

### Causa
- Contexto do FAQ não estava sendo construído e passado para o Gemini
- `companyId` não estava sendo passado para `getGeminiResponse`

### Solução Implementada
1. **buildFAQContext**: Nova função que busca e formata FAQs relevantes
2. **getGeminiResponse**: Agora aceita `companyId` e constrói contexto dinamicamente
3. **Chatbot**: Passa `companyId` para `getGeminiResponse`

### Arquivos Afetados
- `services/geminiService.ts` - Função `buildFAQContext` adicionada
- `components/Chatbot.tsx` - Passa `companyId` para `getGeminiResponse`

### Verificação
```typescript
// Verificar se companyId está sendo passado
const response = await getGeminiResponse(
  enrichedMessages, 
  userMessage + contextInfo,
  companyId // Deve estar presente
);
```

---

## Erros de Firestore

### Sintomas
- Erros ao buscar FAQs
- Erros ao criar/editar FAQs
- Erros ao buscar empresas

### Causas Comuns
1. **Índices faltando**: Queries compostas sem índices criados
2. **Permissões**: Security Rules bloqueando acesso
3. **Network**: Problemas de conexão

### Solução
1. **Logs melhorados**: Todos os erros agora incluem contexto completo
2. **Fallback**: Serviços têm fallback em memória quando queries falham
3. **Verificação de índices**: Criar índices recomendados (ver `DEPLOY_v1.7.0.md`)

### Logs de Erro
```typescript
console.error('[faqService] Error fetching FAQ entries:', {
  error: errorMessage,
  category,
  companyId,
  stack: error instanceof Error ? error.stack : undefined,
});
```

### Índices Recomendados
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
    }
  ]
}
```

---

## Erros de Autenticação

### Sintomas
- Login não funciona
- Código de autenticação não chega
- Reset de senha falha

### Causas Comuns
1. **Proxy não configurado**: URLs de proxy incorretas
2. **Variáveis de ambiente**: Secrets não configuradas
3. **Firebase Rules**: Regras bloqueando acesso

### Solução
1. **Verificar variáveis**: `VITE_AUTH_RESET_PROXY_URL` configurada
2. **Verificar proxy**: Proxy de autenticação funcionando
3. **Verificar logs**: Logs melhorados mostram contexto completo

### Verificação
```bash
# Verificar variáveis de ambiente
echo $VITE_AUTH_RESET_PROXY_URL

# Testar proxy
curl https://firebase-auth-reset-proxy-409489811769.southamerica-east1.run.app/health
```

---

## 📊 Logs de Erro Melhorados

Todos os serviços agora têm logs de erro melhorados com:
- **Prefixo do serviço**: `[faqService]`, `[geminiService]`, etc.
- **Contexto completo**: Parâmetros relevantes (companyId, id, etc.)
- **Stack trace**: Quando disponível
- **Mensagem de erro**: Mensagem legível

### Exemplo de Log
```typescript
console.error('[faqService] Error creating FAQ entry:', {
  error: errorMessage,
  data: { ...data, companyId: data.companyId || 'general' },
  stack: error instanceof Error ? error.stack : undefined,
});
```

---

## 🔍 Como Diagnosticar Problemas

1. **Verificar Console do Navegador**: F12 → Console
2. **Verificar Logs do Cloud Run**: Google Cloud Console → Logs
3. **Verificar Firestore**: Firebase Console → Firestore
4. **Verificar Network**: F12 → Network (verificar requisições falhando)

### Comandos Úteis
```bash
# Ver logs do Cloud Run
gcloud logging read "resource.type=cloud_run_revision" --limit 50 --project suporte-7e68b

# Verificar status do serviço
gcloud run services describe suporte-lojinha --region southamerica-east1 --project suporte-7e68b
```

---

## Boas Práticas para Evitar Bugs

Esta seção documenta padrões e práticas recomendadas para evitar bugs comuns identificados durante a varredura do sistema.

### 1. Verificação de Arrays Antes de Usar Métodos

**Problema:** Chamar métodos como `.join()`, `.map()`, `.filter()` em arrays que podem ser `undefined` causa erros em runtime.

**Solução:**
```typescript
// ❌ ERRADO - Pode causar erro se array for undefined
const tags = entry.tags.join(', ');

// ✅ CORRETO - Sempre use fallback para array vazio
const tags = (entry.tags || []).join(', ');
const items = (array || []).map(item => item.name);
const filtered = (array || []).filter(item => item.active);
```

**Quando usar:**
- Sempre que acessar propriedades de arrays que podem não estar inicializadas
- Especialmente em dados vindos de APIs ou Firestore
- Em componentes que lidam com dados opcionais

---

### 2. Validação de Strings Vazias

**Problema:** Verificar apenas `!value` não detecta strings vazias (`''`), que podem causar problemas.

**Solução:**
```typescript
// ❌ ERRADO - Não detecta string vazia
if (!API_KEY) {
  // Pode passar se API_KEY for ''
}

// ✅ CORRETO - Verifica se está vazia também
if (!API_KEY || API_KEY.trim() === '') {
  // Trata tanto undefined/null quanto string vazia
}
```

**Quando usar:**
- Validação de variáveis de ambiente
- Validação de inputs de formulários
- Validação de parâmetros de API

---

### 3. Comparações Estritas (Strict Equality)

**Problema:** Usar `==` (comparação frouxa) pode causar comparações inesperadas com outros valores falsy.

**Solução:**
```typescript
// ❌ ERRADO - Comparação frouxa
if (value == null) {
  // Pode ser true para 0, '', false também
}

// ✅ CORRETO - Comparação estrita
if (value === null || value === undefined) {
  // Apenas null ou undefined
}

// Ou use optional chaining quando apropriado
if (!component) {
  // Trata null, undefined, false, 0, '', etc.
}
```

**Quando usar:**
- Sempre prefira `===` ao invés de `==`
- Use `!value` apenas quando quiser tratar todos os valores falsy
- Use `value === null || value === undefined` quando quiser apenas null/undefined

---

### 4. Garantir Tipos de Retorno Consistentes

**Problema:** Funções que retornam tipos opcionais podem causar erros quando o valor é usado sem verificação.

**Solução:**
```typescript
// ❌ ERRADO - Pode retornar undefined
function sanitize(code: string): string {
  if (!code) return code; // Retorna undefined se code for undefined
  return code.trim();
}

// ✅ CORRETO - Sempre retorna string
function sanitize(code: string): string {
  if (!code) return ''; // Sempre retorna string
  return code.trim();
}
```

**Quando usar:**
- Funções que têm tipo de retorno não-opcional
- Funções que processam dados de entrada
- Funções utilitárias que são usadas em múltiplos lugares

---

### 5. Omitir Parâmetros Opcionais

**Problema:** Passar `undefined` explicitamente para parâmetros opcionais não é uma boa prática.

**Solução:**
```typescript
// ❌ ERRADO - Passa undefined explicitamente
const result = getGeminiResponse(messages, query, companyId, undefined);

// ✅ CORRETO - Omite o parâmetro
const result = getGeminiResponse(messages, query, companyId);
```

**Quando usar:**
- Sempre que um parâmetro opcional não estiver disponível
- Em chamadas de função com múltiplos parâmetros opcionais
- Para manter o código mais limpo e legível

---

### 6. Tratamento de Erros com Contexto

**Problema:** Erros sem contexto dificultam o diagnóstico de problemas.

**Solução:**
```typescript
// ❌ ERRADO - Erro sem contexto
catch (error) {
  console.error('Error:', error);
}

// ✅ CORRETO - Erro com contexto completo
catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('[serviceName] Error in operation:', {
    error: errorMessage,
    context: relevantData,
    stack: error instanceof Error ? error.stack : undefined,
  });
}
```

**Quando usar:**
- Sempre em blocos try-catch
- Em funções assíncronas que fazem chamadas de API
- Em operações críticas do sistema

---

### 7. Validação de Dados de Entrada

**Problema:** Não validar dados de entrada pode causar erros em cascata.

**Solução:**
```typescript
// ✅ SEMPRE valide dados de entrada
function processOrder(orderId: string): void {
  // Validar tipo
  if (typeof orderId !== 'string') {
    throw new Error('orderId must be a string');
  }
  
  // Validar conteúdo
  if (!orderId || orderId.trim() === '') {
    throw new Error('orderId cannot be empty');
  }
  
  // Processar...
}
```

**Quando usar:**
- Em funções públicas/exportadas
- Em handlers de eventos
- Em funções que processam dados de usuário

---

### 8. Cleanup de setTimeout/setInterval

**Problema:** setTimeout e setInterval não limpos causam memory leaks e tentativas de atualizar estado de componentes desmontados.

**Solução:**
```typescript
// ✅ Use useRef para armazenar timeout IDs
const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

// Ao criar timeout
const timeoutId = setTimeout(() => {
  // ação
}, 1000);
timeoutRefs.current.push(timeoutId);

// Cleanup no useEffect
useEffect(() => {
  return () => {
    timeoutRefs.current.forEach(id => clearTimeout(id));
    timeoutRefs.current = [];
  };
}, []);
```

**Quando usar:**
- Sempre que usar setTimeout ou setInterval em componentes React
- Especialmente em funções assíncronas que podem executar após desmontagem
- Em callbacks que atualizam estado

---

### 9. Validação de Strings Antes de Métodos

**Problema:** Chamar métodos como `.toLowerCase()`, `.substring()`, `.trim()` em valores undefined/null causa erros.

**Solução:**
```typescript
// ❌ ERRADO - Pode falhar se value for undefined
const lower = value.toLowerCase();
const sub = value.substring(0, 100);

// ✅ CORRETO - Use fallback ou verificação
const lower = (value || '').toLowerCase();
const sub = (value || '').substring(0, 100);

// Ou verifique antes
if (value && typeof value === 'string') {
  const lower = value.toLowerCase();
}
```

**Quando usar:**
- Sempre que chamar métodos de string em valores que podem ser undefined
- Em logs e formatação de dados
- Em validações e transformações de dados

---

### 10. Validação de Arrays Antes de Iteração

**Problema:** Chamar `.forEach()`, `.map()`, `.filter()` em valores que não são arrays causa erros.

**Solução:**
```typescript
// ❌ ERRADO - Pode falhar se não for array
config.items.forEach(item => { ... });

// ✅ CORRETO - Verifique se é array
if (config?.items && Array.isArray(config.items)) {
  config.items.forEach(item => { ... });
}

// Ou use fallback
(config?.items || []).forEach(item => { ... });
```

**Quando usar:**
- Sempre que iterar sobre arrays que podem ser undefined
- Em dados vindos de APIs ou Firestore
- Em configurações dinâmicas

---

## 📞 Suporte

Se o problema persistir:
1. Verificar logs completos (navegador + Cloud Run)
2. Verificar documentação em `docs/specs/`
3. Verificar `CHANGELOG.md` para mudanças recentes
4. Verificar `DEPLOY_v1.7.0.md` para requisitos de deploy
5. Verificar `BUGS_CORRIGIDOS.md` para bugs conhecidos e correções

---

**Última Atualização:** 2025-01-XX

