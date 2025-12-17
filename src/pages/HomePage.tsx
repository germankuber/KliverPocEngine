import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Play, Plus, Settings as SettingsIcon } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { LoadingSpinner } from '../components/LoadingSpinner';
import './HomePage.css';

type Simulation = {
  id: string;
  name: string;
  created_at: string;
  character?: string;
  objective?: string;
  character_keypoints?: string[];
  player_keypoints?: string[];
  setting_id?: string;
};

type Setting = {
  id: string;
  name: string;
  model: string;
};

export const HomePage = () => {
  const navigate = useNavigate();
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startingSimId, setStartingSimId] = useState<string | null>(null);
  const isStartingRef = useRef<boolean>(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch simulations
      const { data: simulationsData, error: simError } = await supabase
        .from('simulations')
        .select('*')
        .order('created_at', { ascending: false });

      if (simError) throw simError;

      // Fetch settings
      const { data: settingsData, error: setError } = await supabase
        .from('ai_settings')
        .select('id, name, model');

      if (setError) throw setError;

      setSimulations(simulationsData || []);
      setSettings(settingsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error loading simulations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChat = async (e: React.MouseEvent, simId: string) => {
    e.preventDefault();
    
    // Prevent double clicks using ref for immediate check
    if (isStartingRef.current) return;
    
    isStartingRef.current = true;
    setStartingSimId(simId);
    
    try {
      const { data, error } = await supabase
        .from('chats')
        .insert({ simulation_id: simId })
        .select()
        .single();

      if (error) throw error;
      
      navigate(`/chat/${data.id}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to start chat session');
      setStartingSimId(null);
      isStartingRef.current = false;
    }
  };

  return (
    <div className="home-page">
      <Toaster position="top-right" />
      
      <div className="home-header">
        <div className="header-content">
          <div className="header-icon">
            <SettingsIcon size={32} />
          </div>
          <h1>Welcome to KliverPoc Engine</h1>
          <p>Select a simulation scenario to start chatting with your AI agent.</p>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Loading simulations..." />
      ) : simulations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <SettingsIcon size={48} />
          </div>
          <h2>No Simulations Yet</h2>
          <p>Create your first simulation scenario to get started with AI conversations.</p>
          <Link to="/simulations" className="btn btn-primary">
            <Plus size={20} /> Create Simulation
          </Link>
        </div>
      ) : (
        <div className="simulations-section">
          <div className="section-header">
            <h2>Available Simulations</h2>
            <Link to="/simulations" className="btn btn-secondary btn-sm">
              <Plus size={16} /> New Simulation
            </Link>
          </div>
          
          <div className="simulations-grid">
            {simulations.map(sim => {
              const setting = settings.find(s => s.id === sim.setting_id);
              const isStarting = startingSimId === sim.id;
              return (
                <div 
                  key={sim.id} 
                  className="simulation-card-link"
                  onClick={(e) => handleStartChat(e, sim.id)}
                  style={{ cursor: isStarting ? 'wait' : 'pointer' }}
                >
                  <div className="simulation-card">
                    <div className="card-header">
                      <h3>{sim.name}</h3>
                      {setting && (
                        <span className="model-badge">{setting.model}</span>
                      )}
                    </div>
                    <div className="card-body">
                      {sim.character && (
                        <p>
                          <strong>Character:</strong>
                          <span className="truncate-text">{sim.character}</span>
                        </p>
                      )}
                      {sim.objective && (
                        <p>
                          <strong>Objective:</strong>
                          <span className="truncate-text">{sim.objective}</span>
                        </p>
                      )}
                      {((sim.character_keypoints && sim.character_keypoints.length > 0) || 
                        (sim.player_keypoints && sim.player_keypoints.length > 0)) && (
                        <p className="rules-info">
                          <strong>Keypoints:</strong>
                          <span>{(sim.character_keypoints?.length || 0) + (sim.player_keypoints?.length || 0)} defined</span>
                        </p>
                      )}
                    </div>
                    <div className="card-footer">
                      <span className="card-date">
                        {new Date(sim.created_at).toLocaleDateString()}
                      </span>
                      <div className="play-button">
                        {isStarting ? (
                          <>
                            <div className="spinner-small"></div>
                            <span>Starting...</span>
                          </>
                        ) : (
                          <>
                            <Play size={20} />
                            <span>Start Chat</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
