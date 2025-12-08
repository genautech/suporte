# 📦 Guia de Backup e Atualização

**Última Atualização:** 2025-01-27  
**Status:** ✅ Ativo

## 🎯 Visão Geral

Este guia descreve como fazer backup e atualização do projeto, tanto localmente quanto no repositório remoto.

## 📋 Scripts Disponíveis

### 1. Backup Local (`scripts/backup-local.sh`)

Cria um backup local dos arquivos críticos do projeto.

```bash
./scripts/backup-local.sh
```

**O que faz:**
- Cria backup dos arquivos críticos em `backups/backup_TIMESTAMP.tar.gz`
- Inclui: `.specs-lock`, configurações Firebase, package.json, etc.
- Gera arquivo de informações do backup

**Localização dos backups:** `backups/`

### 2. Backup Remoto (`scripts/backup-remote.sh`)

Faz commit e push das mudanças para o repositório Git remoto.

```bash
./scripts/backup-remote.sh
```

**O que faz:**
- Verifica mudanças não commitadas
- Cria commit automático com timestamp
- Faz push para o repositório remoto
- **NÃO** inclui `.env.local` (protegido pelo .gitignore)

**Repositório:** `https://github.com/genautech/suporte.git`

### 3. Atualização do Remoto (`scripts/update-remote.sh`)

Puxa as últimas mudanças do repositório remoto.

```bash
./scripts/update-remote.sh
```

**O que faz:**
- Verifica mudanças locais não commitadas
- Oferece fazer stash se necessário
- Faz fetch e merge das mudanças remotas
- Instala dependências se `package.json` foi atualizado

### 4. Sincronização de Ambiente (`scripts/sync-env.sh`)

Sincroniza variáveis de ambiente do template de secrets.

```bash
./scripts/sync-env.sh
```

**O que faz:**
- Cria `.env.local` se não existir
- Atualiza `VITE_GEMINI_API_KEY` do template de secrets
- Mantém URLs dos proxies atualizadas

## 🔄 Fluxo de Trabalho Recomendado

### Desenvolvimento Diário

1. **Ao iniciar o trabalho:**
   ```bash
   # Atualizar do remoto
   ./scripts/update-remote.sh
   
   # Sincronizar ambiente
   ./scripts/sync-env.sh
   ```

2. **Durante o desenvolvimento:**
   ```bash
   # Executar servidor local
   npm run dev
   ```

3. **Ao finalizar mudanças:**
   ```bash
   # Backup local
   ./scripts/backup-local.sh
   
   # Backup remoto (commit + push)
   ./scripts/backup-remote.sh
   ```

### Backup Periódico

Execute backup local diariamente ou semanalmente:

```bash
# Backup local completo
./scripts/backup-local.sh
```

Os backups são armazenados em `backups/` e podem ser removidos após período de retenção.

## 📁 Estrutura de Backups

```
backups/
├── backup_20250127_143022.tar.gz
├── backup_20250126_120000.tar.gz
└── ...
```

Cada backup contém:
- Arquivos de configuração críticos
- Especificações (.specs-lock)
- Documentação técnica
- Informações do sistema (Node, Git, etc.)

## 🔐 Segurança

### Arquivos Protegidos

Os seguintes arquivos **NÃO** são incluídos nos backups remotos:
- `.env.local` - Variáveis de ambiente locais
- `node_modules/` - Dependências
- `backups/` - Backups locais
- Arquivos listados em `.gitignore`

### Secrets

Secrets reais estão apenas em:
- `.env.local` (local, não commitado)
- Cloud Run (variáveis de ambiente)
- `.specs-lock/secrets/secrets-template.md` (apenas templates)

## ⚠️ Troubleshooting

### Erro: "Conflitos ao fazer merge"

```bash
# Resolver conflitos manualmente
git status
# Editar arquivos com conflitos
git add <arquivos>
git commit
```

### Erro: "Falha ao fazer push"

```bash
# Verificar conexão
git remote -v

# Verificar permissões
git push origin <branch> --dry-run
```

### Erro: "Variáveis de ambiente não encontradas"

```bash
# Sincronizar ambiente
./scripts/sync-env.sh

# Verificar .env.local
cat .env.local
```

## 📊 Status do Ambiente

### Verificar Status Local

```bash
# Status do Git
git status

# Variáveis de ambiente
cat .env.local | grep -E "^VITE_" | sed 's/=.*/=***/'

# Dependências
npm list --depth=0
```

### Verificar Status Remoto

```bash
# Últimos commits
git log origin/main --oneline -10

# Diferenças locais vs remoto
git diff origin/main
```

## 🚀 Comandos Rápidos

```bash
# Setup completo (primeira vez)
npm install
./scripts/sync-env.sh

# Atualizar e iniciar
./scripts/update-remote.sh
npm run dev

# Backup completo
./scripts/backup-local.sh
./scripts/backup-remote.sh
```

## 📝 Notas Importantes

1. **Sempre** faça backup antes de mudanças grandes
2. **Nunca** commite `.env.local` com valores reais
3. **Sempre** teste localmente antes de fazer push
4. **Mantenha** backups locais por pelo menos 30 dias
5. **Verifique** status do Git antes de fazer push

## 🔗 Referências

- [Documentação Git](https://git-scm.com/doc)
- [Guia de Deploy](./DEPLOY.md)
- [Especificações Técnicas](./docs/specs/)








