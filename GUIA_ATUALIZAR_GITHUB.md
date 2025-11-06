# 📤 Guia para Atualizar o GitHub

## ⚠️ IMPORTANTE: Antes de Fazer Push

### 1. Verificar Secrets

**NUNCA commitar:**
- ✅ `.env.local` (já está no .gitignore)
- ✅ `cloudbuild.yaml` com chave real (criar `cloudbuild.yaml.example` com placeholder)
- ✅ Secrets reais em qualquer arquivo

### 2. Preparar cloudbuild.yaml para GitHub

O arquivo `cloudbuild.yaml` atual contém a chave real. Antes de fazer push:

1. **Criar `cloudbuild.yaml.example`** (já criado) com placeholder
2. **Adicionar `cloudbuild.yaml` ao `.gitignore`** OU
3. **Substituir a chave por placeholder** no `cloudbuild.yaml` antes do commit

**Recomendação:** Adicionar `cloudbuild.yaml` ao `.gitignore` e manter apenas `cloudbuild.yaml.example` no repositório.

## 📝 Passos para Atualizar o GitHub

### Opção A: Usando Git CLI

```bash
# 1. Verificar status
git status

# 2. Adicionar cloudbuild.yaml ao .gitignore (se ainda não estiver)
echo "cloudbuild.yaml" >> .gitignore

# 3. Adicionar arquivos (cloudbuild.yaml será ignorado)
git add .

# 4. Commit
git commit -m "feat: Sistema completo de suporte com FAQ, chatbot inteligente e arquivamento de chamados

- Adicionado sistema completo de FAQ com busca inteligente
- Implementado chatbot com Gemini AI e function calling
- Criado sistema de arquivamento de chamados
- Adicionado formulários dinâmicos baseados em assunto
- Corrigido problema de variáveis de ambiente no deploy
- Adicionado cloudbuild.yaml para build correto
- Atualizada toda documentação e specs
- Versão: v1.6.0"

# 5. Push para GitHub
git push origin main
```

### Opção B: Usando GitHub Desktop ou Interface Web

1. Abra o GitHub Desktop ou a interface web
2. Selecione todos os arquivos modificados
3. **IMPORTANTE:** Certifique-se de que `cloudbuild.yaml` NÃO está selecionado (deve estar no .gitignore)
4. Faça commit com a mensagem acima
5. Faça push

## 🔐 Configuração de Secrets no GitHub (Opcional)

Se quiser usar GitHub Actions para CI/CD no futuro, configure secrets:

1. Vá em **Settings** > **Secrets and variables** > **Actions**
2. Adicione:
   - `GEMINI_API_KEY`
   - `GCP_PROJECT_ID`
   - `GCP_SERVICE_ACCOUNT_KEY` (se necessário)

## 📋 Checklist Antes do Push

- [ ] `.env.local` não está sendo commitado (verificar .gitignore)
- [ ] `cloudbuild.yaml` com chave real não está sendo commitado
- [ ] `cloudbuild.yaml.example` existe com placeholder
- [ ] Todos os arquivos de documentação estão atualizados
- [ ] README.md está atualizado
- [ ] Changelog nas specs está atualizado
- [ ] Não há secrets hardcoded no código

## 🚀 Após o Push

1. Verificar no GitHub que `cloudbuild.yaml` não foi commitado
2. Verificar que `cloudbuild.yaml.example` está presente
3. Atualizar README.md no GitHub se necessário
4. Criar release/tag se necessário: `v1.6.0`

## 📝 Arquivos que DEVEM ser Commitados

- ✅ Todo o código fonte (`components/`, `services/`, etc.)
- ✅ `Dockerfile`
- ✅ `cloudbuild.yaml.example` (com placeholder)
- ✅ `package.json`, `tsconfig.json`, `vite.config.ts`
- ✅ `docs/` (toda documentação)
- ✅ `.gitignore`
- ✅ `README.md`
- ✅ `firebase.ts` (sem secrets)
- ✅ `nginx.conf.template`

## 📝 Arquivos que NÃO DEVEM ser Commitados

- ❌ `.env.local`
- ❌ `cloudbuild.yaml` (com chave real)
- ❌ `dist/` (build gerado)
- ❌ `node_modules/`
- ❌ Secrets em qualquer formato

## 🔄 Comandos Rápidos

```bash
# Verificar o que será commitado
git status

# Verificar se cloudbuild.yaml está no .gitignore
grep cloudbuild.yaml .gitignore

# Se não estiver, adicionar:
echo "cloudbuild.yaml" >> .gitignore

# Adicionar todos os arquivos (respeitando .gitignore)
git add .

# Verificar novamente o que será commitado
git status

# Commit
git commit -m "feat: v1.6.0 - Sistema completo de suporte"

# Push
git push origin main
```

## 📊 Status Atual do Repositório

- **Repositório:** https://github.com/genautech/suporte
- **Branch:** main
- **Última versão:** v1.6.0
- **Status:** Pronto para deploy e atualização do GitHub

