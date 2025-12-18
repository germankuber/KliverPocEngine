import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Plus, Trash2, Edit2, X } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { Toaster, toast } from 'react-hot-toast';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import './MoodsPage.css';

type MoodBehavior = {
  id?: string;
  percentage: number;
  behavior_prompt: string;
};

type MoodInputs = {
  name: string;
};

type Mood = {
  id: string;
  name: string;
  created_at: string;
  user_id: string;
  behaviors?: MoodBehavior[];
};

export const MoodsPage = ({ isNew }: { isNew?: boolean } = {}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [moods, setMoods] = useState<Mood[]>([]);
  const [behaviors, setBehaviors] = useState<MoodBehavior[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [moodToDelete, setMoodToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<MoodInputs>({
    defaultValues: {
      name: ""
    }
  });

  const showForm = isNew || !!id;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (isNew) {
      reset();
      setBehaviors([]);
      return;
    }

    if (id && moods.length > 0) {
      const mood = moods.find(m => m.id === id);
      if (mood) {
        setValue('name', mood.name);
        loadBehaviors(id);
      }
    }
  }, [id, isNew, moods, setValue, reset]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('moods')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMoods(data || []);
    } catch (error) {
      console.error("Error fetching moods:", error);
      toast.error("Error loading moods");
    } finally {
      setIsLoading(false);
    }
  };

  const loadBehaviors = async (moodId: string) => {
    try {
      const { data, error } = await supabase
        .from('mood_behaviors')
        .select('*')
        .eq('mood_id', moodId)
        .order('percentage', { ascending: true });

      if (error) throw error;
      setBehaviors(data || []);
    } catch (error) {
      console.error("Error loading behaviors:", error);
      toast.error("Error loading behaviors");
    }
  };

  const onSubmit: SubmitHandler<MoodInputs> = async (formData) => {
    setIsCreating(true);
    try {
      let moodId = id;
      
      if (id && !isNew) {
        // Update existing mood
        const { error } = await supabase
          .from('moods')
          .update({
            name: formData.name
          })
          .eq('id', id);

        if (error) throw error;
      } else {
        // Create new mood
        const { data: newMood, error } = await supabase
          .from('moods')
          .insert([{
            name: formData.name,
            user_id: user?.id
          }])
          .select()
          .single();

        if (error) throw error;
        moodId = newMood.id;
      }

      // Save behaviors
      if (moodId) {
        // Delete existing behaviors
        await supabase
          .from('mood_behaviors')
          .delete()
          .eq('mood_id', moodId);

        // Insert new behaviors
        if (behaviors.length > 0) {
          const behaviorData = behaviors.map(b => ({
            mood_id: moodId,
            percentage: b.percentage,
            behavior_prompt: b.behavior_prompt,
            user_id: user?.id
          }));

          const { error: behaviorError } = await supabase
            .from('mood_behaviors')
            .insert(behaviorData);

          if (behaviorError) throw behaviorError;
        }
      }
      
      toast.success(id && !isNew ? "Mood updated successfully!" : "Mood created successfully!");
      reset();
      setBehaviors([]);
      await fetchData();
      navigate('/moods');
    } catch (error: any) {
      console.error("Error saving mood:", error);
      toast.error(error.message || "Error saving mood");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = (moodId: string) => {
    setMoodToDelete(moodId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!moodToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('moods')
        .delete()
        .eq('id', moodToDelete);

      if (error) throw error;

      toast.success("Mood deleted successfully!");
      await fetchData();
      setDeleteModalOpen(false);
      setMoodToDelete(null);
    } catch (error: any) {
      console.error("Error deleting mood:", error);
      toast.error(error.message || "Error deleting mood");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (moodId: string) => {
    navigate(`/moods/edit/${moodId}`);
  };

  const handleCancel = () => {
    reset();
    setBehaviors([]);
    navigate('/moods');
  };

  const addBehavior = () => {
    setBehaviors([...behaviors, { percentage: 0, behavior_prompt: '' }]);
  };

  const removeBehavior = (index: number) => {
    setBehaviors(behaviors.filter((_, i) => i !== index));
  };

  const updateBehavior = (index: number, field: 'percentage' | 'behavior_prompt', value: string | number) => {
    const updated = [...behaviors];
    updated[index] = { ...updated[index], [field]: value };
    setBehaviors(updated);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="moods-page">
      <Toaster position="top-right" />
      
      <div className="moods-header">
        <h1>Character Moods</h1>
        <p>Manage mood types and their contexts for character behavior</p>
      </div>

      {showForm && (
        <div className="mood-form-container">
          <div className="mood-form-header">
            <h2>{isNew ? 'Create New Mood' : 'Edit Mood'}</h2>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="mood-form">
            <div className="form-group">
              <label htmlFor="name">Mood Name</label>
              <p className="form-helper-text">A unique name for this mood type (e.g., "cooperative", "angry")</p>
              <input
                id="name"
                type="text"
                {...register("name", { required: "Name is required" })}
                className={`form-input ${errors.name ? 'error' : ''}`}
                placeholder="e.g., cooperative, angry, nervous"
              />
              {errors.name && <span className="error-msg">{errors.name.message}</span>}
            </div>

            <div className="form-group">
              <label>Behavior Levels</label>
              <p className="form-helper-text">Define how the character behaves at different intensity levels (percentage)</p>
              
              <div className="behaviors-list">
                {behaviors.map((behavior, index) => (
                  <div key={index} className="behavior-item">
                    <div className="behavior-percentage">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={behavior.percentage}
                        onChange={(e) => updateBehavior(index, 'percentage', parseInt(e.target.value) || 0)}
                        className="form-input"
                        placeholder="%"
                      />
                      <span className="percentage-label">%</span>
                    </div>
                    <div className="behavior-prompt">
                      <textarea
                        value={behavior.behavior_prompt}
                        onChange={(e) => updateBehavior(index, 'behavior_prompt', e.target.value)}
                        className="form-textarea"
                        rows={2}
                        placeholder="Describe behavior at this intensity level..."
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBehavior(index)}
                      className="btn-icon btn-danger"
                      title="Remove"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
              
              <button
                type="button"
                onClick={addBehavior}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '0.75rem' }}
              >
                <Plus size={16} />
                Add Behavior Level
              </button>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={handleCancel}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="btn btn-primary"
              >
                {isCreating ? 'Saving...' : (isNew ? 'Create Mood' : 'Update Mood')}
              </button>
            </div>
          </form>
        </div>
      )}

      {!showForm && (
        <>
          <div className="moods-actions">
            <button 
              onClick={() => navigate('/moods/new')}
              className="btn btn-primary"
            >
              <Plus size={18} />
              Create Mood
            </button>
          </div>

          <div className="moods-grid">
            {moods.length === 0 ? (
              <div className="empty-state">
                <p>No moods created yet.</p>
                <button 
                  onClick={() => navigate('/moods/new')}
                  className="btn btn-primary"
                >
                  <Plus size={18} />
                  Create Your First Mood
                </button>
              </div>
            ) : (
              moods.map((mood) => (
                <div key={mood.id} className="mood-card">
                  <div className="mood-card-header">
                    <h3>{mood.name}</h3>
                    <div className="mood-card-actions">
                      <button
                        onClick={() => handleEdit(mood.id)}
                        className="btn-icon"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(mood.id)}
                        className="btn-icon btn-danger"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Mood"
        message="Are you sure you want to delete this mood? Characters using this mood may be affected."
        confirmText="Delete"
        onConfirm={confirmDelete}
        onClose={() => {
          setDeleteModalOpen(false);
          setMoodToDelete(null);
        }}
        isLoading={isDeleting}
      />
    </div>
  );
};
