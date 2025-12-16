import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, Circle, Lock, Play, RotateCcw } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import './PathPlayerPage.css';

type Simulation = {
  id: string;
  name: string;
  objective: string;
  characters?: {
    id: string;
    name: string;
    description: string;
  };
};

type PathSimulation = {
    id: string;
    simulation_id: string;
    order_index: number;
    max_attempts: number;
    simulations: Simulation;
};

type PathProgress = {
    simulation_id: string;
    attempts_used: number;
    completed: boolean;
};

type Path = {
    id: string;
    name: string;
    description: string;
    path_simulations: PathSimulation[];
};

export const PathPlayerPage = () => {
    const { pathId } = useParams();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(true);
    const [path, setPath] = useState<Path | null>(null);
    const [userIdentifier, setUserIdentifier] = useState('');
    const [progress, setProgress] = useState<{ [key: string]: PathProgress }>({});
    const [showIdentifierPrompt, setShowIdentifierPrompt] = useState(false);
    const [selectedSimulation, setSelectedSimulation] = useState<PathSimulation | null>(null);

    useEffect(() => {
        loadPath();
        loadUserIdentifier();
    }, [pathId]);

    const loadPath = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('paths')
                .select(`
          *,
          path_simulations(
            id,
            simulation_id,
            order_index,
            max_attempts,
            simulations(
              id,
              name,
              objective,
              characters(id, name, description)
            )
          )
        `)
                .eq('id', pathId)
                .eq('is_public', true)
                .single();

            if (error) throw error;
            if (!data) {
                alert('Path not found or not public');
                return;
            }

      // Sort simulations by order_index
      data.path_simulations.sort((a: PathSimulation, b: PathSimulation) => a.order_index - b.order_index);
      setPath(data as any);
        } catch (error) {
            console.error('Error loading path:', error);
            alert('Error loading path');
        } finally {
            setIsLoading(false);
        }
    };

    const loadUserIdentifier = () => {
        const stored = localStorage.getItem('path_user_identifier');
        if (stored) {
            setUserIdentifier(stored);
            loadProgress(stored);
        } else {
            setShowIdentifierPrompt(true);
        }
    };

    const saveUserIdentifier = (identifier: string) => {
        localStorage.setItem('path_user_identifier', identifier);
        setUserIdentifier(identifier);
        setShowIdentifierPrompt(false);
        loadProgress(identifier);
    };

    const loadProgress = async (identifier: string) => {
        if (!pathId) return;

        try {
            const { data, error } = await supabase
                .from('path_progress')
                .select('*')
                .eq('path_id', pathId)
                .eq('user_identifier', identifier);

            if (error) throw error;

            const progressMap: { [key: string]: PathProgress } = {};
            (data || []).forEach(p => {
                progressMap[p.simulation_id] = {
                    simulation_id: p.simulation_id,
                    attempts_used: p.attempts_used,
                    completed: p.completed,
                };
            });
            setProgress(progressMap);
        } catch (error) {
            console.error('Error loading progress:', error);
        }
    };

    const getSimulationStatus = (pathSim: PathSimulation, index: number) => {
        const prog = progress[pathSim.simulation_id];

        if (prog?.completed) {
            return 'completed';
        }

        // Check if previous simulation is completed
        if (index > 0) {
            const prevPathSim = path?.path_simulations[index - 1];
            const prevProg = prevPathSim ? progress[prevPathSim.simulation_id] : null;
            if (!prevProg?.completed) {
                return 'locked';
            }
        }

        if (prog && prog.attempts_used >= pathSim.max_attempts) {
            return 'failed';
        }

        return 'available';
    };

    const handleStartSimulation = async (pathSim: PathSimulation) => {
        if (!userIdentifier) {
            setShowIdentifierPrompt(true);
            setSelectedSimulation(pathSim);
            return;
        }

        const status = getSimulationStatus(
            pathSim,
            path?.path_simulations.indexOf(pathSim) || 0
        );

        if (status === 'locked') {
            alert('Complete the previous simulation first');
            return;
        }

        if (status === 'failed') {
            alert('Maximum attempts reached for this simulation');
            return;
        }

        // Create a new chat for this simulation
        try {
            const { data: chatData, error: chatError } = await supabase
                .from('chats')
                .insert({
                    simulation_id: pathSim.simulation_id,
                    messages: [],
                })
                .select()
                .single();

            if (chatError) throw chatError;

            // Update or create progress
            const currentProgress = progress[pathSim.simulation_id];
            const newAttemptsUsed = (currentProgress?.attempts_used || 0) + 1;

            const { error: progressError } = await supabase
                .from('path_progress')
                .upsert({
                    path_id: pathId,
                    simulation_id: pathSim.simulation_id,
                    user_identifier: userIdentifier,
                    attempts_used: newAttemptsUsed,
                    completed: false,
                });

            if (progressError) throw progressError;

            // Navigate to chat with path context
            navigate(`/chat/${chatData.id}?pathId=${pathId}&pathSimId=${pathSim.id}`);
        } catch (error) {
            console.error('Error starting simulation:', error);
            alert('Error starting simulation');
        }
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (!path) {
        return (
            <div className="path-player-error">
                <h2>Path not found</h2>
                <p>This path may not exist or is not publicly accessible.</p>
            </div>
        );
    }

    return (
        <div className="path-player-page">
            {showIdentifierPrompt && (
                <div className="identifier-modal-overlay">
                    <div className="identifier-modal">
                        <h2>Welcome!</h2>
                        <p>Please enter your email or name to track your progress:</p>
                        <input
                            type="text"
                            placeholder="Email or name"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                    saveUserIdentifier(e.currentTarget.value.trim());
                                    if (selectedSimulation) {
                                        handleStartSimulation(selectedSimulation);
                                        setSelectedSimulation(null);
                                    }
                                }
                            }}
                            className="identifier-input"
                            autoFocus
                        />
            <button
              onClick={(e) => {
                const modal = e.currentTarget.closest('.identifier-modal');
                const input = modal?.querySelector('input') as HTMLInputElement;
                if (input?.value?.trim()) {
                  saveUserIdentifier(input.value.trim());
                  if (selectedSimulation) {
                    handleStartSimulation(selectedSimulation);
                    setSelectedSimulation(null);
                  }
                } else {
                  alert('Please enter your email or name');
                }
              }}
              className="identifier-submit"
            >
              Continue
            </button>
                    </div>
                </div>
            )}

            <div className="path-player-header">
                <h1>{path.name}</h1>
                {path.description && <p>{path.description}</p>}
                {userIdentifier && (
                    <div className="user-info">
                        Playing as: <strong>{userIdentifier}</strong>
                        <button
                            onClick={() => {
                                localStorage.removeItem('path_user_identifier');
                                window.location.reload();
                            }}
                            className="change-user-btn"
                        >
                            <RotateCcw size={14} />
                            Change
                        </button>
                    </div>
                )}
            </div>

            <div className="simulations-track">
                {path.path_simulations.map((pathSim, index) => {
                    const status = getSimulationStatus(pathSim, index);
                    const prog = progress[pathSim.simulation_id];
                    const attemptsLeft = pathSim.max_attempts - (prog?.attempts_used || 0);

                    return (
                        <div key={pathSim.id} className={`simulation-card ${status}`}>
                            <div className="simulation-status-icon">
                                {status === 'completed' && <CheckCircle size={32} />}
                                {status === 'locked' && <Lock size={32} />}
                                {(status === 'available' || status === 'failed') && (
                                    <Circle size={32} />
                                )}
                            </div>

                            <div className="simulation-content">
                                <div className="simulation-order">Step {index + 1}</div>
                <h3>{pathSim.simulations.name}</h3>
                <p className="simulation-character">
                  Character: {pathSim.simulations.characters?.name || 'N/A'}
                </p>
                <p className="simulation-scenario">{pathSim.simulations.objective}</p>

                                <div className="simulation-meta">
                                    {status === 'completed' && (
                                        <span className="status-badge completed-badge">✓ Completed</span>
                                    )}
                                    {status === 'failed' && (
                                        <span className="status-badge failed-badge">
                                            No attempts left
                                        </span>
                                    )}
                                    {status === 'available' && (
                                        <span className="attempts-info">
                                            {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining
                                        </span>
                                    )}
                                    {status === 'locked' && (
                                        <span className="status-badge locked-badge">
                                            Complete previous step
                                        </span>
                                    )}
                                </div>

                {status !== 'locked' && status !== 'failed' && (
                  <button
                    onClick={() => handleStartSimulation(pathSim)}
                    className="start-simulation-btn"
                  >
                    <Play size={18} />
                    {status === 'completed' ? 'Play Again' : 'Start Simulation'}
                  </button>
                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {path.path_simulations.every((ps) => progress[ps.simulation_id]?.completed) && (
                <div className="completion-banner">
                    <CheckCircle size={48} />
                    <h2>Congratulations! 🎉</h2>
                    <p>You've completed all simulations in this learning path!</p>
                </div>
            )}
        </div>
    );
};

