// Fix: Implement the support service using Firebase.
import { db } from '../firebase';
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp,
  orderBy,
  arrayUnion,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { Ticket, TicketStatus, KnowledgeBase, ApiConfig, CubboOrder } from '../types';

const ticketsCollection = collection(db, 'tickets');
const apiConfigsCollection = collection(db, 'apiConfigs');

// --- Helpers ---

const ticketFromFirestore = (docSnapshot: any): Ticket => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ...data,
    createdAt: (data.createdAt as Timestamp)?.toDate().getTime(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate().getTime(),
  } as Ticket;
};

const apiConfigFromFirestore = (docSnapshot: any): ApiConfig => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ...data,
  } as ApiConfig;
};

const getCubboConfig = async (): Promise<ApiConfig | null> => {
    const docRef = doc(db, 'apiConfigs', 'cubbo');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return apiConfigFromFirestore(docSnap);
    }
    return null;
}

// Internal function to get a fresh access token from Cubbo via a secure backend proxy
// --- REFACTORED to be more robust and provide better error diagnostics ---
const getAccessToken = async (): Promise<string> => {
    // This URL points to your deployed Google Cloud Run service.
    // MAKE SURE THIS URL IS CORRECT
    const CLOUD_FUNCTION_URL = 'https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app';

    try {
        const response = await fetch(CLOUD_FUNCTION_URL, {
            method: 'POST',
        });

        // It's safer to get the raw text first to have it available for logging,
        // as .json() consumes the response body.
        const responseText = await response.text();

        if (!response.ok) {
            let errorDetails = `Status: ${response.status}`;
            try {
                // Try to parse the error text as JSON, which the proxy might send
                const errorBody = JSON.parse(responseText);
                errorDetails = errorBody.error || errorBody.message || JSON.stringify(errorBody);
            } catch (e) {
                // If parsing fails, use the raw text body
                errorDetails = responseText || 'Nenhuma resposta do corpo do erro.';
            }
            throw new Error(`Falha na comunicação com o proxy. Detalhes: ${errorDetails}`);
        }
        
        // If response is OK, but empty, this is a critical diagnostic clue.
        if (!responseText) {
             throw new Error("O proxy de autenticação retornou uma resposta 200 OK vazia. Isso indica um problema no serviço de proxy no Cloud Run.");
        }
        
        const data = JSON.parse(responseText);

        // This is the happy path.
        if (data && data.access_token) {
            return data.access_token;
        }

        // Handle cases where the proxy returns a 200 OK but with an error message inside the JSON.
        if (data && (data.error || data.message)) {
            const errorMessage = data.error || data.message;
            throw new Error(`O proxy retornou uma mensagem de erro com status 200: ${errorMessage}`);
        }

        // **THE MOST LIKELY SCENARIO FOR YOUR PROBLEM**: The proxy service itself failed
        // to talk to Cubbo and returned an empty object `{}`. We can now detect this specifically.
        if (Object.keys(data).length === 0) {
            throw new Error("DIAGNÓSTICO: O proxy de autenticação falhou ao se comunicar com a API da Cubbo e retornou uma resposta vazia ({}). A causa mais provável é que as credenciais (CUBBO_CLIENT_ID/CUBBO_CLIENT_SECRET) nas variáveis de ambiente do seu serviço de proxy no Google Cloud Run estão incorretas ou faltando. Por favor, verifique-as no Google Cloud Console.");
        }

        // Generic fallback error
        throw new Error(`Token de acesso não encontrado na resposta do proxy. Resposta recebida: ${responseText}`);

    } catch (error) {
        // Log and re-throw the error with a consistent prefix to be handled by the calling function.
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Erro no processo de obtenção de token via proxy:", errorMessage);
        // Throw a new error to ensure a consistent message format for the UI.
        throw new Error(`Erro no processo de obtenção de token via proxy: ${errorMessage}`);
    }
};


// --- Public Service Methods ---

