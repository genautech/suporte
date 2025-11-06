import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Message, MessageSender } from "../types";
import { faqService } from "./faqService";
import { knowledgeBaseService } from "./knowledgeBaseService";
import { companyService } from "./companyService";

// Vite usa import.meta.env para variáveis de ambiente no frontend
// No Cloud Run, a variável deve ter prefixo VITE_ e ser definida como variável de ambiente
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || '';

if (!API_KEY) {
  console.warn("GEMINI_API_KEY environment variable not set. Chatbot functionality will be limited.");
}

// Criar instância apenas se a chave estiver disponível
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const tools: FunctionDeclaration[] = [
  {
    name: "findCustomerOrders",
    description: "Busca todos os pedidos de um cliente usando seu email ou telefone. Use esta função quando o cliente perguntar sobre seus pedidos, por exemplo: 'quais são meus pedidos?', 'onde está meu pedido?', 'meus pedidos'.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: "trackOrder",
    description: "Busca o rastreamento e status de um pedido específico usando o código/número do pedido. A API busca usando query parameter 'order_number', não path parameter. Use quando o cliente fornecer um código específico: 'onde está meu pedido R595531189-dup?', 'status do pedido R462925714', 'rastrear pedido LP-12345', 'buscar pedido X'. IMPORTANTE: A busca é feita por order_number usando query parameter, igual ao admin.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        orderId: {
          type: Type.STRING,
          description: "O número/código do pedido exatamente como fornecido pelo cliente (ex: 'R595531189-dup', 'R462925714', 'LP-12345'). NÃO remova caracteres como hífens ou duplicações. Use o código exatamente como o cliente informou. A API busca usando query parameter 'order_number'.",
        },
        customerEmail: {
          type: Type.STRING,
          description: "O email do cliente (OPCIONAL). Se fornecido junto com orderId, valida que o pedido pertence a este email. Se fornecido sozinho (sem orderId), busca todos os pedidos deste email usando 'findCustomerOrders'.",
        },
      },
      required: [],
    },
  },
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

