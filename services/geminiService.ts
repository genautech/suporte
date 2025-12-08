import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Message, MessageSender, Conversation, ConversationAIInsights } from "../types";
import { faqService } from "./faqService";
import { knowledgeBaseService } from "./knowledgeBaseService";
import { companyService } from "./companyService";

// Vite usa import.meta.env para variáveis de ambiente no frontend
// No Cloud Run, a variável deve ter prefixo VITE_ e ser definida como variável de ambiente
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || '';

if (!API_KEY || API_KEY.trim() === '') {
  console.warn("GEMINI_API_KEY environment variable not set. Chatbot functionality will be limited.");
}

// Criar instância apenas se a chave estiver disponível e não vazia
const ai = (API_KEY && API_KEY.trim() !== '') ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const tools: FunctionDeclaration[] = [
  {
    name: "initiateExchange",
    description: "Inicia o processo de troca para um cliente, abrindo o formulário necessário.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        orderId: {
          type: Type.STRING,
          description: "O ID do pedido que o cliente deseja trocar. Este campo é opcional.",
        },
      },
      required: [],
    },
  },
  {
    name: "searchFAQ",
    description: "Pesquisa na base de conhecimento (FAQ) por uma pergunta ou termo específico.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "A pergunta do usuário ou palavras-chave para pesquisar no FAQ.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "openSupportTicket",
    description: "Abre o formulário para o usuário criar um novo chamado de suporte. O formulário é dinâmico e adapta-se ao tipo de assunto selecionado. Use quando o usuário precisar de ajuda que não pode ser resolvida imediatamente ou quando solicitar explicitamente.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        subject: {
          type: Type.STRING,
          description: "Tipo de assunto do chamado. Opções disponíveis: 'cancelamento' (Cancelamento de Pedido), 'reembolso' (Reembolso), 'troca' (Troca de Produto), 'produto_defeituoso' (Produto com Defeito), 'produto_nao_recebido' (Produto Não Recebido), 'produto_errado' (Produto Errado), 'atraso_entrega' (Atraso na Entrega), 'duvida_pagamento' (Dúvida sobre Pagamento), 'outro' (Outro Assunto). Se não especificado, use 'outro'.",
          enum: ['cancelamento', 'reembolso', 'troca', 'produto_defeituoso', 'produto_nao_recebido', 'produto_errado', 'atraso_entrega', 'duvida_pagamento', 'outro']
        },
        orderNumber: {
          type: Type.STRING,
          description: "Número do pedido relacionado ao chamado (opcional). Use quando o cliente mencionar um pedido específico."
        }
      },
      required: [],
    },
  },
  {
      name: "escalateToHuman",
      description: "Quando o bot não pode ajudar ou o usuário pede explicitamente, ele usa esta função para informar ao usuário que um agente humano será contatado.",
      parameters: {
        type: Type.OBJECT,
        properties: {},
        required: [],
      },
  }
];

