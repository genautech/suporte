# 🎯 Especificação de Funcionalidades

**Última Atualização:** 2025-11-07  
**Status:** ✅ Ativo

## 📋 Visão Geral

Este documento descreve todas as funcionalidades principais do sistema de suporte.

## 🔍 Busca e Visualização de Pedidos

### Para Usuários

#### Listagem de Pedidos
- **Localização:** Aba "Meus Pedidos" no UserDashboard
- **Funcionalidade:** Lista todos os pedidos do usuário logado
- **Informações exibidas:**
  - Número do pedido
  - Status (com badge colorido)
  - Data do pedido
  - Valor total
  - Resumo de produtos
- **Interação:** Cards clicáveis que abrem modal de detalhes

#### Modal de Detalhes do Pedido
- **Acesso:** Clicando em qualquer pedido na lista
- **Informações completas exibidas:**
  - **Informações Gerais:**
    - Número do pedido e ID
    - Status atual
    - Data de criação
    - Última atualização
    - Data de recebimento (se entregue)
  
  - **Produtos:**
    - Tabela completa com SKU, nome, quantidade, preço unitário e total
    - Ou lista resumida se detalhes não disponíveis
  
  - **Valores e Pagamento:**
    - Valor total do pedido
    - Método de pagamento
    - Moeda
  
  - **Endereço de Entrega:**
    - Rua e número
    - Bairro
    - Cidade e estado
    - CEP
    - País
    - Complemento e referência (se disponível)
  
  - **Local de Coleta (Click and Collect):**
    - Nome do serviço
    - Descrição/endereço
    - Distância (se disponível)
    - Código do serviço
  
  - **Endereço de Cobrança:**
    - Exibido apenas se diferente do endereço de entrega
  
  - **Informações de Envio:**
    - Transportadora responsável
    - Código de rastreio
    - Link de rastreamento
    - Tempo estimado de entrega
  
  - **Informações do Cliente:**
    - Email do cliente
    - Email de entrega (se diferente)
    - Telefone
  
  - **Comprovante de Recebimento:**
    - URL do comprovante (se disponível)
    - Imagem do comprovante (se disponível)

### Para Administradores

#### Busca por Cliente
- **Campos de busca:**
  - Email do cliente
  - OU telefone do cliente
- **Resultado:** Lista de todos os pedidos do cliente
- **Interação:** Cada pedido é clicável para ver detalhes completos

#### Busca por Código do Pedido
- **Campo de busca:** Número ou ID do pedido
- **Resultado:** Pedido específico encontrado
- **Interação:** Card clicável para ver detalhes completos

#### Modal de Detalhes
- Mesma funcionalidade do modal do usuário
- Acesso a todas as informações disponíveis do pedido

## 💬 Chatbot de Suporte

### Busca de Pedidos via Chatbot

#### Buscar por Código do Pedido
- **Comando:** "Onde está meu pedido LP-12345?"
- **Funcionalidade:** Busca pedido específico
- **Informações retornadas:**
  - Status do pedido
  - Data do pedido
  - Lista completa de produtos
  - Valor total e método de pagamento
  - **Endereço completo de entrega** OU local de coleta
  - Informações de rastreio (link e código)
  - Transportadora
  - Tempo estimado de entrega

#### Buscar por Email
- **Comando:** "Meus pedidos" ou "Pedidos do email X"
- **Funcionalidade:** Lista todos os pedidos do email
- **Informações retornadas para cada pedido:**
  - Número do pedido
  - Status
  - Data
  - **Endereço de entrega resumido**
  - Informações de rastreio
  - Transportadora

#### Visualização no Chatbot
- Componente visual `OrderList` renderizado no chat
- Cards clicáveis que podem abrir modal (se implementado)
- Informações formatadas de forma legível

## 📦 Normalização de Dados

### Endereços de Entrega

O sistema normaliza automaticamente diferentes formatos de endereço retornados pela API:

**Nomes de campos suportados:**
- `shipping_address`, `shippingAddress`, `address`, `delivery_address`, `deliveryAddress`
- Verificação dentro de `shipping_information.address`

