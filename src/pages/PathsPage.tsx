import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, ExternalLink, Edit, Trash2 } from 'lucide-react';
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
        <h1>Learning Paths</h1>
        <p>Create and manage learning paths with multiple simulations</p>
      </div>

      <div className="flex justify-between items-center mb-4">
        <button onClick={() => navigate('/paths/new')} className="btn btn-primary">
          <Plus size={18} />
          Create Path
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Loading paths..." />
      ) : paths.length === 0 ? (
        <p className="empty-text">No paths created yet. Create your first path to group simulations.</p>
      ) : (
        <div className="simulations-grid">
          {paths.map(path => (
            <div key={path.id} className="simulation-card">
              <div className="sim-card-header">
                <h3>{path.name}</h3>
                {path.is_public && (
                  <span className="sim-model-badge">Public</span>
                )}
              </div>

              <div className="sim-card-body">
                {path.description && (
                  <p className="path-description">{path.description}</p>
                )}
                <p>
                  <strong>Simulations:</strong>
                  <span>{path.path_simulations?.length || 0}</span>
                </p>
              </div>

              <div className="sim-card-footer">
                <span className="sim-date">
                  {new Date(path.created_at).toLocaleDateString()}
                </span>
                <div className="sim-actions">
                  <Link to={`/play/${path.id}`} className="btn btn-primary btn-sm">
                    <ExternalLink size={16} />
                    Preview
                  </Link>
                  <button
                    onClick={() => navigate(`/paths/${path.id}/edit`)}
                    className="btn btn-secondary btn-sm"
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                  <button
                    onClick={(e) => copyPublicLink(path.id, e)}
                    className="btn btn-secondary btn-sm"
                    title="Copy public link"
                  >
                    <ExternalLink size={16} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(path.id, e)}
                    className="btn btn-danger btn-sm btn-icon-only"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
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