export const supportService = {
  // Ticket functions
  getTickets: async (): Promise<Ticket[]> => {
    const q = query(ticketsCollection, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(ticketFromFirestore);
  },

  getTicketsByUser: async (user: { email?: string | null; phone?: string | null }): Promise<Ticket[]> => {
    const queries = [];
    if (user.email) {
        queries.push(getDocs(query(ticketsCollection, where('email', '==', user.email))));
    }
    if (user.phone) {
        const sanitizedPhone = user.phone.replace(/\D/g, '');
        queries.push(getDocs(query(ticketsCollection, where('phone', '==', sanitizedPhone))));
    }
    
    if (queries.length === 0) return [];

    const snapshots = await Promise.all(queries);
    const ticketsMap = new Map<string, Ticket>();

    snapshots.forEach(snapshot => {
        snapshot.docs.forEach(doc => ticketsMap.set(doc.id, ticketFromFirestore(doc)));
    });

    const combinedTickets = Array.from(ticketsMap.values());
    combinedTickets.sort((a, b) => b.createdAt - a.createdAt);

    return combinedTickets;
  },

  createTicket: async (ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'history'>): Promise<string> => {
      const newTicket = {
          ...ticketData,
          phone: ticketData.phone?.replace(/\D/g, '') || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          history: [{
              timestamp: Date.now(),
              author: 'user',
              type: 'creation',
              content: 'Ticket criado pelo cliente.'
          }]
      };
      const docRef = await addDoc(ticketsCollection, newTicket);
      return docRef.id;
  },

  updateTicket: async (id: string, data: Partial<Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'history'>>) => {
    const ticketDoc = doc(db, 'tickets', id);
    const dataToUpdate: Record<string, any> = { ...data, updatedAt: serverTimestamp() };

    if (data.status) {
        const currentDoc = await getDoc(ticketDoc);
        if (currentDoc.exists()) {
            const currentData = currentDoc.data();
            if (currentData.status !== data.status) {
                const newHistoryItem = {
                    content: `Status alterado para: ${data.status.replace('_', ' ')}`,
                    author: 'admin',
                    timestamp: Date.now(),
                    type: 'status_change'
                };
                dataToUpdate.history = arrayUnion(newHistoryItem);
            }
        }
    }
    
    await updateDoc(ticketDoc, dataToUpdate);
  },

  addTicketReply: async (id: string, reply: { content: string; author: 'admin' | 'user' }) => {
    const ticketDoc = doc(db, 'tickets', id);
    const newHistoryItem = { ...reply, timestamp: Date.now(), type: 'comment' };
    await updateDoc(ticketDoc, { history: arrayUnion(newHistoryItem), updatedAt: serverTimestamp() });
  },

  updateTicketStatus: async (id: string, status: TicketStatus) => {
    const ticketDoc = doc(db, 'tickets', id);
     const newHistoryItem = {
        content: `Status alterado para: ${status.replace('_', ' ')}`,
        author: 'admin',
        timestamp: Date.now(),
        type: 'status_change'
    };
    await updateDoc(ticketDoc, { status: status, history: arrayUnion(newHistoryItem), updatedAt: serverTimestamp() });
  },

  // Postmark Email Service
  sendTicketReplyEmail: async (emailData: { to: string, subject: string, htmlBody: string }): Promise<{ success: boolean; error?: string }> => {
    // IMPORTANTE: Substitua esta URL pela URL real do seu serviço de proxy de e-mail
    // implantado no Google Cloud Run. Você pode encontrá-la no painel do Cloud Run.
    const EMAIL_PROXY_URL = 'https://substitua-pela-url-do-seu-servico-postmark.a.run.app'; 

    try {
        const response = await fetch(EMAIL_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailData),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(errorBody.error || 'Falha ao enviar e-mail.');
        }

        return { success: true };
    } catch (error: any) {
        console.error("Erro ao enviar e-mail via proxy:", error);
        return { success: false, error: error.message };
    }
  },

  // KnowledgeBase Functions
  getKnowledgeBase: async (): Promise<KnowledgeBase> => {
    const kbDoc = await getDoc(doc(db, 'knowledgeBase', 'main'));
    if (kbDoc.exists()) {
        const data = kbDoc.data();
        return { content: data.content, lastUpdatedAt: (data.lastUpdatedAt as Timestamp).toDate() };
    }
    return { content: '## Trocas\nVocê pode solicitar a troca de um produto em até 3 dias após o recebimento. Para iniciar, por favor, me peça para "iniciar uma troca".\n\n## Pagamento\nAceitamos cartão de crédito, boleto bancário e PIX.\n\n## Entrega\nO prazo de entrega varia de acordo com sua localidade. Você pode simular o frete na página do produto.', lastUpdatedAt: new Date() };
  },

  updateKnowledgeBase: async (content: string): Promise<void> => {
    const kbDoc = doc(db, 'knowledgeBase', 'main');
    await setDoc(kbDoc, { content, lastUpdatedAt: serverTimestamp() }, { merge: true });
  },

  // API Config Functions
  getApiConfigs: async (): Promise<ApiConfig[]> => {
    const snapshot = await getDocs(apiConfigsCollection);
    return snapshot.docs.map(apiConfigFromFirestore);
  },
  
  saveApiConfig: async (id: string, configData: Partial<ApiConfig>): Promise<void> => {
      const configDoc = doc(db, 'apiConfigs', id);
      await setDoc(configDoc, configData, { merge: true });
  },
  
  testApiConnection: async (): Promise<{ success: boolean; error?: string }> => {
    try {
        await getAccessToken();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || 'Ocorreu um erro desconhecido.' };
    }
  },

  trackOrder: async (orderId: string): Promise<{ status: string; details: string; order?: CubboOrder }> => {
    let accessToken: string;
    let config: ApiConfig | null;

    try {
        config = await getCubboConfig();
        if (!config) { 
            return { status: 'Erro de Configuração', details: 'A API de rastreamento não está configurada.' };
        }
        accessToken = await getAccessToken();
    } catch (error: any) {
        console.error("Authentication failed in trackOrder:", error);
        // Provide the specific error to the user via the chatbot.
        return { status: 'Erro de Autenticação', details: `Não foi possível autenticar com a API de pedidos. Detalhe: ${error.message}` };
    }

    try {
        const response = await fetch(`${config.url}/orders/${orderId}`, {
             headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (response.status === 404) {
            return { status: 'Não encontrado', details: `O pedido com ID ${orderId} não foi encontrado.` };
        }
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API da Cubbo retornou status ${response.status}: ${errorText}`);
        }
        const order: CubboOrder = await response.json();
        return {
            status: order.status,
            details: `Seu pedido ${order.order_number} está com o status: ${order.status}. Link de rastreio: ${order.shipping_information.tracking_url || 'Não disponível'}`,
            order
        };
    } catch (error) {
        console.error("Error tracking order:", error);
        return { status: 'Erro', details: 'Não foi possível buscar as informações do pedido. Tente novamente mais tarde.'};
    }
  },
  
  findOrdersByCustomer: async (user: { email?: string | null; phone?: string | null }): Promise<CubboOrder[]> => {
    let accessToken: string;
    let config: ApiConfig | null;

    try {
        config = await getCubboConfig();
        if (!config) return []; 
        accessToken = await getAccessToken();
    } catch (error: any) {
        console.error("Authentication failed in findOrdersByCustomer:", error);
        return []; // Silently fail and return no orders.
    }
    
    let queryParams = '';
    if (user.email) {
        queryParams = `customer_email=${encodeURIComponent(user.email)}`;
    } else if (user.phone) {
        const sanitizedPhone = user.phone.replace(/\D/g, '');
        queryParams = `customer_phone=${sanitizedPhone}`;
    } else {
        return [];
    }

    try {
        const response = await fetch(`${config.url}/orders?${queryParams}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) throw new Error('Failed to fetch orders');
        const data = await response.json();
        return data.orders || []; // Assuming the API returns an object with an 'orders' array
    } catch (error) {
        console.error("Failed to find orders by customer:", error);
        return [];
    }
  },

  searchFAQ: async (queryText: string): Promise<string> => {
    console.log(`Searching FAQ for: ${queryText}`);
    const { content } = await supportService.getKnowledgeBase();
    if (!content) {
        return 'Não encontrei uma resposta no nosso FAQ. Você gostaria que eu abrisse um chamado de suporte?';
    }

    const lowerQuery = queryText.toLowerCase();
    const sections = content.split('## ').slice(1);

    let bestMatch: { score: number, text: string } = { score: 0, text: '' };

    sections.forEach(section => {
        const lines = section.split('\n');
        const title = lines[0]?.trim().toLowerCase();
        const body = lines.slice(1).join('\n').trim();

        let score = 0;
        if (title && title.includes(lowerQuery)) score += 2;
        if (body.toLowerCase().includes(lowerQuery)) score += 1;
        
        const queryWords = lowerQuery.split(' ');
        queryWords.forEach(word => {
            if (title && title.includes(word)) score += 0.5;
            if (body.toLowerCase().includes(word)) score += 0.2;
        });

        if (score > bestMatch.score) {
            bestMatch = { score, text: body };
        }
    });

    if (bestMatch.score > 0) {
        return bestMatch.text;
    }
    
    return 'Não encontrei uma resposta direta para sua pergunta no nosso FAQ. Você gostaria que eu abrisse um chamado de suporte?';
  },
};