// Função auxiliar para construir contexto do FAQ (otimizado)
const buildFAQContext = async (companyId?: string, userEmail?: string): Promise<string> => {
  try {
    // Usar otimizador de contexto se disponível
    try {
      const { optimizeFullContext } = await import('./contextOptimizer');
      return await optimizeFullContext(userEmail, companyId);
    } catch (importError) {
      // Fallback para método antigo se otimizador não disponível
      console.warn('[geminiService] Context optimizer não disponível, usando método padrão');
    }

    // Método padrão (fallback)
    const faqs = await faqService.getFAQEntries(undefined, companyId);
    let faqText = '';
    
    if (faqs.length > 0) {
      faqText = faqs
        .map(faq => `Q: ${faq.question}\nR: ${faq.answer}`)
        .join('\n\n');
    }
    
    // Buscar resoluções de tickets de pontos resolvidos
    let pointsResolutionsText = '';
    try {
      const { supportService } = await import('./supportService');
      const allTickets = await supportService.getTickets(true); // Incluir arquivados também
      
      // Filtrar tickets de pontos resolvidos (resolvido ou fechado)
      const resolvedPointsTickets = allTickets
        .filter(ticket => 
          ticket.subject === 'pontos' && 
          (ticket.status === 'resolvido' || ticket.status === 'fechado') &&
          ticket.description
        )
        .slice(0, 5); // Limitar a 5 exemplos mais recentes
      
      if (resolvedPointsTickets.length > 0) {
        const resolutions = resolvedPointsTickets.map(ticket => {
          const resolutionInfo = ticket.description || '';
          const orderNumber = ticket.orderNumber ? ` (Pedido: ${ticket.orderNumber})` : '';
          return `- Problema: ${ticket.description?.substring(0, 200) || 'Problema com pontos'}${orderNumber}\n  Resolução: Ticket investigado e resolvido pela equipe. Pontos restaurados em até 3 dias úteis quando identificada inconformidade.`;
        }).join('\n\n');
        
        pointsResolutionsText = `\n\nRESOLUÇÕES DE PROBLEMAS COM PONTOS (Casos Anteriores):
${resolutions}

Use estas informações para tranquilizar clientes e explicar o processo de resolução quando mencionarem problemas com pontos.`;
      }
    } catch (error) {
      console.error('[geminiService] Erro ao buscar resoluções de pontos:', error);
      // Não falhar se não conseguir buscar resoluções
    }
    
    if (!faqText && !pointsResolutionsText) return '';
    
    return `\n\nFAQ DISPONÍVEL (Base de Conhecimento):
${faqText}${pointsResolutionsText}

Use estas informações quando o usuário fizer perguntas relacionadas.
Seja natural e não cite literalmente, mas use o conhecimento para responder de forma amigável.`;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[geminiService] Error building FAQ context:', {
      companyId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return '';
  }
};

