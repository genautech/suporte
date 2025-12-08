// Fix: Implement the Chatbot component.
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, MessageSender, ConversationMessage } from '../types';
import { getGeminiResponse, searchIntelligentFAQ } from '../services/geminiService';
import { supportService } from '../services/supportService';
import { conversationService } from '../services/conversationService';
import { extractQuestionFromMessage, hasQuestionBeenAsked, addAskedQuestion } from '../services/questionTracker';
import { defaultResponseService } from '../services/defaultResponseService';
import { validateResponsePrivacy } from '../services/privacyFilter';
import { companyService } from '../services/companyService';
import { userService } from '../services/userService';
import { storageService } from '../services/storageService';
import { MessageIcon, CloseIcon, SendIcon, UserIcon, BotIcon, CopyIcon } from './Icons';
import { ExchangeForm } from './ExchangeForm';
import { SupportTicketFormAdvanced } from './SupportTicketFormAdvanced';
import { ConversationFeedback } from './ConversationFeedback';
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
    const [sessionId, setSessionId] = useState<string>('');
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [attemptsWithoutResolution, setAttemptsWithoutResolution] = useState(0);
    const [isReturningUser, setIsReturningUser] = useState(false);
    const [mentionedOrderNumbers, setMentionedOrderNumbers] = useState<string[]>([]);
    const [conversationHistory, setConversationHistory] = useState<any[]>([]);
    const [showFeedback, setShowFeedback] = useState(false);
    const [companyGreeting, setCompanyGreeting] = useState<string>('Olá! 👋 Sou o assistente virtual. Como posso te ajudar hoje?');
    const [botMessagesWithoutReply, setBotMessagesWithoutReply] = useState(0);
    const [isSearching, setIsSearching] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const messageIdCounter = useRef<number>(0);
    const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
    const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }
        };
    }, []);
    
    // Monitorar mensagens do bot sem resposta e encerrar após 2 mensagens
    useEffect(() => {
        if (botMessagesWithoutReply >= 2 && (isOpen || inline)) {
            // Limpar timer anterior se existir
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }
            
            // Aguardar 5 segundos antes de encerrar
            inactivityTimerRef.current = setTimeout(() => {
                addMessage(
                    "Vejo que você não está respondendo. Você pode continuar o atendimento quando quiser! 😊\n\n" +
                    "Basta enviar uma nova mensagem e eu estarei aqui para ajudar.",
                    MessageSender.SYSTEM
                );
                // Colapsar chat se não for inline
                if (!inline) {
                    setIsOpen(false);
                }
                setBotMessagesWithoutReply(0);
            }, 5000);
            
            return () => {
                if (inactivityTimerRef.current) {
                    clearTimeout(inactivityTimerRef.current);
                }
            };
        }
    }, [botMessagesWithoutReply, isOpen, inline]);

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
                supportService.getTicketsByUser({ email: user.email, phone: user.phone })
            ]).then(([lastConv, tickets]) => {
                if (lastConv) {
                    setIsReturningUser(true);
                    // Carregar histórico recente
                    conversationService.getConversationHistory(user.email, 3).then((history) => {
                        setConversationHistory(history);
                    });
                }
                
                // Armazenar tickets para uso na mensagem inicial
                // Filtrar apenas tickets não resolvidos
                const unresolvedTickets = tickets.filter(t => 
                    t.status !== 'resolvido' && t.status !== 'fechado' && t.status !== 'arquivado'
                );

                if (unresolvedTickets.length > 0) {
                    setConversationHistory(prev => [
                        ...prev,
                        {
                            unresolvedTickets,
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
            const contextData = conversationHistory.find((h: any) => h.unresolvedTickets);
            const unresolvedTickets = contextData?.unresolvedTickets || [];
            
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
            
            if (unresolvedTickets.length === 0) {
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
    const saveConversation = async (
        resolved: boolean = false,
        overrideMessages?: Message[]
    ) => {
        const sourceMessages = overrideMessages ?? messages;
        if (!user.email || sourceMessages.length === 0) return;
        
        try {
            // Registrar interação de chat no userService
            await userService.recordChatInteraction(user.email);
            
            // Buscar supportUserId se existir
            const supportUser = await userService.getUserByEmail(user.email);
            const supportUserId = supportUser?.id;
            
            const conversationMessages: ConversationMessage[] = sourceMessages
                .filter(m => m.sender !== MessageSender.SYSTEM || !m.component)
                .map(m => ({
                    text: m.text,
                    sender: m.sender,
                    timestamp: Date.now(),
                    orderNumbers: supportService.extractOrderNumbers(m.text),
                }));
            
            const allOrderNumbers = Array.from(
                new Set(conversationMessages.flatMap(m => m.orderNumbers || []))
            );
            
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

    // Função para copiar mensagem
    const handleCopyMessage = async (messageText: string, messageId: string) => {
        try {
            await navigator.clipboard.writeText(messageText);
            setCopiedMessageId(messageId);
            setTimeout(() => setCopiedMessageId(null), 2000);
        } catch (error) {
            // Fallback para navegadores mais antigos
            const textArea = document.createElement('textarea');
            textArea.value = messageText;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setCopiedMessageId(messageId);
                setTimeout(() => setCopiedMessageId(null), 2000);
            } catch (err) {
                console.error('Erro ao copiar:', err);
            }
            document.body.removeChild(textArea);
        }
    };

    // Função para lidar com upload de imagem
    const handleImageUpload = async (file: File) => {
        try {
            const userId = user.email || 'anonymous';
            const imageUrl = await storageService.uploadChatImage(file, userId);
            
            // Adicionar imagem como mensagem ou inserir URL no input
            const imageMessage = `![${file.name}](${imageUrl})`;
            setInput(prev => prev ? `${prev} ${imageMessage}` : imageMessage);
            
            // Opcionalmente, enviar automaticamente ou apenas inserir no input
            // Por enquanto, apenas inserir no input para o usuário revisar
        } catch (error) {
            console.error('Erro ao fazer upload da imagem:', error);
            addMessage('Erro ao fazer upload da imagem. Por favor, tente novamente.', MessageSender.BOT);
        }
    };

    // Função para detectar e processar URL arrastada
    const handleDroppedText = (text: string) => {
        // Verificar se é uma URL
        const urlPattern = /(https?:\/\/[^\s]+)/g;
        const urls = text.match(urlPattern);
        
        if (urls && urls.length > 0) {
            // Se for URL, inserir como link markdown
            const urlText = urls[0];
            setInput(prev => prev ? `${prev} ${urlText}` : urlText);
        } else {
            // Se não for URL, apenas inserir o texto
            setInput(prev => prev ? `${prev} ${text}` : text);
        }
    };
    
    const handleFunctionCall = async (response: GenerateContentResponse) => {
        const functionCalls = response.functionCalls;
        let ticketOpened = false;
        
        if (!functionCalls || functionCalls.length === 0) {
            if (response.text) {
                addMessage(response.text, MessageSender.BOT);
            }
            // Incrementar tentativas se não encontrou solução
            if (!ticketOpened) {
                setAttemptsWithoutResolution(prev => prev + 1);
            }
            return;
        }

        for (const call of functionCalls) {
            switch (call.name) {
                case 'findCustomerOrders':
                    // Não buscar pedidos - apenas solicitar número do pedido
                    addMessage("Para que eu possa te ajudar, preciso do número do pedido. Por favor, informe o código do pedido.", MessageSender.BOT);
                    break;
                case 'trackOrder':
                    // Não buscar pedidos - apenas abrir chamado com o número do pedido fornecido
                    const { orderId } = call.args;
                    ticketOpened = true;
                    setAttemptsWithoutResolution(0);
                    const orderNumber = orderId ? (orderId as string) : undefined;
                    // Abrir chamado automaticamente com o número do pedido (se fornecido)
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
                    setIsSearching(true);
                    addMessage(`Buscando informações sobre "${query}"... 🔍`, MessageSender.BOT);
                    
                    try {
                        const intelligentResult = await searchIntelligentFAQ(query, companyId);
                        setIsSearching(false);
                        
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
                        setIsSearching(false);
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
        saveConversation(ticketOpened).catch(err => {
            console.error('[Chatbot] Erro ao salvar conversa (não crítico):', err);
        });
        
        // Aprendizado automático após conversa bem-sucedida (não bloqueante)
        if (ticketOpened) {
            // Processar aprendizado automático em background
            Promise.all([
                import('../services/autoLearningService'),
                import('../services/customerKnowledgeService')
            ]).then(([{ autoLearningService }, { customerKnowledgeService }]) => {
                if (currentConversationId) {
                    // Verificar se conversa é bem-sucedida e aprender automaticamente
                    conversationService.getConversationById(currentConversationId)
                        .then(conversation => {
                            if (conversation && autoLearningService.isSuccessfulConversation(conversation)) {
                                const knowledge = autoLearningService.extractKnowledgeFromConversation(conversation);
                                if (knowledge && knowledge.confidence >= 0.6) {
                                    customerKnowledgeService.addKnowledgeEntry(
                                        user.email,
                                        {
                                            content: `P: ${knowledge.question}\nR: ${knowledge.answer}`,
                                            source: 'conversation',
                                            sourceId: currentConversationId,
                                            tags: ['auto_learning', `confidence_${Math.round(knowledge.confidence * 10)}`],
                                        },
                                        companyId
                                    ).catch(err => {
                                        console.error('[Chatbot] Erro no aprendizado automático (não crítico):', err);
                                    });
                                }
                            }
                        })
                        .catch(err => {
                            console.error('[Chatbot] Erro ao verificar conversa para aprendizado (não crítico):', err);
                        });
                }
            }).catch(err => {
                console.error('[Chatbot] Erro ao importar serviços de aprendizado (não crítico):', err);
            });
        }
        
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
        const newMessage: Message = {
            id: `msg-${Date.now()}-${++messageIdCounter.current}`,
            text: text,
            sender,
        };
        setMessages(prev => [...prev, newMessage]);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
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

        // Garantir que a conversa exista antes de processar respostas (necessário para rastrear perguntas)
        if (!currentConversationId) {
            try {
                await saveConversation(false, enrichedMessages);
            } catch (error) {
                console.error('[Chatbot] Erro ao inicializar conversa:', error);
            }
        }
        
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
        
        // Buscar conversa atual para verificar perguntas já feitas
        let currentConversation = null;
        let askedQuestions: string[] = [];
        if (currentConversationId) {
            try {
                currentConversation = await conversationService.getConversationById(currentConversationId);
                askedQuestions = currentConversation?.askedQuestions || [];
            } catch (error) {
                console.error('[Chatbot] Erro ao buscar conversa para verificar perguntas:', error);
            }
        }
        
        // Verificar se há resposta padrão para esta pergunta
        let defaultResponseFound: string | null = null;
        if (companyId) {
            try {
                const matchingResponse = await defaultResponseService.findMatchingResponse(
                    userMessage,
                    companyId,
                    0.7 // Threshold de 70% de similaridade
                );
                
                if (matchingResponse) {
                    defaultResponseFound = matchingResponse.answer;
                    // Incrementar contador de uso
                    if (matchingResponse.id) {
                        await defaultResponseService.incrementUsage(matchingResponse.id);
                    }
                    console.log('[Chatbot] Resposta padrão encontrada:', matchingResponse.question);
                }
            } catch (error) {
                console.error('[Chatbot] Erro ao buscar resposta padrão:', error);
            }
        }
        
        // Se encontrou resposta padrão, usar diretamente
        if (defaultResponseFound) {
            // Validar privacidade da resposta
            const validation = validateResponsePrivacy(
                defaultResponseFound,
                userEmailToPass,
                mentionedOrderNumbers
            );
            
            if (validation.isValid) {
                addMessage(validation.sanitized, MessageSender.BOT);
                setAttemptsWithoutResolution(0); // Reset ao encontrar resposta
                return;
            } else {
                console.warn('[Chatbot] Resposta padrão contém dados não autorizados, usando Gemini:', validation.issues);
            }
        }
        
        const response = await getGeminiResponse(
            enrichedMessages, 
            userMessage + contextInfo,
            companyId,
            userEmailToPass,
            askedQuestions // Passar perguntas já feitas para evitar repetição
        );
        setIsLoading(false);

        if (response) {
            await handleFunctionCall(response);
            
            // Após processar resposta, verificar se contém pergunta e rastrear
            // Aguardar um pouco para garantir que a mensagem foi adicionada
            setTimeout(async () => {
                try {
                    if (!currentConversationId) return;
                    
                    // Buscar conversa atualizada para pegar última mensagem do bot
                    const updatedConversation = await conversationService.getConversationById(currentConversationId);
                    if (!updatedConversation) return;
                    
                    const botMessages = updatedConversation.messages.filter(m => m.sender === 'bot');
                    const lastBotMessage = botMessages[botMessages.length - 1];
                    
                    if (lastBotMessage && lastBotMessage.text) {
                        const questionInResponse = extractQuestionFromMessage(lastBotMessage.text);
                        
                        // Se contém pergunta nova, adicionar à lista
                        if (questionInResponse) {
                            const currentAskedQuestions = updatedConversation.askedQuestions || [];
                            
                            // Verificar se já foi feita antes
                            if (!hasQuestionBeenAsked(questionInResponse, currentAskedQuestions)) {
                                const updatedAskedQuestions = addAskedQuestion(questionInResponse, currentAskedQuestions);
                                await conversationService.updateConversation(currentConversationId, {
                                    askedQuestions: updatedAskedQuestions
                                });
                                console.log('[Chatbot] Pergunta rastreada:', questionInResponse);
                            }
                        }
                    }
                } catch (error) {
                    console.error('[Chatbot] Erro ao rastrear pergunta:', error);
                }
            }, 500);
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
                    <div 
                        className={`flex-1 p-4 overflow-y-auto bg-gradient-to-b from-background to-muted/20 ${inline ? 'min-h-[500px]' : ''} ${isDragging ? 'bg-primary/5 border-2 border-dashed border-primary rounded-lg' : ''} transition-all duration-200 relative`}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isDragging) setIsDragging(true);
                        }}
                        onDragLeave={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Só desativar se realmente saiu da área (não apenas de um filho)
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            const x = e.clientX;
                            const y = e.clientY;
                            if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                                setIsDragging(false);
                            }
                        }}
                        onDrop={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDragging(false);

                            const dataTransfer = e.dataTransfer;
                            if (!dataTransfer) {
                                return;
                            }
                            const items: DataTransferItem[] = [];
                            for (let index = 0; index < dataTransfer.items.length; index++) {
                                const item = dataTransfer.items[index];
                                if (item) {
                                    items.push(item);
                                }
                            }
                            
                            // Processar arquivos (imagens)
                            const files: File[] = [];
                            for (let index = 0; index < dataTransfer.files.length; index++) {
                                const file = dataTransfer.files[index];
                                if (file) {
                                    files.push(file);
                                }
                            }
                            const imageFiles = files.filter(file => file.type.startsWith('image/'));
                            
                            if (imageFiles.length > 0) {
                                for (const file of imageFiles) {
                                    await handleImageUpload(file);
                                }
                                return;
                            }

                            // Processar texto/URLs
                            for (const item of items) {
                                if (item.kind === 'string') {
                                    const text = await new Promise<string>((resolve) => {
                                        item.getAsString(resolve);
                                    });
                                    handleDroppedText(text);
                                }
                            }
                        }}
                    >
                        {/* Indicador visual de drag & drop */}
                        {isDragging && (
                            <div className="absolute inset-0 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg z-10 pointer-events-none">
                                <div className="text-center">
                                    <p className="text-primary font-medium text-lg mb-2">Solte aqui para enviar</p>
                                    <p className="text-muted-foreground text-sm">Imagens ou URLs</p>
                                </div>
                            </div>
                        )}
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
                                                                className={`p-3 relative group ${
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
                                                                {/* Botão de copiar - aparece no hover */}
                                                                <button
                                                                    onClick={() => handleCopyMessage(part.content, msg.id)}
                                                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 rounded hover:bg-black/10 hover:scale-110 z-10"
                                                                    title="Copiar mensagem"
                                                                    aria-label="Copiar mensagem"
                                                                >
                                                                    {copiedMessageId === msg.id ? (
                                                                        <span className="text-xs text-green-600 font-bold flex items-center gap-1">
                                                                            <span>✓</span>
                                                                            <span>Copiado!</span>
                                                                        </span>
                                                                    ) : (
                                                                        <CopyIcon className={`w-4 h-4 ${msg.sender === MessageSender.USER ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                                                                    )}
                                                                </button>
                                                            </Card>
                                                        );
                                                    }
                                                });
                                            })()}
                                        </div>
                                    </motion.div>
                                )
                            ))}
                            
                            {/* Indicador de loading durante buscas */}
                            {isSearching && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-3 flex-row"
                                >
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-secondary text-secondary-foreground">
                                        <BotIcon className="w-5 h-5"/>
                                    </div>
                                    <div className="flex-1 max-w-[80%] flex flex-col gap-2">
                                        <Card className="p-3 bg-card border-border">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                                <p className="text-sm text-muted-foreground">
                                                    Estou consultando informações...
                                                </p>
                                            </div>
                                        </Card>
                                    </div>
                                </motion.div>
                            )}
                            
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
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onPaste={async (e) => {
                                    const clipboardData = e.clipboardData;
                                    if (!clipboardData) {
                                        return;
                                    }
                                    const items: DataTransferItem[] = [];
                                    for (let index = 0; index < clipboardData.items.length; index++) {
                                        const item = clipboardData.items[index];
                                        if (item) {
                                            items.push(item);
                                        }
                                    }
                                    
                                    // Verificar se há imagens coladas
                                    const imageItems = items.filter(item => item.type.startsWith('image/'));
                                    if (imageItems.length > 0) {
                                        e.preventDefault();
                                        for (const item of imageItems) {
                                            const file = item.getAsFile();
                                            if (file) {
                                                await handleImageUpload(file);
                                            }
                                        }
                                        return;
                                    }

                                    // Se não for imagem, permitir paste normal (comportamento padrão)
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                onDrop={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    const dataTransfer = e.dataTransfer;
                                    if (!dataTransfer) {
                                        return;
                                    }
                                    const items: DataTransferItem[] = [];
                                    for (let index = 0; index < dataTransfer.items.length; index++) {
                                        const item = dataTransfer.items[index];
                                        if (item) {
                                            items.push(item);
                                        }
                                    }
                                    
                                    // Processar arquivos (imagens)
                                    const files: File[] = [];
                                    for (let index = 0; index < dataTransfer.files.length; index++) {
                                        const file = dataTransfer.files[index];
                                        if (file) {
                                            files.push(file);
                                        }
                                    }
                                    const imageFiles = files.filter(file => file.type.startsWith('image/'));
                                    
                                    if (imageFiles.length > 0) {
                                        for (const file of imageFiles) {
                                            await handleImageUpload(file);
                                        }
                                        return;
                                    }

                                    // Processar texto/URLs
                                    for (const item of items) {
                                        if (item.kind === 'string') {
                                            const text = await new Promise<string>((resolve) => {
                                                item.getAsString(resolve);
                                            });
                                            handleDroppedText(text);
                                        }
                                    }
                                }}
                                placeholder="Digite sua mensagem... (ou arraste imagens/URLs aqui)"
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
      
    </>
  );
};
