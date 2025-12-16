import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MessageSquare, Calendar, ArrowRight, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import './ChatListPage.css';

type Chat = {
  id: string;
  simulation_id: string;
  created_at: string;
  messages: any[];
  status?: 'active' | 'completed' | 'failed';
  simulations: {
    name: string;
    character: string;
  };
};

export const ChatListPage = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteChatId, setDeleteChatId] = useState<string | null>(null);

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
            character
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