**Campos normalizados:**
- Rua: `street`, `street_name`, `logradouro`, `address_line1`
- Número: `street_number`, `streetNumber`, `number`, `address_number`
- Bairro: `neighborhood`, `neighbourhood`, `district`, `bairro`
- Cidade: `city`, `cidade`
- Estado: `state`, `estado`, `province`
- CEP: `zip_code`, `zipCode`, `postal_code`, `postalCode`, `cep`
- País: `country`, `pais`, `country_code` (padrão: "Brasil")
- Complemento: `complement`, `complemento`, `address_line2`
- Referência: `reference`, `referencia`, `address_reference`

### Datas

**Formatos suportados:**
- ISO 8601 strings
- Timestamps numéricos (segundos ou milissegundos)
- Objetos Date

**Campos de data:**
- `created_at` - Data de criação do pedido
- `updated_at` - Data de última atualização
- `delivered_at` - Data de entrega/recebimento (quando status = delivered)

### Produtos

**Formatos suportados:**
- Array de objetos com campos detalhados (`items`)
- Array de strings resumidas (`items_summary`)
- Conversão automática entre formatos

## 🎨 Componentes Visuais

### OrderList
- **Uso:** Listagem compacta de pedidos
- **Props:**
  - `orders: CubboOrder[]` - Array de pedidos
  - `onOrderClick?: (order: CubboOrder) => void` - Callback ao clicar
- **Visual:** Cards com hover effect quando clicável

### OrderDetailModal
- **Uso:** Modal de detalhes completos do pedido
- **Props:**
  - `order: CubboOrder | null` - Pedido a exibir
  - `isOpen: boolean` - Estado de abertura
  - `onClose: () => void` - Callback de fechamento
- **Visual:** Dialog grande com scroll interno, seções organizadas

## 🔄 Fluxos de Busca

### Busca pelo Usuário
1. Usuário acessa "Meus Pedidos"
2. Sistema busca pedidos usando email/telefone do Firebase Auth
3. Lista é exibida com resumo
4. Usuário clica em um pedido
5. Modal abre com detalhes completos

### Busca pelo Admin
1. Admin escolhe tipo de busca (cliente ou pedido)
2. Informa email/telefone OU código do pedido
3. Sistema busca na API Cubbo
4. Resultados são exibidos
5. Admin clica em pedido para ver detalhes completos

### Busca via Chatbot
1. Usuário pergunta sobre pedido no chat
2. Chatbot identifica intenção (código ou email)
3. Sistema busca pedido(s) na API
4. Informações são formatadas e exibidas
5. Componente visual é renderizado no chat

## ✅ Validações e Segurança

### Validação de Email
- Quando código do pedido + email são fornecidos, sistema valida que pedido pertence ao email
- Admin pode buscar sem validação de email (apenas código)
- Usuários só veem seus próprios pedidos

### Validação de Store ID
- Todas as requisições à API Cubbo incluem `store_id`
- Sistema valida que `store_id` está configurado antes de buscar
- Erro específico se `store_id` não estiver configurado

## 📊 Status de Pedidos

**Status disponíveis:**
- `pending` - Pendente
- `processing` - Processando
- `shipped` - Enviado
- `delivered` - Entregue
- `cancelled` - Cancelado
- `refunded` - Reembolsado

**Badges coloridos:**
- Pendente: warning (amarelo)
- Processando: info (azul)
- Enviado: default (cinza)
- Entregue: success (verde)
- Cancelado: destructive (vermelho)
- Reembolsado: secondary (cinza claro)

## 🤖 Sistema Inteligente de Chatbot

### Aprendizado e Memória

#### Sistema de Conversas
- **Armazenamento:** Todas as conversas são salvas no Firestore
- **Histórico:** Últimas 3 conversas são carregadas automaticamente
- **Contexto:** Histórico é incluído no contexto do Gemini para respostas mais inteligentes
- **Persistência:** SessionId mantido por 30 dias no localStorage

#### Detecção de Pedidos Mencionados
- **Extração automática:** Códigos de pedido são extraídos das mensagens
- **Padrões suportados:** R123456, R595531189-dup, LP-12345, etc.
- **Relacionamento:** Pedidos mencionados são relacionados automaticamente a chamados

