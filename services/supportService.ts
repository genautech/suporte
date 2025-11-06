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
import { Ticket, TicketStatus, KnowledgeBase, ApiConfig, CubboOrder, PickupLocation, TicketSubject, TicketFormConfig } from '../types';
import { getTicketFormConfig } from '../data/ticketFormConfigs';

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

// Helper para normalizar dados de pedidos da API Cubbo
const normalizeOrderData = (orderData: any): CubboOrder => {
  // Normalizar data de criação - pode vir em diferentes formatos
  let createdAt = orderData.created_at || orderData.createdAt || orderData.created || orderData.date_created;
  
  // Se a data já é uma string ISO válida, usar diretamente
  // Se for um timestamp numérico, converter
  // Se não existir, usar data atual como fallback
  if (!createdAt) {
    createdAt = new Date().toISOString();
  } else if (typeof createdAt === 'number') {
    // Se for timestamp em segundos, converter para milissegundos
    createdAt = createdAt < 10000000000 ? createdAt * 1000 : createdAt;
    createdAt = new Date(createdAt).toISOString();
  } else if (typeof createdAt === 'string') {
    // Validar se é uma data válida
    const date = new Date(createdAt);
    if (isNaN(date.getTime())) {
      console.warn('[normalizeOrderData] Data inválida recebida:', createdAt);
      createdAt = new Date().toISOString();
    }
  }
  
  // Normalizar data de atualização
  let updatedAt = orderData.updated_at || orderData.updatedAt || orderData.updated || orderData.date_modified;
  if (updatedAt) {
    if (typeof updatedAt === 'number') {
      updatedAt = updatedAt < 10000000000 ? updatedAt * 1000 : updatedAt;
      updatedAt = new Date(updatedAt).toISOString();
    } else if (typeof updatedAt === 'string') {
      const date = new Date(updatedAt);
      if (isNaN(date.getTime())) {
        updatedAt = undefined;
      }
    }
  }
  
  // Normalizar produtos - API Cubbo retorna como 'order_lines' (estrutura completa)
  // Formato: order_lines[{ id, sku, quantity, product: { id, name, sku, price, ... } }]
  let itemsSummary: string[] = [];
  let items: any[] = [];
  
  // Prioridade: order_lines (formato real da API) > products > items > items_summary
  let productsData = orderData.order_lines || orderData.products || orderData.items;
  
  // Preservar items/products/order_lines original se existir
  if (productsData && Array.isArray(productsData)) {
    // Se é order_lines (formato Cubbo completo)
    if (orderData.order_lines) {
      items = productsData.map((orderLine: any) => {
        const product = orderLine.product || {};
        // Converter price_per_item e price para número (podem vir como string)
        const pricePerItem = orderLine.price_per_item 
          ? (typeof orderLine.price_per_item === 'string' ? parseFloat(orderLine.price_per_item) : orderLine.price_per_item)
          : (product.price ? (typeof product.price === 'string' ? parseFloat(product.price) : product.price) : undefined);
        const quantity = orderLine.quantity || 1;
        
        return {
          sku: orderLine.sku || product.sku || product.product_codes?.[0]?.sku || '',
          name: orderLine.name || product.name || product.billing_name || orderLine.sku || 'Produto',
          quantity: quantity,
          price: pricePerItem,
          total: pricePerItem ? pricePerItem * quantity : undefined
        };
      });
    } else {
      // Formato products ou items (mais simples)
      items = productsData.map((product: any) => {
        // Converter price para número (pode vir como string)
        const price = product.price || product.unit_price || product.cost;
        const priceNum = price ? (typeof price === 'string' ? parseFloat(price) : price) : undefined;
        const quantity = product.quantity || 1;
        
        return {
          sku: product.sku || product.SKU || '',
          name: product.name || product.product_name || product.title || product.sku || 'Produto',
          quantity: quantity,
          price: priceNum,
          total: product.total || product.line_total 
            ? (typeof (product.total || product.line_total) === 'string' 
                ? parseFloat(product.total || product.line_total) 
                : (product.total || product.line_total))
            : (priceNum ? priceNum * quantity : undefined)
        };
      });
    }
    
    // Criar items_summary a partir de items se não existir
    if (!orderData.items_summary || !Array.isArray(orderData.items_summary) || orderData.items_summary.length === 0) {
      itemsSummary = items.map((item: any) => {
        const qty = item.quantity || 1;
        const name = item.name || item.sku || 'Produto';
        return `${qty}x ${name}`;
      });
    } else {
    itemsSummary = orderData.items_summary;
    }
  } else if (orderData.items_summary && Array.isArray(orderData.items_summary)) {
    itemsSummary = orderData.items_summary;
  }
  
  // Log para debug
  if (!items.length && !itemsSummary.length) {
    console.warn('[normalizeOrderData] Nenhum produto encontrado no pedido:', {
      orderId: orderData.id || orderData.order_number,
      hasOrderLines: !!orderData.order_lines,
      hasItems: !!orderData.items,
      hasProducts: !!orderData.products,
      hasItemsSummary: !!orderData.items_summary,
      orderLinesLength: orderData.order_lines?.length || 0
    });
  }
  
  // Mapear data de envio - API Cubbo retorna como 'shipping_date'
  let shippedAt = orderData.shipping_date || orderData.shipped_at || orderData.shipment_date;
  if (shippedAt) {
    try {
      if (typeof shippedAt === 'number') {
        shippedAt = shippedAt < 10000000000 ? shippedAt * 1000 : shippedAt;
        shippedAt = new Date(shippedAt).toISOString();
      } else if (typeof shippedAt === 'string') {
        const date = new Date(shippedAt);
        if (isNaN(date.getTime())) {
          shippedAt = undefined;
        } else {
          shippedAt = date.toISOString();
        }
      }
    } catch (e) {
      shippedAt = undefined;
    }
  }
  
  // Mapear data de entrega/recebimento
  let deliveredAt = orderData.delivered_at || orderData.delivery_date || orderData.received_at;
  if (deliveredAt) {
    try {
      if (typeof deliveredAt === 'number') {
        deliveredAt = deliveredAt < 10000000000 ? deliveredAt * 1000 : deliveredAt;
        deliveredAt = new Date(deliveredAt).toISOString();
      } else if (typeof deliveredAt === 'string') {
        const date = new Date(deliveredAt);
        if (isNaN(date.getTime())) {
          deliveredAt = undefined;
        } else {
          deliveredAt = date.toISOString();
        }
      }
    } catch (e) {
      deliveredAt = undefined;
    }
  }

  // Mapear comprovante de recebimento
  const receiptUrl = orderData.receipt_url || orderData.receipt_proof_url;
  const receiptImage = orderData.receipt_image || orderData.receipt_proof_image || orderData.receipt_base64;
  
  // Normalizar shipping_address - API Cubbo retorna como 'shipping' 
  // Formato REAL da API: shipping { address_1, address_2, city, state, zip_code, country, first_name, last_name, phone, email }
  // NOTA: API usa address_1 e address_2 (com underscore), não address1 e address2
  let shippingAddress = orderData.shipping || orderData.shipping_address || orderData.shippingAddress || orderData.address || orderData.delivery_address || orderData.deliveryAddress;
  
  // Se o endereço está dentro de shipping_information ou outro objeto
  if (!shippingAddress && orderData.shipping_information?.address) {
    shippingAddress = orderData.shipping_information.address;
  }
  
  // Normalizar estrutura do endereço da API Cubbo
  if (shippingAddress && typeof shippingAddress === 'object') {
    // API Cubbo REAL usa: address_1, address_2 (com underscore), city, state, zip_code, country
    // Também pode vir como: address1, address2 (sem underscore) em alguns casos
    // Nosso formato: street, street_number, neighborhood, city, state, zip_code, country
    const hasCubboFormatUnderscore = shippingAddress.address_1 || shippingAddress.address_2;
    const hasCubboFormatNoUnderscore = shippingAddress.address1 || shippingAddress.address2;
    const hasStandardFormat = shippingAddress.street || shippingAddress.city;
    
    if (hasCubboFormatUnderscore || hasCubboFormatNoUnderscore || hasStandardFormat) {
      // Se é formato Cubbo REAL (address_1, address_2 com underscore)
      if (hasCubboFormatUnderscore) {
        // address_1 pode conter rua e número juntos, ou apenas rua
        const address1 = shippingAddress.address_1 || '';
        const address1Parts = address1.split(',').map((s: string) => s.trim());
        const street = address1Parts[0] || '';
        const streetNumber = address1Parts[1] || shippingAddress.number || '';
        
        shippingAddress = {
          street: street || shippingAddress.street || shippingAddress.street_name || shippingAddress.logradouro || '',
          street_number: streetNumber || shippingAddress.street_number || shippingAddress.streetNumber || '',
          neighborhood: shippingAddress.address_2 || shippingAddress.neighborhood || shippingAddress.neighbourhood || shippingAddress.district || shippingAddress.bairro || '',
          city: shippingAddress.city || shippingAddress.cidade || '',
          state: shippingAddress.state || shippingAddress.province || shippingAddress.estado || '',
          zip_code: shippingAddress.zip_code || shippingAddress.zipCode || shippingAddress.postal_code || shippingAddress.postalCode || shippingAddress.cep || '',
          country: shippingAddress.country || shippingAddress.pais || shippingAddress.country_code || 'Brasil',
          complement: shippingAddress.complement || shippingAddress.complemento || '',
          reference: shippingAddress.reference || shippingAddress.referencia || '',
        };
      } else if (hasCubboFormatNoUnderscore) {
        // Formato address1, address2 (sem underscore) - usado em alguns casos
        const address1Parts = (shippingAddress.address1 || '').split(',').map((s: string) => s.trim());
        const street = address1Parts[0] || '';
        const streetNumber = address1Parts[1] || '';
        
        shippingAddress = {
          street: street || shippingAddress.street || shippingAddress.street_name || shippingAddress.logradouro || '',
          street_number: streetNumber || shippingAddress.street_number || shippingAddress.streetNumber || shippingAddress.number || '',
          neighborhood: shippingAddress.address2 || shippingAddress.neighborhood || shippingAddress.neighbourhood || shippingAddress.district || shippingAddress.bairro || '',
          city: shippingAddress.city || shippingAddress.cidade || '',
          state: shippingAddress.province || shippingAddress.state || shippingAddress.estado || '',
          zip_code: shippingAddress.zip_code || shippingAddress.zipCode || shippingAddress.postal_code || shippingAddress.postalCode || shippingAddress.cep || '',
          country: shippingAddress.country || shippingAddress.pais || shippingAddress.country_code || 'Brasil',
          complement: shippingAddress.complement || shippingAddress.complemento || shippingAddress.address_line2 || '',
          reference: shippingAddress.reference || shippingAddress.referencia || shippingAddress.address_reference || '',
        };
      } else {
        // Formato padrão já normalizado
        shippingAddress = {
          street: shippingAddress.street || shippingAddress.street_name || shippingAddress.logradouro || shippingAddress.address_line1 || '',
          street_number: shippingAddress.street_number || shippingAddress.streetNumber || shippingAddress.number || shippingAddress.address_number || '',
          neighborhood: shippingAddress.neighborhood || shippingAddress.neighbourhood || shippingAddress.district || shippingAddress.bairro || '',
          city: shippingAddress.city || shippingAddress.cidade || '',
          state: shippingAddress.state || shippingAddress.estado || shippingAddress.province || '',
          zip_code: shippingAddress.zip_code || shippingAddress.zipCode || shippingAddress.postal_code || shippingAddress.postalCode || shippingAddress.cep || '',
          country: shippingAddress.country || shippingAddress.pais || shippingAddress.country_code || 'Brasil',
          complement: shippingAddress.complement || shippingAddress.complemento || shippingAddress.address_line2 || '',
          reference: shippingAddress.reference || shippingAddress.referencia || shippingAddress.address_reference || '',
        };
      }
    } else {
      // Tentar campos soltos no objeto principal
      if (orderData.street || orderData.city || orderData.zip_code || orderData.cep || orderData.address_1 || orderData.address1) {
        shippingAddress = {
          street: orderData.address_1 || orderData.address1 || orderData.street || orderData.street_name || orderData.logradouro || '',
          street_number: orderData.street_number || orderData.streetNumber || orderData.number || '',
          neighborhood: orderData.address_2 || orderData.address2 || orderData.neighborhood || orderData.neighbourhood || orderData.district || orderData.bairro || '',
          city: orderData.city || orderData.cidade || '',
          state: orderData.province || orderData.state || orderData.estado || '',
          zip_code: orderData.zip_code || orderData.zipCode || orderData.postal_code || orderData.postalCode || orderData.cep || '',
          country: orderData.country || orderData.pais || orderData.country_code || 'Brasil',
          complement: orderData.complement || orderData.complemento || '',
          reference: orderData.reference || orderData.referencia || '',
        };
      } else {
        shippingAddress = undefined;
      }
    }
  }
  
  // Log para debug
  if (!shippingAddress) {
    console.warn('[normalizeOrderData] Endereço não encontrado no pedido:', {
      orderId: orderData.id || orderData.order_number,
      hasShippingAddress: !!orderData.shipping_address,
      hasShippingAddressCamel: !!orderData.shippingAddress,
      hasAddress: !!orderData.address,
      hasDeliveryAddress: !!orderData.delivery_address,
      shippingInfoAddress: !!orderData.shipping_information?.address,
      hasStreet: !!orderData.street,
      hasCity: !!orderData.city
    });
  }
  
  // Normalizar billing_address também - API Cubbo retorna como 'billing'
  // Formato: billing { address_1, address_2, city, state, zip_code, country }
  let billingAddress = orderData.billing || orderData.billing_address || orderData.billingAddress;
  if (billingAddress && typeof billingAddress === 'object') {
    // Formato Cubbo usa address_1 e address_2 (com underscore)
    if (billingAddress.address_1 || billingAddress.address_2) {
      const address1Parts = (billingAddress.address_1 || '').split(',').map((s: string) => s.trim());
      billingAddress = {
        street: address1Parts[0] || billingAddress.street || billingAddress.street_name || billingAddress.logradouro || '',
        street_number: address1Parts[1] || billingAddress.number || billingAddress.street_number || billingAddress.streetNumber || '',
        neighborhood: billingAddress.address_2 || billingAddress.neighborhood || billingAddress.neighbourhood || billingAddress.district || billingAddress.bairro || '',
        city: billingAddress.city || billingAddress.cidade || '',
        state: billingAddress.state || billingAddress.province || billingAddress.estado || '',
        zip_code: billingAddress.zip_code || billingAddress.zipCode || billingAddress.postal_code || billingAddress.postalCode || billingAddress.cep || '',
        country: billingAddress.country || billingAddress.pais || billingAddress.country_code || 'Brasil',
        complement: billingAddress.complement || billingAddress.complemento || '',
        reference: billingAddress.reference || billingAddress.referencia || '',
      };
    } else {
      // Formato padrão
      billingAddress = {
        street: billingAddress.street || billingAddress.street_name || billingAddress.logradouro || billingAddress.address_line1 || billingAddress.address1 || '',
        street_number: billingAddress.street_number || billingAddress.streetNumber || billingAddress.number || billingAddress.address_number || '',
        neighborhood: billingAddress.neighborhood || billingAddress.neighbourhood || billingAddress.district || billingAddress.bairro || '',
        city: billingAddress.city || billingAddress.cidade || '',
        state: billingAddress.state || billingAddress.estado || billingAddress.province || '',
        zip_code: billingAddress.zip_code || billingAddress.zipCode || billingAddress.postal_code || billingAddress.postalCode || billingAddress.cep || '',
        country: billingAddress.country || billingAddress.pais || billingAddress.country_code || 'Brasil',
        complement: billingAddress.complement || billingAddress.complemento || billingAddress.address_line2 || '',
        reference: billingAddress.reference || billingAddress.referencia || billingAddress.address_reference || '',
      };
    }
  }
  
  // Normalizar total_amount/total_price - pode vir como string
  let totalAmount = orderData.total_amount || orderData.total_price;
  if (totalAmount !== undefined && totalAmount !== null) {
    totalAmount = typeof totalAmount === 'string' ? parseFloat(totalAmount) : totalAmount;
    if (isNaN(totalAmount)) {
      totalAmount = undefined;
    }
  }
  
  // Normalizar shipping_information
  // API Cubbo retorna delivery_tracking como array: [{ shipping_number, tracking_url, service_id }]
  // Também pode ter return_shipping_labels: [{ shipping_number, tracking_url }]
  // shipping_method: { id, shipping_name, carrier_name, is_cod }
  const deliveryTracking = orderData.delivery_tracking || [];
  const returnLabels = orderData.return_shipping_labels || [];
  const trackingData = deliveryTracking.length > 0 ? deliveryTracking[0] : (returnLabels.length > 0 ? returnLabels[0] : null);
  
  // Construir objeto normalizado preservando todos os campos originais
  const normalizedOrder: any = {
    ...orderData,
    created_at: createdAt,
    updated_at: updatedAt,
    shipped_at: shippedAt,
    delivered_at: deliveredAt,
    items_summary: itemsSummary,
    receipt_url: receiptUrl,
    receipt_image: receiptImage,
    shipping_address: shippingAddress,
    billing_address: billingAddress,
    total_amount: totalAmount,
    // Preservar items/products/order_lines original se existir
    items: items.length > 0 ? items : (orderData.items || orderData.products || orderData.order_lines || undefined),
    // Normalizar shipping_information
    shipping_information: {
      ...orderData.shipping_information,
      tracking_url: trackingData?.tracking_url || orderData.shipping_information?.tracking_url || orderData.tracking_url || orderData.tracking_urls?.[0],
      tracking_number: trackingData?.shipping_number || orderData.shipping_information?.tracking_number || orderData.tracking_number,
      courier: orderData.shipping_method?.carrier_name || orderData.shipping_information?.courier || orderData.courier || orderData.carrier_name,
      email: orderData.shipping?.email || orderData.shipping_information?.email || orderData.shipping_email,
      estimated_time_arrival: orderData.shipping_information?.estimated_time_arrival || orderData.estimated_time_arrival,
    },
  };
  
  // Log final para debug (apenas se estiver faltando dados importantes)
  if (!normalizedOrder.items?.length && !normalizedOrder.items_summary?.length) {
    console.warn('[normalizeOrderData] Pedido sem produtos após normalização:', {
      orderId: normalizedOrder.id || normalizedOrder.order_number,
      normalizedItems: normalizedOrder.items?.length || 0,
      normalizedItemsSummary: normalizedOrder.items_summary?.length || 0
    });
  }
  
  if (!normalizedOrder.shipping_address && !normalizedOrder.pickup_location) {
    console.warn('[normalizeOrderData] Pedido sem endereço após normalização:', {
      orderId: normalizedOrder.id || normalizedOrder.order_number,
      hasShippingAddress: !!normalizedOrder.shipping_address,
      hasPickupLocation: !!normalizedOrder.pickup_location
    });
  }
  
  return normalizedOrder as CubboOrder;
};

