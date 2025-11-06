// Fix: Implement the Chatbot component.
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, MessageSender, ConversationMessage } from '../types';
import { getGeminiResponse, searchIntelligentFAQ } from '../services/geminiService';
import { supportService } from '../services/supportService';
import { conversationService } from '../services/conversationService';
import { companyService } from '../services/companyService';
import { MessageIcon, CloseIcon, SendIcon, UserIcon, BotIcon } from './Icons';
import { ExchangeForm } from './ExchangeForm';
import { SupportTicketFormAdvanced } from './SupportTicketFormAdvanced';
import { OrderList } from './OrderList';
import { EmailRequestModal } from './EmailRequestModal';
import { ConversationFeedback } from './ConversationFeedback';
import { GenerateContentResponse } from '@google/genai';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';

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
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isOpen]);

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
        
        // Verificar se é usuário retornante
        if (user.email) {
            conversationService.getLastConversation(user.email).then((lastConv) => {
                if (lastConv) {
                    setIsReturningUser(true);
                    // Carregar histórico recente
                    conversationService.getConversationHistory(user.email, 3).then((history) => {
                        setConversationHistory(history);
                    });
                }
            });
        }
    }, [user.email, companyId]);

    useEffect(() => {
        if ((isOpen || inline) && messages.length === 0) {
            let welcomeMessage = companyGreeting;
            
            if (isReturningUser && user.name) {
                welcomeMessage = `${companyGreeting}\n\nOlá novamente, ${user.name}! 👋 Que bom te ver de volta!`;
                
                // Adicionar contexto sobre conversas anteriores se houver pedidos mencionados
                if (conversationHistory.length > 0) {
                    const lastConv = conversationHistory[0];
                    if (lastConv.orderNumbers && lastConv.orderNumbers.length > 0) {
                        welcomeMessage += `\n\nVi que você teve uma conversa anterior sobre o${lastConv.orderNumbers.length > 1 ? 's pedido' : ' pedido'} ${lastConv.orderNumbers.join(', ')}.`;
                    }
                }
            }
            
            welcomeMessage += '\n\nVocê pode rastrear um pedido, solicitar uma troca ou tirar dúvidas.';
            
            setMessages([
                { id: 'welcome', text: welcomeMessage, sender: MessageSender.BOT }
            ]);
        }
    }, [isOpen, inline, messages.length, isReturningUser, user.name, conversationHistory, companyGreeting]);

    const handleFormSubmit = async (formType: 'exchange' | 'ticket', data: any) => {
        const confirmationText = formType === 'exchange'
            ? `Sua solicitação de troca para o pedido ${data.orderId} foi enviada. Entraremos em contato por e-mail.`
            : `Seu chamado de suporte foi criado com sucesso! O ID é #${data.substring(0, 6)}. Nossa equipe entrará em contato em breve.`;
        
        const newSystemMessage: Message = {
            id: Date.now().toString(),
            text: confirmationText,
            sender: MessageSender.SYSTEM,
        };
        setMessages(prev => prev.filter(m => m.component == null).concat(newSystemMessage));
        
        // Resetar tentativas quando resolve ou abre chamado
        setAttemptsWithoutResolution(0);
        
        // Salvar conversa após resolução/chamado
        if (user.email && currentConversationId) {
            await saveConversation(true);
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
            }
            
            setMentionedOrderNumbers(allOrderNumbers);
        } catch (error) {
            console.error('[Chatbot] Erro ao salvar conversa:', error);
        }
    };
    
    const renderComponentInChat = (component: React.ReactNode) => {
        const newComponentMessage: Message = {
            id: Date.now().toString(),
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
                    // O usuário pode fornecer código do pedido OU email
                    const searchValue = (orderId as string) || (customerEmail as string) || '';
                    // Email é OPCIONAL: só usar se fornecido explicitamente ou se buscar por email
                    // Se buscar por código do pedido sem email, não validar email
                    const providedEmail = customerEmail as string | undefined;
                    
                    // Feedback imediato ao usuário
                    if (orderId) {
                        addMessage(`Buscando informações do pedido ${orderId}... 🔍`, MessageSender.BOT);
                    } else {
                        addMessage('Buscando seus pedidos... 🔍', MessageSender.BOT);
                    }
                    
                    // Se tem orderId, buscar pedido específico; se não, buscar por email
                    const trackingInfo = await supportService.trackOrder(searchValue, providedEmail || user.email);
                    
                    // Se pedido não encontrado e não há email fornecido, solicitar email
                    if (trackingInfo.status === 'Não encontrado' && orderId && !providedEmail && !user.email) {
                        setPendingOrderSearch(orderId);
                        setEmailRequestModal({
                            orderId: orderId,
                            reason: 'Para encontrar seu pedido, precisamos confirmar seu email. Por favor, informe o email usado na compra.'
                        });
                        addMessage(`Não encontrei o pedido #${orderId} sem validação de email. Vou solicitar seu email para continuar a busca.`, MessageSender.BOT);
                        break;
                    }
                    
                    // Se pedido não encontrado mesmo com email, informar
                    if (trackingInfo.status === 'Não encontrado') {
                        addMessage(
                            `Não foi possível encontrar o pedido #${orderId}. ` +
                            `Verifique se o código está correto ou entre em contato conosco para mais informações.`,
                            MessageSender.BOT
                        );
                        setAttemptsWithoutResolution(prev => prev + 1);
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
                    
                    // Renderizar componente visual para melhor visualização das informações
                    if (trackingInfo.orders && trackingInfo.orders.length > 0) {
                        // Múltiplos pedidos encontrados - renderizar lista
                        renderComponentInChat(<OrderList orders={trackingInfo.orders} />);
                    } else if (trackingInfo.order) {
                        // Pedido único encontrado - renderizar também para melhor visualização
                        renderComponentInChat(<OrderList orders={[trackingInfo.order]} />);
                    }
                    
                    // Adicionar mensagem formatada com todas as informações
                    addMessage(trackingInfo.details, MessageSender.BOT);
                    break;
                case 'initiateExchange':
                    renderComponentInChat(
                        <ExchangeForm 
                            // Fix: Cast `orderId` from `unknown` to `string | undefined` for the component prop.
                            orderId={call.args.orderId as string | undefined} 
                            onSubmit={(data) => handleFormSubmit('exchange', data)}
                            onClose={() => setMessages(prev => prev.filter(m => m.component == null))}
                        />
                    );
                    break;
                case 'openSupportTicket':
                    ticketOpened = true;
                    setAttemptsWithoutResolution(0); // Reset ao abrir chamado
                    const orderNumberFromCall = (call.args.orderNumber as string | undefined);
                    const subjectFromCall = (call.args.subject as string | undefined) || 'outro';
                    const orderNumber = orderNumberFromCall || (mentionedOrderNumbers.length > 0 ? mentionedOrderNumbers[0] : undefined);
                    renderComponentInChat(
                        <SupportTicketFormAdvanced
                           initialData={{ 
                               name: user.name, 
                               email: user.email, 
                               phone: user.phone,
                               orderNumber: orderNumber
                           }}
                           defaultSubject={subjectFromCall as any}
                           onSubmit={(ticketId) => handleFormSubmit('ticket', ticketId)}
                           onClose={() => setMessages(prev => prev.filter(m => m.component == null))}
                        />
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
                                setTimeout(() => {
                                    addMessage(
                                        "Não encontrei uma resposta completa para sua pergunta. Gostaria de abrir um chamado para nossa equipe te ajudar pessoalmente?",
                                        MessageSender.BOT
                                    );
                                }, 1000);
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
            setTimeout(() => {
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
                                renderComponentInChat(
                                    <SupportTicketFormAdvanced
                                       initialData={{ 
                                           name: user.name, 
                                           email: user.email, 
                                           phone: user.phone,
                                           orderNumber: orderNumber
                                       }}
                                       onSubmit={(ticketId) => handleFormSubmit('ticket', ticketId)}
                                       onClose={() => setMessages(prev => prev.filter(m => m.component == null))}
                                    />
                                );
                            }}
                            className="w-full"
                        >
                            Abrir Chamado de Suporte
                        </Button>
                    </Card>
                );
            }, 1000);
        }
    };

    const addMessage = (text: string, sender: MessageSender) => {
        const newMessage: Message = {
            id: Date.now().toString(),
            text,
            sender,
        };
        setMessages(prev => [...prev, newMessage]);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input;
        addMessage(userMessage, MessageSender.USER);
        
        // Extrair orderNumbers da mensagem do usuário
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
            id: Date.now().toString(), 
            text: userMessage, 
            sender: MessageSender.USER 
        }];
        
        // Adicionar contexto do histórico se disponível
        let contextInfo = '';
        if (conversationHistory.length > 0) {
            const lastConv = conversationHistory[0];
            if (lastConv.orderNumbers && lastConv.orderNumbers.length > 0) {
                contextInfo += `\n[Contexto: Usuário mencionou anteriormente os pedidos: ${lastConv.orderNumbers.join(', ')}]`;
            }
        }
        if (attemptsWithoutResolution > 0) {
            contextInfo += `\n[Tentativas sem resolução: ${attemptsWithoutResolution}]`;
        }
        
        const response = await getGeminiResponse(
            enrichedMessages, 
            userMessage + contextInfo
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
                                        } flex flex-col`}>
                                            <Card className={`p-3 ${
                                                msg.sender === MessageSender.USER 
                                                    ? 'bg-primary text-primary-foreground border-primary/20' 
                                                    : msg.sender === MessageSender.SYSTEM
                                                    ? 'bg-warning/10 text-warning-foreground border-warning/20'
                                                    : 'bg-card border-border'
                                            }`}>
                                                <p className={`text-sm whitespace-pre-wrap ${
                                                    msg.sender === MessageSender.USER ? 'text-primary-foreground' : ''
                                                }`}>
                                                    {msg.text}
                                                </p>
                                            </Card>
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
    </>
  );
};
