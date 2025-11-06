# 📋 Scripts de Deploy Automático

## 🚀 deploy.sh - Script Principal

Script completo que faz build, deploy e atualiza Git automaticamente.

### Uso

```bash
# Deploy completo (build + deploy + git)
./deploy.sh

# Deploy sem atualizar Git
./deploy.sh --skip-git

# Deploy usando imagem existente (sem build)
./deploy.sh --skip-build

# Deploy sem build e sem Git
./deploy.sh --skip-build --skip-git
```

### O que faz

1. ✅ Verifica se Git está inicializado
2. ✅ Verifica se `cloudbuild.yaml` existe
3. ✅ Faz build da imagem Docker (se não `--skip-build`)
4. ✅ Faz deploy no Cloud Run
5. ✅ Atualiza Git automaticamente (se não `--skip-git`):
   - Adiciona arquivos (respeitando .gitignore)
   - Verifica se `cloudbuild.yaml` não está sendo commitado
   - Faz commit com mensagem automática
   - Faz push para o branch atual

### Segurança

- ✅ Protege `cloudbuild.yaml` (não commita se estiver no stage)
- ✅ Respeita `.gitignore`
- ✅ Verifica erros em cada etapa

## ⚡ deploy-quick.sh - Deploy Rápido

Deploy rápido usando imagem existente e atualizando Git.

### Uso

```bash
./deploy-quick.sh
```

### O que faz

1. ✅ Faz deploy usando imagem existente (`latest`)
2. ✅ Atualiza Git automaticamente

**Ideal para:** Deploys rápidos quando apenas código mudou e a imagem já foi buildada.

## 📝 Mensagens de Commit

Os scripts criam commits automáticos com mensagens no formato:

```
deploy: 2025-11-07 16:30:45 - Deploy automático de suporte-lojinha
```

ou

```
deploy: 2025-11-07 16:30:45 - Deploy rápido
```

## ⚠️ Requisitos

- Google Cloud SDK (`gcloud`) instalado e configurado
- Autenticação: `gcloud auth login`
- Projeto configurado: `gcloud config set project suporte-7e68b`
- Git configurado (se usar atualização automática)
- Remote `origin` configurado (se usar atualização automática)

## 🔧 Configuração Inicial

### 1. Tornar scripts executáveis

```bash
chmod +x deploy.sh deploy-quick.sh
```

### 2. Configurar Git remote (se necessário)

```bash
git remote add origin https://github.com/genautech/suporte.git
```

### 3. Verificar cloudbuild.yaml

Certifique-se de que `cloudbuild.yaml` existe e está configurado corretamente.

## 📊 Fluxo de Trabalho Recomendado

### Desenvolvimento Local

1. Fazer mudanças no código
2. Testar localmente: `npm run dev`
3. Commit manual das mudanças: `git commit -m "feat: nova funcionalidade"`

### Deploy em Produção

1. Executar: `./deploy.sh`
2. O script faz:
   - Build da imagem
   - Deploy no Cloud Run
   - Commit automático do deploy
   - Push para GitHub

### Deploy Rápido (Código já buildado)

1. Executar: `./deploy-quick.sh`
2. O script faz:
   - Deploy usando imagem existente
   - Commit automático do deploy
   - Push para GitHub

## 🛡️ Proteções de Segurança

- ✅ `cloudbuild.yaml` nunca é commitado (está no .gitignore)
- ✅ Scripts verificam se `cloudbuild.yaml` está no stage antes de commitar
- ✅ Secrets protegidos pelo `.gitignore`

## 🔍 Troubleshooting

### Erro: "cloudbuild.yaml não encontrado"

**Solução:** Crie o arquivo `cloudbuild.yaml` na raiz do projeto.

### Erro: "Repositório Git não encontrado"

**Solução:** Execute `git init` ou configure o remote:
```bash
git remote add origin https://github.com/genautech/suporte.git
```

### Erro: "Erro ao fazer push"

**Solução:** Verifique suas credenciais Git:
```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"
```

Ou configure SSH keys no GitHub.

### Deploy funciona mas Git não atualiza

**Solução:** Use `--skip-git` para pular a atualização do Git e faça manualmente depois.

