# 🎯 Sistema de Suporte - Lojinha Prio by Yoobe

Sistema completo de suporte ao cliente com chatbot inteligente, FAQ, gestão de chamados e integração com API Cubbo para rastreamento de pedidos.

> **Marco atual:** `v2.3.0` (30/11/2025). Consulte [`CHANGELOG.md`](./CHANGELOG.md) para a linha do tempo completa.

## 🆕 Novidades v2.3.0

- 🔔 **Central de Notificações** (`NotificationCenterProvider`, `NotificationBell`) com toasts, áudio e mute por escopo (admin, gestor, cliente).
- 📣 **Banners e Avisos Dirigidos** (`AdminSupportNotices`, `CompanyNoticePanel`, `SupportNoticeBanner`) com editor rico e segmentação por empresa/local.
- 🧠 **Biblioteca de Respostas Padrão** (`AdminDefaultResponses` + `defaultResponseService`) integrada ao aprendizado automático do Gemini.
- 🚨 **Fluxo de Escalonamento de Gestores** (`managerEscalationService`, `managerNotificationService`, novas abas no ManagerDashboard).
- 🎉 **Experiência do Gestor** com `OrderCelebration`, cache de pedidos (`orderCacheService`) e preferências (`managerProfileService`).
- 🔍 **Busca de pedidos unificada**: `findOrdersByCustomer` consulta `customer_email`, `shipping_email` e `customer_phone` individualmente, garantindo que o ManagerDashboard sempre carregue pedidos mesmo quando a Cubbo preenche apenas um dos campos.
- ⚙️ **Scripts e documentação de deploy** revisados para o pipeline automático (`deploy-auto.sh`) apontando para `https://suporte-lojinha-409489811769.southamerica-east1.run.app`.

## 🚀 Deploy em Produção

**URL:** https://suporte-lojinha-409489811769.southamerica-east1.run.app

### Pré-requisitos

- Node.js 18+
- Google Cloud SDK (`gcloud`)
- Conta Google Cloud com projeto configurado
- Chave da API Gemini

### Configuração Inicial

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/genautech/suporte.git
   cd suporte
   ```

2. **Instale automaticamente o ambiente (recomendado no macOS):**
   ```bash
   npm run setup:local
   ```
   > Este comando instala/valida Homebrew, Node, Firebase CLI, sincroniza `.env.local` e aplica as regras do Firestore local automaticamente.  
   > Utilize `SKIP_BREW_CHECK=1` se já tiver todas as ferramentas instaladas.

3. **Instale as dependências (caso prefira o fluxo manual):**
   ```bash
   npm install
   ```

4. **Configure variáveis de ambiente locais:**
   Crie um arquivo `.env.local` na raiz do projeto:
   ```env
   VITE_GEMINI_API_KEY=sua_chave_api_gemini_aqui
   VITE_POSTMARK_PROXY_URL=https://postmark-email-proxy-409489811769.southamerica-east1.run.app
   VITE_AUTH_RESET_PROXY_URL=https://firebase-auth-reset-proxy-409489811769.southamerica-east1.run.app
   ```

5. **Configure o cloudbuild.yaml:**
   ```bash
   cp cloudbuild.yaml.example cloudbuild.yaml
   # Edite cloudbuild.yaml e substitua 'SUA_CHAVE_AQUI' pela chave real
   ```

## 🏃 Executar Localmente

Para iniciar com emuladores do Firebase:
```bash
npm run firebase:emulators   # terminal 1
npm run dev                  # terminal 2
```

Fluxo tradicional (sem emuladores):
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`

## 📦 Build Local

```bash
npm run build
```

Os arquivos buildados estarão em `dist/`

## 🐳 Deploy no Google Cloud Run

### Método Automático (Recomendado)

Use os scripts de deploy que fazem tudo automaticamente, incluindo validações e atualização opcional do Git:

```bash
# Pipeline completo com validações pós-deploy
./deploy-auto.sh

# Deploy completo (build + deploy + git) com menos validações
./deploy.sh

# Deploy rápido (usando imagem existente)
./deploy-quick.sh
```

**📚 Documentação Completa:** Veja [DEPLOY.md](./DEPLOY.md) para guia completo de deploy.

**📋 Scripts:** Veja [SCRIPTS_DEPLOY.md](./SCRIPTS_DEPLOY.md) para mais detalhes sobre os scripts.