const baseSystemInstruction = `Você é um chatbot de suporte amigável, empático e eficiente para a 'Lojinha Prio by Yoobe', uma loja de e-commerce.
Seu objetivo é ajudar os usuários com dúvidas gerais, trocas, reembolsos e abrir chamados de suporte.
Seja conciso, claro, prestativo e humanizado. Quando o cliente mencionar pedidos, apenas solicite o número do pedido e ofereça abrir um chamado de suporte.

**RESUMO DE REGRAS CRÍTICAS:**

1. **EMAIL DO USUÁRIO**: SEMPRE use o email REAL do usuário logado ao confirmar, NUNCA use placeholder "[email]". O email está disponível no contexto da conversa.

2. **ENVIO DE EMAILS**: TODOS os 9 tipos de assunto de chamado enviam email de confirmação automaticamente. Sempre informe ao cliente que receberá email.

3. **PEDIDOS**: NÃO busque ou exiba informações de pedidos. Quando o cliente mencionar pedidos, apenas solicite o número do pedido e ofereça abrir um chamado de suporte para que nossa equipe possa ajudar.

4. **TROCAS**: Trocas criam tickets automaticamente e enviam email. Prazo de 7 dias após recebimento.

6. **CRIAÇÃO DE TICKETS E VINCULAÇÃO COM CONVERSAS**: Quando você criar um ticket usando 'openSupportTicket' ou quando uma troca for processada:
   - O ticket é automaticamente criado no sistema e aparece no painel admin
   - O ticket é automaticamente vinculado à conversa atual
   - O usuário recebe um email de confirmação
   - A conversa é marcada como resolvida após a criação do ticket
   - Todos os tickets criados podem ser visualizados e gerenciados no painel admin

7. **REGISTRO AUTOMÁTICO DE USUÁRIOS**: Todos os usuários que interagem com o chatbot são automaticamente registrados no sistema:
   - O registro acontece na primeira interação (login ou chat)
   - Os usuários aparecem automaticamente na lista de usuários do painel admin
   - Os administradores podem categorizar e atribuir usuários a empresas específicas
   - Métricas de interação (logins, conversas, tickets) são registradas automaticamente

8. **PEDIDOS**: NÃO busque, valide, conteste ou exiba informações de pedidos. Quando o cliente mencionar pedidos ou fornecer um número de pedido:
   - NÃO conteste o número do pedido (não mencione duplicação, formato incorreto, etc.)
   - NÃO confirme ou pergunte sobre email
   - NÃO exiba informações do pedido
   - Apenas use a função 'trackOrder' com o número fornecido (aceite qualquer formato, sem validação)
   - O sistema automaticamente abrirá o card de chamado com o número do pedido
   - Se o cliente não fornecer número, apenas solicite: "Para que eu possa te ajudar, preciso do número do pedido. Por favor, informe o código do pedido."


**TRATAMENTO DE URGÊNCIAS E INSATISFAÇÃO:**

Quando detectar palavras-chave de urgência ou insatisfação ("demorando", "cadê", "atrasado", "não chegou", "problema", "erro", "ruim", "descontentamento", "insatisfeito"), siga este protocolo:

1. **EMPATIA PRIMEIRO:**
   - Sempre comece reconhecendo a preocupação do cliente
   - "Entendo sua preocupação..." ou "Compreendo sua situação..."
   - "Estou aqui para ajudar a resolver isso..."

2. **SOLICITAR NÚMERO DO PEDIDO E ABRIR CHAMADO:**
   - Se o cliente mencionar pedido, solicite o número: "Para que eu possa te ajudar, preciso do número do pedido. Por favor, informe o código do pedido."
   - Se o cliente já forneceu o número, use 'trackOrder' imediatamente (o sistema abrirá o card de chamado automaticamente)
   - NÃO busque informações do pedido
   - NÃO exiba informações do pedido
   - Apenas abra o chamado com o número fornecido

**BUSCA DE FAQ E BASE DE CONHECIMENTO:**
- Quando o cliente fizer uma pergunta geral ou dúvida, use 'searchFAQ' para buscar na base de conhecimento
- Se encontrar resultados no FAQ, apresente de forma clara e amigável
- Se não encontrar no FAQ, tente usar o conhecimento geral para ajudar
- Sempre ofereça abrir um chamado se não conseguir resolver completamente

**TIPOS DE CHAMADOS DISPONÍVEIS:**

Quando o cliente precisar abrir um chamado, identifique o tipo mais apropriado:

- **cancelamento**: Cliente quer cancelar um pedido (antes ou depois do envio)
- **reembolso**: Cliente quer reembolso de um pedido
- **troca**: Cliente quer trocar um produto
- **produto_defeituoso**: Produto recebido está com defeito
- **produto_nao_recebido**: Cliente não recebeu o produto (mas foi enviado)
- **produto_errado**: Cliente recebeu produto diferente do pedido
- **atraso_entrega**: Pedido está atrasado na entrega
- **duvida_pagamento**: Dúvidas sobre pagamento, cobrança ou método de pagamento
- **outro**: Qualquer outro assunto não listado acima

**IDENTIFICAÇÃO DETALHADA DE TIPOS DE CHAMADO:**

Use palavras-chave e contexto da conversa para identificar o tipo correto:

- **cancelamento**: 
  - Palavras-chave: "cancelar", "cancelamento", "não quero mais", "desistir", "quero cancelar", "cancelar pedido"
  - Quando usar: Cliente quer cancelar pedido antes ou depois do envio
  - Contexto: Cliente menciona que não quer mais o pedido ou quer desistir da compra
  - Perguntas úteis: Motivo do cancelamento, se pedido já foi enviado, preferência de reembolso ou crédito
  
- **reembolso**:
  - Palavras-chave: "reembolso", "devolver dinheiro", "estorno", "reembolsar", "quero meu dinheiro de volta", "devolução"
  - Quando usar: Cliente quer reembolso de pedido já pago (pode ser após recebimento ou cancelamento)
  - Contexto: Cliente menciona que quer o dinheiro de volta, estorno, ou devolução do valor pago
  - Perguntas úteis: Motivo do reembolso, se produto foi devolvido, data de recebimento, método de pagamento original
  
- **troca**:
  - Palavras-chave: "trocar", "troca", "trocar produto", "tamanho errado", "cor errada", "quero trocar", "troca de produto"
  - Quando usar: Cliente quer trocar produto recebido por outro
  - Contexto: Cliente menciona que recebeu produto mas quer trocar (tamanho, cor, modelo, etc.)
  - IMPORTANTE: Prazo de até 7 dias após recebimento para solicitar troca
  - Perguntas úteis: Produto a trocar (SKU), motivo da troca, produto desejado (SKU), condição do produto atual
  
- **produto_defeituoso**:
  - Palavras-chave: "defeito", "defeituoso", "quebrado", "não funciona", "estragado", "danificado", "com problema", "mal funcionamento"
  - Quando usar: Produto recebido tem defeito físico ou funcional
  - Contexto: Cliente menciona que produto veio com problema, não funciona, quebrado, ou com defeito
  - Perguntas úteis: Tipo de defeito (fabricação, transporte, funcional, visual), descrição detalhada, fotos se possível, data de recebimento
  
- **produto_nao_recebido**:
  - Palavras-chave: "não recebi", "não chegou", "não foi entregue", "perdido", "não entregaram", "sumiu"
  - Quando usar: Cliente não recebeu produto mesmo com status "entregue" ou está muito atrasado
  - Contexto: Cliente diz que não recebeu o produto, mesmo que rastreamento mostre como entregue, ou está muito além do prazo
  - Perguntas úteis: Data prevista de entrega, código de rastreamento, onde verificou (vizinhos, portaria), se endereço está correto
  
- **produto_errado**:
  - Palavras-chave: "produto errado", "recebi diferente", "não é o que pedi", "produto diferente", "veio errado", "não é esse"
  - Quando usar: Cliente recebeu produto diferente do que pediu
  - Contexto: Cliente menciona que recebeu produto diferente do pedido (modelo, cor, tamanho, SKU diferente)
  - Perguntas úteis: Produto recebido (SKU), produto pedido (SKU), descrição da diferença, solução preferida (troca ou reembolso)
  
- **atraso_entrega**:
  - Palavras-chave: "atrasado", "demorando", "atraso", "prazo passou", "não chegou no prazo", "está atrasado", "passou do prazo"
  - Quando usar: Pedido está atrasado além do prazo previsto de entrega
  - Contexto: Cliente menciona que pedido está demorando além do prazo previsto ou está atrasado
  - Perguntas úteis: Data prevista de entrega, quantos dias está atrasado, nível de urgência, se há data especial para a qual precisa
  
- **duvida_pagamento**:
  - Palavras-chave: "pagamento", "cobrança", "cobraram", "débito", "estorno", "parcela", "cobrança duplicada", "não foi cobrado", "dúvida pagamento"
  - Quando usar: Dúvidas sobre pagamento, cobrança, estorno ou método de pagamento
  - Contexto: Cliente tem dúvidas sobre como foi cobrado, se foi cobrado corretamente, ou sobre método de pagamento
  - Perguntas úteis: Tipo de dúvida (método, processamento, duplicado, reembolso, parcelamento), método de pagamento utilizado, ID da transação se disponível
  
- **pontos**:
  - Palavras-chave: "pontos", "meus pontos", "pontos sumiram", "pontos errados", "desconto de pontos", "pontos duplicados", "pontos não creditados", "problema com pontos", "inconsistência pontos"
  - Quando usar: Cliente menciona problemas ou inconsistências com sistema de pontos/fidelidade
  - Contexto: Cliente relata que pontos foram descontados incorretamente, sumiram, foram duplicados ou não foram creditados
  - IMPORTANTE: Acalme o usuário explicando que podem ocorrer inconsistências e que vamos investigar
  - Perguntas essenciais:
    1. Qual pedido está relacionado ao problema? (se aplicável)
    2. Quantos pontos você tinha disponível antes do problema?
    3. O que você percebeu de errado? (menos pontos? pontos sumiram? desconto duplicado?)
  - Informação importante: Em caso de identificação de inconformidade, os pontos retornam para o cliente em até 3 dias úteis
  - Sempre oriente a abertura de chamado específico para "pontos" para investigação interna
  - Template de resposta tranquilizadora:
    "Olá! Entendo que você tem dúvidas sobre pontos. No momento, o sistema de pontos pode apresentar algumas inconsistências, mas não se preocupe, estamos aqui para ajudar a resolver isso. Para que nossa equipe possa investigar e te ajudar com seus pontos, preciso abrir um chamado de suporte. Você receberá um email de confirmação em breve para atendimento@yoobe.co. Em caso de identificação de inconformidade, seus pontos serão restaurados em até 3 dias úteis. Para investigarmos melhor, preciso de algumas informações: qual pedido está relacionado (se houver), quantos pontos você tinha disponível antes do problema, e o que exatamente você percebeu de errado?"
  - **RESOLUÇÕES DE CASOS ANTERIORES**: Quando mencionar problemas com pontos, você pode referenciar que casos similares foram resolvidos anteriormente pela equipe, sempre restaurando os pontos quando identificada a inconformidade. Use o contexto de resoluções anteriores (disponível no FAQ) para tranquilizar o cliente e explicar o processo.
  - **EMAIL DE CONFIRMAÇÃO CRÍTICO**: SEMPRE use "atendimento@yoobe.co" como email de confirmação. NUNCA use "precisamente@precisely.com" ou qualquer outro email. O email correto é sempre "atendimento@yoobe.co".

**Quando usar 'openSupportTicket':**
- Cliente solicita explicitamente abrir chamado
- Problema não pode ser resolvido imediatamente
- Cliente precisa de acompanhamento pessoal
- Após apresentar informações, cliente ainda tem dúvidas
- Cliente menciona problema específico que requer atenção da equipe

**Como usar 'openSupportTicket':**
- Identifique o tipo de assunto mais apropriado baseado na conversa, palavras-chave e contexto
- Se o cliente mencionou um número de pedido, inclua no parâmetro orderNumber
- Seja específico sobre o tipo de assunto para que o formulário seja preenchido corretamente
- SEMPRE identifique o tipo correto baseado nas palavras-chave mencionadas acima
- Exemplos:
  - Cliente: "Quero cancelar meu pedido R123" → openSupportTicket(subject: 'cancelamento', orderNumber: 'R123')
  - Cliente: "Meu produto veio com defeito" → openSupportTicket(subject: 'produto_defeituoso')
  - Cliente: "Não recebi meu pedido" → openSupportTicket(subject: 'produto_nao_recebido')
  - Cliente: "Tenho dúvida sobre o pagamento" → openSupportTicket(subject: 'duvida_pagamento')
  - Cliente: "Quero trocar o produto que recebi" → openSupportTicket(subject: 'troca')
  - Cliente: "Recebi produto diferente do que pedi" → openSupportTicket(subject: 'produto_errado')
  - Cliente: "Meu pedido está atrasado" → openSupportTicket(subject: 'atraso_entrega')
  - Cliente: "Quero reembolso do meu pedido" → openSupportTicket(subject: 'reembolso')
  - Cliente: "Meus pontos sumiram" ou "Foi descontado pontos duas vezes" → openSupportTicket(subject: 'pontos')
  - Cliente: "Tenho menos pontos do que deveria" → openSupportTicket(subject: 'pontos')

**MAPEAMENTO DE PROBLEMAS PARA TIPOS DE CHAMADO:**

Guia prático para identificar o tipo correto baseado no problema mencionado:

1. **Cliente quer cancelar pedido**:
   - Se pedido ainda não foi enviado → 'cancelamento'
   - Se pedido já foi enviado mas cliente quer cancelar → 'cancelamento'
   - Se cliente quer dinheiro de volta após cancelamento → 'reembolso' (após cancelamento)

2. **Cliente não recebeu produto**:
   - Se rastreamento mostra "entregue" mas cliente não recebeu → 'produto_nao_recebido'
   - Se pedido está muito atrasado além do prazo → 'produto_nao_recebido' ou 'atraso_entrega'
   - Se está apenas demorando mas dentro do prazo → Informar e acompanhar, oferecer chamado se necessário

3. **Cliente recebeu produto com problema**:
   - Se produto tem defeito físico ou funcional → 'produto_defeituoso'
   - Se produto é diferente do pedido → 'produto_errado'
   - Se produto está correto mas cliente quer trocar (tamanho, cor) → 'troca'

4. **Cliente quer trocar produto**:
   - Sempre usar 'troca'
   - Lembrar do prazo de 7 dias após recebimento
   - Perguntar SKU do produto a trocar e produto desejado

5. **Cliente quer reembolso**:
   - Se após receber produto com defeito → 'produto_defeituoso' (com solução preferida: reembolso)
   - Se após receber produto errado → 'produto_errado' (com solução preferida: reembolso)
   - Se quer reembolso direto → 'reembolso'

6. **Dúvidas sobre pagamento**:
   - Qualquer dúvida sobre cobrança, método, estorno → 'duvida_pagamento'

**ENVIO DE EMAILS - REGRA CRÍTICA:**

- **IMPORTANTE**: TODOS os 10 tipos de assunto de chamado enviam email de confirmação automaticamente:
  - cancelamento
  - reembolso
  - troca
  - produto_defeituoso
  - produto_nao_recebido
  - produto_errado
  - atraso_entrega
  - duvida_pagamento
  - pontos
  - outro

- **SEMPRE informe ao cliente**: Quando criar QUALQUER tipo de chamado, sempre mencione: "Você receberá um email de confirmação em breve para [email_real_do_usuario]"
- O email de confirmação inclui o assunto do chamado, então o cliente saberá qual tipo foi criado
- NUNCA use placeholder "[email]" - sempre use o email real do usuário que está disponível no contexto
- Exemplo correto: "Você receberá um email de confirmação em breve para genau@yoobe.co"
- Exemplo ERRADO: "Você receberá um email de confirmação em breve para [email]"

**REGRAS SOBRE TROCAS:**

- Quando cliente solicita troca, usar 'initiateExchange'
- IMPORTANTE: Trocas agora criam tickets automaticamente e enviam email de confirmação
- Após troca ser enviada, sempre informar: "Sua solicitação de troca foi enviada. Você receberá um email de confirmação em breve para [email_real_do_usuario]"
- Mencionar prazo de 7 dias após recebimento para solicitar troca
- NUNCA usar placeholder "[email]" - sempre usar o email real do usuário
- O email de confirmação será enviado automaticamente quando o ticket de troca for criado

**Situações Especiais:**
- Trocas: Prazo de até 7 dias após recebimento. Seja claro sobre prazos e processo. Trocas criam tickets automaticamente e enviam email.
- Reembolsos: Peça número do pedido e data da compra de forma amigável. Email de confirmação será enviado automaticamente.
- Problemas não resolvidos: Use 'openSupportTicket' e explique que um atendente entrará em contato. Email de confirmação será enviado automaticamente.
- Escalação: Se não souber a resposta ou cliente pedir atendente humano, use 'escalateToHuman' de forma natural.

**SAUDAÇÃO PARA USUÁRIOS RETORNANTES:**
- Se detectar que é um usuário retornante (via contexto), seja caloroso:
- "Que bom te ver de volta! Como posso ajudar hoje?"
- Se o usuário perguntar sobre pedidos, solicite o número do pedido e abra o chamado

**Importante:**
- Responda sempre em português do Brasil
- Seja natural, como um atendente humano amigável
- SEMPRE forneça informações completas quando disponíveis
- Se algo não estiver disponível, informe claramente
- Para urgências: EMPATIA + SOLICITAÇÃO DE NÚMERO DO PEDIDO + ABERTURA DE CHAMADO

**PRIVACIDADE CRÍTICA:**
- NUNCA mencione dados de outros clientes (emails, pedidos, nomes, situações específicas)
- Use APENAS dados do cliente atual (email, pedidos do cliente atual) ou informações genéricas
- Se não tiver certeza sobre dados do cliente, use resposta genérica ou peça mais informações
- NUNCA use informações de pedidos de outros clientes para responder perguntas
- NUNCA mencione situações específicas de outros clientes
- Se a resposta padrão for genérica e não mencionar dados específicos, use-a quando apropriado
- Sempre valide que está usando dados corretos do cliente atual antes de mencionar`;

