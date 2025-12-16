import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, StopCircle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { supabase } from '../lib/supabase';
import './ChatPage.css';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export const ChatPage = () => {
  const { id: simulationId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
    if (simulationId) {
      loadData(simulationId);
    }
  }, [simulationId]);

  const loadData = async (id: string) => {
    try {
      const { data: simData, error: simError } = await supabase
        .from('simulations')
        .select('*')
        .eq('id', id)
        .single();

      if (simError) throw simError;

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
      
      if (simData.messages && Array.isArray(simData.messages)) {
        setMessages(simData.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })));
      }

    } catch (error) {
      console.error("Error loading chat data:", error);
    }
  };

  const saveMessages = async (newMessages: Message[]) => {
    if (!simulationId) return;
    try {
      await supabase
        .from('simulations')
        .update({ messages: newMessages })
        .eq('id', simulationId);
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

    try {
      // GPT-5 models (reasoning models) do not support temperature parameter
      const isReasoningModel = appSettings.model?.startsWith('gpt-5');
      
      const chat = new ChatOpenAI({
        openAIApiKey: appSettings.api_key,
        modelName: appSettings.model || "gpt-3.5-turbo",
        ...(isReasoningModel ? {} : { temperature: 0.7 }),
      });

      const rules = simulationData.rules ? JSON.stringify(simulationData.rules) : "";
      const systemMessageContent = `${simulationData.system_prompt}
      
      Character: ${simulationData.character}
      Objective: ${simulationData.objective}
      ${simulationData.context ? `Context: ${simulationData.context}` : ''}
      ${rules ? `Rules: ${rules}` : ''}`;

      const history = [
        new SystemMessage(systemMessageContent),
        ...updatedMessages.map(m => m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content))
      ];

      const response = await chat.invoke(history);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content as string,
        timestamp: new Date()
      };

      const finalMessages = [...updatedMessages, botMessage];
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

  if (!simulationId) return <div className="p-8">No simulation selected</div>;

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
          {isLoading && (
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
        </div>
      </div>
    </div>
  );
};