### Reconhecimento de Usuários Retornantes

#### Detecção
- **Firestore:** Verifica conversas anteriores do mesmo email
- **localStorage:** Verifica sessionId válido (não expirado)
- **Mensagem personalizada:** "Olá novamente, [nome]! Que bom te ver de volta!"

#### Contexto Personalizado
- Menciona pedidos da conversa anterior (se houver)
- Mantém tom amistoso mas focado em solução
- Inclui histórico relevante nas respostas

### Contador de Tentativas Sem Resolução

#### Lógica
- **Incrementa quando:**
  - Pedido não encontrado
  - FAQ não retorna resultado útil
  - Erro ao processar requisição
  - Função não consegue resolver problema

- **Reseta quando:**
  - Pedido encontrado com sucesso
  - Chamado de suporte aberto
  - Problema resolvido

- **Após 3 tentativas:**
  - Mostra mensagem empática
  - Oferece botão destacado para abrir chamado
  - Relaciona pedido mencionado automaticamente

### Relacionamento Dinâmico Pedido-Chamado

#### Detecção Automática
- **Quando pedido mencionado:** Relaciona automaticamente ao criar chamado
- **Quando apenas email informado:** Busca pedidos e relaciona se encontrado
- **Quando nenhum pedido:** Abre chamado sem relacionamento

#### Visualização
- **No TicketDetailModal:** Mostra card com resumo do pedido relacionado
- **Botão "Ver Detalhes":** Abre OrderDetailModal completo
- **Busca automática:** Carrega informações do pedido ao abrir ticket

### Sistema de Feedback

#### Funcionalidades
- **Coleta rating:** 1-5 estrelas
- **Comentário opcional:** Campo para feedback detalhado
- **Salvamento:** Feedback salvo no Firestore
- **Pode ser pulado:** Usuário pode optar por não dar feedback

#### Quando Mostrar
- Após resolução bem-sucedida de problema
- Após abertura de chamado de suporte
- Uma vez por conversa (não repetir)

### Tratamento Empático de Urgências

#### Detecção de Palavras-Chave
- **Urgência:** "demorando", "cadê", "atrasado", "não chegou"
- **Problemas:** "problema", "erro", "ruim", "descontentamento"

#### Protocolo de Resposta
1. **Empatia primeiro:** Reconhecer preocupação do cliente
2. **Priorizar rastreio:** Para pedidos "shipped", mostrar código de rastreio primeiro
3. **Apresentar informações:** Todas as informações disponíveis de forma clara
4. **Oferecer chamado:** Após apresentar informações, oferecer abertura de chamado

#### Exemplos de Respostas
- **"Cadê meu pedido?":** "Vou verificar isso para você agora mesmo!" + informações completas
- **"Está demorando muito":** "Entendo sua preocupação..." + rastreio primeiro + oferta de chamado
- **"Não chegou":** "Lamento que seu pedido ainda não tenha chegado..." + verificação + chamado

## 📚 Sistema de FAQ (Perguntas Frequentes)

### Para Clientes

#### Área de FAQ
- **Localização:** Aba "FAQ" no SupportArea
- **Funcionalidades:**
  - Navegação por categorias (Compras, Trocas, Rastreios, Cancelamentos, Reembolsos, SLAs, Geral)
  - Busca por texto em perguntas e respostas
  - Visualização expandida/colapsada de perguntas
  - Contador de visualizações
  - Botão "Foi útil?" para feedback
  - Botão para abrir chamado se FAQ não resolver

#### Busca Inteligente de FAQ
- **Localização:** Topo da aba FAQ
- **Funcionalidades:**
  - Busca inteligente usando Gemini AI
  - Combina resultados do FAQ e Knowledge Base
  - Resposta sintetizada e completa
  - Fontes citadas (perguntas do FAQ relacionadas)
  - Perguntas sugeridas relacionadas
  - Fallback para busca simples se Gemini não disponível

