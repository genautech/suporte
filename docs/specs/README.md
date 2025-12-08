# 📚 Especificações Técnicas - Base da Verdade

**Última Atualização:** 2025-11-05  
**Versão:** 1.0.0

## 🎯 Propósito

Este diretório contém a **fonte única da verdade** (Single Source of Truth) para todas as especificações técnicas, configurações, APIs e serviços do projeto **Suporte Lojinha Prio by Yoobe**.

## 📋 Índice de Especificações

### 🔐 Configurações Críticas (Protegidas)
- **[01-authentication.md](./01-authentication.md)** - Autenticação Firebase e segurança
- **[02-configuration.md](./02-configuration.md)** - Configurações gerais do projeto
- **[03-secrets.md](./03-secrets.md)** - Variáveis de ambiente e secrets (referência apenas)

### 🌐 APIs e Integrações
- **[04-apis.md](./04-apis.md)** - Documentação completa de todas as APIs
- **[05-services.md](./05-services.md)** - Serviços internos e externos

### 🚀 Deployment e Infraestrutura
- **[06-deployment.md](./06-deployment.md)** - Configuração de deployment Cloud Run
- **[07-docker.md](./07-docker.md)** - Especificações Docker e containers

### 🏗️ Arquitetura e Features
- **[08-architecture.md](./08-architecture.md)** - Arquitetura do sistema
- **[09-features.md](./09-features.md)** - Features e funcionalidades

## ⚠️ Regras Importantes

### ✅ O que fazer:
- **SEMPRE** consultar estas specs antes de fazer mudanças
- **SEMPRE** atualizar as specs após implementar novas features
- **SEMPRE** manter arquivos de configuração sincronizados com as specs
- **SEMPRE** documentar mudanças em breaking changes

### ❌ O que NÃO fazer:
- **NUNCA** modificar arquivos protegidos em `.specs-lock/` sem atualizar as specs
- **NUNCA** fazer mudanças em configurações críticas sem documentar
- **NUNCA** remover arquivos de configuração sem criar backup

## 📁 Estrutura de Arquivos Protegidos

```
.specs-lock/
├── configs/          # Configurações críticas (backup/versionamento)
│   ├── firebase.ts.backup
│   ├── docker.config.json
│   └── api-endpoints.json
└── secrets/          # Referências de secrets (SEM valores reais)
    ├── .env.example
    └── secrets-template.md
```

## 🔄 Processo de Atualização

1. **Antes de mudar:** Consulte a spec relevante
2. **Durante a mudança:** Mantenha as specs atualizadas
3. **Após a mudança:** 
   - Atualize a spec correspondente
   - Atualize a data de "Última Atualização"
   - Crie backup se necessário em `.specs-lock/`

## 📞 Referências Rápidas

- **Firebase Project:** `suporte-7e68b`
- **Cloud Run Project:** `suporte-7e68b` (ID: `409489811769`)
- **Região:** `southamerica-east1`
- **Domínio Produção:** `https://suporte-lojinha-409489811769.southamerica-east1.run.app`

## 🔍 Como Usar

### Para Desenvolvedores:
1. Leia a spec relevante antes de trabalhar em uma feature
2. Consulte a spec durante o desenvolvimento
3. Atualize a spec após completar a feature

### Para Agentes de IA:
1. **SEMPRE** buscar informações nestas specs primeiro
2. **SEMPRE** validar configurações contra estas specs
3. **SEMPRE** atualizar specs quando fizer mudanças

## 📝 Changelog

### v1.0.0 (2025-11-05)
- Criação inicial da estrutura de specs
- Documentação completa de autenticação
- Documentação de APIs e serviços
- Especificações Docker e deployment










