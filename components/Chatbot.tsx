// Fix: Implement the Chatbot component.
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, MessageSender, ConversationMessage, CubboOrder } from '../types';
import { getGeminiResponse, searchIntelligentFAQ } from '../services/geminiService';
import { supportService } from '../services/supportService';
import { conversationService } from '../services/conversationService';
import { companyService } from '../services/companyService';
import { userService } from '../services/userService';
import { MessageIcon, CloseIcon, SendIcon, UserIcon, BotIcon } from './Icons';
import { ExchangeForm } from './ExchangeForm';
import { SupportTicketFormAdvanced } from './SupportTicketFormAdvanced';
import { OrderList } from './OrderList';
import { EmailRequestModal } from './EmailRequestModal';
import { ConversationFeedback } from './ConversationFeedback';
import { OrderSelectionModal } from './OrderSelectionModal';
import { CodeBlock } from './CodeBlock';
import { GenerateContentResponse } from '@google/genai';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface ChatbotProps {
    user: { name: string; email: string; phone: string; };
    onTicketCreated?: () => void;
    inline?: boolean; // Se true, renderiza inline ao invés de flutuante
    companyId?: string; // ID da empresa do usuário
}

export const Chatbot: React.FC<ChatbotProps> = ({ user, onTicketCreated, inline = false, companyId }) => {
    const [isOpen, setIsOpen] = useState(inline); // Se inline, já inicia aberto
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailRequestModal, setEmailRequestModal] = useState<{ orderId?: string; reason?: string } | null>(null);
    const [pendingOrderSearch, setPendingOrderSearch] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string>('');
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [attemptsWithoutResolution, setAttemptsWithoutResolution] = useState(0);
    const [isReturningUser, setIsReturningUser] = useState(false);
    const [mentionedOrderNumbers, setMentionedOrderNumbers] = useState<string[]>([]);
    const [conversationHistory, setConversationHistory] = useState<any[]>([]);
    const [showFeedback, setShowFeedback] = useState(false);
    const [companyGreeting, setCompanyGreeting] = useState<string>('Olá! 👋 Sou o assistente virtual. Como posso te ajudar hoje?');
    const [selectedOrders, setSelectedOrders] = useState<CubboOrder[]>([]);
    const [showOrderSelection, setShowOrderSelection] = useState(false);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const messageIdCounter = useRef<number>(0);
    const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isOpen]);

    // Cleanup de timeouts quando componente for desmontado
    useEffect(() => {
        return () => {
            // Limpar todos os timeouts pendentes ao desmontar
            timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
            timeoutRefs.current = [];
        };
    }, []);

    // Inicializar sessionId e verificar usuário retornante
    useEffect(() => {
        const storedSessionId = conversationService.getOrCreateSessionId();
        setSessionId(storedSessionId);
        
        // Carregar saudação da empresa se companyId fornecido
        if (companyId && companyId !== 'general') {
            companyService.getCompanyGreeting(companyId).then((greeting) => {
                setCompanyGreeting(greeting);
            });
        }
        
        // Verificar se é usuário retornante e carregar contexto
        if (user.email) {
            Promise.all([
                conversationService.getLastConversation(user.email),
                supportService.getTicketsByUser({ email: user.email, phone: user.phone }),
                supportService.findOrdersByCustomer({ email: user.email, phone: user.phone })
            ]).then(([lastConv, tickets, orders]) => {
                if (lastConv) {
                    setIsReturningUser(true);
                    // Carregar histórico recente
                    conversationService.getConversationHistory(user.email, 3).then((history) => {
                        setConversationHistory(history);
                    });
                }
                
                // Armazenar tickets e pedidos para uso na mensagem inicial
                // Filtrar apenas tickets não resolvidos
                const unresolvedTickets = tickets.filter(t => 
                    t.status !== 'resolvido' && t.status !== 'fechado' && t.status !== 'arquivado'
                );
                
                // Pedidos recentes (últimos 30 dias)
                const recentOrders = orders.filter(order => {
                    if (!order.created_at) return false;
                    const orderDate = new Date(order.created_at);
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    return orderDate >= thirtyDaysAgo;
                }).slice(0, 3); // Limitar a 3 pedidos mais recentes
                
                // Armazenar no estado para uso na mensagem inicial
                if (unresolvedTickets.length > 0 || recentOrders.length > 0) {
                    // Adicionar contexto ao conversationHistory para uso na mensagem inicial
                    setConversationHistory(prev => [
                        ...prev,
                        {
                            unresolvedTickets,
                            recentOrders,
                        } as any
                    ]);
                }
            }).catch(error => {
                console.error('[Chatbot] Erro ao carregar contexto inicial:', error);
            });
        }
    }, [user.email, user.phone, companyId]);

    useEffect(() => {
        if ((isOpen || inline) && messages.length === 0) {
            let welcomeMessage = companyGreeting;
            
            // Buscar contexto de aprendizado (tickets não resolvidos e pedidos recentes)
            const contextData = conversationHistory.find((h: any) => h.unresolvedTickets || h.recentOrders);
            const unresolvedTickets = contextData?.unresolvedTickets || [];
            const recentOrders = contextData?.recentOrders || [];
            
            if (isReturningUser && user.name) {
                welcomeMessage = `${companyGreeting}\n\nOlá novamente, ${user.name}! 👋 Que bom te ver de volta!`;
            }
            
            // Adicionar contexto baseado em aprendizado
            if (unresolvedTickets.length > 0) {
                welcomeMessage += `\n\n📋 Vejo que você tem ${unresolvedTickets.length} chamado(s) de suporte em aberto.`;
                if (unresolvedTickets.length === 1) {
                    welcomeMessage += ` Posso ajudar com o chamado "${unresolvedTickets[0].subject}"?`;
                } else {
                    welcomeMessage += ` Posso ajudar com algum deles?`;
                }
            }
            
            if (recentOrders.length > 0) {
                if (unresolvedTickets.length > 0) {
                    welcomeMessage += `\n\n📦 Também encontrei ${recentOrders.length} pedido(s) recente(s) associado(s) ao seu email.`;
                } else {
                    welcomeMessage += `\n\n📦 Encontrei ${recentOrders.length} pedido(s) recente(s) associado(s) ao seu email.`;
                }
                if (recentOrders.length === 1) {
                    welcomeMessage += ` Gostaria de rastrear o pedido ${recentOrders[0].order_number}?`;
                } else {
                    const orderNumbers = recentOrders.slice(0, 3).map(o => o.order_number).join(', ');
                    welcomeMessage += ` Gostaria de rastrear algum deles (${orderNumbers}${recentOrders.length > 3 ? '...' : ''})?`;
                }
            }
            
            if (unresolvedTickets.length === 0 && recentOrders.length === 0) {
                welcomeMessage += '\n\nVocê pode rastrear um pedido, solicitar uma troca ou tirar dúvidas.';
            } else {
                welcomeMessage += '\n\nOu se preferir, posso ajudar com outras questões!';
            }
            
            setMessages([
                { id: 'welcome', text: welcomeMessage, sender: MessageSender.BOT }
            ]);
        }
    }, [isOpen, inline, messages.length, isReturningUser, user.name, conversationHistory, companyGreeting]);

    const handleFormSubmit = async (formType: 'exchange' | 'ticket', data: any) => {
        // Se for troca, criar ticket automaticamente
        if (formType === 'exchange') {
            try {
                // Garantir que temos email válido
                const emailToUse = (data.email || user.email || '').trim();
                if (!emailToUse) {
                    addMessage('Erro: Email não fornecido. Por favor, informe seu email para continuar.', MessageSender.BOT);
                    return;
                }

                // Criar descrição estruturada para o ticket de troca
                const description = `Solicitação de Troca de Produto

Número do Pedido: ${data.orderId || 'Não informado'}
Motivo da Troca: ${data.reason || 'Não informado'}
Nome do Cliente: ${data.name || user.name || 'Não informado'}
Email: ${emailToUse}
Telefone: ${data.phone || user.phone || 'Não informado'}`;

                // Criar ticket de troca
                const ticketId = await supportService.createTicket({
                    subject: 'Troca de Produto',
                    description: description,
                    name: data.name || user.name || 'Cliente',
                    email: emailToUse,
                    phone: data.phone || user.phone || undefined,
                    orderNumber: data.orderId || undefined,
                    priority: 'media',
                    status: 'aberto',
                });

                const confirmationText = `Sua solicitação de troca para o pedido ${data.orderId || 'informado'} foi enviada. Você receberá um email de confirmação em breve para ${emailToUse}.`;
                
                const newSystemMessage: Message = {
                    id: `msg-${Date.now()}-${++messageIdCounter.current}`,
                    text: confirmationText,
                    sender: MessageSender.SYSTEM,
                };
                setMessages(prev => prev.filter(m => m.component === null || m.component === undefined).concat(newSystemMessage));

                // Resetar tentativas quando resolve ou abre chamado
                setAttemptsWithoutResolution(0);

                // Salvar conversa após resolução/chamado e vincular ticket
                if (user.email && currentConversationId) {
                    await saveConversation(true);
                    // Vincular ticket à conversa
                    try {
                        await conversationService.linkTicketToConversation(currentConversationId, ticketId);
                    } catch (error) {
                        console.error('[handleFormSubmit] Erro ao vincular ticket à conversa:', error);
                    }
                    // Mostrar feedback após resolução ou abertura de chamado
                    setShowFeedback(true);
                }

                // Chamar callback se disponível
                if (onTicketCreated) {
                    onTicketCreated();
                }
            } catch (error) {
                console.error('[handleFormSubmit] Erro ao criar ticket de troca:', error);
                addMessage('Desculpe, ocorreu um erro ao processar sua solicitação de troca. Por favor, tente novamente ou entre em contato conosco.', MessageSender.BOT);
            }
            return;
        }

        // Se for ticket normal, manter comportamento existente
        // data é o ticketId retornado pelo formulário
        const ticketId = typeof data === 'string' ? data : data?.ticketId || data;
        const confirmationText = `Seu chamado de suporte foi criado com sucesso! O ID é #${ticketId.substring(0, 6)}. Nossa equipe entrará em contato em breve.`;
        
        const newSystemMessage: Message = {
            id: `msg-${Date.now()}-${++messageIdCounter.current}`,
            text: confirmationText,
            sender: MessageSender.SYSTEM,
        };
        setMessages(prev => prev.filter(m => m.component === null || m.component === undefined).concat(newSystemMessage));
        
        // Resetar tentativas quando resolve ou abre chamado
        setAttemptsWithoutResolution(0);
        
        // Salvar conversa após resolução/chamado e vincular ticket
        if (user.email && currentConversationId && ticketId) {
            await saveConversation(true);
            // Vincular ticket à conversa
            try {
                await conversationService.linkTicketToConversation(currentConversationId, ticketId);
            } catch (error) {
                console.error('[handleFormSubmit] Erro ao vincular ticket à conversa:', error);
            }
            // Mostrar feedback após resolução ou abertura de chamado
            setShowFeedback(true);
        }
        
        if(formType === 'ticket' && onTicketCreated) {
            onTicketCreated();
        }
    };
    
    // Salvar conversa no Firestore
    const saveConversation = async (resolved: boolean = false) => {
        if (!user.email || messages.length === 0) return;
        
        try {
            // Registrar interação de chat no userService
            await userService.recordChatInteraction(user.email);
            
            // Buscar supportUserId se existir
            const supportUser = await userService.getUserByEmail(user.email);
            const supportUserId = supportUser?.id;
            
            const conversationMessages: ConversationMessage[] = messages
                .filter(m => m.sender !== MessageSender.SYSTEM || !m.component)
                .map(m => ({
                    text: m.text,
                    sender: m.sender,
                    timestamp: Date.now(),
                    orderNumbers: supportService.extractOrderNumbers(m.text),
                }));
            
            const allOrderNumbers = Array.from(new Set(
                conversationMessages.flatMap(m => m.orderNumbers || [])
            ));
            
            if (currentConversationId) {
                // Atualizar conversa existente
                await conversationService.updateConversation(currentConversationId, {
                    messages: conversationMessages,
                    orderNumbers: allOrderNumbers,
                    resolved,
                    attempts: attemptsWithoutResolution,
                    supportUserId: supportUserId,
                });
            } else {
                // Criar nova conversa
                const convId = await conversationService.saveConversation(
                    user.email,
                    sessionId,
                    conversationMessages,
                    allOrderNumbers
                );
                setCurrentConversationId(convId);
                
                // Atualizar com supportUserId após criação
                if (supportUserId) {
                    await conversationService.updateConversation(convId, {
                        supportUserId: supportUserId,
                    });
                }
            }
            
            setMentionedOrderNumbers(allOrderNumbers);
        } catch (error) {
            console.error('[Chatbot] Erro ao salvar conversa:', error);
        }
    };
    
    const renderComponentInChat = (component: React.ReactNode) => {
        const newComponentMessage: Message = {
            id: `msg-${Date.now()}-${++messageIdCounter.current}`,
            text: '',
            sender: MessageSender.SYSTEM,
            component: component,
        };
        setMessages(prev => [...prev, newComponentMessage]);
    };
    
    const handleFunctionCall = async (response: GenerateContentResponse) => {
        const functionCalls = response.functionCalls;
        let orderFound = false;
        let ticketOpened = false;
        
        if (!functionCalls || functionCalls.length === 0) {
            if (response.text) {
                addMessage(response.text, MessageSender.BOT);
            }
            // Incrementar tentativas se não encontrou solução
            if (!orderFound && !ticketOpened) {
                setAttemptsWithoutResolution(prev => prev + 1);
            }
            return;
        }

        for (const call of functionCalls) {
            switch (call.name) {
                case 'findCustomerOrders':
                    try {
                        const orders = await supportService.findOrdersByCustomer({
                            email: user.email || null,
                            phone: user.phone || null
                        });
                        
                        if (orders.length === 0) {
                            addMessage("Não encontrei nenhum pedido associado ao seu email ou telefone. Verifique se os dados estão corretos ou entre em contato conosco.", MessageSender.BOT);
                            setAttemptsWithoutResolution(prev => prev + 1);
                        } else {
                            orderFound = true;
                            setAttemptsWithoutResolution(0); // Reset ao encontrar pedidos
                            const ordersText = orders.length === 1 
                                ? `Encontrei 1 pedido seu:` 
                                : `Encontrei ${orders.length} pedidos seus:`;
                            addMessage(ordersText, MessageSender.BOT);
                            
                            // Renderizar componente com lista de pedidos
                            renderComponentInChat(<OrderList orders={orders} />);
                            
                            // Adicionar mensagem com resumo
                            const summary = orders.map(order => {
                                const date = new Date(order.created_at);
                                const formattedDate = date.toLocaleDateString('pt-BR');
                                return `• Pedido ${order.order_number} - ${order.status} (${formattedDate})`;
                            }).join('\n');
                            
                            addMessage(`\n${summary}\n\nVocê pode perguntar sobre um pedido específico informando o número do pedido.`, MessageSender.BOT);
                        }
                    } catch (error) {
                        console.error("Error finding customer orders:", error);
                        addMessage("Desculpe, ocorreu um erro ao buscar seus pedidos. Por favor, tente novamente ou entre em contato conosco.", MessageSender.BOT);
                    }
                    break;
                case 'trackOrder':
                    const { orderId, customerEmail } = call.args;
                    
                    // Se Gemini forneceu apenas email (sem orderId), usar findCustomerOrders ao invés de trackOrder
                    if (!orderId && customerEmail) {
                        // Confirmar email antes de buscar
                        const providedEmail = customerEmail as string;
                        const emailToUse = providedEmail.toLowerCase().trim();
                        const userEmail = user.email.toLowerCase().trim();
                        
                        if (emailToUse !== userEmail) {
                            addMessage(`Você está logado com ${user.email}, mas forneceu ${providedEmail}. Deseja buscar pedidos com qual email?`, MessageSender.BOT);
                            // Por enquanto, usar o email fornecido mas avisar
                            addMessage(`Buscando pedidos com o email ${providedEmail}... 🔍`, MessageSender.BOT);
                        } else {
                            addMessage(`Você está logado com ${user.email}. Buscando seus pedidos... 🔍`, MessageSender.BOT);
                        }
                        
                        // Usar findCustomerOrders quando apenas email fornecido
                        try {
                            const customerOrders = await supportService.findOrdersByCustomer({ email: emailToUse });
                            if (customerOrders && customerOrders.length > 0) {
                                if (customerOrders.length > 1) {
                                    // Múltiplos pedidos encontrados - exibir modal de seleção
                                    setSelectedOrders(customerOrders);
                                    setShowOrderSelection(true);
                                    addMessage(`Encontrei ${customerOrders.length} pedidos associados ao email ${emailToUse}. Por favor, selecione qual pedido deseja consultar.`, MessageSender.BOT);
                                } else {
                                    // Apenas um pedido encontrado - exibir diretamente
                                    const singleOrder = customerOrders[0];
                                    renderComponentInChat(<OrderList orders={[singleOrder]} />);
                                    const orderDetails = supportService.formatOrderDetails(singleOrder);
                                    addMessage(`Encontrei seu pedido!\n\n${orderDetails}`, MessageSender.BOT);
                                    if (singleOrder.order_number && !mentionedOrderNumbers.includes(singleOrder.order_number)) {
                                        setMentionedOrderNumbers(prev => [...prev, singleOrder.order_number]);
                                    }
                                }
                            } else {
                                addMessage(`Não encontrei pedidos para o email ${emailToUse}. Este é o mesmo email usado na compra? Pode verificar se o email está correto?`, MessageSender.BOT);
                            }
                        } catch (error) {
                            console.error("Error finding customer orders:", error);
                            addMessage("Desculpe, ocorreu um erro ao buscar seus pedidos. Por favor, tente novamente ou entre em contato conosco.", MessageSender.BOT);
                        }
                        break;
                    }
                    
                    // Sanitizar orderId para remover duplicações antes de usar
                    // IMPORTANTE: Apenas sanitizar se for código com letras, não números puros
                    let sanitizedOrderId: string | undefined = undefined;
                    if (orderId) {
                        const orderIdStr = orderId as string;
                        // Se é número puro, usar diretamente sem sanitização
                        if (/^\d+$/.test(orderIdStr.trim())) {
                            sanitizedOrderId = orderIdStr.trim();
                        } else {
                            // Se tem letras, aplicar sanitização
                            sanitizedOrderId = sanitizeOrderCode(orderIdStr);
                        }
                    }
                    // O usuário pode fornecer código do pedido OU email
                    const searchValue = (sanitizedOrderId as string) || (customerEmail as string) || '';
                    // Email é OPCIONAL: só usar se fornecido explicitamente ou se buscar por email
                    // Se buscar por código do pedido sem email, não validar email
                    const providedEmail = customerEmail as string | undefined;
                    
                    // Confirmar email se fornecido e diferente do login
                    if (providedEmail) {
                        const emailToUse = providedEmail.toLowerCase().trim();
                        const userEmail = user.email.toLowerCase().trim();
                        if (emailToUse !== userEmail) {
                            addMessage(`Você está logado com ${user.email}, mas forneceu ${providedEmail}. Vou usar o email fornecido para validar o pedido.`, MessageSender.BOT);
                        } else {
                            addMessage(`Confirmando: você está logado com ${user.email}. Este é o mesmo email usado na compra do pedido.`, MessageSender.BOT);
                        }
                    } else if (sanitizedOrderId && user.email) {
                        // Se tem código mas não tem email fornecido, confirmar email logado
                        addMessage(`Você está logado com ${user.email}. Este é o mesmo email usado na compra do pedido ${sanitizedOrderId}?`, MessageSender.BOT);
                    }
                    
                    // Feedback imediato ao usuário (usar código sanitizado)
                    if (sanitizedOrderId) {
                        addMessage(`Buscando informações do pedido ${sanitizedOrderId}... 🔍`, MessageSender.BOT);
                    } else {
                        addMessage('Buscando seus pedidos... 🔍', MessageSender.BOT);
                    }
                    
                    // Se tem orderId, buscar pedido específico; se não, buscar por email
                    const trackingInfo = await supportService.trackOrder(searchValue, providedEmail || user.email);
                    
                    // Se pedido não encontrado e não há email fornecido, solicitar email
                    if (trackingInfo.status === 'Não encontrado' && sanitizedOrderId && !providedEmail && !user.email) {
                        setPendingOrderSearch(sanitizedOrderId);
                        setEmailRequestModal({
                            orderId: sanitizedOrderId,
                            reason: 'Para encontrar seu pedido, precisamos confirmar seu email. Por favor, informe o email usado na compra.'
                        });
                        addMessage(`Não encontrei o pedido ${sanitizedOrderId} sem validação de email. Vou solicitar seu email para continuar a busca.`, MessageSender.BOT);
                        break;
                    }
                    
                    // Se pedido não encontrado mesmo com email, tentar alternativas
                    if (trackingInfo.status === 'Não encontrado') {
                        // Tentar buscar por email do usuário logado para ver se há pedidos associados
                        if (user.email && sanitizedOrderId) {
                            try {
                                const customerOrders = await supportService.findOrdersByCustomer({ email: user.email });
                                if (customerOrders && customerOrders.length > 0) {
                                    // Encontrou pedidos por email - mostrar lista e perguntar
                                    addMessage(
                                        `Não encontrei o pedido ${sanitizedOrderId} com esse código exato. ` +
                                        `No entanto, encontrei ${customerOrders.length} pedido(s) associado(s) ao seu email ${user.email}. ` +
                                        `Talvez o código esteja incompleto ou diferente. Veja os pedidos encontrados:`,
                                        MessageSender.BOT
                                    );
                                    renderComponentInChat(<OrderList orders={customerOrders} />);
                                    addMessage(
                                        `Algum desses pedidos é o que você está procurando? ` +
                                        `Se sim, me informe o número correto. ` +
                                        `Se não encontrar seu pedido aqui, pode ser que:\n` +
                                        `• O código do pedido esteja incompleto (ex: faltam letras no início como "R")\n` +
                                        `• O email usado na compra seja diferente de ${user.email}\n` +
                                        `• O código esteja incorreto\n\n` +
                                        `Você pode me informar o código completo do pedido ou o email usado na compra?`,
                                        MessageSender.BOT
                                    );
                                    orderFound = true; // Encontrou pedidos por email, mesmo que não seja o código exato
                                    setAttemptsWithoutResolution(prev => Math.max(0, prev - 1)); // Reduzir tentativas já que encontrou algo
                                } else {
                                    // Não encontrou pedidos por email também
                                    addMessage(
                                        `Não foi possível encontrar o pedido ${sanitizedOrderId} com esse código. ` +
                                        `Também não encontrei pedidos associados ao email ${user.email}. ` +
                                        `Isso pode acontecer se:\n` +
                                        `• O código do pedido estiver incompleto (ex: faltam letras no início como "R" ou "LP")\n` +
                                        `• O email usado na compra for diferente de ${user.email}\n` +
                                        `• O código estiver incorreto\n\n` +
                                        `Você pode:\n` +
                                        `• Informar o código completo do pedido (com todas as letras e números)\n` +
                                        `• Informar o email usado na compra (se for diferente)\n` +
                                        `• Abrir um chamado de suporte para nossa equipe te ajudar`,
                                        MessageSender.BOT
                                    );
                                    setAttemptsWithoutResolution(prev => prev + 1);
                                }
                            } catch (error) {
                                console.error('[Chatbot] Erro ao buscar pedidos por email:', error);
                                addMessage(
                                    `Não foi possível encontrar o pedido ${sanitizedOrderId || 'informado'}. ` +
                                    `Verifique se o código está completo e correto. ` +
                                    `Se o código estiver incompleto (ex: faltam letras no início), informe o código completo. ` +
                                    `Caso contrário, entre em contato conosco para mais informações.`,
                                    MessageSender.BOT
                                );
                                setAttemptsWithoutResolution(prev => prev + 1);
                            }
                        } else {
                            // Não tem email do usuário logado
                            addMessage(
                                `Não foi possível encontrar o pedido ${sanitizedOrderId || 'informado'}. ` +
                                `Verifique se o código está completo e correto. ` +
                                `Códigos de pedido geralmente começam com letras (ex: R123456, LP12345). ` +
                                `Se o código estiver incompleto, informe o código completo. ` +
                                `Caso contrário, entre em contato conosco para mais informações.`,
                                MessageSender.BOT
                            );
                            setAttemptsWithoutResolution(prev => prev + 1);
                        }
                        break;
                    }
                    
                    // Pedido encontrado - resetar tentativas
                    orderFound = true;
                    setAttemptsWithoutResolution(0);
                    
                    // Adicionar orderNumber aos mencionados
                    if (trackingInfo.order) {
                        const orderNum = trackingInfo.order.order_number;
                        if (orderNum && !mentionedOrderNumbers.includes(orderNum)) {
                            setMentionedOrderNumbers(prev => [...prev, orderNum]);
                        }
                    }
                    
                    // Verificar se múltiplos pedidos foram encontrados por email
                    if (trackingInfo.orders && trackingInfo.orders.length > 1) {
                        // Múltiplos pedidos encontrados - exibir modal de seleção
                        setSelectedOrders(trackingInfo.orders);
                        setShowOrderSelection(true);
                        addMessage(`Encontrei ${trackingInfo.orders.length} pedidos associados ao seu email. Por favor, selecione qual pedido deseja consultar.`, MessageSender.BOT);
                    } else if (trackingInfo.orders && trackingInfo.orders.length === 1) {
                        // Apenas um pedido encontrado - exibir diretamente
                        const singleOrder = trackingInfo.orders[0];
                        renderComponentInChat(<OrderList orders={[singleOrder]} />);
                        addMessage(trackingInfo.details, MessageSender.BOT);
                    } else if (trackingInfo.order) {
                        // Pedido único encontrado - renderizar também para melhor visualização
                        renderComponentInChat(<OrderList orders={[trackingInfo.order]} />);
                        addMessage(trackingInfo.details, MessageSender.BOT);
                    } else {
                        // Adicionar mensagem formatada com todas as informações
                        addMessage(trackingInfo.details, MessageSender.BOT);
                    }
                    break;
                case 'initiateExchange':
                    renderComponentInChat(
                        <ExchangeForm 
                            // Fix: Cast `orderId` from `unknown` to `string | undefined` for the component prop.
                            orderId={call.args.orderId as string | undefined}
                            userEmail={user.email || ''}
                            userName={user.name || ''}
                            userPhone={user.phone || ''}
                            onSubmit={(data) => handleFormSubmit('exchange', data)}
                            onClose={() => setMessages(prev => prev.filter(m => m.component === null || m.component === undefined))}
                        />
                    );
                    break;
                case 'openSupportTicket':
                    ticketOpened = true;
                    setAttemptsWithoutResolution(0); // Reset ao abrir chamado
                    const orderNumberFromCall = (call.args.orderNumber as string | undefined);
                    const subjectFromCall = (call.args.subject as string | undefined) || 'outro';
                    const orderNumber = orderNumberFromCall || (mentionedOrderNumbers.length > 0 ? mentionedOrderNumbers[0] : undefined);
                    // Envolver em Dialog para garantir z-index alto
                    renderComponentInChat(
                        <Dialog open={true} onOpenChange={() => setMessages(prev => prev.filter(m => m.component === null || m.component === undefined))}>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[100]">
                                <DialogHeader>
                                    <DialogTitle>Abrir Chamado de Suporte</DialogTitle>
                                </DialogHeader>
                                <SupportTicketFormAdvanced
                                   initialData={{ 
                                       name: user.name, 
                                       email: user.email, 
                                       phone: user.phone,
                                       orderNumber: orderNumber
                                   }}
                                   defaultSubject={subjectFromCall as any}
                                   onSubmit={(ticketId) => handleFormSubmit('ticket', ticketId)}
                                   onClose={() => setMessages(prev => prev.filter(m => m.component === null || m.component === undefined))}
                                />
                            </DialogContent>
                        </Dialog>
                    );
                    break;
                case 'searchFAQ':
                    // Busca inteligente de FAQ usando Gemini
                    const query = call.args.query as string;
                    addMessage(`Buscando informações sobre "${query}"... 🔍`, MessageSender.BOT);
                    
                    try {
                        const intelligentResult = await searchIntelligentFAQ(query, companyId);
                        
                        if (intelligentResult.answer) {
                            addMessage(intelligentResult.answer, MessageSender.BOT);
                            
                            // Se houver fontes, mencionar
                            if (intelligentResult.sources && intelligentResult.sources.length > 0) {
                                const sourcesText = `\n\n📚 Fonte${intelligentResult.sources.length > 1 ? 's' : ''} do FAQ:\n${intelligentResult.sources.slice(0, 3).map((s, i) => `${i + 1}. ${s.question}`).join('\n')}`;
                                addMessage(sourcesText, MessageSender.BOT);
                            }
                            
                            // Se houver perguntas sugeridas
                            if (intelligentResult.suggestedQuestions && intelligentResult.suggestedQuestions.length > 0) {
                                const suggestionsText = `\n\n💡 Perguntas relacionadas:\n${intelligentResult.suggestedQuestions.map((q, i) => `• ${q}`).join('\n')}`;
                                addMessage(suggestionsText, MessageSender.BOT);
                            }
                            
                            // Se não encontrou resposta satisfatória, oferecer abrir chamado
                            if (intelligentResult.sources.length === 0) {
                                const timeoutId = setTimeout(() => {
                                    addMessage(
                                        "Não encontrei uma resposta completa para sua pergunta. Gostaria de abrir um chamado para nossa equipe te ajudar pessoalmente?",
                                        MessageSender.BOT
                                    );
                                }, 1000);
                                timeoutRefs.current.push(timeoutId);
                            }
                        } else {
                            // Fallback para busca simples
                            const faqResult = await supportService.searchFAQ(query);
                            addMessage(faqResult || 'Não encontrei informações sobre isso no nosso FAQ. Gostaria de abrir um chamado?', MessageSender.BOT);
                        }
                    } catch (error) {
                        console.error('Error in intelligent FAQ search:', error);
                        // Fallback para busca simples
                        const faqResult = await supportService.searchFAQ(query);
                        addMessage(faqResult || 'Ocorreu um erro ao buscar. Gostaria de abrir um chamado?', MessageSender.BOT);
                    }
                    break;
                case 'escalateToHuman':
                     addMessage("Entendi. Um de nossos atendentes entrará em contato com você por e-mail em breve para dar continuidade ao seu atendimento.", MessageSender.BOT);
                    ticketOpened = true;
                    break;
                default:
                    addMessage("Desculpe, não consegui processar essa ação.", MessageSender.BOT);
                    setAttemptsWithoutResolution(prev => prev + 1);
            }
        }
        
        // Salvar conversa após processar função (não bloquear resposta)
        saveConversation(orderFound || ticketOpened).catch(err => {
            console.error('[Chatbot] Erro ao salvar conversa (não crítico):', err);
        });
        
        // Sugerir abertura de chamado após 3 tentativas sem resolução
        if (attemptsWithoutResolution >= 3 && !ticketOpened) {
            const timeoutId = setTimeout(() => {
                addMessage(
                    "Vejo que ainda não conseguimos resolver sua questão. Gostaria de abrir um chamado para nossa equipe te ajudar pessoalmente?",
                    MessageSender.BOT
                );
                renderComponentInChat(
                    <Card className="p-4 bg-warning/10 border-warning/20">
                        <p className="text-sm mb-3">Nossa equipe pode ajudar com questões mais complexas.</p>
                        <Button
                            onClick={() => {
                                const orderNumber = mentionedOrderNumbers.length > 0 ? mentionedOrderNumbers[0] : undefined;
                                // Envolver em Dialog para garantir z-index alto
                                renderComponentInChat(
                                    <Dialog open={true} onOpenChange={() => setMessages(prev => prev.filter(m => m.component === null || m.component === undefined))}>
                                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[100]">
                                            <DialogHeader>
                                                <DialogTitle>Abrir Chamado de Suporte</DialogTitle>
                                            </DialogHeader>
                                            <SupportTicketFormAdvanced
                                               initialData={{ 
                                                   name: user.name, 
                                                   email: user.email, 
                                                   phone: user.phone,
                                                   orderNumber: orderNumber
                                               }}
                                               onSubmit={(ticketId) => handleFormSubmit('ticket', ticketId)}
                                               onClose={() => setMessages(prev => prev.filter(m => m.component === null || m.component === undefined))}
                                            />
                                        </DialogContent>
                                    </Dialog>
                                );
                            }}
                            className="w-full"
                        >
                            Abrir Chamado de Suporte
                        </Button>
                    </Card>
                );
            }, 1000);
            timeoutRefs.current.push(timeoutId);
        }
    };

    // Função helper para sanitizar códigos de pedido removendo duplicações
    const sanitizeOrderCode = (code: string): string => {
        if (!code || typeof code !== 'string') return code || '';
        
        // Remover "#" do início para normalização
        let cleaned = code.replace(/^#+/, '').trim();
        
        // IMPORTANTE: NÃO processar números puros (apenas dígitos)
        // Números puros não devem ser sanitizados para evitar falsos positivos
        if (/^\d+$/.test(cleaned)) {
            return cleaned; // Retornar número puro sem modificação
        }
        
        // Apenas processar códigos que começam com letras (R123, LP123, ABC123, etc.)
        if (!/^[A-Za-z]/.test(cleaned)) {
            return cleaned; // Se não começa com letra, retornar sem modificação
        }
        
        // Verificar se há duplicação exata no meio do código (ex: R123R123, ABC123ABC123)
        // Dividir em possíveis partes e verificar se há repetição
        const halfLength = Math.floor(cleaned.length / 2);
        if (halfLength > 0 && cleaned.length % 2 === 0) {
            const firstHalf = cleaned.substring(0, halfLength);
            const secondHalf = cleaned.substring(halfLength);
            if (firstHalf === secondHalf) {
                return firstHalf;
            }
        }
        
        // Detectar duplicação consecutiva usando regex (ex: R123R123, ABC123ABC123)
        // Padrão: captura grupo de caracteres e verifica se é repetido consecutivamente
        // Aplicar apenas a códigos que começam com letras
        const duplicatePattern = /^([A-Za-z].+?)\1+$/;
        const match = cleaned.match(duplicatePattern);
        
        if (match && match[0] === cleaned) {
            // Se o código inteiro é uma duplicação exata, retornar apenas uma vez
            return match[1];
        }
        
        // Verificar duplicação parcial no final (ex: R123R123 onde pode haver espaço)
        // Tentar encontrar padrão repetido no final
        for (let i = Math.floor(cleaned.length / 2); i >= 3; i--) {
            const suffix = cleaned.substring(cleaned.length - i);
            const prefix = cleaned.substring(0, i);
            if (suffix === prefix && cleaned.length >= i * 2) {
                // Verificar se há repetição completa
                const repeated = prefix + prefix;
                if (cleaned === repeated || cleaned.endsWith(repeated)) {
                    return prefix;
                }
            }
        }
        
        return cleaned;
    };

    // Função helper para sanitizar respostas e remover duplicações de códigos de pedido
    const sanitizeOrderCodeDuplication = (text: string): string => {
        if (!text || typeof text !== 'string') return text;
        
        // Padrões para códigos de pedido (incluindo "#" opcional)
        // IMPORTANTE: Apenas processar códigos que começam com letras (R, LP, ABC, etc.)
        // NÃO processar números puros para evitar falsos positivos
        const orderCodePattern = /#?\b(R\d+[-\w]*|LP[-_]?\d+|[A-Za-z]+\d+[-\w]*)/gi;
        const matches = text.match(orderCodePattern);
        
        // Padrão para detectar códigos genéricos duplicados (ex: ABC123ABC123, R123R123)
        // IMPORTANTE: Apenas códigos que começam com letras seguidos de números
        // NÃO aplicar a números puros
        const genericCodePattern = /(\b[A-Za-z]+\d+[-\w]*)\1+\b/gi;
        const genericMatches = text.match(genericCodePattern);
        
        let sanitized = text;
        
        // Processar códigos padrão (R/LP) e genéricos com letras
        if (matches && matches.length > 0) {
            // Encontrar códigos únicos (case-insensitive, removendo "#" para comparação)
            const uniqueCodes = new Map<string, string>();
            matches.forEach(match => {
                // Remover "#" para normalização na comparação
                const normalized = match.replace(/^#+/, '').trim().toUpperCase();
                // Validar que o código começa com letra (não é número puro)
                if (/^[A-Za-z]/.test(normalized) && !uniqueCodes.has(normalized)) {
                    // Preservar formato original do primeiro encontrado (com ou sem #)
                    uniqueCodes.set(normalized, match);
                }
            });
            
            // Detectar e corrigir duplicações consecutivas apenas em códigos válidos
            uniqueCodes.forEach((originalCode, normalizedCode) => {
                // Criar padrão que aceita "#" opcional antes do código
                const codeWithoutHash = originalCode.replace(/^#+/, '');
                const escapedCode = codeWithoutHash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                
                // Padrão para detectar duplicação consecutiva (com ou sem #)
                // Aplicar apenas se o código começa com letra
                if (/^[A-Za-z]/.test(codeWithoutHash)) {
                    const duplicatePattern = new RegExp(`(#?${escapedCode})\\1+`, 'gi');
                    sanitized = sanitized.replace(duplicatePattern, originalCode);
                    
                    // Também verificar variações onde o segundo código pode ter "#" diferente
                    const mixedPattern = new RegExp(`(${escapedCode})(#?\\1)`, 'gi');
                    sanitized = sanitized.replace(mixedPattern, originalCode);
                }
            });
        }
        
        // Processar códigos genéricos duplicados (ex: ABC123ABC123)
        // IMPORTANTE: Apenas códigos que começam com letras
        if (genericMatches && genericMatches.length > 0) {
            genericMatches.forEach(match => {
                // Validar que começa com letra antes de processar
                if (/^[A-Za-z]/.test(match)) {
                    // Extrair a parte única (primeira metade se for duplicação exata)
                    const sanitizedCode = sanitizeOrderCode(match);
                    if (sanitizedCode !== match) {
                        sanitized = sanitized.replace(match, sanitizedCode);
                    }
                }
            });
        }
        
        return sanitized;
    };

    // Função para detectar e extrair blocos de código de uma mensagem
    const parseCodeBlocks = (text: string): Array<{ type: 'text' | 'code'; content: string; language?: string }> => {
        const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
        
        // Padrão para detectar blocos de código markdown: ```language\ncode\n```
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let lastIndex = 0;
        let match;
        
        while ((match = codeBlockRegex.exec(text)) !== null) {
            // Adicionar texto antes do bloco de código
            if (match.index > lastIndex) {
                const textBefore = text.substring(lastIndex, match.index);
                if (textBefore.trim()) {
                    parts.push({ type: 'text', content: textBefore });
                }
            }
            
            // Adicionar bloco de código
            const language = match[1] || undefined;
            const code = match[2].trim();
            parts.push({ type: 'code', content: code, language });
            
            lastIndex = match.index + match[0].length;
        }
        
        // Adicionar texto restante após o último bloco de código
        if (lastIndex < text.length) {
            const textAfter = text.substring(lastIndex);
            if (textAfter.trim()) {
                parts.push({ type: 'text', content: textAfter });
            }
        }
        
        // Se não encontrou nenhum bloco de código, retornar o texto inteiro
        if (parts.length === 0) {
            parts.push({ type: 'text', content: text });
        }
        
        return parts;
    };

    const addMessage = (text: string, sender: MessageSender) => {
        // Sanitizar texto antes de adicionar se for mensagem do bot
        const sanitizedText = sender === MessageSender.BOT 
            ? sanitizeOrderCodeDuplication(text) 
            : text;
            
        const newMessage: Message = {
            id: `msg-${Date.now()}-${++messageIdCounter.current}`,
            text: sanitizedText,
            sender,
        };
        setMessages(prev => [...prev, newMessage]);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        // Sanitizar mensagem do usuário para remover duplicações de códigos antes de processar
        const sanitizedUserMessage = sanitizeOrderCodeDuplication(input.trim());
        const userMessage = sanitizedUserMessage;
        addMessage(userMessage, MessageSender.USER);
        
        // Extrair orderNumbers da mensagem do usuário (já sanitizada)
        const extractedOrders = supportService.extractOrderNumbers(userMessage);
        if (extractedOrders && extractedOrders.length > 0) {
            setMentionedOrderNumbers(prev => {
                const combined = [...prev, ...extractedOrders];
                return Array.from(new Set(combined));
            });
        }
        
        setInput('');
        setIsLoading(true);

        // Criar contexto enriquecido com histórico
        const enrichedMessages = [...messages, { 
            id: `msg-${Date.now()}-${++messageIdCounter.current}`, 
            text: userMessage, 
            sender: MessageSender.USER 
        }];
        
        // Adicionar contexto do histórico se disponível
        // IMPORTANTE: Filtrar códigos já presentes na mensagem atual para evitar duplicação
        // NÃO passar pedidos de conversas anteriores no contexto para evitar confusão
        // O Gemini deve sempre buscar informações reais usando as funções disponíveis
        let contextInfo = '';
        if (attemptsWithoutResolution > 0) {
            contextInfo += `\n[Tentativas sem resolução: ${attemptsWithoutResolution}]`;
        }
        
        // Passar email do usuário para o Gemini
        const userEmailToPass = user.email && user.email.trim() ? user.email.trim() : undefined;
        
        const response = await getGeminiResponse(
            enrichedMessages, 
            userMessage + contextInfo,
            companyId,
            userEmailToPass
        );
        setIsLoading(false);

        if (response) {
            await handleFunctionCall(response);
        } else {
            addMessage('Desculpe, ocorreu um erro. Por favor, tente novamente.', MessageSender.BOT);
            setAttemptsWithoutResolution(prev => prev + 1);
        }
    };

    const chatContainerClass = inline 
        ? "w-full h-full flex flex-col bg-background rounded-lg border border-border shadow-sm"
        : "fixed bottom-20 right-6 w-full max-w-md h-[70vh] bg-white border border-gray-200 shadow-xl flex flex-col z-40 rounded-lg overflow-hidden";

    return (
        <>
            {!inline && (
                <motion.button
                    onClick={() => setIsOpen(!isOpen)}
                    className="fixed bottom-6 right-6 bg-gradient-to-r from-primary to-secondary text-white p-4 shadow-lg hover:shadow-xl rounded-full z-50"
                    aria-label="Toggle Chat"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    animate={!isOpen ? {
                        rotate: 0,
                    } : {
                        rotate: 90,
                    }}
                    transition={{ duration: 0.2 }}
                >
                    {isOpen ? (
                        <CloseIcon className="w-6 h-6" />
                    ) : (
                        <MessageIcon className="w-6 h-6" />
                    )}
                </motion.button>
            )}
            <AnimatePresence>
                {(isOpen || inline) && (
                    <motion.div
                        initial={inline ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={inline ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className={chatContainerClass}
                    >
                    <header className={`bg-gradient-to-r from-primary to-secondary p-4 flex justify-between items-center text-white shadow-md ${inline ? 'rounded-t-lg' : ''}`}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                                <BotIcon className="w-5 h-5 text-white"/>
                            </div>
                            <div>
                                <h3 className="font-semibold text-base">Suporte Lojinha Prio</h3>
                                <p className="text-xs text-white/90">Assistente Virtual</p>
                            </div>
                        </div>
                        {inline && (
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-white/80 hover:text-white transition-colors"
                                aria-label="Fechar chat"
                            >
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        )}
                    </header>
                    <div className={`flex-1 p-4 overflow-y-auto bg-gradient-to-b from-background to-muted/20 ${inline ? 'min-h-[500px]' : ''}`}>
                        <div className="space-y-4">
                            {messages.map((msg, index) => (
                                msg.component ? (
                                    <motion.div 
                                        key={msg.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        {msg.component}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={`flex gap-3 ${msg.sender === MessageSender.USER ? 'flex-row-reverse' : 'flex-row'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                            msg.sender === MessageSender.USER 
                                                ? 'bg-primary text-primary-foreground' 
                                                : msg.sender === MessageSender.SYSTEM
                                                ? 'bg-warning text-warning-foreground'
                                                : 'bg-secondary text-secondary-foreground'
                                        }`}>
                                            {msg.sender === MessageSender.USER ? <UserIcon className="w-5 h-5"/> : <BotIcon className="w-5 h-5"/>}
                                        </div>
                                        <div className={`flex-1 max-w-[80%] ${
                                            msg.sender === MessageSender.USER ? 'items-end' : 'items-start'
                                        } flex flex-col gap-2`}>
                                            {(() => {
                                                // Parsear blocos de código apenas para mensagens do bot
                                                const parts = msg.sender === MessageSender.BOT 
                                                    ? parseCodeBlocks(msg.text)
                                                    : [{ type: 'text' as const, content: msg.text }];
                                                
                                                return parts.map((part, partIndex) => {
                                                    if (part.type === 'code') {
                                                        return (
                                                            <CodeBlock
                                                                key={`code-${msg.id}-${partIndex}`}
                                                                code={part.content}
                                                                language={part.language}
                                                                className="w-full"
                                                            />
                                                        );
                                                    } else {
                                                        return (
                                                            <Card 
                                                                key={`text-${msg.id}-${partIndex}`}
                                                                className={`p-3 ${
                                                                    msg.sender === MessageSender.USER 
                                                                        ? 'bg-primary text-primary-foreground border-primary/20' 
                                                                        : msg.sender === MessageSender.SYSTEM
                                                                        ? 'bg-warning/10 text-warning-foreground border-warning/20'
                                                                        : 'bg-card border-border'
                                                                }`}
                                                            >
                                                                <p className={`text-sm whitespace-pre-wrap ${
                                                                    msg.sender === MessageSender.USER ? 'text-primary-foreground' : ''
                                                                }`}>
                                                                    {part.content}
                                                                </p>
                                                            </Card>
                                                        );
                                                    }
                                                });
                                            })()}
                                        </div>
                                    </motion.div>
                                )
                            ))}
                            {showFeedback && currentConversationId && (
                                <ConversationFeedback
                                    conversationId={currentConversationId}
                                    onSubmitted={() => setShowFeedback(false)}
                                    onSkip={() => setShowFeedback(false)}
                                />
                            )}
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex gap-3"
                                >
                                    <div className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">
                                        <BotIcon className="w-5 h-5"/>
                                    </div>
                                    <Card className="p-3 bg-card border-border">
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                        </div>
                                    </Card>
                                </motion.div>
                            )}
                        </div>
                        <div ref={messagesEndRef} />
                    </div>
                    <footer className={`p-4 border-t border-border bg-background ${inline ? 'rounded-b-lg' : ''}`}>
                        <form onSubmit={handleSend} className="flex items-center gap-2">
                            <Input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Digite sua mensagem..."
                                className="flex-1"
                                disabled={isLoading}
                            />
                            <Button 
                                type="submit" 
                                size="icon"
                                disabled={isLoading || !input.trim()}
                            >
                                <SendIcon className="w-5 h-5"/>
                            </Button>
                        </form>
                    </footer>
                    </motion.div>
                )}
            </AnimatePresence>
      
      {emailRequestModal && (
        <EmailRequestModal
        isOpen={!!emailRequestModal}
        onClose={() => {
          setEmailRequestModal(null);
          setPendingOrderSearch(null);
        }}
        onSubmit={async (email) => {
          if (pendingOrderSearch) {
            setEmailRequestModal(null);
            addMessage(`Buscando pedido #${pendingOrderSearch} com o email fornecido...`, MessageSender.BOT);
            
            const trackingInfo = await supportService.trackOrder(pendingOrderSearch, email);
            
            if (trackingInfo.order) {
              renderComponentInChat(<OrderList orders={[trackingInfo.order]} />);
              addMessage(trackingInfo.details, MessageSender.BOT);
            } else if (trackingInfo.orders && trackingInfo.orders.length > 1) {
              // Múltiplos pedidos encontrados
              setSelectedOrders(trackingInfo.orders);
              setShowOrderSelection(true);
              addMessage(`Encontrei ${trackingInfo.orders.length} pedidos associados ao seu email. Por favor, selecione qual pedido deseja consultar.`, MessageSender.BOT);
            } else {
              addMessage(
                `Não foi possível encontrar o pedido #${pendingOrderSearch} associado ao email ${email}. ` +
                `Verifique se o código do pedido e o email estão corretos.`,
                MessageSender.BOT
              );
            }
            
            setPendingOrderSearch(null);
          }
        }}
        orderId={emailRequestModal.orderId}
        reason={emailRequestModal.reason}
        />
      )}
      
      <OrderSelectionModal
        isOpen={showOrderSelection}
        orders={selectedOrders}
        allowMultiple={true}
        onSelect={(orderOrOrders) => {
          setShowOrderSelection(false);
          // Verificar se é array (múltiplos) ou objeto único
          const ordersArray = Array.isArray(orderOrOrders) ? orderOrOrders : [orderOrOrders];
          
          // Renderizar informações dos pedidos selecionados
          renderComponentInChat(<OrderList orders={ordersArray} />);
          
          if (ordersArray.length === 1) {
            const order = ordersArray[0];
            const orderDetails = supportService.formatOrderDetails(order);
            addMessage(`Informações do pedido selecionado:\n\n${orderDetails}`, MessageSender.BOT);
            // Adicionar orderNumber aos mencionados
            if (order.order_number && !mentionedOrderNumbers.includes(order.order_number)) {
              setMentionedOrderNumbers(prev => [...prev, order.order_number]);
            }
          } else {
            // Múltiplos pedidos selecionados
            const orderNumbers = ordersArray.map(o => o.order_number).filter(Boolean);
            addMessage(
              `Informações dos ${ordersArray.length} pedidos selecionados:\n\n` +
              ordersArray.map(order => {
                const details = supportService.formatOrderDetails(order);
                return `📦 Pedido ${order.order_number}:\n${details}`;
              }).join('\n\n---\n\n'),
              MessageSender.BOT
            );
            // Adicionar todos os orderNumbers aos mencionados
            orderNumbers.forEach(orderNumber => {
              if (orderNumber && !mentionedOrderNumbers.includes(orderNumber)) {
                setMentionedOrderNumbers(prev => [...prev, orderNumber]);
              }
            });
          }
        }}
        onClose={() => {
          setShowOrderSelection(false);
          setSelectedOrders([]);
        }}
      />
    </>
  );
};
