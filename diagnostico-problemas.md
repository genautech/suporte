# Diagnóstico de Problemas - Admin e Gemini

## Problemas Identificados

### 1. Admin não visualiza empresas

**Possíveis causas:**
- Collection `companies` não existe no Firestore
- Regras do Firestore bloqueando acesso (requer `request.auth.token.admin == true`)
- Erro no `companyService.getAllCompanies()`
- Problema de autenticação Firebase (token admin não configurado)

**Verificações necessárias:**
1. Verificar se collection `companies` existe no Firestore Console
2. Verificar se o usuário admin tem `admin: true` no token do Firebase
3. Verificar console do navegador para erros JavaScript
4. Verificar logs do Firestore para erros de permissão

**Arquivos relacionados:**
- `services/companyService.ts` linha 117-129
- `components/AdminDashboard.tsx` linha 62-73
- `firestore.rules` linha 33-35

### 2. Gemini não carrega

**Possíveis causas:**
- Variável `VITE_GEMINI_API_KEY` não foi embedada no build (build time)
- Chave está vazia ou inválida
- Erro na inicialização do GoogleGenAI

**Verificações necessárias:**
1. Verificar console do navegador para warning: "GEMINI_API_KEY environment variable not set"
2. Verificar se `import.meta.env.VITE_GEMINI_API_KEY` está disponível no runtime
3. Verificar se a imagem foi buildada com a chave (variáveis VITE_ são embedadas no build)

**Arquivos relacionados:**
- `services/geminiService.ts` linha 9-16
- `Dockerfile` linha 19-20
- `vite.config.ts` linha 18

## Soluções

### Para empresas não carregarem:

1. **Verificar autenticação admin:**
   - O login admin precisa criar um token com `admin: true`
   - Verificar `services/authService.ts` ou onde o token é criado

2. **Verificar Firestore:**
   - Criar collection `companies` se não existir
   - Verificar regras do Firestore permitem acesso admin

3. **Verificar código:**
   - `companyService.getAllCompanies()` deve retornar array vazio se não houver empresas
   - Verificar se há tratamento de erro adequado

### Para Gemini não carregar:

1. **Rebuild da imagem:**
   - Variáveis VITE_ são embedadas no build time
   - Se a imagem foi buildada sem a chave, precisa rebuildar
   - Passar `VITE_GEMINI_API_KEY` como ARG no Dockerfile durante o build

2. **Alternativa temporária:**
   - Usar código fonte local ao invés da imagem Docker
   - Configurar `.env.local` com `VITE_GEMINI_API_KEY`

## Próximos Passos

1. Verificar console do navegador ao acessar http://localhost:8080
2. Verificar Firestore Console para collection `companies`
3. Verificar se há empresas cadastradas
4. Verificar logs do container para erros
5. Testar login admin e verificar token

