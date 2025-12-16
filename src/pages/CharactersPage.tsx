import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Edit2, User } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { Toaster, toast } from 'react-hot-toast';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import './CharactersPage.css';

type CharacterInputs = {
  name: string;
  description: string;
};

type Character = {
  id: string;
  name: string;
  description: string;
  created_at: string;
};

export const CharactersPage = ({ isNew }: { isNew?: boolean } = {}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [characterToDelete, setCharacterToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CharacterInputs>({
    defaultValues: {
      name: "",
      description: ""
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

    if (id && characters.length > 0) {
      const char = characters.find(c => c.id === id);
      if (char) {
        setValue('name', char.name);
        setValue('description', char.description);
      }
    }
  }, [id, isNew, characters, setValue, reset]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCharacters(data || []);
    } catch (error) {
      console.error("Error fetching characters:", error);
      toast.error("Error loading characters");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit: SubmitHandler<CharacterInputs> = async (formData) => {
    setIsCreating(true);
    try {
      if (id && !isNew) {
        // Update existing character
        const { error } = await supabase
          .from('characters')
          .update({
            name: formData.name,
            description: formData.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (error) throw error;
        toast.success("Character updated successfully");
      } else {
        // Create new character
        const { error } = await supabase
          .from('characters')
          .insert({
            name: formData.name,
            description: formData.description
          });

        if (error) throw error;
        toast.success("Character created successfully");
      }

      handleCancel();
      fetchData();
    } catch (error) {
      console.error("Error saving character:", error);
      toast.error("Error saving character");
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = (char: Character) => {
    navigate(`/characters/${char.id}`);
  };

  const handleCancel = () => {
    navigate('/characters');
    reset();
  };

  const handleDeleteClick = (charId: string) => {
    setCharacterToDelete(charId);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!characterToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('characters')
        .delete()
        .eq('id', characterToDelete);

      if (error) throw error;

      toast.success("Character deleted successfully");
      
      if (id === characterToDelete) {
        handleCancel();
      }
      
      fetchData();
    } catch (error) {
      console.error("Error deleting character:", error);
      toast.error("Error deleting character");
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setCharacterToDelete(null);
    }
  };

  return (
    <div className="characters-page">
      <Toaster position="top-right" />
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Character"
        message="Are you sure you want to delete this character? Simulations using this character will not be affected."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
      />

      <div className="simulation-header">
        <h1>Characters</h1>
        <p>Create reusable character profiles for your simulations.</p>
      </div>

      {!showForm ? (
        <button 
          className="btn btn-primary mb-4" 
          onClick={() => navigate('/characters/new')}
        >
          <Plus size={20} /> Create New Character
        </button>
      ) : (
        <div className="create-sim-section">
          <div className="flex justify-between items-center mb-4">
            <h2>{id && !isNew ? 'Edit Character' : 'Create Character'}</h2>
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
              <label htmlFor="name">Character Name</label>
              <input 
                id="name"
                type="text"
                placeholder="e.g. Senior Software Engineer"
                {...register("name", { required: "Name is required" })}
                className={`form-input ${errors.name ? 'error' : ''}`}
              />
              {errors.name && <span className="error-msg">{errors.name.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="description">Character Description</label>
              <p className="form-helper-text">Describe the persona, role, and behavior traits.</p>
              <textarea 
                id="description"
                rows={6}
                placeholder="e.g., Senior Software Engineer with 10 years of experience in full-stack development. Expert in React, Node.js, and system architecture. Known for clear communication and mentoring junior developers..."
                {...register("description", { required: "Description is required" })}
                className={`form-textarea ${errors.description ? 'error' : ''}`}
              />
              {errors.description && <span className="error-msg">{errors.description.message}</span>}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={isCreating}>
                {id && !isNew ? (
                  <><Edit2 size={18} /> {isCreating ? "Updating..." : "Update Character"}</>
                ) : (
                  <><Plus size={18} /> {isCreating ? "Creating..." : "Create Character"}</>
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
          <h2>Saved Characters</h2>
          {isLoading ? (
            <LoadingSpinner message="Loading characters..." />
          ) : characters.length === 0 ? (
            <p className="empty-text">No characters created yet. Create your first character to get started.</p>
          ) : (
            <div className="simulations-grid">
              {characters.map(char => (
                <div key={char.id} className="simulation-card">
                  <div className="sim-card-header">
                    <div className="flex items-center" style={{gap: '0.5rem'}}>
                      <User size={20} color="var(--primary)" />
                      <h3>{char.name}</h3>
                    </div>
                  </div>
                  <div className="sim-card-body">
                    <p className="character-description">{char.description}</p>
                  </div>
                  <div className="sim-card-footer">
                    <span className="sim-date">
                      {new Date(char.created_at).toLocaleDateString()}
                    </span>
                    <div className="sim-actions">
                      <button 
                        onClick={() => handleEdit(char)}
                        className="btn btn-secondary btn-sm"
                      >
                        <Edit2 size={16} /> Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(char.id)}
                        className="btn btn-danger btn-sm btn-icon-only"
                        title="Delete character"
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
      )}
    </div>
  );
};


