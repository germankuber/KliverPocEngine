import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, StopCircle } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';
import './ChatPage.css';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export const ChatPage = () => {
  const { id: chatId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [simulationData, setSimulationData] = useState<any>(null);
  const [appSettings, setAppSettings] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (chatId) {
      loadData(chatId);
    }
  }, [chatId]);

  const loadData = async (id: string) => {
    setIsInitialLoading(true);
    try {
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select(`
          *,
          simulations (*)
        `)
        .eq('id', id)
        .single();

      if (chatError) throw chatError;

      // Set messages from chat history
      if (chatData.messages && Array.isArray(chatData.messages)) {
        // Parse ISO date strings back to Date objects
        const parsedMessages = chatData.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(parsedMessages);
      } else {
        setMessages([]);
      }

      const simData = chatData.simulations;
      setSimulationData(simData);

      // Load the AI setting associated with this simulation
      if (simData.setting_id) {
        const { data: settingData, error: settingError } = await supabase
          .from('ai_settings')
          .select('*')
          .eq('id', simData.setting_id)
          .single();

        if (!settingError && settingData) {
          setAppSettings(settingData);
        } else {
          console.error("Error loading AI setting:", settingError);
          alert("This simulation is missing its AI configuration. Please edit the simulation and assign a valid setting.");
        }
      } else {
        alert("This simulation doesn't have an AI setting assigned. Please edit the simulation to assign one.");
      }

    } catch (error: any) {
      console.error("Error loading chat data:", error);
      alert("Chat session not found. It may have been deleted.");
      navigate('/chats');
    } finally {
      setIsInitialLoading(false);
    }
  };

  const saveMessages = async (newMessages: Message[]) => {
    if (!chatId) return;
    try {
      await supabase
        .from('chats')
        .update({ messages: newMessages })
        .eq('id', chatId);
    } catch (error) {
      console.error("Error saving messages:", error);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || !simulationData) return;

    if (!appSettings?.api_key) {
      alert("API Key is missing in Global Settings. Please configure it.");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    // Check interaction limit
    const assistantMessagesCount = updatedMessages.filter(m => m.role === 'assistant').length;
    const maxInteractions = simulationData.max_interactions || 10;

    if (assistantMessagesCount >= maxInteractions) {
      setTimeout(() => {
        const limitMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "❌ **Simulation Failed:** Maximum interaction limit reached.",
          timestamp: new Date()
        };
        const finalMessages = [...updatedMessages, limitMessage];
        setMessages(finalMessages);
        saveMessages(finalMessages);
        setIsLoading(false);
      }, 500);
      return;
    }

    try {
      // GPT-5 models (reasoning models) do not support temperature parameter
      const isReasoningModel = appSettings.model?.startsWith('gpt-5') || appSettings.model?.startsWith('o1');

      const chat = new ChatOpenAI({
        apiKey: appSettings.api_key?.trim(),
        openAIApiKey: appSettings.api_key?.trim(),
        modelName: appSettings.model || "gpt-3.5-turbo",
        ...(isReasoningModel ? {} : { temperature: 0.7 }),
        // @ts-ignore
        dangerouslyAllowBrowser: true
      });

      const rules = simulationData.rules && Array.isArray(simulationData.rules)
        ? simulationData.rules.map((r: any) => `- "${r.question}" → "${r.answer}"`).join("\n")
        : "";

      let systemMessageContent = simulationData.system_prompt || "";

      // Replace wildcards if they exist in the prompt
      systemMessageContent = systemMessageContent.replace(/{{character}}/g, simulationData.character || "")
        .replace(/{{objective}}/g, simulationData.objective || "")
        .replace(/{{context}}/g, simulationData.context || "")
        .replace(/{{rules}}/g, rules);

      // Append if wildcards were NOT used (legacy behavior / fallback)
      if (!systemMessageContent.includes(simulationData.character) && simulationData.character) {
        systemMessageContent += `\n\nCharacter: ${simulationData.character}`;
      }
      if (!systemMessageContent.includes(simulationData.objective) && simulationData.objective) {
        systemMessageContent += `\n\nObjective: ${simulationData.objective}`;
      }
      if (!systemMessageContent.includes(simulationData.context) && simulationData.context) {
        systemMessageContent += `\n\nContext: ${simulationData.context}`;
      }
      if (!systemMessageContent.includes(rules) && rules) {
        systemMessageContent += `\n\nRules: ${rules}`;
      }

      const history = [
        new SystemMessage(systemMessageContent),
        ...updatedMessages.map(m => m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content))
      ];

      // Create a temporary bot message for streaming
      const botMessageId = (Date.now() + 1).toString();
      const botMessage: Message = {
        id: botMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };

      // Add the empty bot message to UI immediately
      setMessages(prev => [...prev, botMessage]);

      const stream = await chat.stream(history);
      let fullContent = "";

      for await (const chunk of stream) {
        const content = chunk.content as string;
        if (content) {
          fullContent += content;
          setMessages(prev => prev.map(msg =>
            msg.id === botMessageId
              ? { ...msg, content: fullContent }
              : msg
          ));
        }
      }

      // Once complete, update the message with full content and save
      const finalBotMessage = { ...botMessage, content: fullContent };
      const finalMessages = [...updatedMessages, finalBotMessage];
      setMessages(finalMessages);
      saveMessages(finalMessages);

    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Error: Could not get response. " + (error as Error).message,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!chatId) return <div className="p-8">No chat selected</div>;

  if (isInitialLoading) {
    return (
      <div className="chat-page">
        <LoadingSpinner message="Loading chat..." />
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-header">
        <div className="chat-title">
          <h1><Bot className="text-primary" /> {simulationData?.name || "Simulation"}</h1>
          <p>Character: {simulationData?.character}</p>
        </div>
      </div>

      <div className="chat-container">
        <div className="messages-area">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-container">
                <Bot size={48} />
              </div>
              <h3>Start Simulation</h3>
              <p>Chatting with <strong>{simulationData?.character}</strong></p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`message-wrapper ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
                </div>
                <div className="message-bubble">
                  <div className="message-content">{msg.content}</div>
                  <div className="message-time">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && messages.length > 0 && messages[messages.length - 1].role !== 'assistant' && (
            <div className="message-wrapper assistant">
              <div className="message-avatar"><Bot size={20} /></div>
              <div className="message-bubble typing">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          <form onSubmit={handleSendMessage} className="input-form">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here..."
              rows={1}
              className="chat-input"
              disabled={isLoading}
            />
            <button
              type="submit"
              className={`send-btn ${!input.trim() || isLoading ? 'disabled' : ''}`}
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? <StopCircle size={20} /> : <Send size={20} />}
            </button>
          </form>
          {simulationData && (
            <div className="interactions-counter" style={{ textAlign: 'center', fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
              Interactions: {messages.filter(m => m.role === 'assistant').length} / {simulationData.max_interactions || 10}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