#### Categorias Disponíveis
- **Compras:** Informações sobre como comprar, formas de pagamento, cupons
- **Trocas:** Processo de troca, prazos, condições, frete
- **Rastreios:** Como rastrear pedidos, códigos de rastreamento, status
- **Cancelamentos:** Como cancelar, prazos, reembolsos
- **Reembolsos:** Processo de reembolso, prazos, formas de pagamento
- **SLAs:** Prazos de atendimento, envios e recebimentos
- **Geral:** Outras dúvidas frequentes

### Para Administradores

#### Gerenciamento de FAQ
- **Localização:** Aba "FAQ" no AdminDashboard
- **Funcionalidades:**
  - CRUD completo de entradas de FAQ
  - Filtro por categoria
  - Busca por texto
  - Reordenação de FAQs (drag and drop ou numeração)
  - Ativação/desativação de entradas
  - Visualização de estatísticas (views, helpful)
  - Botão para popular FAQ com dados iniciais

#### Estrutura de Entrada FAQ
- Pergunta (obrigatório)
- Resposta (obrigatório)
- Categoria (obrigatório)
- Tags (opcional, para busca melhorada)
- Ordem (numérico, para ordenação)
- Ativo (boolean, para mostrar/ocultar)
- Contadores automáticos: views, helpful

## 🧠 Base de Conhecimento

### Para Administradores

#### Gerenciamento de Base de Conhecimento
- **Localização:** Aba "Base de Conhecimento" no AdminDashboard
- **Funcionalidades:**
  - CRUD completo de entradas
  - Filtro por categoria e status de verificação
  - Busca por texto
  - Sistema de verificação (aprovado/pendente)
  - Sugestões automáticas de tickets resolvidos
  - Relacionamento com tickets

#### Sistema de Aprendizado Automático
- **Quando ticket é resolvido:**
  - Sistema sugere criar entrada na base de conhecimento
  - Extrai informações do ticket automaticamente
  - Cria entrada como não verificada (requer aprovação)
  - Relaciona ticket à entrada criada

#### Estrutura de Entrada
- Título (obrigatório)
- Conteúdo (obrigatório)
- Categoria (obrigatório)
- Tags (opcional)
- Fonte: 'faq' | 'ticket' | 'manual' | 'gemini'
- Tickets relacionados (array de IDs)
- Verificado (boolean, requer aprovação do admin)

### Para Clientes

#### Integração com Busca Inteligente
- Base de conhecimento é consultada automaticamente na busca inteligente
- Apenas entradas verificadas são retornadas
- Respostas são sintetizadas com informações do FAQ e Knowledge Base

## 🎫 Formulário Dinâmico de Tickets

### Funcionalidades

#### Seleção de Assunto
- **Admin e Cliente:** Select box (dropdown) com assuntos pré-definidos substituindo campo texto
- **9 Assuntos Disponíveis:**
  - Cancelamento de Pedido
  - Reembolso
  - Troca de Produto
  - Produto com Defeito
  - Produto Não Recebido
  - Produto Errado
  - Atraso na Entrega
  - Dúvida sobre Pagamento
  - Outro Assunto

#### Componentes Utilizados

**Admin (`TicketForm.tsx`):**
- Select de assunto na criação de chamado
- Campo texto mantido na edição (compatibilidade)
- Campos dinâmicos baseados no assunto selecionado
- Preview de pedido quando número fornecido

**Cliente (`SupportTicketFormAdvanced.tsx`):**
- Select de assunto sempre visível
- Suporte para `defaultSubject` prop (do chatbot)
- Campos dinâmicos completos
- Preview de pedido integrado

#### Adaptação Dinâmica
- **Campos base:** Nome, Email, Telefone (sempre presentes)
- **Campos dinâmicos:** Adaptados conforme assunto selecionado
- **Tipos de campos:** text, textarea, select, number, date, file
- **Perguntas específicas:** Geradas automaticamente para cada assunto
- **Validação:** Específica por tipo de campo e assunto

#### Integração com Chatbot
- **Gemini AI identifica tipo de assunto** baseado na conversa
- **Formulário abre pré-preenchido** com assunto correto
- **Número do pedido incluído** se mencionado na conversa
- **Campos dinâmicos aparecem automaticamente**