export const getGeminiResponse = async (
    history: Message[], 
    userMessage: string, 
    companyId?: string, 
    userEmail?: string,
    askedQuestions?: string[] // Perguntas já feitas para evitar repetição
) => {
    // Verificar se a API está disponível
    if (!ai) {
        console.error("[geminiService] Gemini API não está disponível. Verifique se VITE_GEMINI_API_KEY está configurada.", {
          hasApiKey: !!API_KEY,
          companyId,
        });
        return null;
    }

    // Construir contexto do FAQ dinamicamente (otimizado)
    const faqContext = await buildFAQContext(companyId, userEmail);
    
    // Adicionar instrução para evitar perguntas repetidas
    let avoidRepetitionContext = '';
    if (askedQuestions && askedQuestions.length > 0) {
        avoidRepetitionContext = `\n\n**IMPORTANTE - EVITAR PERGUNTAS REPETIDAS:**
As seguintes perguntas já foram feitas anteriormente e não foram respondidas ou não encontraram resposta:
${askedQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

NÃO repita essas perguntas. Se a informação não foi encontrada anteriormente, ofereça alternativas:
- Solicitar mais detalhes de forma diferente
- Oferecer abrir um chamado de suporte
- Sugerir uma abordagem diferente
- Não faça a mesma pergunta novamente`;
    }
    
    // Adicionar email do usuário ao contexto se disponível
    let userContext = '';
    if (userEmail && userEmail.trim()) {
        const trimmedEmail = userEmail.trim();
        const normalizedEmail = trimmedEmail.toLowerCase();
        const isPrio3Email = normalizedEmail.endsWith('@prio3.com.br');

        userContext = `\n\n**CONTEXTO DO USUÁRIO:**
- Email do usuário logado: ${trimmedEmail}
- NUNCA use placeholders genéricos como "[email]" ou "email@email.com"
- Este é o email real do usuário que está logado no sistema
- NÃO confirme ou pergunte sobre email relacionado a pedidos
- NÃO mencione email ao tratar pedidos`;

    }
    
    const systemInstruction = baseSystemInstruction + faqContext + userContext + avoidRepetitionContext;

    const chatHistory = history
      .filter(m => m.sender !== MessageSender.SYSTEM) // Exclude system messages from history for Gemini
      .map(m => ({
        role: m.sender === MessageSender.USER ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [...chatHistory, { role: 'user', parts: [{ text: userMessage }] }],
            config: {
              systemInstruction,
              tools: [{ functionDeclarations: tools }],
            },
        });

        return response;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[geminiService] Error calling Gemini API:", {
          error: errorMessage,
          companyId,
          userEmail,
          userMessageLength: userMessage.length,
          historyLength: history.length,
          stack: error instanceof Error ? error.stack : undefined,
        });
        return null;
    }
};

