# 📚 ESPECIFICAÇÕES TÉCNICAS - BASE DA VERDADE

**⚠️ LEIA PRIMEIRO - Este é o arquivo principal de referência**

## 🎯 Para Agentes de IA e Desenvolvedores

**SEMPRE consulte `docs/specs/` antes de fazer qualquer mudança no projeto.**

## 📖 Índice Principal

Acesse **[docs/specs/README.md](./docs/specs/README.md)** para o índice completo de todas as especificações.

## 🚨 Regras Críticas

### ⚠️ ANTES de modificar QUALQUER arquivo:

1. **CONSULTE** a spec relevante em `docs/specs/`
2. **VERIFIQUE** configurações protegidas em `.specs-lock/configs/`
3. **VALIDE** que a mudança não quebra arquitetura existente
4. **DOCUMENTE** a mudança após implementar

### 🔒 Arquivos Protegidos (NUNCA modificar sem atualizar specs):

- `firebase.ts` - Configuração Firebase
- `vite.config.ts` - Configuração de build
- `Dockerfile` - Configuração Docker
- `services/supportService.ts` - Lógica de negócio principal
- `services/geminiService.ts` - Integração AI
- `.specs-lock/configs/*` - Configurações críticas

## 📂 Estrutura de Referência

```
docs/specs/              # 📚 Todas as especificações técnicas
├── README.md            # Índice principal
├── 01-authentication.md # 🔐 Autenticação Firebase
├── 02-configuration.md  # ⚙️ Configurações gerais
├── 03-secrets.md        # 🔑 Secrets e credenciais (templates)
├── 04-apis.md           # 🌐 APIs e endpoints
├── 05-services.md       # 🛠️ Serviços internos/externos
├── 06-deployment.md     # 🚀 Deployment Cloud Run
├── 07-docker.md         # 🐳 Configuração Docker
├── 08-architecture.md   # 🏗️ Arquitetura do sistema
└── 09-features.md       # ✨ Features e funcionalidades

.specs-lock/             # 🔒 Arquivos protegidos
├── configs/             # Configurações críticas (backup)
│   ├── firebase.config.json
│   └── api-endpoints.json
└── secrets/            # Templates de secrets
    └── secrets-template.md
```

## 🔍 Busca Rápida

### Quero modificar:
- **Autenticação** → Ver `docs/specs/01-authentication.md`
- **Configurações** → Ver `docs/specs/02-configuration.md`
- **APIs** → Ver `docs/specs/04-apis.md`
- **Docker** → Ver `docs/specs/07-docker.md`
- **Deploy** → Ver `docs/specs/06-deployment.md`
- **Arquitetura** → Ver `docs/specs/08-architecture.md`
- **Features** → Ver `docs/specs/09-features.md`

## 📝 Processo de Atualização

### Ao fazer mudanças:

1. **Antes:** Consultar spec relevante
2. **Durante:** Manter specs atualizadas
3. **Depois:** 
   - Atualizar spec correspondente
   - Atualizar data de "Última Atualização"
   - Criar backup se necessário em `.specs-lock/`

## 🔄 Versão Atual

**Versão das Specs:** 1.0.0  
**Última Atualização Geral:** 2025-11-05

## 📞 Referências Rápidas

- **Firebase Project:** `suporte-7e68b`
- **Cloud Run Project:** `suporte-7e68b` (409489811769)
- **Região:** `southamerica-east1`
- **URL Produção:** `https://suporte-lojinha-409489811769.southamerica-east1.run.app`

---

**⚠️ LEMBRE-SE: As specs em `docs/specs/` são a FONTE ÚNICA DA VERDADE. Mantenha-as sempre atualizadas!**