#### Exemplos de Formulários Dinâmicos

**Troca de Produto:**
- Número do pedido (obrigatório)
- Motivo da troca (obrigatório, select)
- Produto a trocar (obrigatório)
- Descrição do problema (opcional)

**Reembolso:**
- Número do pedido (obrigatório)
- Motivo do reembolso (obrigatório)
- Valor esperado (opcional, number)
- Data da compra (opcional, date)

**Produto com Defeito:**
- Número do pedido (obrigatório)
- Produto com defeito (obrigatório)
- Descrição do defeito (obrigatório, textarea)
- Fotos (opcional, file)

#### Preview de Pedido
- Se número do pedido fornecido, sistema busca automaticamente
- Informações básicas: status, produtos, valor
- Link para ver detalhes completos

## 💬 Melhorias no Chatbot

### Modo Inline
- **Localização:** Aba "Chat Suporte" no SupportArea
- **Funcionalidade:** Chatbot renderizado diretamente na aba, sem modal
- **Vantagens:** Melhor integração com área de suporte, sem sobreposição

### Integração com FAQ Inteligente
- Chatbot usa `searchIntelligentFAQ` quando pergunta não é sobre pedidos
- Respostas sintetizadas com fontes
- Perguntas sugeridas relacionadas
- Oferece abrir chamado se não resolver

### Sistema de Conversas Melhorado
- **Histórico persistente:** Últimas 3 conversas carregadas automaticamente
- **Contexto enriquecido:** Histórico incluído no contexto do Gemini
- **Reconhecimento de usuários retornantes:** Mensagem personalizada
- **Relacionamento automático:** Pedidos mencionados relacionados a tickets

### Feedback do Chatbot
- **Componente:** `ConversationFeedback`
- **Quando mostrar:** Após resolução ou abertura de chamado
- **Coleta:** Rating (1-5) e comentário opcional
- **Salvamento:** No Firestore, relacionado à conversa

### Tratamento de Tentativas Sem Resolução
- **Contador:** Incrementa quando problema não é resolvido
- **Após 3 tentativas:** Oferece botão destacado para abrir chamado
- **Reset:** Quando pedido encontrado ou chamado aberto

## 📦 Sistema de Arquivamento de Chamados

### Funcionalidades

#### Arquivamento de Chamados
- **Status:** Novo status `arquivado` adicionado ao sistema
- **Visibilidade:** Chamados arquivados não aparecem para clientes
- **Histórico:** Mantém todo o histórico e informações do chamado
- **Reativação:** Pode ser reativado a qualquer momento

#### Para Administradores

**Visualização:**
- **Aba "Chamados":** Checkbox "Mostrar arquivados" para filtrar
- **Aba "Arquivados":** Visualização dedicada apenas para chamados arquivados
- **Badge:** Status "Arquivado" com cor específica (cinza)

**Ações Disponíveis:**
- **Arquivar:** Botão "Arquivar" na lista de chamados (ação rápida)
- **Reativar:** Botão "Reativar" na lista de chamados arquivados
- **Arquivar/Reativar:** Botão no modal de detalhes do chamado
- **Mudança de Status:** Select de status inclui opção "Arquivado" (apenas na edição)

**Comportamento:**
- Ao arquivar: Status muda para `arquivado` e adiciona entrada no histórico
- Ao reativar: Status volta para o status anterior (ou `aberto` se não encontrado) e adiciona entrada no histórico
- Histórico completo preservado em ambos os casos

#### Para Clientes

**Comportamento:**
- Chamados arquivados **não aparecem** na lista de chamados do cliente
- Histórico preservado mas não visível até reativação
- Cliente pode criar novo chamado normalmente

#### Integração com Serviços

**`supportService.ts`:**
- `archiveTicket(ticketId)` - Arquivar chamado
- `unarchiveTicket(ticketId)` - Reativar chamado
- `getTickets(includeArchived)` - Parâmetro opcional para incluir arquivados
- `getTicketsByUser()` - Automaticamente filtra arquivados para clientes