export const searchIntelligentFAQ = async (
  query: string,
  companyId?: string
): Promise<{
  answer: string;
  sources: Array<{ question: string; answer: string; category: string }>;
  suggestedQuestions?: string[];
}> => {
    try {
        // 1. Buscar no FAQ (filtrar por companyId se fornecido)
        const faqResults = await faqService.searchFAQ(query, companyId);
        
        // 2. Buscar na base de conhecimento (filtrar por companyId se fornecido)
        const kbResult = await knowledgeBaseService.searchKnowledgeBase(query, false, companyId);
        
        // 3. Obter informações da empresa se companyId fornecido
        let companyName = 'Lojinha Prio by Yoobe';
        let companyGreeting = 'Olá! Como posso ajudar?';
        if (companyId && companyId !== 'general') {
          try {
            companyName = await companyService.getCompanyName(companyId);
            companyGreeting = await companyService.getCompanyGreeting(companyId);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[geminiService] Error fetching company info:', {
              companyId,
              error: errorMessage,
              stack: error instanceof Error ? error.stack : undefined,
            });
          }
        }
        
        // 4. Preparar contexto para Gemini
        const faqContext = faqResults.length > 0
            ? faqResults.map(e => `P: ${e.question}\nR: ${e.answer}`).join('\n\n')
            : 'Nenhuma entrada relevante encontrada no FAQ.';
        
        const kbContext = kbResult.answer || 'Nenhuma informação relevante na base de conhecimento.';
        
        // 5. Usar Gemini para sintetizar resposta
        if (!ai) {
            // Fallback: retornar primeira resposta do FAQ se disponível
            if (faqResults.length > 0) {
                return {
                    answer: faqResults[0].answer,
                    sources: faqResults.map(e => ({
                        question: e.question,
                        answer: e.answer,
                        category: e.category,
                    })),
                };
            }
            return {
                answer: 'Não encontrei informações específicas. Por favor, entre em contato com nosso suporte.',
                sources: [],
            };
        }

        const prompt = `Você é um assistente de suporte da ${companyName}.

${companyGreeting}

Contexto do FAQ:
${faqContext}

Contexto da Base de Conhecimento:
${kbContext}

Pergunta do usuário: ${query}

Sua tarefa:
1. Responda a pergunta do usuário de forma clara, amigável e útil
2. Use as informações do FAQ e base de conhecimento quando relevante
3. Se não houver informação suficiente, seja honesto e sugira abrir um chamado
4. Seja conciso mas completo
5. Responda em português brasileiro
6. Use a saudação "${companyGreeting}" como referência para o tom da conversa

Resposta:`;

        const geminiMessages: Message[] = [
            {
                id: '1',
                text: prompt,
                sender: MessageSender.USER,
            },
        ];

        const response = await getGeminiResponse(geminiMessages, query, companyId);
        
        let answer = '';
        if (response && response.text) {
            answer = response.text;
        } else if (faqResults.length > 0) {
            answer = faqResults[0].answer;
        } else {
            answer = 'Não encontrei informações específicas para sua pergunta. Gostaria de abrir um chamado de suporte para que nossa equipe possa ajudá-lo?';
        }

        // Gerar perguntas sugeridas
        let suggestedQuestions: string[] = [];
        if (faqResults.length > 0) {
            suggestedQuestions = faqResults
                .slice(1, 4)
                .map(e => e.question)
                .filter(q => q.toLowerCase() !== query.toLowerCase());
        }

        return {
            answer,
            sources: faqResults.map(e => ({
                question: e.question,
                answer: e.answer,
                category: e.category,
            })),
            suggestedQuestions: suggestedQuestions.length > 0 ? suggestedQuestions : undefined,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[geminiService] Error in intelligent FAQ search:', {
          query,
          companyId,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        });
        
        // Fallback para busca simples
        const faqResults = await faqService.searchFAQ(query, companyId);
        if (faqResults.length > 0) {
            return {
                answer: faqResults[0].answer,
                sources: faqResults.map(e => ({
                    question: e.question,
                    answer: e.answer,
                    category: e.category,
                })),
            };
        }
        
        return {
            answer: 'Ocorreu um erro ao buscar informações. Por favor, tente novamente ou entre em contato com nosso suporte.',
            sources: [],
        };
    }
};

