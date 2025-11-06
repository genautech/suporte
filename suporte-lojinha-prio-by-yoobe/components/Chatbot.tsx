// Fix: Implement the Chatbot component.
import React, { useState, useRef, useEffect } from 'react';
import { Message, MessageSender } from '../types';
import { getGeminiResponse } from '../services/geminiService';
import { supportService } from '../services/supportService';
import { MessageIcon, CloseIcon, SendIcon, UserIcon, BotIcon } from './Icons';
import { ExchangeForm } from './ExchangeForm';
import { SupportTicketForm } from './SupportTicketForm';
import { GenerateContentResponse } from '@google/genai';

interface ChatbotProps {
    user: { name: string; email: string; phone: string; };
    onTicketCreated?: () => void;
}

export const Chatbot: React.FC<ChatbotProps> = ({ user, onTicketCreated }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isOpen]);

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([
                { id: 'welcome', text: 'Olá! 👋 Sou o assistente virtual da Lojinha Prio. Como posso te ajudar hoje? Você pode rastrear um pedido, solicitar uma troca ou tirar dúvidas.', sender: MessageSender.BOT }
            ]);
        }
    }, [isOpen, messages.length]);

    const handleFormSubmit = (formType: 'exchange' | 'ticket', data: any) => {
        const confirmationText = formType === 'exchange'
            ? `Sua solicitação de troca para o pedido ${data.orderId} foi enviada. Entraremos em contato por e-mail.`
            : `Seu chamado de suporte foi criado com sucesso! O ID é #${data.substring(0, 6)}. Nossa equipe entrará em contato em breve.`;
        
        const newSystemMessage: Message = {
            id: Date.now().toString(),
            text: confirmationText,
            sender: MessageSender.SYSTEM,
        };
        setMessages(prev => prev.filter(m => m.component == null).concat(newSystemMessage));
        if(formType === 'ticket' && onTicketCreated) {
            onTicketCreated();
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
        if (!functionCalls || functionCalls.length === 0) {
            if (response.text) {
                addMessage(response.text, MessageSender.BOT);
            }
            return;
        }

        for (const call of functionCalls) {
            switch (call.name) {
                case 'trackOrder':
                    const { orderId } = call.args;
                    // Fix: Cast `orderId` from `unknown` to `string` for the service call.
                    const trackingInfo = await supportService.trackOrder(orderId as string);
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
                    renderComponentInChat(
                        <SupportTicketForm
                           initialData={{ name: user.name, email: user.email, phone: user.phone }}
                           onSubmit={(ticketId) => handleFormSubmit('ticket', ticketId)}
                           onClose={() => setMessages(prev => prev.filter(m => m.component == null))}
                        />
                    );
                    break;
                case 'searchFAQ':
                    // Fix: Cast `query` from `unknown` to `string` for the service call.
                    const faqResult = await supportService.searchFAQ(call.args.query as string);
                    addMessage(faqResult, MessageSender.BOT);
                    break;
                case 'escalateToHuman':
                     addMessage("Entendi. Um de nossos atendentes entrará em contato com você por e-mail em breve para dar continuidade ao seu atendimento.", MessageSender.BOT);
                    break;
                default:
                    addMessage("Desculpe, não consegui processar essa ação.", MessageSender.BOT);
            }
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
        setInput('');
        setIsLoading(true);

        const response = await getGeminiResponse(messages, userMessage);
        setIsLoading(false);

        if (response) {
            await handleFunctionCall(response);
        } else {
            addMessage('Desculpe, ocorreu um erro. Por favor, tente novamente.', MessageSender.BOT);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-5 right-5 bg-primary text-primary-content rounded-full p-4 shadow-lg hover:bg-primary-focus transition-transform transform hover:scale-110 z-50"
                aria-label="Toggle Chat"
            >
                {isOpen ? <CloseIcon className="w-8 h-8" /> : <MessageIcon className="w-8 h-8" />}
            </button>
            {isOpen && (
                <div className="fixed bottom-20 right-5 w-full max-w-sm h-[60vh] bg-white rounded-lg shadow-2xl flex flex-col animate-fade-in-up z-40 border">
                    <header className="bg-primary text-primary-content p-4 rounded-t-lg flex justify-between items-center">
                        <h3 className="font-bold">Suporte Lojinha Prio</h3>
                    </header>
                    <div className="flex-1 p-4 overflow-y-auto bg-base-200">
                        <div className="space-y-4">
                            {messages.map((msg) => (
                                msg.component ? (
                                    <div key={msg.id}>{msg.component}</div>
                                ) : (
                                    <div key={msg.id} className={`chat ${msg.sender === MessageSender.USER ? 'chat-end' : 'chat-start'}`}>
                                        <div className="chat-image avatar">
                                            <div className="w-10 rounded-full bg-neutral text-neutral-content flex items-center justify-center">
                                               {msg.sender === MessageSender.USER ? <UserIcon className="w-6 h-6"/> : <BotIcon className="w-6 h-6"/>}
                                            </div>
                                        </div>
                                        <div className={`chat-bubble ${msg.sender === MessageSender.USER ? 'chat-bubble-primary' : ''} ${msg.sender === MessageSender.SYSTEM ? 'chat-bubble-warning text-sm' : ''}`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                )
                            ))}
                            {isLoading && (
                                <div className="chat chat-start">
                                    <div className="chat-image avatar">
                                        <div className="w-10 rounded-full bg-neutral text-neutral-content flex items-center justify-center">
                                            <BotIcon className="w-6 h-6"/>
                                        </div>
                                    </div>
                                    <div className="chat-bubble">
                                        <span className="loading loading-dots loading-md"></span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div ref={messagesEndRef} />
                    </div>
                    <footer className="p-4 border-t bg-white">
                        <form onSubmit={handleSend} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Digite sua mensagem..."
                                className="input input-bordered flex-1"
                                disabled={isLoading}
                            />
                            <button type="submit" className="btn btn-primary" disabled={isLoading || !input.trim()}>
                                <SendIcon className="w-5 h-5"/>
                            </button>
                        </form>
                    </footer>
                </div>
            )}
        </>
    );
};
