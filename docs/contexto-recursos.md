# Contexto de Recursos – Sistema de Suporte Yoobe

Este documento resume os principais recursos disponíveis para cada perfil do sistema, bem como as melhorias mais recentes que devem ser preservadas durante novas entregas.

## 1. Cliente / Usuário Final
- **Dashboard do Cliente** (`UserDashboard`):
  - Visualização de tickets abertos/fechados e detalhes.
  - Listagem de pedidos via integração com a API da Yoobe (Cubbo) usando email/telefone do cliente.
  - Acesso ao chat inteligente diretamente no painel (modo inline).
- **Chatbot Inteligente**:
  - Fluxo completo para rastreamento de pedidos, trocas, reembolsos e abertura de chamados.
  - Mensagens de contexto personalizadas por empresa (saudação, tickets pendentes, pedidos recentes).
  - **Novas melhorias**:
    - Copiar/colar mensagens com botão dedicado (feedback visual de “Copiado!”).
    - Suporte a colar e arrastar imagens diretamente no input (upload automático para Storage e inserção de markdown).
    - Detecção de URLs arrastadas/coladas e inserção automática como link.
    - Indicadores visuais de drag & drop e aprimoramentos de UX nas bolhas de mensagens.

## 2. Gestor / Manager Dashboard
- **Visão Geral (Sidebar dinâmica)**:
  - Chamados, Pedidos, FAQ, Base de conhecimento, Interações e Usuários.
  - Acesso rápido ao botão de logout seguro.
- **Cards de Métricas**:
  - Chamados concluídos (resolvidos/fechados).
  - Pedidos realizados relacionados à empresa.
  - Pedidos enviados/entregues.
- **Chamados**:
  - Lista completa filtrada pela empresa ou pelos usuários vinculados.
  - Detalhes por ticket (assunto, prioridade, data, pedido associado).
- **Pedidos (Interface restaurada)**:
  - Nova aba **Pedidos** com tabela detalhada (pedido, status, cliente, email, data, valor, rastreio/transportadora).
  - Busca consolidada por:
    - Emails dos usuários associados.
    - Email do gestor.
    - Clientes com pedidos entregues da mesma organização + palavras-chave da empresa.
  - Botão de atualização manual e ordenação decrescente por data.
- **Interações**:
  - Lista de conversas com quantidade de mensagens, status e pedidos mencionados.
  - Modal com histórico completo e insights do Gemini.
- **Usuários**:
  - Indicadores de logins, conversas e tickets por usuário.
  - Último acesso e badge de empresa atribuída.

## 3. Administrador
- **Gerenciamento de Conversas e Usuários**:
  - Filtros por empresa, indefinidos e estatísticas gerais.
  - **Exclusão múltipla** de conversas e usuários (checkbox por linha + barra de ações com confirmar/excluir).
  - Atribuição manual de empresas para conversas/usuários.
- **Chamados e Tickets**:
  - Abertura e vinculação de chamados direto a partir das conversas.
  - Histórico e envio de respostas via email (Postmark).
- **Conteúdo e Configurações**:
  - Gestão de FAQ (`AdminFAQ`) e Base de Conhecimento (`AdminKnowledgeBase`).
  - Configurações de empresas (saudação, palavras-chave, store URL, acessos de gestor).

## 4. Integrações & Backend
- **Integração API Yoobe (Cubbo)**:
  - `findOrdersByCustomer` e `trackOrder` usados pelo chatbot e dashboards.
  - Proxy autenticado em Cloud Run (store_id, client credentials).
  - Busca refinada para gestores (emails de usuários, gestor e clientes com pedidos entregues + palavras-chave).
- **Armazenamento**:
  - Firebase Storage para uploads de FAQ e imagens do chat (`storageService.uploadChatImage`).
  - Regras de tamanho e tipo para segurança.
- **Serviços Internos**:
  - `supportService.getCompanyStats` e `supportService.getCompanyOrders`.
  - `conversationService` (CRUD completo, link de tickets, arquivamento).
  - `userService` (estatísticas, registro de interações, store URL).

## 5. Melhorias Recentes (Nov/2025)
- Correção de todas as referências para o email oficial `atendimento@yoobe.co` e remoção de marcas legadas (“Cubbo” -> “Yoobe”) no chatbot.
- Exclusão em massa de conversas e usuários no painel admin.
- Recuperação do dashboard do gestor, incluindo:
  - Cards de métricas.
  - Abas completas (chamados, pedidos, interações, usuários, FAQ, base de conhecimento).
  - Nova interface de pedidos com busca inteligente e rastreamento.
- Aperfeiçoamentos de chat:
  - Copiar mensagens, drag & drop de imagens/URLs, estado visual durante upload.
  - Indicadores de contextos (usuário retornante, tickets pendentes, pedidos recentes).

## 6. Boas Práticas para Deploy
- Não remover funcionalidades existentes; apenas incrementar melhorias.
- Validar chamadas principais (chatbot, dashboards, admin) após alterações.
- Registrar novas features neste documento para manter a rastreabilidade das entregas.