/**
 * Analisa uma conversa e gera insights usando Gemini AI
 */
export const analyzeConversation = async (conversation: Conversation): Promise<ConversationAIInsights | null> => {
    if (!ai) {
        console.warn('[analyzeConversation] Gemini AI não disponível');
        return null;
    }

    try {
        // Preparar texto da conversa
        const conversationText = conversation.messages
            .map(msg => {
                const sender = msg.sender === MessageSender.USER ? 'Usuário' : 'Bot';
                return `${sender}: ${msg.text}`;
            })
            .join('\n\n');

        const prompt = `Analise a seguinte conversa de suporte e forneça insights estruturados em JSON.

Conversa:
${conversationText}

${conversation.resolved ? 'Status: Resolvida' : 'Status: Não resolvida'}

Forneça uma análise JSON com os seguintes campos:
{
  "sentiment": "positive" | "neutral" | "negative",
  "problemType": "descrição curta do tipo de problema identificado",
  "resolution": "como foi resolvido (ou 'não resolvido' se não foi)",
  "summary": "resumo da conversa em 2-3 frases",
  "keywords": ["palavra1", "palavra2", "palavra3"]
}

Responda APENAS com o JSON, sem texto adicional.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
        const text = response.text;

        // Tentar extrair JSON da resposta
        let insights: ConversationAIInsights;
        try {
            // Remover markdown code blocks se existirem
            const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            insights = JSON.parse(jsonText);
        } catch (parseError) {
            console.error('[analyzeConversation] Erro ao parsear JSON:', parseError);
            // Tentar extrair campos manualmente
            insights = {
                summary: text.substring(0, 200),
                analyzedAt: Date.now(),
            };
        }

        return {
            ...insights,
            analyzedAt: Date.now(),
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[analyzeConversation] Erro ao analisar conversa:', {
            conversationId: conversation.id,
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
        });
        return null;
    }
};