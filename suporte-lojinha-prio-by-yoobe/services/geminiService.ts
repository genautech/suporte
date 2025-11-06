import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Message, MessageSender } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you might want to handle this more gracefully.
  // For this context, we assume the key is always present.
  console.warn("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const tools: FunctionDeclaration[] = [
  {
    name: "trackOrder",
    description: "Obtém o status de rastreamento de um pedido a partir do seu ID.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        orderId: {
          type: Type.STRING,
          description: "O ID do pedido do cliente, por exemplo, 'LP-12345'.",
        },
      },
      required: ["orderId"],
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
    description: "Abre o formulário para o usuário criar um novo chamado de suporte para qualquer problema não resolvido.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
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

const systemInstruction = `Você é um chatbot de suporte amigável e eficiente para a 'Lojinha Prio by Yoobe', uma loja de e-commerce.
Seu objetivo é ajudar os usuários com rastreamento de pedidos, trocas, reembolsos e perguntas gerais.
Seja conciso, claro e prestativo.
- Para rastreamento, sempre peça o número do pedido se não for fornecido.
- Para trocas, o prazo é de até 3 dias após o recebimento. Inicie o processo de troca quando solicitado.
- Para reembolsos, peça o número do pedido e a data da compra para análise.
- Se o usuário tiver um problema que não pode ser resolvido com as outras funções, use 'openSupportTicket'.
- Se você não souber a resposta ou o usuário pedir para falar com um atendente, use a função 'escalateToHuman'.
- Responda sempre em português do Brasil.`;


export const getGeminiResponse = async (history: Message[], userMessage: string) => {
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