import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { Toaster, toast } from 'react-hot-toast';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import './MoodsPage.css';

type MoodInputs = {
  name: string;
  context: string;
};

type Mood = {
  id: string;
  name: string;
  context: string;
  created_at: string;
  user_id: string;
};

export const MoodsPage = ({ isNew }: { isNew?: boolean } = {}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [moods, setMoods] = useState<Mood[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [moodToDelete, setMoodToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<MoodInputs>({
    defaultValues: {
      name: "",
      context: ""
    }
  });

  const showForm = isNew || !!id;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (isNew) {
      reset();
      return;
    }

    if (id && moods.length > 0) {
      const mood = moods.find(m => m.id === id);
      if (mood) {
        setValue('name', mood.name);
        setValue('context', mood.context);
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

  const onSubmit: SubmitHandler<MoodInputs> = async (formData) => {
    setIsCreating(true);
    try {
      if (id && !isNew) {
        // Update existing mood
        const { error } = await supabase
          .from('moods')
          .update({
            name: formData.name,
            context: formData.context,
          })
          .eq('id', id);

        if (error) throw error;
        toast.success("Mood updated successfully!");
      } else {
        // Create new mood
        const { error } = await supabase
          .from('moods')
          .insert([{
            name: formData.name,
            context: formData.context,
            user_id: user?.id
          }]);

        if (error) throw error;
        toast.success("Mood created successfully!");
        reset();
      }
      
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
    navigate('/moods');
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
              <label htmlFor="context">Context</label>
              <p className="form-helper-text">Describe how this mood affects character behavior and responses</p>
              <textarea
                id="context"
                rows={4}
                {...register("context", { required: "Context is required" })}
                className={`form-textarea ${errors.context ? 'error' : ''}`}
                placeholder="e.g., The character is friendly, helpful, and willing to collaborate with others."
              />
              {errors.context && <span className="error-msg">{errors.context.message}</span>}
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
                  <div className="mood-card-body">
                    <p className="mood-context">{mood.context}</p>
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
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setMoodToDelete(null);
        }}
        isLoading={isDeleting}
      />
    </div>
  );
};
