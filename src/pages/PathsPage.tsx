import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, FolderOpen, Calendar, ExternalLink, Edit, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import './PathsPage.css';

type Path = {
  id: string;
  name: string;
  description: string;
  is_public: boolean;
  created_at: string;
  path_simulations: { simulation_id: string }[];
};

export const PathsPage = () => {
  const [paths, setPaths] = useState<Path[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletePathId, setDeletePathId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadPaths();
  }, []);

  const loadPaths = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('paths')
        .select(`
          *,
          path_simulations(simulation_id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaths(data || []);
    } catch (error) {
      console.error('Error loading paths:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (pathId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletePathId(pathId);
  };

  const confirmDelete = async () => {
    if (!deletePathId) return;

    try {
      const { error } = await supabase
        .from('paths')
        .delete()
        .eq('id', deletePathId);

      if (error) throw error;

      setPaths(paths.filter(p => p.id !== deletePathId));
      setDeletePathId(null);
    } catch (error) {
      console.error('Error deleting path:', error);
      alert('Error deleting path');
    }
  };

  const copyPublicLink = (pathId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/play/${pathId}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="paths-page">
      <div className="paths-header">
        <div className="header-content">
          <h1>Learning Paths</h1>
          <p>Create and manage learning paths with multiple simulations</p>
        </div>
        <button onClick={() => navigate('/paths/new')} className="create-path-btn">
          <Plus size={20} />
          Create Path
        </button>
      </div>

      {paths.length === 0 ? (
        <div className="empty-state">
          <FolderOpen size={64} />
          <h2>No paths yet</h2>
          <p>Create your first learning path to group simulations</p>
          <button onClick={() => navigate('/paths/new')} className="create-path-btn">
            <Plus size={20} />
            Create Path
          </button>
        </div>
      ) : (
        <div className="paths-grid">
          {paths.map(path => (
            <div key={path.id} className="path-card">
              <div className="path-card-header">
                <h3>{path.name}</h3>
                <div className="path-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/paths/${path.id}/edit`);
                    }}
                    className="action-btn edit-btn"
                    title="Edit"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={(e) => copyPublicLink(path.id, e)}
                    className="action-btn link-btn"
                    title="Copy public link"
                  >
                    <ExternalLink size={18} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(path.id, e)}
                    className="action-btn delete-btn"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {path.description && (
                <p className="path-description">{path.description}</p>
              )}

              <div className="path-meta">
                <span className="simulations-count">
                  {path.path_simulations?.length || 0} simulations
                </span>
                <span className="path-date">
                  <Calendar size={14} />
                  {new Date(path.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="path-footer">
                <Link to={`/play/${path.id}`} className="preview-btn">
                  Preview Path
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deletePathId}
        title="Delete Path"
        message="Are you sure you want to delete this path? This action cannot be undone."
        onConfirm={confirmDelete}
        onClose={() => setDeletePathId(null)}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

