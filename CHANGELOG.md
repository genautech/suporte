# Changelog - Sistema de Suporte

## [v1.7.0] - 2025-01-XX

### 🎉 Novas Funcionalidades

#### FAQ Multi-tenant por Cliente
- **Admin Geral**: Pode criar/editar FAQs e associá-las a clientes específicos via select box
- **Managers**: Podem criar/editar FAQs apenas para sua empresa (automático)
- **FAQ Geral**: Opção para marcar FAQ como "Geral" (visível para todos os clientes)
- **Badges Visuais**: Listagem mostra badge indicando qual cliente a FAQ pertence
- **Filtragem Automática**: Clientes veem apenas FAQs da sua empresa + FAQs gerais

#### Integração FAQ com Gemini AI
- **Contexto Dinâmico**: FAQ agora está disponível no contexto do Gemini AI para aprendizado contínuo
- **Filtragem por Cliente**: Gemini AI recebe apenas FAQs relevantes ao cliente (empresa específica + gerais)
- **Aprendizado Automático**: O chatbot aprende com o conteúdo do FAQ para responder melhor às perguntas

#### Visualização Admin como Cliente
- **Seleção de Cliente**: Admin pode escolher qual cliente visualizar antes de entrar no modo cliente
- **Perfil Correto**: Perfil mostra dados do cliente selecionado (nome da empresa, email fictício)
- **Gerenciamento FAQ**: Admin pode gerenciar FAQs do cliente selecionado diretamente na visualização de cliente
- **Aba Dedicada**: Nova aba "⚙️ Gerenciar FAQ" disponível quando admin visualiza como cliente

### 🐛 Correções

#### Select Boxes
- **Problema**: Select boxes pararam de abrir em toda a plataforma
- **Solução**: 
  - Aumentado z-index padrão de `z-50` para `z-[9999]`
  - Adicionado `modal={false}` no SelectContent para funcionar dentro de Dialogs
  - Todos os SelectContent agora têm z-index alto (`z-[10000]`) para aparecer sobre Dialogs

#### Perfil do Cliente
- **Problema**: Quando admin visualizava como cliente, mostrava perfil do admin ao invés do cliente
- **Solução**: 
  - Criado componente `AdminClientView` que carrega dados da empresa selecionada
  - MockUser agora usa nome e email baseados na empresa selecionada
  - ProfileModal atualiza corretamente quando user muda

#### Criação/Edição FAQ para Managers
- **Problema**: Managers não conseguiam criar/editar FAQs
- **Solução**: 
  - Lógica corrigida para sempre usar `companyId` do manager ao criar/editar
  - Formulário funciona corretamente para managers

### 🔧 Melhorias Técnicas

#### Logs de Erro
- Logs melhorados em todos os serviços
- Mensagens de erro mais descritivas
- Contexto adicional nos logs para facilitar debugging

#### Componentes
- `AdminClientView.tsx`: Novo componente para visualização admin como cliente
- `AdminFAQ.tsx`: Adicionado select de cliente e badges visuais
- `SupportArea.tsx`: Adicionada aba "Gerenciar FAQ" quando em modo admin
- `UserDashboard.tsx`: Suporte para `adminSelectedCompanyId` e `adminMode`

#### Serviços
- `faqService.ts`: Já suportava `companyId` (sem mudanças necessárias)
- `geminiService.ts`: Adicionada função `buildFAQContext()` e parâmetro `companyId` em `getGeminiResponse()`

### 📚 Documentação

- README.md atualizado com novas funcionalidades
- DEPLOY_CHECKLIST.md atualizado
- CHANGELOG.md criado
- Documentação de erros atualizada

### 🔒 Segurança

- Nenhuma mudança de segurança necessária
- Todas as validações existentes mantidas

---

## [v1.6.0] - 2025-11-06

### Funcionalidades Anteriores
- Sistema de FAQ completo
- Base de conhecimento
- Formulário dinâmico de tickets
- Sistema de conversas do chatbot
- Autenticação por código de email

---

**Nota**: Versões anteriores documentadas em arquivos separados.