// Extrair códigos de pedido do texto
const extractOrderNumbers = (text: string): string[] => {
  const orderNumbers: string[] = [];
  
  // Padrões para códigos de pedido:
  // - R seguido de números (ex: R123456, R595531189-dup)
  // - LP- seguido de números (ex: LP-12345)
  // - Pedido seguido de código (ex: pedido R123)
  // - Padrões similares
  
  const patterns = [
    /\bR\d+[-\w]*/gi, // R123456, R595531189-dup
    /\bLP[-_]?\d+/gi, // LP-12345, LP12345
    /pedido\s+([R\d]+[-\w]*)/gi, // pedido R123456
    /order\s+([R\d]+[-\w]*)/gi, // order R123456
  ];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Limpar espaços e caracteres extras
        const cleaned = match.replace(/^(pedido|order)\s+/i, '').trim();
        if (cleaned && !orderNumbers.includes(cleaned)) {
          orderNumbers.push(cleaned);
        }
      });
    }
  });
  
  return orderNumbers;
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
const getProxyUrl = (): string => {
    // This URL points to your deployed Google Cloud Run service.
    // MAKE SURE THIS URL IS CORRECT
    return 'https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app';
};

const getAccessToken = async (): Promise<string> => {
    const CLOUD_FUNCTION_URL = getProxyUrl();

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
        // Cubbo API returns 'token' instead of 'access_token'
        if (data && (data.access_token || data.token)) {
            return data.access_token || data.token;
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
  getTickets: async (includeArchived: boolean = false): Promise<Ticket[]> => {
    const q = query(ticketsCollection, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const allTickets = snapshot.docs.map(ticketFromFirestore);
    
    // Se não incluir arquivados, filtrar
    if (!includeArchived) {
      return allTickets.filter(ticket => ticket.status !== 'arquivado');
    }
    
    return allTickets;
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
    // Excluir tickets arquivados do cliente
    const activeTickets = combinedTickets.filter(ticket => ticket.status !== 'arquivado');
    activeTickets.sort((a, b) => b.createdAt - a.createdAt);

    return activeTickets;
  },

  createTicket: async (ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'history'>): Promise<string> => {
      // Se orderNumber foi fornecido, buscar pedido para relacionar
      let orderId = ticketData.orderId;
      if (ticketData.orderNumber && !orderId) {
        try {
          const order = await supportService.getOrderDetails(ticketData.orderNumber);
          if (order) {
            orderId = order.id;
          }
        } catch (error) {
          console.error('[createTicket] Erro ao buscar pedido:', error);
        }
      }
      
      const newTicket = {
          ...ticketData,
          orderId: orderId || ticketData.orderId,
          phone: ticketData.phone?.replace(/\D/g, '') || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          history: [{
              timestamp: Date.now(),
              author: 'user',
              type: 'creation',
              content: ticketData.description || 'Ticket criado pelo cliente.'
          }]
      };
      const docRef = await addDoc(ticketsCollection, newTicket);
      const ticketId = docRef.id;
      
      // Enviar email de confirmação ao cliente
      try {
        const orderInfo = ticketData.orderNumber ? ` relacionado ao pedido ${ticketData.orderNumber}` : '';
        const emailHtmlBody = `
          <div style="font-family: sans-serif; line-height: 1.6;">
            <h2>Olá ${ticketData.name},</h2>
            <p>Seu chamado de suporte foi criado com sucesso${orderInfo}!</p>
            <div style="background-color: #f4f4f4; border-left: 4px solid #3498db; padding: 15px; margin: 20px 0;">
              <p><strong>ID do Chamado:</strong> #${ticketId.substring(0, 6)}</p>
              <p><strong>Assunto:</strong> ${ticketData.subject}</p>
              <p><strong>Status:</strong> Aberto</p>
            </div>
            <p>Nossa equipe entrará em contato em breve para resolver sua questão.</p>
            <p>Atenciosamente,<br>Equipe Lojinha Prio by Yoobe</p>
          </div>`;
        
        await supportService.sendTicketReplyEmail({
          to: ticketData.email,
          subject: `Chamado de Suporte Criado - #${ticketId.substring(0, 6)}`,
          htmlBody: emailHtmlBody
        });
      } catch (emailError) {
        console.error('[createTicket] Erro ao enviar email de confirmação:', emailError);
        // Não falhar a criação do ticket se o email falhar
      }
      
      return ticketId;
  },

  updateTicket: async (id: string, data: Partial<Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'history'>>) => {
    const ticketDoc = doc(db, 'tickets', id);
    const ticketSnapshot = await getDoc(ticketDoc);
    
    if (!ticketSnapshot.exists()) {
      throw new Error('Ticket não encontrado');
    }
    
    const ticketData = ticketSnapshot.data() as Ticket;
    const oldStatus = ticketData.status;
    const dataToUpdate: Record<string, any> = { ...data, updatedAt: serverTimestamp() };

    if (data.status && oldStatus !== data.status) {
        const newHistoryItem = {
            content: `Status alterado para: ${data.status.replace('_', ' ')}`,
            author: 'admin',
            timestamp: Date.now(),
            type: 'status_change'
        };
        dataToUpdate.history = arrayUnion(newHistoryItem);
    }
    
    await updateDoc(ticketDoc, dataToUpdate);
    
    // Enviar email ao cliente sobre mudança de status (se houver mudança)
    if (data.status && oldStatus !== data.status && ticketData.email) {
      try {
        const statusMap: Record<string, string> = {
          'aberto': 'Aberto',
          'em_andamento': 'Em Andamento',
          'resolvido': 'Resolvido',
          'fechado': 'Fechado'
        };
        
        const statusText = statusMap[data.status] || data.status;
        const emailHtmlBody = `
          <div style="font-family: sans-serif; line-height: 1.6;">
            <h2>Olá ${ticketData.name},</h2>
            <p>O status do seu chamado de suporte foi atualizado.</p>
            <div style="background-color: #f4f4f4; border-left: 4px solid #3498db; padding: 15px; margin: 20px 0;">
              <p><strong>ID do Chamado:</strong> #${id.substring(0, 6)}</p>
              <p><strong>Assunto:</strong> ${ticketData.subject}</p>
              <p><strong>Novo Status:</strong> ${statusText}</p>
            </div>
            <p>Você pode acompanhar o progresso do seu chamado em nosso portal de suporte.</p>
            <p>Atenciosamente,<br>Equipe Lojinha Prio by Yoobe</p>
          </div>`;
        
        await supportService.sendTicketReplyEmail({
          to: ticketData.email,
          subject: `Atualização do Chamado #${id.substring(0, 6)} - Status: ${statusText}`,
          htmlBody: emailHtmlBody
        });
      } catch (emailError) {
        console.error('[updateTicket] Erro ao enviar email de atualização:', emailError);
        // Não falhar a atualização se o email falhar
      }
    }
  },

  addTicketReply: async (id: string, reply: { content: string; author: 'admin' | 'user' }) => {
    const ticketDoc = doc(db, 'tickets', id);
    const newHistoryItem = { ...reply, timestamp: Date.now(), type: 'comment' };
    await updateDoc(ticketDoc, { history: arrayUnion(newHistoryItem), updatedAt: serverTimestamp() });
  },

  archiveTicket: async (id: string) => {
    const ticketDoc = doc(db, 'tickets', id);
    const ticketSnapshot = await getDoc(ticketDoc);
    
    if (!ticketSnapshot.exists()) {
      throw new Error('Ticket não encontrado');
    }
    
    const ticketData = ticketSnapshot.data() as Ticket;
    
    // Não arquivar se já estiver arquivado
    if (ticketData.status === 'arquivado') {
      return;
    }
    
    const newHistoryItem = {
        content: `Ticket arquivado. Status anterior: ${ticketData.status.replace('_', ' ')}`,
        author: 'admin',
        timestamp: Date.now(),
        type: 'status_change'
    };
    
    await updateDoc(ticketDoc, { 
      status: 'arquivado', 
      history: arrayUnion(newHistoryItem), 
      updatedAt: serverTimestamp() 
    });
  },

  unarchiveTicket: async (id: string) => {
    const ticketDoc = doc(db, 'tickets', id);
    const ticketSnapshot = await getDoc(ticketDoc);
    
    if (!ticketSnapshot.exists()) {
      throw new Error('Ticket não encontrado');
    }
    
    const ticketData = ticketSnapshot.data() as Ticket;
    
    // Não reativar se não estiver arquivado
    if (ticketData.status !== 'arquivado') {
      return;
    }
    
    // Tentar restaurar status anterior do histórico
    let previousStatus: TicketStatus = 'aberto';
    const statusHistory = ticketData.history
      .filter(item => item.type === 'status_change')
      .sort((a, b) => b.timestamp - a.timestamp);
    
    // Procurar por entrada que menciona "Status anterior"
    for (const item of statusHistory) {
      const match = item.content.match(/Status anterior: (.+)/);
      if (match) {
        const statusText = match[1].trim();
        // Mapear texto para status
        if (statusText.includes('aberto')) previousStatus = 'aberto';
        else if (statusText.includes('andamento')) previousStatus = 'em_andamento';
        else if (statusText.includes('resolvido')) previousStatus = 'resolvido';
        else if (statusText.includes('fechado')) previousStatus = 'fechado';
        break;
      }
    }
    
    // Se não encontrou status anterior, procurar último status antes de arquivar
    if (previousStatus === 'aberto') {
      // Buscar último status válido antes do arquivamento
      for (let i = statusHistory.length - 1; i >= 0; i--) {
        const content = statusHistory[i].content.toLowerCase();
        if (content.includes('status alterado para')) {
          if (content.includes('aberto')) previousStatus = 'aberto';
          else if (content.includes('andamento')) previousStatus = 'em_andamento';
          else if (content.includes('resolvido')) previousStatus = 'resolvido';
          else if (content.includes('fechado')) previousStatus = 'fechado';
          break;
        }
      }
    }
    
    const newHistoryItem = {
        content: `Ticket reativado. Status restaurado para: ${previousStatus.replace('_', ' ')}`,
        author: 'admin',
        timestamp: Date.now(),
        type: 'status_change'
    };
    
    await updateDoc(ticketDoc, { 
      status: previousStatus, 
      history: arrayUnion(newHistoryItem), 
      updatedAt: serverTimestamp() 
    });
  },

  updateTicketStatus: async (id: string, status: TicketStatus) => {
    const ticketDoc = doc(db, 'tickets', id);
    const ticketSnapshot = await getDoc(ticketDoc);
    
    if (!ticketSnapshot.exists()) {
      throw new Error('Ticket não encontrado');
    }
    
    const ticketData = ticketSnapshot.data() as Ticket;
    const oldStatus = ticketData.status;
    
    const newHistoryItem = {
        content: `Status alterado para: ${status.replace('_', ' ')}`,
        author: 'admin',
        timestamp: Date.now(),
        type: 'status_change'
    };
    await updateDoc(ticketDoc, { status: status, history: arrayUnion(newHistoryItem), updatedAt: serverTimestamp() });
    
    // Enviar email ao cliente sobre mudança de status
    if (oldStatus !== status && ticketData.email) {
      try {
        const statusMap: Record<string, string> = {
          'aberto': 'Aberto',
          'em_andamento': 'Em Andamento',
          'resolvido': 'Resolvido',
          'fechado': 'Fechado'
        };
        
        const statusText = statusMap[status] || status;
        const emailHtmlBody = `
          <div style="font-family: sans-serif; line-height: 1.6;">
            <h2>Olá ${ticketData.name},</h2>
            <p>O status do seu chamado de suporte foi atualizado.</p>
            <div style="background-color: #f4f4f4; border-left: 4px solid #3498db; padding: 15px; margin: 20px 0;">
              <p><strong>ID do Chamado:</strong> #${id.substring(0, 6)}</p>
              <p><strong>Assunto:</strong> ${ticketData.subject}</p>
              <p><strong>Novo Status:</strong> ${statusText}</p>
            </div>
            <p>Você pode acompanhar o progresso do seu chamado em nosso portal de suporte.</p>
            <p>Atenciosamente,<br>Equipe Lojinha Prio by Yoobe</p>
          </div>`;
        
        await supportService.sendTicketReplyEmail({
          to: ticketData.email,
          subject: `Atualização do Chamado #${id.substring(0, 6)} - Status: ${statusText}`,
          htmlBody: emailHtmlBody
        });
      } catch (emailError) {
        console.error('[updateTicketStatus] Erro ao enviar email de atualização:', emailError);
        // Não falhar a atualização se o email falhar
      }
    }
  },

  // Postmark Email Service
  sendTicketReplyEmail: async (emailData: { to: string, subject: string, htmlBody: string }): Promise<{ success: boolean; error?: string }> => {
    // URL do proxy de email Postmark deployado no Google Cloud Run
    // Configure via variável de ambiente VITE_POSTMARK_PROXY_URL no .env.local ou no Cloud Run
    const EMAIL_PROXY_URL = ((import.meta as any).env?.VITE_POSTMARK_PROXY_URL as string) || 'https://postmark-email-proxy-409489811769.southamerica-east1.run.app'; 

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

  trackOrder: async (orderIdOrEmail: string, customerEmail?: string): Promise<{ status: string; details: string; order?: CubboOrder; orders?: CubboOrder[] }> => {
    let accessToken: string;
    let config: ApiConfig | null;

    try {
        config = await getCubboConfig();
        if (!config) { 
            console.error("[trackOrder] Configuração da API Cubbo não encontrada no Firestore");
            return { status: 'Erro de Configuração', details: 'A API de rastreamento não está configurada. Configure a integração no painel administrativo (Treinamento > Configurações de API).' };
        }
        
        // Log removido para melhor performance
        
        if (!config.storeId || config.storeId.trim() === '') {
            console.error("[trackOrder] store_id não configurado ou vazio:", config.storeId);
            return { 
                status: 'Erro de Configuração', 
                details: 'O Store ID não está configurado. Por favor, configure o ID da loja no painel administrativo: Treinamento > Configurações de API > Editar configuração da Cubbo > Store ID.' 
            };
        }
        accessToken = await getAccessToken();
    } catch (error: any) {
        console.error("Authentication failed in trackOrder:", error);
        return { status: 'Erro de Autenticação', details: `Não foi possível autenticar com a API de pedidos. Detalhe: ${error.message}` };
    }

    // Limpar o código do pedido removendo caracteres especiais (#, espaços, etc.)
    const cleanOrderIdOrEmail = orderIdOrEmail.trim().replace(/^#+/, '').trim();
    
    // Determinar se é código de pedido ou email
    const isEmail = cleanOrderIdOrEmail.includes('@');
    // Se não for email, é código de pedido - usar customerEmail fornecido para validação
    // Se customerEmail não foi fornecido, não podemos validar (mas ainda podemos buscar o pedido)
    const searchEmail = isEmail ? cleanOrderIdOrEmail : (customerEmail || undefined);
    const orderId = isEmail ? undefined : cleanOrderIdOrEmail;

    // Se for email, buscar todos os pedidos do cliente
    if (isEmail || (!orderId && searchEmail)) {
        try {
            const orders = await supportService.findOrdersByCustomer({
                email: searchEmail || null,
                phone: null
            });
            
            if (orders.length === 0) {
                return { 
                    status: 'Não encontrado', 
                    details: `Nenhum pedido encontrado para o email ${searchEmail}. Verifique se o email está correto.` 
                };
            }
            
            // Formatar detalhes de todos os pedidos
            const details = orders.map(order => {
                // Garantir que created_at existe e é válido
                let formattedDate = 'Data não disponível';
                if (order.created_at) {
                    try {
                        const date = new Date(order.created_at);
                        if (!isNaN(date.getTime())) {
                            formattedDate = date.toLocaleDateString('pt-BR', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: 'numeric' 
                            });
                        }
                    } catch (e) {
                        console.warn('[trackOrder] Erro ao formatar data:', order.created_at, e);
                    }
                }
                
                const statusMap: Record<string, string> = {
                    'pending': 'Pendente',
                    'processing': 'Processando',
                    'shipped': 'Enviado',
                    'delivered': 'Entregue',
                    'cancelled': 'Cancelado',
                    'refunded': 'Reembolsado'
                };
                
                const statusText = statusMap[order.status.toLowerCase()] || order.status;
                let orderDetails = `📦 Pedido ${order.order_number} - Status: ${statusText} - Data: ${formattedDate}`;
                
                // Adicionar endereço de entrega ou local de coleta
                if (order.pickup_location) {
                    orderDetails += `\n📍 Local de Coleta: ${order.pickup_location.service_name}`;
                } else if (order.shipping_address) {
                    const addr = order.shipping_address;
                    const addressParts: string[] = [];
                    if (addr.street) {
                        addressParts.push(addr.street);
                        if (addr.street_number) addressParts.push(addr.street_number);
                    }
                    if (addressParts.length > 0) {
                        orderDetails += `\n🏠 Endereço: ${addressParts.join(', ')}`;
                        if (addr.neighborhood) orderDetails += `, ${addr.neighborhood}`;
                        const cityState: string[] = [];
                        if (addr.city) cityState.push(addr.city);
                        if (addr.state) cityState.push(addr.state);
                        if (cityState.length > 0) orderDetails += ` - ${cityState.join(' - ')}`;
                        if (addr.zip_code) orderDetails += ` - CEP: ${addr.zip_code}`;
                    }
                }
                
                if (order.shipping_information?.tracking_url) {
                    orderDetails += `\n📍 Rastreio: ${order.shipping_information.tracking_url}`;
                } else if (order.shipping_information?.tracking_number) {
                    orderDetails += `\n📍 Código de rastreio: ${order.shipping_information.tracking_number}`;
                }
                
                if (order.shipping_information?.courier) {
                    orderDetails += `\n🚚 Transportadora: ${order.shipping_information.courier}`;
                }
                
                return orderDetails;
            }).join('\n\n');
            
            return {
                status: 'Encontrado',
                details: `Encontrei ${orders.length} pedido(s) para ${searchEmail}:\n\n${details}`,
                orders: orders
            };
        } catch (error: any) {
            console.error("Error finding orders by email:", error);
            return { 
                status: 'Erro', 
                details: `Erro ao buscar pedidos: ${error.message}` 
            };
        }
    }

    // Se for código de pedido, buscar pedido específico e validar email
    if (!orderId) {
        return { status: 'Erro', details: 'É necessário informar o código do pedido ou o email.' };
    }

    try {
        // Usar o proxy para evitar problemas de CORS
        const proxyUrl = getProxyUrl();
        
        // store_id é obrigatório na API Cubbo - sempre adicionar como query parameter
        if (!config.storeId) {
            return { 
                status: 'Erro de Configuração', 
                details: 'O store_id não está configurado. Configure o ID da loja nas configurações da API Cubbo no painel administrativo.' 
            };
        }
        
        // Limpar orderId de caracteres especiais que podem causar problemas na URL
        const cleanOrderId = orderId.replace(/[#\s]/g, '').trim();
        
        if (!cleanOrderId) {
            return { status: 'Erro', details: 'Código do pedido inválido após limpeza.' };
        }
        
        // API Cubbo busca por order_number usando query parameter, não path parameter
        // Formato correto: /api/orders?store_id=X&order_number=Y
        const queryParams = `?store_id=${encodeURIComponent(config.storeId)}&order_number=${encodeURIComponent(cleanOrderId)}`;
        const requestUrl = `${proxyUrl}/api/orders${queryParams}`;
        
        // Log reduzido para melhor performance
        console.log(`[trackOrder] Buscando pedido: ${cleanOrderId}`);
        
        let response: Response;
        try {
            response = await fetch(requestUrl, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                mode: 'cors'
            });
        } catch (fetchError: any) {
            // Captura erros de rede/CORS especificamente
            const errorMessage = fetchError.message || String(fetchError);
            console.error(`[trackOrder] Erro de rede ao fazer fetch:`, fetchError);
            
            if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('CORS')) {
                return { 
                    status: 'Erro de Conexão', 
                    details: `Não foi possível conectar ao proxy da API Cubbo. Verifique se o proxy está funcionando. URL tentada: ${requestUrl}` 
                };
            }
            throw fetchError;
        }
        
        if (response.status === 404) {
            // Se 404, retornar mensagem apropriada
            return { status: 'Não encontrado', details: `O pedido "${cleanOrderId}" não foi encontrado. Verifique se o código do pedido está correto.` };
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { error: errorText };
            }
            throw new Error(`API da Cubbo retornou status ${response.status}: ${errorData.error || errorData.details || errorText}`);
        }
        
        const responseData = await response.json();
        // Log reduzido para melhor performance (apenas resumo)
        console.log('[trackOrder] Resposta recebida:', { 
            hasOrders: !!responseData.orders, 
            ordersCount: responseData.orders?.length || 0,
            hasOrder: !!responseData.order 
        });
        
        // A API retorna { orders: [...] } quando busca por order_number
        // Precisamos pegar o primeiro pedido da lista
        let rawOrder;
        if (responseData.orders && Array.isArray(responseData.orders) && responseData.orders.length > 0) {
            rawOrder = responseData.orders[0]; // Pegar o primeiro pedido
        } else if (responseData.order) {
            rawOrder = responseData.order;
        } else if (responseData.id || responseData.order_number) {
            // Se retornou diretamente o pedido
            rawOrder = responseData;
        } else {
            console.warn('[trackOrder] Formato de resposta inesperado');
            return { status: 'Não encontrado', details: `O pedido "${cleanOrderId}" não foi encontrado na resposta da API.` };
        }
        
        // Normalizar dados do pedido
        const order: CubboOrder = normalizeOrderData(rawOrder);
        
        // VALIDAÇÃO DE EMAIL (OPCIONAL): Se email foi fornecido, validar que o pedido pertence ao cliente
        // Mas se não houver email, ainda assim retornar o pedido (admin pode buscar sem validação)
        if (searchEmail) {
            // Verificar tanto customer_email quanto shipping_email (a API pode usar qualquer um)
            const orderEmail = (order.customer_email || order.shipping_email || (order as any).shipping_information?.email || '').toLowerCase().trim();
            const providedEmail = searchEmail.toLowerCase().trim();
            
            if (orderEmail && orderEmail !== providedEmail) {
                // Email fornecido não corresponde ao email do pedido
                return { 
                    status: 'Não autorizado', 
                    details: `O pedido ${orderId} não está associado ao email ${searchEmail}. Verifique se o código do pedido e o email estão corretos.` 
                };
            }
            
            // Se email foi fornecido mas o pedido não tem email cadastrado, buscar pedidos do cliente para validar
            if (!orderEmail) {
                // Buscar pedidos do cliente para verificar se este pedido está na lista
                const customerOrders = await supportService.findOrdersByCustomer({
                    email: searchEmail,
                    phone: null
                });
                
                const orderExists = customerOrders.some(o => 
                    o.id === order.id || 
                    o.order_number === order.order_number ||
                    o.order_number === orderId
                );
                
                if (!orderExists) {
                    return { 
                        status: 'Não autorizado', 
                        details: `O pedido ${orderId} não está associado ao email ${searchEmail}. Verifique se o código do pedido e o email estão corretos.` 
                    };
                }
            }
        }
        // Se não houver email fornecido, retornar o pedido sem validação (útil para admin)
        
        // Helper function local para evitar referência circular
        const formatOrderDetails = (order: CubboOrder): string => {
            // Garantir que created_at existe e é válido
            let formattedDate = 'Data não disponível';
            if (order.created_at) {
                try {
                    const date = new Date(order.created_at);
                    if (!isNaN(date.getTime())) {
                        formattedDate = date.toLocaleDateString('pt-BR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                        });
                    }
                } catch (e) {
                    console.warn('[formatOrderDetails-local] Erro ao formatar data:', order.created_at, e);
                }
            }
            
            const statusMap: Record<string, string> = {
              'pending': 'Pendente',
              'processing': 'Processando',
              'shipped': 'Enviado',
              'delivered': 'Entregue',
              'cancelled': 'Cancelado',
              'refunded': 'Reembolsado'
            };
            
            const statusText = statusMap[order.status.toLowerCase()] || order.status;
            const itemsText = order.items_summary && order.items_summary.length > 0 
              ? order.items_summary.join(', ') 
              : 'Produtos não especificados';
            
            let details = `📦 Pedido ${order.order_number}\n`;
            details += `Status: ${statusText}\n`;
            details += `Data: ${formattedDate}\n`;
            details += `Produtos: ${itemsText}\n`;
            
            // Adicionar valor total se disponível
            if (order.total_amount !== undefined) {
                const currency = order.currency || 'BRL';
                const currencySymbol = currency === 'BRL' ? 'R$' : currency;
                details += `💰 Valor Total: ${currencySymbol} ${order.total_amount.toFixed(2)}\n`;
            }
            
            // Adicionar método de pagamento se disponível
            if (order.payment_method) {
                details += `💳 Pagamento: ${order.payment_method}\n`;
            }
            
            // Informações de entrega ou coleta
            if (order.pickup_location) {
                details += `\n📍 Local de Coleta (Click and Collect):\n`;
                details += `${order.pickup_location.service_name}\n`;
                details += `${order.pickup_location.description || order.pickup_location.source}\n`;
                if (order.pickup_location.distance) {
                    details += `Distância: ${order.pickup_location.distance}\n`;
                }
            } else if (order.shipping_address) {
                details += `\n🏠 Endereço de Entrega:\n`;
                const addr = order.shipping_address;
                const addressParts: string[] = [];
                if (addr.street) {
                    addressParts.push(addr.street);
                    if (addr.street_number) addressParts.push(addr.street_number);
                }
                if (addressParts.length > 0) {
                    details += addressParts.join(', ') + '\n';
                }
                if (addr.neighborhood) details += `${addr.neighborhood}\n`;
                const cityState: string[] = [];
                if (addr.city) cityState.push(addr.city);
                if (addr.state) cityState.push(addr.state);
                if (cityState.length > 0) details += cityState.join(' - ') + '\n';
                if (addr.zip_code) details += `CEP: ${addr.zip_code}\n`;
                if (addr.country) details += `${addr.country}\n`;
                if (addr.complement) details += `Complemento: ${addr.complement}\n`;
                if (addr.reference) details += `Referência: ${addr.reference}\n`;
            }
            
            // Informações de rastreio
            if (order.shipping_information?.tracking_url) {
              details += `\n📍 Rastreio: ${order.shipping_information.tracking_url}\n`;
            } else if (order.shipping_information?.tracking_number) {
              details += `\n📍 Código de rastreio: ${order.shipping_information.tracking_number}\n`;
            }
            
            if (order.shipping_information?.courier) {
              details += `🚚 Transportadora: ${order.shipping_information.courier}\n`;
            }
            
            // Tempo estimado de entrega
            if (order.shipping_information?.estimated_time_arrival) {
                details += `⏱️ Tempo estimado de entrega: ${order.shipping_information.estimated_time_arrival}\n`;
            }
            
            return details;
        };
        return {
            status: order.status,
            details: formatOrderDetails(order),
            order
        };
    } catch (error: any) {
        console.error("Error tracking order:", error);
        const errorMessage = error?.message || String(error);
        
        // Fornecer mensagem mais específica baseada no tipo de erro
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
            return { 
                status: 'Erro de Conexão', 
                details: 'Não foi possível conectar à API da Cubbo. Verifique sua conexão com a internet e se a API está acessível. Se o problema persistir, pode ser necessário configurar um proxy para as chamadas de API.' 
            };
        }
        
        return { 
            status: 'Erro', 
            details: `Não foi possível buscar as informações do pedido: ${errorMessage}` 
        };
    }
  },
  
  findOrdersByCustomer: async (user: { email?: string | null; phone?: string | null }): Promise<CubboOrder[]> => {
    let accessToken: string;
    let config: ApiConfig | null;

    try {
        config = await getCubboConfig();
        if (!config) return [];
        
        if (!config.storeId) {
            console.error("[findOrdersByCustomer] store_id não configurado");
            return [];
        } 
        accessToken = await getAccessToken();
    } catch (error: any) {
        console.error("Authentication failed in findOrdersByCustomer:", error);
        return []; // Silently fail and return no orders.
    }
    
    let queryParams: string[] = [];
    
    // Adicionar store_id primeiro (obrigatório)
    if (config.storeId) {
        queryParams.push(`store_id=${encodeURIComponent(config.storeId)}`);
    }
    
    // Usar shipping_email ao invés de customer_email (conforme documentação da API Cubbo)
    if (user.email) {
        queryParams.push(`shipping_email=${encodeURIComponent(user.email)}`);
    } else if (user.phone) {
        const sanitizedPhone = user.phone.replace(/\D/g, '');
        queryParams.push(`customer_phone=${sanitizedPhone}`);
    } else {
        return [];
    }
    
    // Adicionar parâmetros de paginação e ordenação (opcionais, mas recomendados)
    queryParams.push(`per_page=100`);
    queryParams.push(`page=1`);
    queryParams.push(`sort=desc`);
    queryParams.push(`sort_by=created_at`);

    try {
        // Usar o proxy para evitar problemas de CORS
        const proxyUrl = getProxyUrl();
        
        const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
        const requestUrl = `${proxyUrl}/api/orders${queryString}`;
        console.log(`[findOrdersByCustomer] Fazendo requisição via proxy para: ${requestUrl}`, { 
            storeId: config.storeId,
            email: user.email,
            phone: user.phone 
        });
        
        let response: Response;
        try {
            response = await fetch(requestUrl, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                mode: 'cors'
            });
        } catch (fetchError: any) {
            // Captura erros de rede/CORS especificamente
            const errorMessage = fetchError.message || String(fetchError);
            console.error(`[findOrdersByCustomer] Erro de rede ao fazer fetch:`, fetchError);
            
            if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('CORS')) {
                // Lançar erro para ser capturado pelo catch externo e retornar array vazio com log
                throw new Error(`CORS/Network Error: Não foi possível conectar ao proxy da API Cubbo. URL: ${requestUrl}`);
            }
            throw fetchError;
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { error: errorText };
            }
            console.error(`API Cubbo retornou status ${response.status}:`, errorData);
            throw new Error(`Falha ao buscar pedidos: ${response.status} - ${errorData.error || errorData.details || errorText}`);
        }
        
        const data = await response.json();
        // Log reduzido para melhor performance
        console.log('[findOrdersByCustomer] Resposta recebida:', { 
            ordersCount: Array.isArray(data) ? data.length : (data.orders?.length || data.data?.length || 0)
        });
        
        // A API Cubbo pode retornar:
        // - Um array diretamente
        // - Um objeto com 'orders' contendo o array
        // - Um objeto com 'data' contendo o array
        let orders: any[] = [];
        if (Array.isArray(data)) {
            orders = data;
        } else {
            orders = data.orders || data.data || data.results || [];
        }
        
        // Normalizar dados de cada pedido
        return orders.map(normalizeOrderData);
    } catch (error: any) {
        const errorMessage = error?.message || String(error);
        console.error("Failed to find orders by customer:", error);
        
        // Log mais detalhado para diagnóstico
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('CORS')) {
            console.error(`[findOrdersByCustomer] Erro de conexão detectado. Isso pode indicar problema de CORS ou API inacessível.`, {
                error: errorMessage,
                configUrl: config?.url,
                queryParams
            });
        }
        
        return [];
    }
  },

  // Buscar locais de coleta disponíveis (Click and Collect)
  getPickupLocations: async (postalCode: string): Promise<PickupLocation[]> => {
    let accessToken: string;
    let config: ApiConfig | null;

    try {
        config = await getCubboConfig();
        if (!config) {
            console.error("[getPickupLocations] Configuração da API Cubbo não encontrada");
            return [];
        }
        accessToken = await getAccessToken();
    } catch (error: any) {
        console.error("Authentication failed in getPickupLocations:", error);
        return [];
    }

    try {
        const proxyUrl = getProxyUrl();
        const requestUrl = `${proxyUrl}/api/carrier-services/pickup-locations?postal_code=${encodeURIComponent(postalCode)}`;
        
        console.log(`[getPickupLocations] Fazendo requisição para: ${requestUrl}`);
        
        const response = await fetch(requestUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors'
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[getPickupLocations] Erro na API: ${response.status} - ${errorText}`);
            return [];
        }

        const data = await response.json();
        // A API retorna { rates: [...] }
        return data.rates || data || [];
    } catch (error: any) {
        console.error("Failed to get pickup locations:", error);
        return [];
    }
  },

  // Buscar detalhes completos de um pedido específico
  getOrderDetails: async (orderId: string): Promise<CubboOrder | null> => {
    let accessToken: string;
    let config: ApiConfig | null;

    try {
        config = await getCubboConfig();
        if (!config) {
            console.error("[getOrderDetails] Configuração da API Cubbo não encontrada");
            return null;
        }
        
        if (!config.storeId || config.storeId.trim() === '') {
            console.error("[getOrderDetails] store_id não configurado");
            return null;
        }
        accessToken = await getAccessToken();
    } catch (error: any) {
        console.error("Authentication failed in getOrderDetails:", error);
        return null;
    }

    try {
        const proxyUrl = getProxyUrl();
        // API Cubbo busca por order_number usando query parameter, não path parameter
        // Formato: /api/orders?store_id=X&order_number=Y
        // Limpar orderId de caracteres especiais
        const cleanOrderId = orderId.replace(/[#\s]/g, '').trim();
        const queryParams = `?store_id=${encodeURIComponent(config.storeId)}&order_number=${encodeURIComponent(cleanOrderId)}`;
        const requestUrl = `${proxyUrl}/api/orders${queryParams}`;
        
        console.log(`[getOrderDetails] Fazendo requisição para: ${requestUrl}`);
        
        const response = await fetch(requestUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors'
        });

        if (response.status === 404) {
            console.log(`[getOrderDetails] Pedido ${cleanOrderId} não encontrado (404)`);
            return null;
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[getOrderDetails] Erro na API: ${response.status} - ${errorText}`);
            return null;
        }

        const responseData = await response.json();
        
        // A API retorna { orders: [...] } quando busca por order_number
        // Precisamos pegar o primeiro pedido da lista
        let orderData;
        if (responseData.orders && Array.isArray(responseData.orders) && responseData.orders.length > 0) {
            orderData = responseData.orders[0]; // Pegar o primeiro pedido
            console.log(`[getOrderDetails] Pedido encontrado na lista (${responseData.orders.length} pedido(s))`);
        } else if (responseData.order) {
            orderData = responseData.order;
        } else if (responseData.id || responseData.order_number) {
            // Se retornou diretamente o pedido
            orderData = responseData;
        } else {
            console.warn('[getOrderDetails] Formato de resposta inesperado:', responseData);
            return null;
        }

        console.log('[getOrderDetails] Resposta da API completa:', JSON.stringify(responseData, null, 2));
        
        // orderData já foi extraído acima da lista de orders
        const rawOrder = orderData;
        console.log('[getOrderDetails] Raw order antes da normalização:', {
          hasOrderLines: !!rawOrder.order_lines,
          hasItems: !!rawOrder.items,
          hasProducts: !!rawOrder.products,
          itemsLength: rawOrder.order_lines?.length || rawOrder.items?.length || rawOrder.products?.length || 0,
          hasItemsSummary: !!rawOrder.items_summary,
          itemsSummaryLength: rawOrder.items_summary?.length || 0,
          hasShippingAddress: !!rawOrder.shipping_address,
          hasShipping: !!rawOrder.shipping,
          shippingAddressKeys: rawOrder.shipping_address ? Object.keys(rawOrder.shipping_address) : [],
          shippingKeys: rawOrder.shipping ? Object.keys(rawOrder.shipping) : [],
          hasDeliveryTracking: !!rawOrder.delivery_tracking,
          hasShippingMethod: !!rawOrder.shipping_method,
          allKeys: Object.keys(rawOrder)
        });
        
        // Normalizar dados do pedido
        const normalizedOrder = normalizeOrderData(rawOrder);
        
        console.log('[getOrderDetails] Order após normalização:', {
          hasItems: !!normalizedOrder.items,
          itemsLength: normalizedOrder.items?.length || 0,
          hasItemsSummary: !!normalizedOrder.items_summary,
          itemsSummaryLength: normalizedOrder.items_summary?.length || 0,
          hasShippingAddress: !!normalizedOrder.shipping_address,
          shippingAddressKeys: normalizedOrder.shipping_address ? Object.keys(normalizedOrder.shipping_address) : [],
          hasShippedAt: !!normalizedOrder.shipped_at
        });
        
        return normalizedOrder;
    } catch (error: any) {
        console.error("Failed to get order details:", error);
        return null;
    }
  },

  extractOrderNumbers,

  formatOrderDetails: (order: CubboOrder): string => {
    // Garantir que created_at existe e é válido
    let formattedDate = 'Data não disponível';
    if (order.created_at) {
        try {
            const date = new Date(order.created_at);
            if (!isNaN(date.getTime())) {
                formattedDate = date.toLocaleDateString('pt-BR', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                });
            }
        } catch (e) {
            console.warn('[formatOrderDetails] Erro ao formatar data:', order.created_at, e);
        }
    }
    
    const statusMap: Record<string, string> = {
      'pending': 'Pendente',
      'processing': 'Processando',
      'shipped': 'Enviado',
      'delivered': 'Entregue',
      'cancelled': 'Cancelado',
      'refunded': 'Reembolsado'
    };
    
    const statusText = statusMap[order.status.toLowerCase()] || order.status;
    
    // Formatar produtos
    let itemsText = 'Produtos não especificados';
    if (order.items && order.items.length > 0) {
        itemsText = order.items.map(item => {
            const qty = item.quantity > 1 ? ` (${item.quantity}x)` : '';
            const price = item.price ? ` - R$ ${item.price.toFixed(2)}` : '';
            return `${item.name || item.sku}${qty}${price}`;
        }).join(', ');
    } else if (order.items_summary && order.items_summary.length > 0) {
        itemsText = order.items_summary.join(', ');
    }
    
    let details = `📦 Pedido ${order.order_number}\n`;
    details += `Status: ${statusText}\n`;
    details += `Data do pedido: ${formattedDate}\n`;
    
    // Adicionar data de atualização se disponível
    if (order.updated_at) {
        try {
            const updatedDate = new Date(order.updated_at);
            if (!isNaN(updatedDate.getTime())) {
                const formattedUpdatedDate = updatedDate.toLocaleDateString('pt-BR', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                details += `Última atualização: ${formattedUpdatedDate}\n`;
            }
        } catch (e) {
            console.warn('[formatOrderDetails] Erro ao formatar updated_at:', order.updated_at, e);
        }
    }
    
    details += `\n🛍️ Produtos:\n${itemsText}\n`;
    
    // Adicionar valor total se disponível
    if (order.total_amount !== undefined) {
        const currency = order.currency || 'BRL';
        const currencySymbol = currency === 'BRL' ? 'R$' : currency;
        details += `\n💰 Valor total: ${currencySymbol} ${order.total_amount.toFixed(2)}\n`;
    }
    
    // Adicionar método de pagamento se disponível
    if (order.payment_method) {
        details += `💳 Pagamento: ${order.payment_method}\n`;
    }
    
    // Informações de entrega ou coleta
    if (order.pickup_location) {
        details += `\n📍 Local de Coleta (Click and Collect):\n`;
        details += `${order.pickup_location.service_name}\n`;
        details += `${order.pickup_location.description || order.pickup_location.source}\n`;
        if (order.pickup_location.distance) {
            details += `Distância: ${order.pickup_location.distance}\n`;
        }
    } else if (order.shipping_address) {
        details += `\n🏠 Endereço de Entrega:\n`;
        const addr = order.shipping_address;
        const addressParts: string[] = [];
        if (addr.street) {
            addressParts.push(addr.street);
            if (addr.street_number) addressParts.push(addr.street_number);
        }
        if (addressParts.length > 0) {
            details += addressParts.join(', ') + '\n';
        }
        if (addr.neighborhood) details += `${addr.neighborhood}\n`;
        const cityState: string[] = [];
        if (addr.city) cityState.push(addr.city);
        if (addr.state) cityState.push(addr.state);
        if (cityState.length > 0) details += cityState.join(' - ') + '\n';
        if (addr.zip_code) details += `CEP: ${addr.zip_code}\n`;
        if (addr.country) details += `${addr.country}\n`;
        if (addr.complement) details += `Complemento: ${addr.complement}\n`;
    }
    
    // Informações de rastreio
    if (order.shipping_information?.tracking_url) {
      details += `\n📍 Rastreio: ${order.shipping_information.tracking_url}\n`;
    } else if (order.shipping_information?.tracking_number) {
      details += `\n📍 Código de rastreio: ${order.shipping_information.tracking_number}\n`;
    }
    
    if (order.shipping_information?.courier) {
      details += `🚚 Transportadora: ${order.shipping_information.courier}\n`;
    }
    
    // Tempo estimado de entrega
    if (order.shipping_information?.estimated_time_arrival) {
        details += `⏱️ Tempo estimado de entrega: ${order.shipping_information.estimated_time_arrival}\n`;
    }
    
    return details;
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

  getTicketFormConfig: (subject: TicketSubject): TicketFormConfig => {
    return getTicketFormConfig(subject);
  },
};