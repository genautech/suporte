# Resumo de Correções - Imagem Docker Local

## Problemas Identificados e Corrigidos

### 1. ✅ Problema: Admin não visualiza empresas

**Causa Raiz:**
- O `AdminLogin` não estava criando autenticação Firebase real
- Apenas verificava email/senha localmente sem criar sessão Firebase
- As regras do Firestore verificavam `request.auth.token.admin == true`, mas `request.auth` era `null`

**Solução Implementada:**
1. **Modificado `components/AdminLogin.tsx`:**
   - Agora usa `signInWithEmailAndPassword` do Firebase Auth
   - Cria usuário automaticamente se não existir (`createUserWithEmailAndPassword`)
   - Cria autenticação Firebase real ao invés de apenas verificação local

2. **Corrigido `firestore.rules`:**
   - Adicionada função helper `isAdmin()` que verifica:
     - `request.auth.token.admin == true` (custom claim)
     - `request.auth.token.email == 'admin@yoobe.co'` (email direto)
   - Todas as regras agora usam `isAdmin()` ao invés de verificação direta

**Arquivos Modificados:**
- `components/AdminLogin.tsx` - Autenticação Firebase real
- `firestore.rules` - Função helper `isAdmin()` e uso consistente

### 2. ⚠️ Problema: Gemini não carrega

**Causa Raiz:**
- Variáveis `VITE_*` são embedadas no **build time**, não runtime
- Se a imagem Docker foi buildada sem `VITE_GEMINI_API_KEY`, ela não funcionará mesmo passando como variável de ambiente no runtime
- A imagem atual (`sha256:d706461be48a`) pode ter sido buildada sem a chave

**Solução Necessária:**
1. **Opção A: Rebuild da imagem (Recomendado para produção)**
   - Rebuildar a imagem Docker passando `VITE_GEMINI_API_KEY` como ARG no build
   - Comando: `docker build --build-arg VITE_GEMINI_API_KEY=...`
   - Ou usar Cloud Build com substitutions

2. **Opção B: Usar código fonte local (Para desenvolvimento)**
   - Usar `npm run dev` ao invés da imagem Docker
   - Configurar `.env.local` com `VITE_GEMINI_API_KEY=...`
   - Mais fácil para desenvolvimento e debugging

**Arquivos Relacionados:**
- `Dockerfile` linha 19-20 - ARG e ENV para VITE_GEMINI_API_KEY
- `services/geminiService.ts` linha 9-16 - Validação da chave
- `vite.config.ts` linha 18 - Define variável no build

### 3. ✅ Problema: Nginx não iniciava

**Causa:**
- Template do nginx usava `${PORT}` mas `envsubst` espera `$PORT`
- Variável `PORT` não estava sendo passada ao container

**Solução:**
- Corrigido `nginx.conf.template` para usar `$PORT` ao invés de `${PORT}`
- Script `run-image-local.sh` agora passa `-e PORT=8080`

## Como Testar

### Testar Correção de Empresas:
1. Acesse http://localhost:8080/admin
2. Faça login com:
   - Email: `admin@yoobe.co`
   - Senha: `123456`
3. O sistema deve criar autenticação Firebase automaticamente
4. Acesse a aba "Empresas" no AdminDashboard
5. Deve carregar empresas (ou mostrar lista vazia se não houver empresas cadastradas)

### Testar Gemini:
1. Verifique console do navegador (F12)
2. Procure por warning: "GEMINI_API_KEY environment variable not set"
3. Se aparecer, a imagem foi buildada sem a chave
4. **Solução:** Use código fonte local com `.env.local` ou rebuild a imagem

## Próximos Passos

1. **Deploy das correções:**
   - Fazer deploy das regras do Firestore atualizadas
   - Fazer deploy do AdminLogin corrigido

2. **Para Gemini funcionar:**
   - Rebuild da imagem com `VITE_GEMINI_API_KEY` no build time
   - Ou usar código fonte local para desenvolvimento

3. **Verificar Firestore:**
   - Garantir que collection `companies` existe
   - Criar empresas de teste se necessário

## Comandos Úteis

```bash
# Executar imagem local
./run-image-local.sh

# Ver logs do container
docker logs -f suporte-lojinha-local

# Parar container
docker stop suporte-lojinha-local

# Remover container
docker rm suporte-lojinha-local

# Rebuild imagem com Gemini API Key (exemplo)
docker build --build-arg VITE_GEMINI_API_KEY=sua_chave_aqui -t suporte-lojinha:local .
```

## Notas Importantes

- As correções nas regras do Firestore precisam ser deployadas no Firebase Console
- O AdminLogin agora cria usuário Firebase automaticamente na primeira vez
- Para produção, é recomendado rebuildar a imagem com a chave do Gemini embedada
- Para desenvolvimento local, use código fonte com `.env.local` ao invés da imagem Docker