### Método Manual

```bash
# 1. Build da imagem
gcloud builds submit --config cloudbuild.yaml --project suporte-7e68b

# 2. Deploy da imagem
gcloud run deploy suporte-lojinha \
  --image gcr.io/suporte-7e68b/suporte-lojinha:latest \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --project suporte-7e68b
```

### Método 2: Deploy Direto

```bash
gcloud run deploy suporte-lojinha \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --project suporte-7e68b
```

**⚠️ IMPORTANTE:** O arquivo `cloudbuild.yaml` é obrigatório para passar a variável `VITE_GEMINI_API_KEY` como build arg. Sem ele, o chatbot não funcionará em produção.

**💡 Dica:** Use `./deploy.sh` para deploy automático com atualização do Git.

## 📚 Documentação Completa

Toda a documentação técnica está disponível em `docs/specs/`:

- **01-authentication.md** - Sistema de autenticação
- **02-configuration.md** - Configurações e variáveis de ambiente
- **03-secrets.md** - Gerenciamento de secrets
- **04-apis.md** - APIs e endpoints
- **05-services.md** - Serviços internos
- **06-deployment.md** - Processo de deploy
- **07-docker.md** - Configuração Docker
- **08-architecture.md** - Arquitetura do sistema
- **09-features.md** - Funcionalidades
- **10-conversations.md** - Sistema de conversas

## 🏗️ Arquitetura

- **Frontend:** React 19 + TypeScript + Vite
- **Backend:** Firebase (Firestore + Authentication)
- **AI:** Google Gemini API
- **Deploy:** Google Cloud Run
- **Proxy Services:** Cloud Run (Cubbo Auth, Postmark Email, Firebase Auth Reset)

## 🔑 Variáveis de Ambiente

### Desenvolvimento (.env.local)

```env
VITE_GEMINI_API_KEY=sua_chave_aqui
VITE_POSTMARK_PROXY_URL=https://postmark-email-proxy-409489811769.southamerica-east1.run.app
VITE_AUTH_RESET_PROXY_URL=https://firebase-auth-reset-proxy-409489811769.southamerica-east1.run.app
```

### Produção (cloudbuild.yaml)

O arquivo `cloudbuild.yaml` deve conter a substituição `_VITE_GEMINI_API_KEY` com a chave real.

## 📋 Funcionalidades Principais

- ✅ Chatbot inteligente com Gemini AI
- ✅ FAQ completo com busca inteligente
- ✅ **Central de notificações em tempo real** para admins, gestores e usuários finais
- ✅ **Banners/Avisos segmentados** com editor rico e alcance por empresa
- ✅ **Biblioteca de respostas padrão** reaproveitável no auto-learning do Gemini
- ✅ **Fluxo de escalonamento de gestores** com alertas dedicados e acompanhamento
- ✅ **FAQ Multi-tenant por Cliente** - FAQs específicas por empresa
- ✅ **Integração FAQ com Gemini AI** - Contexto do FAQ disponível para aprendizado
- ✅ **Sistema de Pontos** - Chamados especializados para problemas com pontos/fidelidade
- ✅ **Memória de Resoluções** - Chatbot aprende com resoluções anteriores de problemas
- ✅ Base de conhecimento com aprendizado automático
- ✅ Gestão de chamados (CRUD completo)
- ✅ Arquivamento de chamados
- ✅ Rastreamento de pedidos via API Cubbo
- ✅ Formulários dinâmicos baseados em assunto
- ✅ Sistema de conversas persistente
- ✅ Autenticação por código de email
- ✅ **Visualização Admin como Cliente** - Admin pode visualizar como qualquer cliente
- ✅ **Gerenciamento FAQ por Gestores** - Gestores podem gerenciar FAQs da sua empresa
- ✅ **Endereço da Loja** - Botão "Voltar para a Loja" no dashboard do cliente
- ✅ **Layout Responsivo** - Interface otimizada para mobile e desktop

## 🔒 Segurança

- Secrets não são commitados no Git
- `.env.local` está no `.gitignore`
- `cloudbuild.yaml` deve usar Secret Manager (recomendado) ou placeholder
- Firebase Security Rules configuradas

## 📞 Suporte

Para questões sobre o projeto, consulte a documentação em `docs/specs/` ou abra uma issue no GitHub.

## 📄 Licença

Este projeto é privado e proprietário.
