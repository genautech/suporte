# 📤 Instruções para Atualizar o GitHub

## 🔧 Configuração Inicial do Git (Se necessário)

Se o diretório ainda não é um repositório Git:

```bash
cd /Users/genautech/suporte

# Inicializar repositório Git
git init

# Adicionar remote (se ainda não existir)
git remote add origin https://github.com/genautech/suporte.git

# Ou verificar remote existente
git remote -v
```

## ✅ Checklist Antes do Push

### 1. Verificar Secrets Protegidos

```bash
# Verificar se cloudbuild.yaml está no .gitignore
grep cloudbuild.yaml .gitignore

# Verificar se .env.local está no .gitignore
grep .env.local .gitignore

# Verificar se há chaves hardcoded no código
grep -r "AIzaSy" --exclude-dir=node_modules --exclude="*.log" .
```

### 2. Preparar cloudbuild.yaml

O arquivo `cloudbuild.yaml` atual contém a chave real. Você tem duas opções:

**Opção A: Adicionar ao .gitignore (Recomendado)**
- ✅ Já feito: `cloudbuild.yaml` está no `.gitignore`
- ✅ `cloudbuild.yaml.example` existe com placeholder
- ✅ Manter `cloudbuild.yaml` localmente com chave real

**Opção B: Substituir chave por placeholder**
```bash
# Substituir chave real por placeholder antes do commit
sed -i '' 's/AIzaSyBtDlRu_AxMOLFnlBy8hBb0LUWxuySbtWw/SUA_CHAVE_AQUI/g' cloudbuild.yaml
```

## 🚀 Comandos para Atualizar o GitHub

### Passo 1: Verificar Status

```bash
cd /Users/genautech/suporte
git status
```

### Passo 2: Adicionar Arquivos

```bash
# Adicionar todos os arquivos (respeitando .gitignore)
git add .

# Verificar o que será commitado
git status
```

**IMPORTANTE:** Verifique que `cloudbuild.yaml` NÃO aparece na lista de arquivos a serem commitados.

### Passo 3: Commit

```bash
git commit -m "feat: v1.6.0 - Sistema completo de suporte com FAQ, chatbot inteligente e arquivamento

- Sistema completo de FAQ com busca inteligente integrada com Gemini
- Chatbot inteligente com function calling e conversas persistentes
- Sistema de arquivamento de chamados (admin)
- Formulários dinâmicos baseados em assunto selecionado
- Correção de z-index em todos os Selects dentro de Dialogs
- Debounce no campo de número do pedido para otimização
- DialogDescription adicionado para melhorar acessibilidade
- cloudbuild.yaml configurado para deploy correto
- Documentação completa atualizada (specs, README, guias)
- Índices Firestore deployados
- Versão: v1.6.0"
```

### Passo 4: Push

```bash
# Se for a primeira vez ou branch diferente
git branch -M main
git push -u origin main

# Ou se já existe
git push origin main
```

## 📋 Arquivos que DEVEM ser Commitados

- ✅ Todo o código fonte (`components/`, `services/`, `data/`, etc.)
- ✅ `Dockerfile`
- ✅ `cloudbuild.yaml.example` (template com placeholder)
- ✅ `package.json`, `tsconfig.json`, `vite.config.ts`
- ✅ `nginx.conf.template`
- ✅ `firebase.ts`
- ✅ `types.ts`
- ✅ `index.html`, `index.tsx`, `App.tsx`
- ✅ `docs/` (toda documentação)
- ✅ `.gitignore`
- ✅ `README.md`
- ✅ `GUIA_ATUALIZAR_GITHUB.md`
- ✅ `VERSAO_FINAL_v1.6.0.md`
- ✅ Todos os arquivos `.md` de documentação

## 📋 Arquivos que NÃO DEVEM ser Commitados

- ❌ `cloudbuild.yaml` (com chave real) - está no .gitignore
- ❌ `.env.local` - está no .gitignore
- ❌ `dist/` - build gerado
- ❌ `node_modules/` - dependências
- ❌ Secrets em qualquer formato

## 🔍 Verificação Final

Antes de fazer push, execute:

```bash
# Verificar se cloudbuild.yaml não será commitado
git status | grep cloudbuild.yaml
# Não deve retornar nada

# Verificar se .env.local não será commitado
git status | grep .env.local
# Não deve retornar nada

# Verificar arquivos que serão commitados
git status --short
```

## 📝 Após o Push

1. ✅ Verificar no GitHub que `cloudbuild.yaml` não foi commitado
2. ✅ Verificar que `cloudbuild.yaml.example` está presente
3. ✅ Verificar que README.md está atualizado
4. ✅ Criar tag de release (opcional):
   ```bash
   git tag -a v1.6.0 -m "Release v1.6.0 - Sistema completo de suporte"
   git push origin v1.6.0
   ```

## 🎯 Resumo

- ✅ Documentação completa atualizada
- ✅ `cloudbuild.yaml.example` criado com placeholder
- ✅ `.gitignore` atualizado para proteger secrets
- ✅ README.md atualizado com instruções completas
- ✅ Todas as specs atualizadas
- ✅ Versão final v1.6.0 pronta para deploy

**Próximo passo:** Executar os comandos acima para atualizar o GitHub.

