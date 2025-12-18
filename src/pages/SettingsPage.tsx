import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Edit2, Save, X, ChevronDown } from 'lucide-react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { Toaster, toast } from 'react-hot-toast';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { HighlightedTextarea } from '../components/HighlightedTextarea';
import * as Accordion from '@radix-ui/react-accordion';
import './SettingsPage.css';

type SettingInputs = {
  name: string;
  apiKey: string;
  model: string;
};

type Setting = {
  id: string;
  name: string;
  api_key: string;
  model: string;
  created_at: string;
};

type GlobalPrompts = {
  id: string;
  system_prompt: string;
  character_keypoints_evaluation_prompt: string;
  character_analysis_prompt: string;
  player_keypoints_evaluation_prompt: string;
  mood_evaluator_prompt?: string;
  langsmith_api_key?: string;
  langsmith_project?: string;
  langsmith_enabled?: boolean;
};

export const SettingsPage = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [globalPrompts, setGlobalPrompts] = useState<GlobalPrompts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [settingToDelete, setSettingToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingPrompts, setIsSavingPrompts] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<SettingInputs>({
    defaultValues: {
      name: "",
      apiKey: "",
      model: "gpt-4o"
    }
  });

  useEffect(() => {
    fetchSettings();
    fetchGlobalPrompts();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_settings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Error loading settings");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGlobalPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('global_prompts')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      setGlobalPrompts(data);
    } catch (error) {
      console.error("Error fetching global prompts:", error);
      toast.error("Error loading global prompts");
    }
  };

  const handleSavePrompts = async () => {
    if (!globalPrompts) return;
    
    setIsSavingPrompts(true);
    try {
      console.log('Saving global prompts:', globalPrompts);
      
      const { error } = await supabase
        .from('global_prompts')
        .update({
          system_prompt: globalPrompts.system_prompt,
          character_keypoints_evaluation_prompt: globalPrompts.character_keypoints_evaluation_prompt,
          character_analysis_prompt: globalPrompts.character_analysis_prompt || '',
          player_keypoints_evaluation_prompt: globalPrompts.player_keypoints_evaluation_prompt || '',
          mood_evaluator_prompt: globalPrompts.mood_evaluator_prompt || '',
          langsmith_api_key: globalPrompts.langsmith_api_key || '',
          langsmith_project: globalPrompts.langsmith_project || '',
          langsmith_enabled: globalPrompts.langsmith_enabled || false,
          updated_at: new Date().toISOString()
        })
        .eq('id', globalPrompts.id);

      if (error) throw error;
      toast.success("Global prompts saved successfully");
    } catch (error) {
      console.error("Error saving global prompts:", error);
      toast.error("Error saving global prompts");
    } finally {
      setIsSavingPrompts(false);
    }
  };

  const handleEdit = (setting: Setting) => {
    setEditingId(setting.id);
    setShowCreateForm(true);
    setValue('name', setting.name);
    setValue('apiKey', setting.api_key);
    setValue('model', setting.model);
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingId(null);
    reset();
  };

  const handleDeleteClick = (id: string) => {
    setSettingToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!settingToDelete) return;

    setIsDeleting(true);
    try {
      // Check if setting is being used by any simulation
      const { data: simulations } = await supabase
        .from('simulations')
        .select('id')
        .eq('setting_id', settingToDelete)
        .limit(1);

      if (simulations && simulations.length > 0) {
        toast.error("Cannot delete setting: it's being used by one or more simulations");
        setDeleteModalOpen(false);
        setSettingToDelete(null);
        setIsDeleting(false);
        return;
      }

      const { error } = await supabase
        .from('ai_settings')
        .delete()
        .eq('id', settingToDelete);

      if (error) throw error;

      toast.success("Setting deleted successfully");
      
      if (editingId === settingToDelete) {
        handleCancel();
      }
      
      fetchSettings();
    } catch (error) {
      console.error("Error deleting setting:", error);
      toast.error("Error deleting setting");
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setSettingToDelete(null);
    }
  };

  const onSubmit: SubmitHandler<SettingInputs> = async (data) => {
    try {
      if (editingId) {
        const { error } = await supabase
          .from('ai_settings')
          .update({
            name: data.name,
            api_key: data.apiKey,
            model: data.model
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success("Setting updated successfully");
      } else {
        const { error } = await supabase
          .from('ai_settings')
          .insert({
            name: data.name,
            api_key: data.apiKey,
            model: data.model
          });

        if (error) throw error;
        toast.success("Setting created successfully");
      }
      
      reset();
      setShowCreateForm(false);
      setEditingId(null);
      fetchSettings();
    } catch (error) {
      console.error("Error saving setting:", error);
      toast.error("Error saving setting");
    }
  };

  return (
    <div className="settings-page">
      <Toaster position="top-right" />
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Setting"
        message="Are you sure you want to delete this setting? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
      />

      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage global prompts and API configurations for your simulations.</p>
      </div>

      {/* Global Prompts Section */}
      <div className="global-prompts-section">
        <h2>Global Prompts</h2>
        <p className="section-description">These prompts are used across all simulations in the application.</p>
        
        {globalPrompts ? (
          <div className="prompts-form">
            <Accordion.Root type="multiple" className="accordion-root" defaultValue={['system-prompt', 'evaluation-prompt', 'evaluator-prompt']}>
              
              {/* System Prompt Accordion Item */}
              <Accordion.Item value="system-prompt" className="accordion-item">
                <Accordion.Header className="accordion-header">
                  <Accordion.Trigger className="accordion-trigger">
                    <span>System Prompt</span>
                    <ChevronDown className="accordion-chevron" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="accordion-content">
                  <div className="form-group">
                    <p className="form-helper-text">
                      Core instructions that define how the AI should behave across all simulations. 
                      Use <code>{'{{character}}'}</code>, <code>{'{{objective}}'}</code>, <code>{'{{context}}'}</code>, <code>{'{{rules}}'}</code> as placeholders.
                    </p>
                    <HighlightedTextarea
                      id="systemPrompt"
                      value={globalPrompts.system_prompt}
                      onChange={(value) => setGlobalPrompts({...globalPrompts, system_prompt: value})}
                      placeholder="e.g., You are a helpful assistant that provides accurate and concise information..."
                      rows={15}
                    />
                  </div>
                </Accordion.Content>
              </Accordion.Item>

              {/* Evaluation Rule Prompt Accordion Item */}
              <Accordion.Item value="evaluation-prompt" className="accordion-item">
                <Accordion.Header className="accordion-header">
                  <Accordion.Trigger className="accordion-trigger">
                    <span>Character Keypoints Evaluation Prompt</span>
                    <ChevronDown className="accordion-chevron" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="accordion-content">
                  <div className="form-group">
                    <p className="form-helper-text">
                      Evaluation criteria for character keypoints during the conversation.
                      This prompt is used to evaluate if the character (AI) mentioned the required keypoints.
                    </p>
                    <HighlightedTextarea
                      id="evaluationPrompt"
                      value={globalPrompts.character_keypoints_evaluation_prompt}
                      onChange={(value) => setGlobalPrompts({...globalPrompts, character_keypoints_evaluation_prompt: value})}
                      placeholder="e.g., Evaluate if the character mentioned all required keypoints appropriately..."
                      rows={15}
                    />
                  </div>
                </Accordion.Content>
              </Accordion.Item>

              {/* Evaluator Prompt Accordion Item */}
              <Accordion.Item value="evaluator-prompt" className="accordion-item">
                <Accordion.Header className="accordion-header">
                  <Accordion.Trigger className="accordion-trigger">
                    <span>Character Analysis Prompt</span>
                    <ChevronDown className="accordion-chevron" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="accordion-content">
                  <div className="form-group">
                    <p className="form-helper-text">
                      Analysis criteria for character keypoints. Used to analyze if the character mentioned the required facts.
                    </p>
                    <HighlightedTextarea
                      id="characterAnalysisPrompt"
                      value={globalPrompts.character_analysis_prompt || ''}
                      onChange={(value) => setGlobalPrompts({...globalPrompts, character_analysis_prompt: value})}
                      placeholder="e.g., Be strict in evaluation and provide detailed feedback..."
                      rows={15}
                    />
                  </div>
                </Accordion.Content>
              </Accordion.Item>

              {/* Player Evaluator Prompt Accordion Item */}
              <Accordion.Item value="player-evaluator-prompt" className="accordion-item">
                <Accordion.Header className="accordion-header">
                  <Accordion.Trigger className="accordion-trigger">
                    <span>Player Keypoints Evaluation Prompt</span>
                    <ChevronDown className="accordion-chevron" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="accordion-content">
                  <div className="form-group">
                    <p className="form-helper-text">
                      Evaluation criteria for player keypoints during the conversation.
                      This prompt is used to evaluate if the player mentioned the required keypoints.
                    </p>
                    <HighlightedTextarea
                      id="playerAnalysisPrompt"
                      value={globalPrompts.player_keypoints_evaluation_prompt || ''}
                      onChange={(value) => setGlobalPrompts({...globalPrompts, player_keypoints_evaluation_prompt: value})}
                      placeholder="e.g., Evaluate if the player mentioned all required keypoints appropriately..."
                      rows={15}
                    />
                  </div>
                </Accordion.Content>
              </Accordion.Item>

              {/* Mood Evaluator Prompt Accordion Item */}
              <Accordion.Item value="mood-evaluator-prompt" className="accordion-item">
                <Accordion.Header className="accordion-header">
                  <Accordion.Trigger className="accordion-trigger">
                    <span>Mood Evaluator Prompt</span>
                    <ChevronDown className="accordion-chevron" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="accordion-content">
                  <div className="form-group">
                    <p className="form-helper-text">
                      Evaluation criteria for analyzing the mood and emotional state during conversations.
                      This prompt is used to evaluate the emotional tone and sentiment of the interaction.
                    </p>
                    <HighlightedTextarea
                      id="moodEvaluatorPrompt"
                      value={globalPrompts.mood_evaluator_prompt || ''}
                      onChange={(value) => setGlobalPrompts({...globalPrompts, mood_evaluator_prompt: value})}
                      placeholder="e.g., Analyze the emotional tone and mood throughout the conversation..."
                      rows={15}
                    />
                  </div>
                </Accordion.Content>
              </Accordion.Item>

            </Accordion.Root>

            <div className="langsmith-section">
              <h3>LangSmith Configuration</h3>
              <p className="form-helper-text">Enable tracing and monitoring with LangSmith.</p>
              
              <div className="form-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox"
                    checked={globalPrompts.langsmith_enabled || false}
                    onChange={(e) => setGlobalPrompts({...globalPrompts, langsmith_enabled: e.target.checked})}
                  />
                  <span>Enable LangSmith Tracing</span>
                </label>
              </div>

              {globalPrompts.langsmith_enabled && (
                <>
                  <div className="form-group">
                    <label htmlFor="langsmithApiKey">LangSmith API Key</label>
                    <input 
                      id="langsmithApiKey"
                      type="password"
                      value={globalPrompts.langsmith_api_key || ''}
                      onChange={(e) => setGlobalPrompts({...globalPrompts, langsmith_api_key: e.target.value})}
                      className="form-input"
                      placeholder="lsv2_pt_..."
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="langsmithProject">LangSmith Project Name</label>
                    <input 
                      id="langsmithProject"
                      type="text"
                      value={globalPrompts.langsmith_project || ''}
                      onChange={(e) => setGlobalPrompts({...globalPrompts, langsmith_project: e.target.value})}
                      className="form-input"
                      placeholder="my-project"
                    />
                  </div>
                </>
              )}
            </div>

            <button 
              onClick={handleSavePrompts}
              className="btn btn-primary"
              disabled={isSavingPrompts}
            >
              <Save size={20} /> {isSavingPrompts ? 'Saving...' : 'Save Global Settings'}
            </button>
          </div>
        ) : (
          <LoadingSpinner message="Loading global prompts..." />
        )}
      </div>

      {/* AI Settings Section */}
      <div className="ai-settings-section">
        <h2>AI Settings</h2>
        <p className="section-description">Manage multiple API configurations.</p>

      {!showCreateForm ? (
        <button 
          className="btn btn-primary mb-4" 
          onClick={() => setShowCreateForm(true)}
        >
          <Plus size={20} /> Create New Setting
        </button>
      ) : (
        <div className="create-setting-section">
          <h2>{editingId ? 'Edit Setting' : 'Create New Setting'}</h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="setting-form">
            <div className="form-group">
              <label htmlFor="name">Setting Name</label>
              <input 
                id="name"
                type="text"
                placeholder="e.g. Production OpenAI, Development, Testing"
                {...register("name", { required: "Name is required" })}
                className={`form-input ${errors.name ? 'error' : ''}`}
              />
              {errors.name && <span className="error-msg">{errors.name.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="apiKey">OpenAI API Key <span style={{fontWeight: 'normal', color: '#666'}}>(Required)</span></label>
              <input 
                id="apiKey"
                type="password"
                placeholder="sk-..."
                {...register("apiKey", { required: "API Key is required" })}
                className={`form-input ${errors.apiKey ? 'error' : ''}`}
              />
              {errors.apiKey && <span className="error-msg">{errors.apiKey.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="model">Model</label>
              <select 
                id="model"
                {...register("model", { required: "Model is required" })}
                className={`form-input ${errors.model ? 'error' : ''}`}
              >
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-4.1">GPT-4.1</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-5">GPT-5 (Reasoning)</option>
                <option value="gpt-5.1">GPT-5.1 (Reasoning)</option>
                <option value="gpt-5.2">GPT-5.2 (Reasoning - Latest)</option>
                <option value="gpt-5-mini">GPT-5 mini (Reasoning)</option>
                <option value="gpt-5-nano">GPT-5 nano (Reasoning)</option>
                <option value="gpt-5.2-pro">GPT-5.2 pro (Reasoning)</option>
              </select>
              {errors.model && <span className="error-msg">{errors.model.message}</span>}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                <Save size={20} /> {isSubmitting ? 'Saving...' : editingId ? 'Update Setting' : 'Create Setting'}
              </button>
              <button 
                type="button" 
                onClick={handleCancel}
                className="btn btn-secondary"
                disabled={isSubmitting}
              >
                <X size={20} /> Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="settings-list-section">
        <h2>Saved Settings</h2>
        {isLoading ? (
          <LoadingSpinner message="Loading settings..." />
        ) : settings.length === 0 ? (
          <p className="empty-text">No settings created yet. Create your first AI setting to get started.</p>
        ) : (
          <div className="settings-grid">
            {settings.map(setting => (
              <div key={setting.id} className="setting-card">
                <div className="setting-card-header">
                  <h3>{setting.name}</h3>
                </div>
                <div className="setting-card-body">
                  <p><strong>Model:</strong> {setting.model}</p>
                  <p><strong>API Key:</strong> {setting.api_key.substring(0, 10)}...{setting.api_key.substring(setting.api_key.length - 4)}</p>
                </div>
                <div className="setting-card-footer">
                  <span className="setting-date">
                    {new Date(setting.created_at).toLocaleDateString()}
                  </span>
                  <div className="setting-actions">
                    <button 
                      onClick={() => handleEdit(setting)}
                      className="btn btn-secondary btn-sm"
                    >
                      <Edit2 size={16} /> Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(setting.id)}
                      className="btn btn-danger btn-sm"
                      title="Delete setting"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