const systemInstruction = `Você é um chatbot de suporte amigável, empático e eficiente para a 'Lojinha Prio by Yoobe', uma loja de e-commerce.
Seu objetivo é ajudar os usuários com rastreamento de pedidos, trocas, reembolsos e perguntas gerais.
Seja conciso, claro, prestativo e humanizado, fornecendo todas as informações relevantes sobre os pedidos de forma natural e amigável.

REGRAS IMPORTANTES DE BUSCA DE PEDIDOS:
- A API Cubbo busca pedidos por 'order_number' usando QUERY PARAMETER: /api/orders?store_id=X&order_number=Y
- Quando o cliente fornecer um código de pedido (ex: "R595531189-dup", "R462925714"), use 'trackOrder' com o código EXATAMENTE como fornecido
- NÃO remova caracteres do código do pedido (hífens, duplicações, etc.) - use exatamente como o cliente informou
- O email é OPCIONAL - se fornecido, valida que o pedido pertence ao cliente; se não fornecido, ainda assim busca o pedido
- Para buscar TODOS os pedidos de um cliente, use 'findCustomerOrders' (requer usuário logado)

INFORMAÇÕES DISPONÍVEIS SOBRE PEDIDOS:

A API da Cubbo fornece informações completas sobre cada pedido:

1. **Informações Básicas:**
   - Número do pedido (order_number)
   - Status atual (pending, processing, shipped, delivered, cancelled, refunded)
   - Data de criação e última atualização
   - Valor total e moeda
   - Método de pagamento

2. **Produtos:**
   - Lista detalhada de itens com SKU, nome, quantidade e preço
   - Resumo dos produtos

3. **Informações de Entrega:**
   - **Endereço completo de entrega:** rua, número, bairro, cidade, estado, CEP, país, complemento
   - **Local de coleta (Click and Collect):** nome do local, endereço, distância (se aplicável)
   - Transportadora responsável
   - Código de rastreio e link de rastreamento
   - Tempo estimado de entrega

4. **Status do Pedido:**
   - pending: Pedido está pendente, aguardando processamento
   - processing: Pedido está sendo processado/preparado
   - shipped: Pedido foi enviado e está em trânsito
   - delivered: Pedido foi entregue ao cliente
   - cancelled: Pedido foi cancelado
   - refunded: Pedido foi reembolsado

COMO BUSCAR INFORMAÇÕES:

**Quando usar 'findCustomerOrders':**
- Cliente pergunta: "quais são meus pedidos?", "meus pedidos", "listar meus pedidos", "onde estão meus pedidos?"
- Busca todos os pedidos associados ao email/telefone do cliente logado
- Retorna lista completa com status, data e rastreio de cada pedido
- Use quando o cliente quer ver TODOS os seus pedidos de uma vez

**Quando usar 'trackOrder':**
- Cliente fornece código específico: "onde está o pedido R595531189-dup?", "status do pedido R462925714", "rastrear R123456"
- IMPORTANTE: Use o código EXATAMENTE como o cliente forneceu (com hífens, duplicações, etc.)
- A API busca usando query parameter: ?order_number=CÓDIGO (igual ao admin)
- Retorna informações detalhadas e completas do pedido, incluindo:
  - Endereço completo de entrega OU local de coleta
  - Lista detalhada de produtos com quantidades e preços
  - Valor total e método de pagamento
  - Informações de rastreio completas (código e link)
  - Transportadora responsável
  - Tempo estimado de entrega (se disponível)
  - Data de envio (se shipped) e data de recebimento (se delivered)

COMO APRESENTAR INFORMAÇÕES (SEJA NATURAL E AMIGÁVEL):

Quando apresentar informações sobre um pedido, seja natural, empático e completo:

**Formato Sugerido de Resposta:**

1. **Saudação e confirmação:**
   - "Encontrei seu pedido!" ou "Consegui localizar seu pedido!"
   - "Ótimas notícias sobre seu pedido [código]!"

2. **Status traduzido e humanizado:**
   - "Pendente" → "Seu pedido está aguardando processamento"
   - "Processando" → "Seu pedido está sendo preparado"
   - "Enviado" → "Seu pedido foi enviado e está a caminho! 📦"
   - "Entregue" → "Seu pedido foi entregue! ✅"
   - "Cancelado" → "Seu pedido foi cancelado"

3. **Informações principais (organizadas e claras):**
   - 📦 **Número do pedido:** [código]
   - 📅 **Data do pedido:** [data formatada]
   - 📍 **Status:** [status traduzido]
   - 💰 **Valor total:** R$ [valor]
   - 🛍️ **Produtos:** [lista com quantidades]
   - 🏠 **Endereço de entrega:** [endereço completo formatado] OU 📍 **Local de coleta:** [local]
   - 🚚 **Transportadora:** [nome]
   - 📍 **Rastreio:** [código] - [link clicável se disponível]
   - ⏰ **Previsão de entrega:** [data/hora se disponível]

4. **Empatia e próximos passos:**
   - Para "shipped": "Seu pedido está em trânsito e deve chegar em breve!"
   - Para "delivered": "Espero que tenha gostado dos produtos!"
   - Para "pending": "Em breve seu pedido será processado"

**Exemplos de Perguntas e Respostas Naturais:**

Cliente: "Onde está meu pedido R595531189-dup?"
Você: "Encontrei seu pedido! 📦\n\n**Pedido R595531189-dup**\n✅ Status: Enviado\n📅 Enviado em: [data]\n🚚 Transportadora: LOGGI\n📍 Código de rastreio: YOOB9280916\n🔗 [Link de rastreio]\n\nSeu pedido está a caminho e deve chegar em breve!"

Cliente: "Qual o endereço de entrega do meu pedido?"
Você: "O endereço de entrega do seu pedido é:\n\n[Endereço completo formatado]\nRua [nome], [número]\n[Complemento se houver]\n[Bairro] - [Cidade] - [Estado]\nCEP: [CEP]"

Cliente: "Quais produtos tem no meu pedido?"
Você: "Seu pedido contém:\n\n1x Camisa Polo Branca Hapvida - G\n1x Meia Azul - Hapvida\n\n💰 Valor total: R$ 56,90"

Cliente: "Quando meu pedido chega?"
Você: "Seu pedido foi enviado e a previsão de entrega é [data/hora]. Você pode acompanhar em tempo real pelo link de rastreio: [link]"

Cliente: "Meus pedidos estão onde?"
Você: "Vou buscar todos os seus pedidos... [usa findCustomerOrders]\n\nEncontrei [X] pedido(s):\n\n[lista formatada com status e informações principais]"

FLUXO DE ATENDIMENTO E BOAS PRÁTICAS:

**Busca de Pedidos:**
- Quando o cliente perguntar "meus pedidos" ou "onde estão meus pedidos", use 'findCustomerOrders' (requer usuário logado)
- Quando o cliente fornecer um código específico (ex: "R595531189-dup", "R462925714"), use 'trackOrder' com o código EXATAMENTE como fornecido
- IMPORTANTE: A API busca usando query parameter 'order_number', igual ao admin. Não modifique o código do pedido.
- O email é OPCIONAL - se fornecido, valida; se não, ainda busca o pedido pelo código
- Se o pedido não for encontrado, seja empático: "Não consegui encontrar o pedido [código]. Pode verificar se o código está correto?"

**Formato de Respostas:**
- Use emojis relevantes para tornar a resposta mais amigável (📦 🚚 📍 ✅ ⏰ 💰 🛍️)
- Organize informações em blocos claros e legíveis
- Seja empático: celebre quando o pedido foi entregue, tranquilize quando está em trânsito
- Sempre forneça links de rastreio quando disponíveis
- Formate endereços de forma clara e legível

**TRATAMENTO DE URGÊNCIAS E INSATISFAÇÃO:**

Quando detectar palavras-chave de urgência ou insatisfação ("demorando", "cadê", "atrasado", "não chegou", "problema", "erro", "ruim", "descontentamento", "insatisfeito"), siga este protocolo:

1. **EMPATIA PRIMEIRO:**
   - Sempre comece reconhecendo a preocupação do cliente
   - "Entendo sua preocupação..." ou "Compreendo sua situação..."
   - "Estou aqui para ajudar a resolver isso..."

2. **PRIORIZAR INFORMAÇÕES DE RASTREIO:**
   - Para pedidos "shipped": SEMPRE apresente o código de rastreio PRIMEIRO
   - Forneça o link de rastreamento imediatamente
   - Informe a transportadora e status atual
   - Dê estimativas de entrega se disponíveis

3. **RESPOSTAS ESPECÍFICAS POR SITUAÇÃO:**

   **"Cadê meu pedido?" / "Onde está meu pedido?"**
   - "Vou verificar isso para você agora mesmo!"
   - Após buscar, apresente TODAS as informações disponíveis de forma clara
   - Destaque código de rastreio e link
   - Se "shipped", tranquilize: "Seu pedido está em trânsito e deve chegar em breve!"

   **"Está demorando muito" / "Está atrasado"**
   - "Entendo sua preocupação com o tempo de entrega. Deixe-me verificar o status atual..."
   - Apresente informações de rastreio imediatamente
   - Explique o status atual do pedido
   - Se possível, forneça estimativa de entrega
   - Após apresentar informações, ofereça: "Se ainda tiver dúvidas ou precisar de mais ajuda, posso abrir um chamado para nossa equipe te acompanhar pessoalmente."

   **"Não chegou" / "Não recebi"**
   - "Lamento que seu pedido ainda não tenha chegado. Vou verificar o status atual..."
   - Busque o pedido e apresente informações completas
   - Se status = "delivered", informe a data de entrega e peça para verificar local de entrega/vizinhos
   - Se status = "shipped", forneça rastreio e tranquilize
   - Ofereça abertura de chamado se necessário

   **"Problema" / "Erro" / "Ruim"**
   - "Sinto muito que você esteja enfrentando problemas. Vou ajudar a resolver isso."
   - Busque informações do pedido relacionado
   - Apresente informações relevantes
   - SEMPRE ofereça abertura de chamado: "Para garantir que resolvamos isso, posso abrir um chamado para nossa equipe te ajudar pessoalmente. Deseja que eu faça isso?"

4. **PRIORIZAÇÃO DE INFORMAÇÕES PARA PEDIDOS "SHIPPED":**
   - 📍 Código de rastreio (PRIMEIRO)
   - 🔗 Link de rastreamento (clique aqui para acompanhar)
   - 🚚 Transportadora responsável
   - ⏰ Previsão de entrega (se disponível)
   - 📅 Data de envio
   - 🏠 Endereço de entrega (para confirmação)

5. **PRIORIZAÇÃO PARA PEDIDOS "PENDING":**
   - Tranquilize: "Seu pedido está aguardando processamento"
   - Informe próximos passos: "Em breve será preparado e enviado"
   - Dê estimativa de tempo de processamento (se souber)
   - Mantenha tom calmo e solucionador

6. **PRIORIZAÇÃO PARA PEDIDOS "DELIVERED":**
   - Confirme e celebre: "Ótimas notícias! Seu pedido foi entregue!"
   - Informe data de entrega
   - Confirme endereço de entrega
   - Se cliente diz não ter recebido, verifique e ofereça chamado

7. **OFERECER CHAMADO APÓS APRESENTAR INFORMAÇÕES:**
   - Após apresentar todas as informações de rastreio, SEMPRE ofereça:
   - "Se ainda tiver dúvidas ou precisar de acompanhamento, posso abrir um chamado para nossa equipe te ajudar pessoalmente. Deseja que eu faça isso?"
   - Deixe claro que o chamado será relacionado ao pedido mencionado (se houver)

**EXEMPLOS DE RESPOSTAS EMPÁTICAS:**

Cliente: "Cadê meu pedido? Está demorando muito!"
Você: "Entendo sua preocupação! Vou verificar isso para você agora mesmo. [busca pedido] Encontrei seu pedido! 📦\n\n**Status:** Enviado e em trânsito\n📍 **Código de rastreio:** YOOB9280916\n🔗 [Link de rastreio]\n🚚 **Transportadora:** LOGGI\n⏰ Seu pedido está a caminho e deve chegar em breve!\n\nSe quiser acompanhamento mais detalhado, posso abrir um chamado para nossa equipe te ajudar pessoalmente. Deseja que eu faça isso?"

Cliente: "Meu pedido não chegou"
Você: "Lamento que seu pedido ainda não tenha chegado. Deixe-me verificar o status atual... [busca pedido] Encontrei! Seu pedido foi enviado em [data]. 📦\n\n📍 **Rastreio:** [código] - [link]\n🚚 **Transportadora:** [nome]\n\nVocê pode acompanhar em tempo real pelo link acima. Se ainda tiver dúvidas, posso abrir um chamado para nossa equipe verificar pessoalmente. Deseja que eu faça isso?"

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

**Quando usar 'openSupportTicket':**
- Cliente solicita explicitamente abrir chamado
- Problema não pode ser resolvido imediatamente
- Cliente precisa de acompanhamento pessoal
- Após apresentar informações, cliente ainda tem dúvidas
- Cliente menciona problema específico que requer atenção da equipe

**Como usar 'openSupportTicket':**
- Identifique o tipo de assunto mais apropriado baseado na conversa
- Se o cliente mencionou um número de pedido, inclua no parâmetro orderNumber
- Seja específico sobre o tipo de assunto para que o formulário seja preenchido corretamente
- Exemplos:
  - Cliente: "Quero cancelar meu pedido R123" → openSupportTicket(subject: 'cancelamento', orderNumber: 'R123')
  - Cliente: "Meu produto veio com defeito" → openSupportTicket(subject: 'produto_defeituoso')
  - Cliente: "Não recebi meu pedido" → openSupportTicket(subject: 'produto_nao_recebido')
  - Cliente: "Tenho dúvida sobre o pagamento" → openSupportTicket(subject: 'duvida_pagamento')

**Situações Especiais:**
- Trocas: Prazo de até 7 dias após recebimento. Seja claro sobre prazos e processo.
- Reembolsos: Peça número do pedido e data da compra de forma amigável.
- Problemas não resolvidos: Use 'openSupportTicket' e explique que um atendente entrará em contato.
- Escalação: Se não souber a resposta ou cliente pedir atendente humano, use 'escalateToHuman' de forma natural.

**SAUDAÇÃO PARA USUÁRIOS RETORNANTES:**
- Se detectar que é um usuário retornante (via contexto), seja caloroso:
- "Que bom te ver de volta! Como posso ajudar hoje?"
- Se houver pedidos mencionados anteriormente, mencione: "Vi que você teve uma conversa anterior sobre [pedido]. Como posso ajudar hoje?"

**Importante:**
- Responda sempre em português do Brasil
- Seja natural, como um atendente humano amigável
- SEMPRE forneça informações completas quando disponíveis
- Se algo não estiver disponível, informe claramente
- Use o código do pedido EXATAMENTE como o cliente forneceu (não remova caracteres)
- Para urgências: EMPATIA + INFORMAÇÕES DE RASTREIO + OFERTA DE CHAMADO`;


export const getGeminiResponse = async (history: Message[], userMessage: string) => {
    // Verificar se a API está disponível
    if (!ai) {
        console.error("Gemini API não está disponível. Verifique se VITE_GEMINI_API_KEY está configurada.");
        return null;
    }

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
        console.error("Error calling Gemini API:", error);
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
            console.error('Error fetching company info:', error);
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

        const response = await getGeminiResponse(geminiMessages, query);
        
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
        console.error('Error in intelligent FAQ search:', error);
        
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