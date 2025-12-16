import { useMemo, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MessageSquare, Calendar, ArrowRight, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import './ChatListPage.css';

type Chat = {
  id: string;
  simulation_id: string;
  created_at: string;
  messages: any[];
  status?: 'active' | 'completed' | 'failed';
  analysis_result?: any;
  analysis_updated_at?: string | null;
  simulations: {
    name: string;
    character: string;
    setting_id?: string | null;
    characters?: {
      name: string;
      description: string;
    } | null;
  };
};

type EvaluationJson = {
  overall_score: number;
  skills: Array<{
    skill_id: string;
    skill_name: string;
    score: number;
    signals_detected: string[];
    signals_missing: string[];
    evidence: string[];
    summary: string;
  }>;
  strengths: string[];
  improvement_areas: string[];
};

export const ChatListPage = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteChatId, setDeleteChatId] = useState<string | null>(null);
  const [analyzingChatIds, setAnalyzingChatIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          simulations (
            name,
            character,
            setting_id,
            characters(name, description)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChats(data || []);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isAnalyzing = useMemo(() => analyzingChatIds, [analyzingChatIds]);

  const extractJsonObject = (raw: string): unknown => {
    const trimmed = raw.trim();
    if (!trimmed) throw new Error('Empty evaluator response');

    // Handle fenced JSON blocks
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidate = (fenceMatch?.[1] ?? trimmed).trim();

    // Try direct parse first
    try {
      return JSON.parse(candidate);
    } catch {
      // Fallback: try to locate the first {...} block
      const firstBrace = candidate.indexOf('{');
      const lastBrace = candidate.lastIndexOf('}');
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        const slice = candidate.slice(firstBrace, lastBrace + 1);
        return JSON.parse(slice);
      }
      throw new Error('Evaluator response is not valid JSON');
    }
  };

  const handleAnalyzeClick = async (e: React.MouseEvent, chat: Chat) => {
    e.preventDefault();
    e.stopPropagation();

    if (chat.status !== 'completed') return;
    if (isAnalyzing[chat.id]) return;

    setAnalyzingChatIds(prev => ({ ...prev, [chat.id]: true }));

    try {
      // Load global evaluator prompt
      const { data: promptsData, error: promptsError } = await supabase
        .from('global_prompts')
        .select('evaluator_prompt')
        .limit(1)
        .single();

      if (promptsError) throw promptsError;
      const evaluatorPrompt = promptsData?.evaluator_prompt?.trim();
      if (!evaluatorPrompt) {
        throw new Error('Missing evaluator_prompt in global_prompts');
      }

      // Load the AI setting for this simulation
      const settingId = chat.simulations?.setting_id;
      if (!settingId) {
        throw new Error('This chat simulation is missing setting_id');
      }

      const { data: settingData, error: settingError } = await supabase
        .from('ai_settings')
        .select('api_key, model')
        .eq('id', settingId)
        .single();

      if (settingError) throw settingError;
      const apiKey = settingData?.api_key?.trim();
      const modelName = settingData?.model || 'gpt-4o';
      if (!apiKey) throw new Error('Missing api_key in ai_settings');

      // Build the formatted user message
      const characterText =
        chat.simulations?.characters?.description ||
        chat.simulations?.character ||
        chat.simulations?.characters?.name ||
        'N/A';

      const userMessages = Array.isArray(chat.messages)
        ? chat.messages
            .filter((m: any) => m?.role === 'user' && typeof m?.content === 'string')
            .map((m: any) => m.content.trim())
            .filter(Boolean)
        : [];

      const playerText = userMessages.join('\n\n');

      const evaluatorUserMessage = `Character:\n${characterText}\n\nPlayer:\n${playerText}`;

      const isReasoningModel = modelName.startsWith('gpt-5') || modelName.startsWith('o1');

      const evaluatorChat = new ChatOpenAI({
        apiKey,
        openAIApiKey: apiKey,
        modelName,
        ...(isReasoningModel ? {} : { temperature: 0 }),
        modelKwargs: {
          response_format: { type: 'json_object' }
        },
        // @ts-ignore
        dangerouslyAllowBrowser: true
      });

      const response = await evaluatorChat.invoke([
        new SystemMessage(evaluatorPrompt),
        new HumanMessage(evaluatorUserMessage)
      ]);

      const parsed = extractJsonObject(String(response.content)) as EvaluationJson;

      const { error: updateError } = await supabase
        .from('chats')
        .update({
          analysis_result: parsed,
          analysis_updated_at: new Date().toISOString()
        })
        .eq('id', chat.id);

      if (updateError) throw updateError;

      setChats(prev =>
        prev.map(c =>
          c.id === chat.id
            ? { ...c, analysis_result: parsed, analysis_updated_at: new Date().toISOString() }
            : c
        )
      );
    } catch (error) {
      console.error('Error analyzing chat:', error);
      alert('Error analyzing chat: ' + (error as Error).message);
    } finally {
      setAnalyzingChatIds(prev => ({ ...prev, [chat.id]: false }));
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation();
    setDeleteChatId(id);
  };

  const confirmDelete = async () => {
    if (!deleteChatId) return;
    
    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', deleteChatId);

      if (error) throw error;
      
      setChats(chats.filter(c => c.id !== deleteChatId));
      setDeleteChatId(null);
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  return (
    <div className="chat-list-page">
      <div className="page-header">
        <h1><MessageSquare className="text-primary" /> Chat History</h1>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Loading chat history..." />
      ) : chats.length === 0 ? (
        <div className="empty-state">
          <MessageSquare size={48} className="text-gray-300 mb-4" />
          <h3>No chats yet</h3>
          <p>Start a new simulation to create a chat history.</p>
          <Link to="/simulations" className="btn btn-primary mt-4">
            Go to Simulations
          </Link>
        </div>
      ) : (
        <div className="chats-grid">
          {chats.map((chat) => (
            <Link key={chat.id} to={`/chat/${chat.id}`} className="chat-card">
              <div className="chat-card-header">
                <div className="header-top">
                  <h3>{chat.simulations?.name || 'Unknown Simulation'}</h3>
                  {chat.status && chat.status !== 'active' && (
                    <span className={`status-badge ${chat.status}`}>
                      {chat.status === 'completed' ? '✅ Completed' : '❌ Failed'}
                    </span>
                  )}
                </div>
                <span className="chat-date">
                  <Calendar size={14} />
                  {new Date(chat.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <div className="chat-card-body">
                <p><strong>Character:</strong> {chat.simulations?.character || 'N/A'}</p>
                <p className="message-count">
                  {Array.isArray(chat.messages) ? chat.messages.length : 0} messages
                </p>
              </div>

              <div className="chat-card-footer">
                <span className="chat-footer-date">
                  {new Date(chat.created_at).toLocaleDateString()}
                </span>
                <div className="chat-footer-actions">
                  {chat.status === 'completed' && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => handleAnalyzeClick(e, chat)}
                      disabled={!!isAnalyzing[chat.id]}
                      title="Analyze completed chat"
                    >
                      {isAnalyzing[chat.id] ? 'Analizando…' : 'Analizar'}
                    </button>
                  )}
                  <div className="btn btn-primary btn-sm">
                    <ArrowRight size={16} /> Continue
                  </div>
                  <button 
                    className="btn btn-danger btn-sm btn-icon-only"
                    onClick={(e) => handleDeleteClick(e, chat.id)}
                    title="Delete chat"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteChatId}
        title="Delete Chat"
        message="Are you sure you want to delete this chat history? This action cannot be undone."
        onConfirm={confirmDelete}
        onClose={() => setDeleteChatId(null)}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

