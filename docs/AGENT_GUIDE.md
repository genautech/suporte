# 🤖 Guia para Agentes de IA

**Este arquivo é sua primeira referência ao trabalhar neste projeto.**

## 🎯 Instruções para Agentes

### ⚠️ REGRA FUNDAMENTAL

**SEMPRE consulte `docs/specs/` ANTES de fazer QUALQUER mudança no código.**

## 📚 Estrutura de Referência

### 1. Especificações Técnicas (Base da Verdade)

**Localização:** `docs/specs/`

**Índice Principal:** `docs/specs/README.md`

**Arquivos Principais:**
- `01-authentication.md` - Autenticação e segurança
- `02-configuration.md` - Configurações do projeto
- `04-apis.md` - Todas as APIs e endpoints
- `05-services.md` - Serviços e lógica de negócio
- `06-deployment.md` - Processo de deploy
- `07-docker.md` - Configuração Docker
- `08-architecture.md` - Arquitetura do sistema
- `09-features.md` - Features e funcionalidades

### 2. Arquivos Protegidos

**Localização:** `.specs-lock/`

**Conteúdo:**
- Configurações críticas (backup)
- Templates de secrets
- Referências de endpoints

**⚠️ NUNCA modificar sem atualizar specs correspondentes**

## 🔍 Processo de Trabalho

### Antes de Fazer Qualquer Mudança:

1. **LER** a spec relevante em `docs/specs/`
2. **VERIFICAR** configurações em `.specs-lock/configs/`
3. **ENTENDER** o impacto da mudança
4. **PLANEJAR** a implementação

### Durante a Implementação:

1. **SEGUIR** as especificações
2. **MANTER** compatibilidade com arquitetura existente
3. **RESPEITAR** configurações protegidas
4. **TESTAR** localmente se possível

### Após Implementar:

1. **ATUALIZAR** a spec correspondente
2. **ATUALIZAR** data de "Última Atualização"
3. **DOCUMENTAR** breaking changes (se houver)
4. **CRIAR** backup se necessário

## 🔒 Arquivos Críticos (NUNCA modificar sem specs)

### Configuração
- `firebase.ts` → Ver `docs/specs/01-authentication.md`
- `vite.config.ts` → Ver `docs/specs/02-configuration.md`
- `Dockerfile` → Ver `docs/specs/07-docker.md`

### Serviços
- `services/supportService.ts` → Ver `docs/specs/05-services.md`
- `services/geminiService.ts` → Ver `docs/specs/05-services.md`

### APIs
- URLs de APIs → Ver `docs/specs/04-apis.md`
- Configurações de proxy → Ver `docs/specs/06-deployment.md`

## 📋 Checklist Rápido

Antes de modificar código, verificar:

- [ ] Li a spec relevante em `docs/specs/`?
- [ ] Entendi o impacto da mudança?
- [ ] Verifiquei configurações protegidas?
- [ ] Planejei a implementação?
- [ ] Vou atualizar a spec após implementar?

## 🚨 Erros Comuns a Evitar

### ❌ NÃO fazer:
- Modificar configurações sem consultar specs
- Mudar arquitetura sem documentar
- Adicionar APIs sem documentar endpoints
- Modificar Docker sem atualizar spec
- Mudar autenticação sem atualizar spec

### ✅ SEMPRE fazer:
- Consultar specs primeiro
- Manter specs atualizadas
- Documentar mudanças
- Criar backups se necessário

## 📞 Referências Rápidas

### Onde encontrar informações sobre:

- **Autenticação:** `docs/specs/01-authentication.md`
- **Configurações:** `docs/specs/02-configuration.md`
- **APIs:** `docs/specs/04-apis.md`
- **Deploy:** `docs/specs/06-deployment.md`
- **Docker:** `docs/specs/07-docker.md`
- **Arquitetura:** `docs/specs/08-architecture.md`
- **Features:** `docs/specs/09-features.md`

## 🔄 Manutenção das Specs

### Quando atualizar:

- ✅ Adicionar nova feature
- ✅ Modificar API existente
- ✅ Mudar configuração crítica
- ✅ Adicionar novo serviço
- ✅ Mudar processo de deploy

### Como atualizar:

1. Abrir spec relevante
2. Atualizar conteúdo
3. Atualizar data: `**Última Atualização:** YYYY-MM-DD`
4. Adicionar entrada no changelog
5. Verificar consistência com código

## 📝 Exemplo de Uso

### Cenário: Adicionar nova API

1. **Consultar:** `docs/specs/04-apis.md`
2. **Verificar:** `.specs-lock/configs/api-endpoints.json`
3. **Implementar:** Código da integração
4. **Atualizar:** `docs/specs/04-apis.md` com nova API
5. **Atualizar:** `.specs-lock/configs/api-endpoints.json` se necessário

## ⚡ Quick Start

**Para começar a trabalhar:**

1. Ler `SPECS.md` (raiz do projeto)
2. Ler `docs/specs/README.md`
3. Consultar spec relevante ao trabalho
4. Seguir processo de trabalho acima

---

**Lembre-se: As specs são a BASE DA VERDADE. Mantenha-as sempre atualizadas e sincronizadas com o código!**



