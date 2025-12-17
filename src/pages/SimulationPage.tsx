import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Play, Plus, Trash2, Edit2, Copy, BarChart2 } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { Toaster, toast } from 'react-hot-toast';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import './SimulationPage.css';

type Rule = {
    question: string;
    answer: string;
};

type SimulationInputs = {
    name: string;
    characterId: string;
    objective: string;
    context: string;
    maxInteractions: number;
    rules: Rule[];
    settingId: string;
};

type Simulation = {
    id: string;
    name: string;
    created_at: string;
    character?: string; // Legacy field
    character_id?: string;
    objective?: string;
    context?: string;
    max_interactions?: number;
    rules?: Rule[];
    setting_id?: string;
    characters?: {
        id: string;
        name: string;
        description: string;
    };
    chats?: {
        id: string;
        analysis_result: any;
        created_at: string;
    }[];
};

type Setting = {
    id: string;
    name: string;
    model: string;
};

type Character = {
    id: string;
    name: string;
    description: string;
};

export const SimulationPage = ({ isNew }: { isNew?: boolean } = {}) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [simulations, setSimulations] = useState<Simulation[]>([]);
    const [settings, setSettings] = useState<Setting[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [simulationToDelete, setSimulationToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [runningSimId, setRunningSimId] = useState<string | null>(null);
    const isRunningRef = useRef<boolean>(false);

    const { register, control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<SimulationInputs>({
        defaultValues: {
            name: "",
            characterId: "",
            objective: "Help the user with their tasks.",
            context: "",
            maxInteractions: 10,
            rules: [{ question: "How should you respond?", answer: "Polite and concise." }],
            settingId: ""
        }
    });

    const maxInteractionsValue = watch("maxInteractions");

    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: "rules"
    });

    const fetchData = async () => {
        try {
            const { data, error } = await supabase
                .from('simulations')
                .select(`
          *,
          characters(id, name, description),
          chats(id, analysis_result, created_at)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSimulations(data || []);
        } catch (error) {
            console.error("Error fetching simulations:", error);
            toast.error("Error loading simulations");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        fetchSettings();
        fetchCharacters();
    }, []);

    useEffect(() => {
        if (isNew) {
            reset();
            return;
        }

        if (id && simulations.length > 0) {
            const sim = simulations.find(s => s.id === id);
            if (sim) {
                setValue('name', sim.name);
                setValue('characterId', sim.character_id || '');
                setValue('objective', sim.objective || '');
                setValue('context', sim.context || '');
                setValue('maxInteractions', sim.max_interactions || 10);
                setValue('settingId', sim.setting_id || '');

                if (sim.rules && sim.rules.length > 0) {
                    replace(sim.rules);
                }
            }
        }
    }, [id, simulations, isNew, reset, setValue, replace]);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('ai_settings')
                .select('id, name, model')
                .order('name', { ascending: true });

            if (error) throw error;
            setSettings(data || []);
        } catch (error) {
            console.error("Error fetching settings:", error);
            toast.error("Error loading settings");
        }
    };

    const fetchCharacters = async () => {
        try {
            const { data, error } = await supabase
                .from('characters')
                .select('id, name, description')
                .order('name', { ascending: true });

            if (error) throw error;
            setCharacters(data || []);
        } catch (error) {
            console.error("Error fetching characters:", error);
            toast.error("Error loading characters");
        }
    };

    const handleEdit = (sim: Simulation) => {
        navigate(`/simulations/${sim.id}`);
    };

    const handleCancel = () => {
        navigate('/simulations');
        reset();
    };

    const handleDeleteClick = (id: string) => {
        setSimulationToDelete(id);
        setDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!simulationToDelete) return;

        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('simulations')
                .delete()
                .eq('id', simulationToDelete);

            if (error) throw error;

            toast.success("Simulation deleted successfully");

            if (id === simulationToDelete) {
                handleCancel();
            }

            fetchData();
        } catch (error) {
            console.error("Error deleting simulation:", error);
            toast.error("Error deleting simulation");
        } finally {
            setIsDeleting(false);
            setDeleteModalOpen(false);
            setSimulationToDelete(null);
        }
    };

  const handleClone = async (sim: Simulation) => {
    try {
      const clonedData = {
        name: `${sim.name} (Copy)`,
        character_id: sim.character_id,
        objective: sim.objective,
        context: sim.context,
        max_interactions: sim.max_interactions,
        rules: sim.rules,
        setting_id: sim.setting_id
      };

            const { error } = await supabase
                .from('simulations')
                .insert(clonedData)
                .select()
                .single();

            if (error) throw error;

            toast.success("Simulation cloned successfully");
            fetchData();
        } catch (error) {
            console.error("Error cloning simulation:", error);
            toast.error("Error cloning simulation");
        }
    };

    const handleRun = async (simId: string) => {
        // Prevent double clicks using ref for immediate check
        if (isRunningRef.current) return;

        isRunningRef.current = true;
        setRunningSimId(simId);

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
            setRunningSimId(null);
            isRunningRef.current = false;
        }
    };

    const onSubmit: SubmitHandler<SimulationInputs> = async (data) => {
        setIsCreating(true);
        try {
            if (!data.settingId) {
                toast.error("Please select an AI setting");
                setIsCreating(false);
                return;
            }

            if (id && !isNew) {
                const { error } = await supabase
                    .from('simulations')
                    .update({
                        name: data.name,
                        character_id: data.characterId,
                        objective: data.objective,
                        context: data.context,
                        max_interactions: Number(data.maxInteractions),
                        rules: data.rules,
                        setting_id: data.settingId
                    })
                    .eq('id', id);

                if (error) throw error;
                toast.success("Simulation updated successfully");
            } else {
                const { error } = await supabase
                    .from('simulations')
                    .insert({
                        name: data.name,
                        character_id: data.characterId,
                        objective: data.objective,
                        context: data.context,
                        max_interactions: Number(data.maxInteractions),
                        rules: data.rules,
                        setting_id: data.settingId
                    });

                if (error) throw error;
                toast.success("Simulation created successfully");
            }

            handleCancel();
            fetchData();
        } catch (error) {
            console.error("Error saving simulation:", error);
            toast.error("Error saving simulation");
        } finally {
            setIsCreating(false);
        }
    };

    const showForm = !!id || isNew;

    return (
        <div className="simulation-page">
            <Toaster position="top-right" />
            <ConfirmModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Simulation"
                message="Are you sure you want to delete this simulation? This action cannot be undone and all chat history will be lost."
                confirmText="Delete"
                cancelText="Cancel"
                isLoading={isDeleting}
            />

            <div className="simulation-header">
                <h1>Simulation Scenarios</h1>
                <p>Create and run simulation scenarios with specific agent behaviors.</p>
            </div>

            {!showForm ? (
                <button
                    className="btn btn-primary mb-4"
                    onClick={() => navigate('/simulations/new')}
                >
                    <Plus size={20} /> Create New Simulation
                </button>
            ) : (
                <div className="create-sim-section">
                    <div className="flex justify-between items-center mb-4">
                        <h2>{id && !isNew ? 'Edit Simulation' : 'Define Simulation'}</h2>
                        {id && !isNew && (
                            <button
                                type="button"
                                onClick={() => handleDeleteClick(id)}
                                className="btn btn-danger btn-sm"
                            >
                                <Trash2 size={16} /> Delete
                            </button>
                        )}
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="create-sim-form-expanded">
                        <div className="form-group">
                            <label htmlFor="name">Simulation Name</label>
                            <input
                                id="name"
                                type="text"
                                placeholder="e.g. Customer Support Scenario"
                                {...register("name", { required: "Name is required" })}
                                className={`form-input ${errors.name ? 'error' : ''}`}
                            />
                            {errors.name && <span className="error-msg">{errors.name.message}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="settingId">AI Setting <span style={{ fontWeight: 'normal', color: '#666' }}>(Required)</span></label>
                            <select
                                id="settingId"
                                {...register("settingId", { required: "AI Setting is required" })}
                                className={`form-input ${errors.settingId ? 'error' : ''}`}
                            >
                                <option value="">Select an AI setting...</option>
                                {settings.map(setting => (
                                    <option key={setting.id} value={setting.id}>
                                        {setting.name} ({setting.model})
                                    </option>
                                ))}
                            </select>
                            {errors.settingId && <span className="error-msg">{errors.settingId.message}</span>}
                            {settings.length === 0 && (
                                <span className="info-msg" style={{ color: '#f59e0b', fontSize: '0.875rem' }}>
                                    No AI settings found. Please create one in the Settings page first.
                                </span>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="characterId">Character <span style={{fontWeight: 'normal', color: '#666'}}>(Required)</span></label>
                            <p className="form-helper-text">Select a character profile or create one in the Characters page.</p>
                            <select
                                id="characterId"
                                {...register("characterId", { required: "Character is required" })}
                                className={`form-input ${errors.characterId ? 'error' : ''}`}
                            >
                                <option value="">Select a character...</option>
                                {characters.map(char => (
                                    <option key={char.id} value={char.id}>
                                        {char.name}
                                    </option>
                                ))}
                            </select>
                            {errors.characterId && <span className="error-msg">{errors.characterId.message}</span>}
                            {characters.length === 0 && (
                                <span className="info-msg" style={{color: '#f59e0b', fontSize: '0.875rem'}}>
                                    No characters found. Please create one in the Characters page first.
                                </span>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="objective">Objective</label>
                            <p className="form-helper-text">The primary goal the AI should achieve in this simulation.</p>
                            <textarea
                                id="objective"
                                rows={2}
                                placeholder="e.g., Assist users with debugging code issues and provide best practice recommendations..."
                                {...register("objective", { required: "Objective is required" })}
                                className={`form-textarea ${errors.objective ? 'error' : ''}`}
                            />
                            {errors.objective && <span className="error-msg">{errors.objective.message}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="context">Context <span style={{ fontWeight: 'normal', color: '#9ca3af' }}>(Optional)</span></label>
                            <p className="form-helper-text">Additional background or situational information.</p>
                            <textarea
                                id="context"
                                rows={3}
                                placeholder="e.g., This simulation represents a technical support scenario for a SaaS platform..."
                                {...register("context")}
                                className="form-textarea"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="maxInteractions">Max Interactions: <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{maxInteractionsValue}</span></label>
                            <p className="form-helper-text">Maximum number of responses the AI can give (Range: 5 - 10).</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <input
                                    id="maxInteractions"
                                    type="range"
                                    min="5"
                                    max="10"
                                    step="1"
                                    {...register("maxInteractions", { required: true, min: 5, max: 10 })}
                                    className={`form-input ${errors.maxInteractions ? 'error' : ''}`}
                                    style={{ flex: 1, padding: 0, height: '40px' }}
                                />
                            </div>
                            {errors.maxInteractions && <span className="error-msg">{errors.maxInteractions.message}</span>}
                        </div>

                        <div className="form-group">
                            <label>Operational Rules</label>
                            <p className="form-helper-text">Define specific behaviors and responses for the AI agent.</p>
                            <div className="rules-list">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="rule-item">
                                        <div className="rule-inputs">
                                            <input
                                                type="text"
                                                placeholder="Condition / Question"
                                                {...register(`rules.${index}.question` as const, { required: true })}
                                                className="form-input"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Rule / Answer"
                                                {...register(`rules.${index}.answer` as const, { required: true })}
                                                className="form-input"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            className="btn-icon-delete"
                                            onClick={() => remove(index)}
                                            title="Remove rule"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm mt-2"
                                onClick={() => append({ question: "", answer: "" })}
                            >
                                <Plus size={16} /> Add Rule
                            </button>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary" disabled={isCreating}>
                                {id && !isNew ? (
                                    <><Edit2 size={18} /> {isCreating ? "Updating..." : "Update Simulation"}</>
                                ) : (
                                    <><Plus size={18} /> {isCreating ? "Creating..." : "Create Simulation"}</>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="btn btn-secondary"
                                disabled={isCreating}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {!showForm && (
                <div className="simulations-list-section">
                    <h2>Saved Scenarios</h2>
                    <div className="simulations-grid">
                        {simulations.map(sim => {
                            const setting = settings.find(s => s.id === sim.setting_id);
                            const analyzedChats = sim.chats?.filter(c => c.analysis_result) || [];
                            analyzedChats.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                            const latestAnalysis = analyzedChats[0];

                            return (
                                <div key={sim.id} className="simulation-card">
                                    <div className="sim-card-header">
                                        <h3>{sim.name}</h3>
                                        {setting && (
                                            <span className="sim-model-badge">{setting.model}</span>
                                        )}
                                    </div>
                                    <div className="sim-card-body">
                                        <p>
                                            <strong>Character:</strong> {sim.characters?.name || 'N/A'}
                                        </p>
                                        <p>
                                            <strong>Max Interactions:</strong>
                                            <span>{sim.max_interactions || 10}</span>
                                        </p>
                                        {sim.rules && sim.rules.length > 0 && (
                                            <p className="rules-count">
                                                <strong>Rules:</strong>
                                                <span>{sim.rules.length} defined</span>
                                            </p>
                                        )}
                                        {latestAnalysis && latestAnalysis.analysis_result?.overall_score !== undefined && (
                                            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <p style={{ color: 'var(--primary)', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <BarChart2 size={16} />
                                                    Score: {latestAnalysis.analysis_result.overall_score}/100
                                                </p>
                                                <button
                                                    className="btn btn-secondary"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/analyses/${latestAnalysis.id}`);
                                                    }}
                                                    title="View Latest Analysis"
                                                    style={{ padding: '2px 8px', fontSize: '0.75rem', height: 'auto' }}
                                                >
                                                    Ver Análisis
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="sim-card-footer">
                                        <span className="sim-date">
                                            {new Date(sim.created_at).toLocaleDateString()}
                                        </span>
                                        <div className="sim-actions">
                                            <button
                                                onClick={() => handleRun(sim.id)}
                                                className="btn btn-primary btn-sm"
                                                disabled={!!runningSimId}
                                            >
                                                {runningSimId === sim.id ? (
                                                    <span className="spinner-small"></span>
                                                ) : (
                                                    <Play size={16} />
                                                )}
                                                {runningSimId === sim.id ? 'Starting...' : 'Run'}
                                            </button>
                                            <button
                                                onClick={() => handleEdit(sim)}
                                                className="btn btn-secondary btn-sm"
                                            >
                                                <Edit2 size={16} /> Edit
                                            </button>
                                            <button
                                                onClick={() => handleClone(sim)}
                                                className="btn btn-secondary btn-sm btn-icon-only"
                                                title="Clone simulation"
                                            >
                                                <Copy size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(sim.id)}
                                                className="btn btn-danger btn-sm btn-icon-only"
                                                title="Delete simulation"
                                            >
                                                <Trash2 size={16} />
                                            </button>
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