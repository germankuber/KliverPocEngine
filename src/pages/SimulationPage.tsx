import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Play, Plus, Trash2, Edit2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { Toaster, toast } from 'react-hot-toast';
import { ConfirmModal } from '../components/ConfirmModal';
import './SimulationPage.css';

type Rule = {
  question: string;
  answer: string;
};

type SimulationInputs = {
  name: string;
  systemPrompt: string;
  character: string;
  objective: string;
  context: string;
  rules: Rule[];
  settingId: string;
};

type Simulation = {
  id: string;
  name: string;
  created_at: string;
  system_prompt?: string;
  character?: string;
  objective?: string;
  context?: string;
  rules?: Rule[];
  setting_id?: string;
};

type Setting = {
  id: string;
  name: string;
  model: string;
};

export const SimulationPage = () => {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [simulationToDelete, setSimulationToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { register, control, handleSubmit, reset, setValue, formState: { errors } } = useForm<SimulationInputs>({
    defaultValues: {
      name: "",
      systemPrompt: "You are a helpful assistant.",
      character: "Helpful Assistant",
      objective: "Help the user with their tasks.",
      context: "",
      rules: [{ question: "How should you respond?", answer: "Polite and concise." }],
      settingId: ""
    }
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "rules"
  });

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('simulations')
        .select('*')
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

  const handleEdit = (sim: Simulation) => {
    setEditingId(sim.id);
    setShowCreateForm(true);
    
    setValue('name', sim.name);
    setValue('systemPrompt', sim.system_prompt || '');
    setValue('character', sim.character || '');
    setValue('objective', sim.objective || '');
    setValue('context', sim.context || '');
    setValue('settingId', sim.setting_id || '');
    
    if (sim.rules && sim.rules.length > 0) {
      replace(sim.rules);
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingId(null);
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
      
      if (editingId === simulationToDelete) {
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

  const onSubmit: SubmitHandler<SimulationInputs> = async (data) => {
    setIsCreating(true);
    try {
      if (!data.settingId) {
        toast.error("Please select an AI setting");
        setIsCreating(false);
        return;
      }

      if (editingId) {
        const { error } = await supabase
          .from('simulations')
          .update({
            name: data.name,
            system_prompt: data.systemPrompt,
            character: data.character,
            objective: data.objective,
            context: data.context,
            rules: data.rules,
            setting_id: data.settingId
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success("Simulation updated successfully");
      } else {
        const { error } = await supabase
          .from('simulations')
          .insert({
            name: data.name,
            system_prompt: data.systemPrompt,
            character: data.character,
            objective: data.objective,
            context: data.context,
            rules: data.rules,
            setting_id: data.settingId
          });

        if (error) throw error;
        toast.success("Simulation created successfully");
      }
      
      reset();
      setShowCreateForm(false);
      setEditingId(null);
      fetchData();
    } catch (error) {
      console.error("Error saving simulation:", error);
      toast.error("Error saving simulation");
    } finally {
      setIsCreating(false);
    }
  };

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

      {!showCreateForm ? (
        <button 
          className="btn btn-primary mb-4" 
          onClick={() => setShowCreateForm(true)}
        >
          <Plus size={20} /> Create New Simulation
        </button>
      ) : (
        <div className="create-sim-section">
          <div className="flex justify-between items-center mb-4">
            <h2>{editingId ? 'Edit Simulation' : 'Define Simulation'}</h2>
            {editingId && (
              <button 
                type="button" 
                onClick={() => handleDeleteClick(editingId)}
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
              <label htmlFor="settingId">AI Setting <span style={{fontWeight: 'normal', color: '#666'}}>(Required)</span></label>
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
                <span className="info-msg" style={{color: '#f59e0b', fontSize: '0.875rem'}}>
                  No AI settings found. Please create one in the Settings page first.
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="systemPrompt">System Prompt</label>
              <p className="form-helper-text">Core instructions that define how the AI should behave.</p>
              <textarea 
                id="systemPrompt" 
                rows={3}
                placeholder="e.g., You are a helpful assistant that provides accurate and concise information..."
                {...register("systemPrompt", { required: "System Prompt is required" })}
                className={`form-textarea ${errors.systemPrompt ? 'error' : ''}`}
              />
              {errors.systemPrompt && <span className="error-msg">{errors.systemPrompt.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="character">Character</label>
              <p className="form-helper-text">Describe the persona or role the AI should adopt.</p>
              <textarea 
                id="character"
                rows={2}
                placeholder="e.g., Senior Software Engineer with 10 years of experience in full-stack development..."
                {...register("character", { required: "Character is required" })}
                className={`form-textarea ${errors.character ? 'error' : ''}`}
              />
              {errors.character && <span className="error-msg">{errors.character.message}</span>}
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
              <label htmlFor="context">Context <span style={{fontWeight: 'normal', color: '#9ca3af'}}>(Optional)</span></label>
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
                {editingId ? (
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

      <div className="simulations-list-section">
        <h2>Saved Scenarios</h2>
        {isLoading ? (
          <p className="loading-text">Loading simulations...</p>
        ) : simulations.length === 0 ? (
          <p className="empty-text">No simulations created yet. Create your first scenario to get started.</p>
        ) : (
          <div className="simulations-grid">
            {simulations.map(sim => {
              const setting = settings.find(s => s.id === sim.setting_id);
              return (
                <div key={sim.id} className="simulation-card">
                  <div className="sim-card-header">
                    <h3>{sim.name}</h3>
                    {setting && (
                      <span className="sim-model-badge">{setting.model}</span>
                    )}
                  </div>
                  <div className="sim-card-body">
                     <p><strong>Character:</strong> <span className="truncate-inline">{sim.character || 'N/A'}</span></p>
                     <p><strong>Objective:</strong> <span className="truncate-inline">{sim.objective || 'N/A'}</span></p>
                     {sim.rules && sim.rules.length > 0 && (
                       <p className="rules-count"><strong>Rules:</strong> {sim.rules.length} defined</p>
                     )}
                  </div>
                  <div className="sim-card-footer">
                    <span className="sim-date">
                      {new Date(sim.created_at).toLocaleDateString()}
                    </span>
                    <div className="sim-actions">
                      <button 
                        onClick={() => handleDeleteClick(sim.id)}
                        className="btn btn-danger btn-sm"
                        title="Delete simulation"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleEdit(sim)}
                        className="btn btn-secondary btn-sm"
                      >
                        <Edit2 size={16} /> Edit
                      </button>
                      <Link to={`/chat/${sim.id}`} className="btn btn-primary btn-sm">
                        <Play size={16} /> Run
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