**Notificações por Email:**
- Status `arquivado` incluído no mapeamento de status para emails
- Cliente recebe notificação quando chamado é arquivado

## 🎨 Melhorias de UI/UX

### Correções em Componentes Select

**Problema Resolvido:**
- Selects dentro de Dialogs não abriam corretamente devido a problemas de z-index

**Solução Implementada:**
- **Componente SelectContent:** Atualizado para detectar e aplicar z-index customizado
- **Z-index:** Todos os Selects dentro de Dialogs agora usam `z-[100]`
- **Aplicação:** Z-index aplicado via `style` inline para garantir funcionamento

**Componentes Corrigidos:**
- `SupportTicketFormAdvanced.tsx` - Select de assunto e campos dinâmicos
- `TicketForm.tsx` - Select de assunto, prioridade, status e campos dinâmicos
- `components/ui/select.tsx` - Componente base atualizado

### Otimizações de Performance

**Debounce no Campo de Número do Pedido:**
- **Implementação:** Debounce de 500ms no campo `orderNumber`
- **Comportamento:** Busca de detalhes do pedido apenas após usuário parar de digitar
- **Condição:** Busca apenas se número do pedido tiver 3 ou mais caracteres
- **Benefício:** Reduz chamadas desnecessárias à API

**DialogDescription Adicionado:**
- **Acessibilidade:** `DialogDescription` adicionado em todos os modais
- **Componentes:** `AdminDashboard.tsx`, `SupportArea.tsx`
- **Benefício:** Remove warnings de acessibilidade e melhora experiência para leitores de tela

## 🔄 Changelog

### v1.6.0 (2025-11-07)
- ✅ Sistema de arquivamento de chamados implementado
- ✅ Visualização dedicada de chamados arquivados no admin
- ✅ Reativação de chamados arquivados
- ✅ Correção de z-index em todos os Selects dentro de Dialogs
- ✅ Debounce implementado no campo de número do pedido
- ✅ DialogDescription adicionado para melhorar acessibilidade
- ✅ Histórico preservado em arquivamento/reativação
- ✅ Filtro de arquivados na lista de chamados do admin

### v1.5.0 (2025-11-06)
- ✅ Modal de criação de chamado melhorado (Admin e Cliente)
- ✅ Select box de assunto substituindo campo texto
- ✅ Campos dinâmicos baseados no assunto selecionado
- ✅ Integração chatbot com identificação automática de assunto
- ✅ Gemini AI atualizado com tipos de assunto específicos
- ✅ Preview de pedido melhorado
- ✅ Validação específica por tipo de campo

### v1.4.0 (2025-11-06)
- ✅ Sistema completo de FAQ implementado
- ✅ Base de conhecimento com aprendizado automático
- ✅ Formulário dinâmico de tickets por assunto
- ✅ Busca inteligente de FAQ integrada com Gemini
- ✅ Chatbot com modo inline no SupportArea
- ✅ Sistema de conversas melhorado
- ✅ Feedback do chatbot implementado
- ✅ Integração completa FAQ + Knowledge Base + Chatbot

### v1.3.0 (2025-01-XX)
- ✅ Sistema inteligente de conversas implementado
- ✅ Reconhecimento de usuários retornantes
- ✅ Contador de tentativas sem resolução
- ✅ Relacionamento automático pedido-chamado
- ✅ Sistema de feedback do chatbot
- ✅ Tratamento empático de urgências
- ✅ Contexto enriquecido para Gemini
- ✅ Persistência de sessão (30 dias)

### v1.2.0 (2025-01-XX)
- ✅ Modal de detalhes completo implementado
- ✅ Cards clicáveis em todas as listagens
- ✅ Endereço de entrega aparece em todas as buscas
- ✅ Normalização automática de formatos de endereço
- ✅ Suporte completo a Click and Collect
- ✅ Formatação de endereços no chatbot
- ✅ Visualização de comprovante de recebimento

### v1.1.0 (2025-11-05)
- ✅ Busca por código de pedido implementada
- ✅ Busca por email/telefone implementada
- ✅ Validação de segurança implementada
- ✅ Listagem de pedidos para usuários
