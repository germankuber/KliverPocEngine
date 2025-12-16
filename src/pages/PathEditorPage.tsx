import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import './PathEditorPage.css';

type Simulation = {
  id: string;
  name: string;
  characters?: {
    id: string;
    name: string;
    description: string;
  };
};

type PathSimulation = {
    simulation_id: string;
    order_index: number;
    max_attempts: number;
    simulation?: Simulation;
};

export const PathEditorPage = () => {
    const { pathId } = useParams();
    const navigate = useNavigate();
    const isEditing = pathId !== 'new';

    const [isLoading, setIsLoading] = useState(isEditing);
    const [isSaving, setIsSaving] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [pathSimulations, setPathSimulations] = useState<PathSimulation[]>([]);
    const [availableSimulations, setAvailableSimulations] = useState<Simulation[]>([]);
    const [showSimulationPicker, setShowSimulationPicker] = useState(false);

    useEffect(() => {
        loadData();
    }, [pathId]);

    const loadData = async () => {
        try {
      // Load available simulations
      const { data: sims, error: simsError } = await supabase
        .from('simulations')
        .select(`
          id,
          name,
          characters(id, name, description)
        `)
        .order('name');

            if (simsError) throw simsError;
            console.log('Raw simulations data:', sims);
            // Map to handle the characters array from Supabase (returns array, we need single object)
            const mappedSims = (sims || []).map((sim: any) => {
                console.log('Simulation:', sim.name, 'Characters:', sim.characters);
                return {
                    id: sim.id,
                    name: sim.name,
                    characters: Array.isArray(sim.characters) && sim.characters.length > 0 
                        ? sim.characters[0] 
                        : undefined
                };
            });
            console.log('Mapped simulations:', mappedSims);
            setAvailableSimulations(mappedSims);

            // Load path data if editing
            if (isEditing && pathId) {
                const { data: pathData, error: pathError } = await supabase
                    .from('paths')
                    .select('*')
                    .eq('id', pathId)
                    .single();

                if (pathError) throw pathError;

                setName(pathData.name);
                setDescription(pathData.description || '');
                setIsPublic(pathData.is_public);

                // Load path simulations
                const { data: pathSims, error: pathSimsError } = await supabase
                    .from('path_simulations')
                    .select(`
            simulation_id,
            order_index,
            max_attempts,
            simulations(
              id,
              name,
              characters(id, name, description)
            )
          `)
                    .eq('path_id', pathId)
                    .order('order_index');

                if (pathSimsError) throw pathSimsError;

                setPathSimulations(
                    (pathSims || []).map(ps => ({
                        simulation_id: ps.simulation_id,
                        order_index: ps.order_index,
                        max_attempts: ps.max_attempts,
                        simulation: ps.simulations as any,
                    }))
                );
            }
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Error loading data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddSimulation = (simulation: Simulation) => {
        const exists = pathSimulations.some(ps => ps.simulation_id === simulation.id);
        if (exists) {
            alert('This simulation is already added');
            return;
        }

        setPathSimulations([
            ...pathSimulations,
            {
                simulation_id: simulation.id,
                order_index: pathSimulations.length,
                max_attempts: 1,
                simulation,
            },
        ]);
        setShowSimulationPicker(false);
    };

    const handleRemoveSimulation = (index: number) => {
        const updated = pathSimulations.filter((_, i) => i !== index);
        // Reindex
        updated.forEach((ps, i) => {
            ps.order_index = i;
        });
        setPathSimulations(updated);
    };

    const handleUpdateAttempts = (index: number, attempts: number) => {
        const updated = [...pathSimulations];
        updated[index].max_attempts = Math.max(1, attempts);
        setPathSimulations(updated);
    };

    const moveSimulation = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= pathSimulations.length) return;

        const updated = [...pathSimulations];
        [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];

        // Update order_index
        updated.forEach((ps, i) => {
            ps.order_index = i;
        });

        setPathSimulations(updated);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            alert('Please enter a path name');
            return;
        }

        if (pathSimulations.length === 0) {
            alert('Please add at least one simulation');
            return;
        }

        try {
            setIsSaving(true);

            let finalPathId = pathId;

            if (isEditing && pathId) {
                // Update existing path
                const { error: updateError } = await supabase
                    .from('paths')
                    .update({
                        name,
                        description,
                        is_public: isPublic,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', pathId);

                if (updateError) throw updateError;

                // Delete existing path_simulations
                const { error: deleteError } = await supabase
                    .from('path_simulations')
                    .delete()
                    .eq('path_id', pathId);

                if (deleteError) throw deleteError;
            } else {
                // Create new path
                const { data: newPath, error: createError } = await supabase
                    .from('paths')
                    .insert({
                        name,
                        description,
                        is_public: isPublic,
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                finalPathId = newPath.id;
            }

            // Insert path_simulations
            const { error: insertError } = await supabase
                .from('path_simulations')
                .insert(
                    pathSimulations.map(ps => ({
                        path_id: finalPathId,
                        simulation_id: ps.simulation_id,
                        order_index: ps.order_index,
                        max_attempts: ps.max_attempts,
                    }))
                );

            if (insertError) throw insertError;

            navigate('/paths');
        } catch (error) {
            console.error('Error saving path:', error);
            alert('Error saving path');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

  return (
    <div className="path-editor-page">
      <div className="simulation-header">
        <h1>Learning Paths</h1>
        <p>Create and manage learning paths with multiple simulations</p>
      </div>

      <div className="create-sim-section">
        <div className="flex justify-between items-center mb-4">
          <h2>{isEditing ? 'Edit Path' : 'Create New Path'}</h2>
        </div>

        <div className="create-sim-form-expanded">
          <div className="form-group">
            <label htmlFor="pathName">Path Name</label>
            <input
              id="pathName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Customer Service Training"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description <span style={{fontWeight: 'normal', color: '#9ca3af'}}>(Optional)</span></label>
            <p className="form-helper-text">Brief description of this learning path.</p>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this path teaches..."
              className="form-textarea"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="checkbox-input"
              />
              <span>Make this path publicly accessible</span>
            </label>
          </div>

          <div className="form-group">
            <div className="flex justify-between items-center mb-4">
              <div>
                <label>Simulations</label>
                <p className="form-helper-text">Add and order simulations for this learning path.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSimulationPicker(!showSimulationPicker)}
                className="btn btn-secondary btn-sm"
              >
                <Plus size={16} />
                Add Simulation
              </button>
            </div>

            {showSimulationPicker && (
              <div className="simulation-picker">
                <p style={{fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem'}}>
                  Select a simulation to add:
                </p>
                <div className="simulations-list">
                  {availableSimulations.map(sim => (
                    <button
                      key={sim.id}
                      type="button"
                      onClick={() => handleAddSimulation(sim)}
                      className="simulation-item"
                    >
                      <div>
                        <div className="sim-name">{sim.name}</div>
                        <div className="sim-character">
                          Character: {sim.characters?.name || 'N/A'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {pathSimulations.length === 0 ? (
              <div className="empty-simulations">
                <p>No simulations added yet. Click "Add Simulation" to get started.</p>
              </div>
            ) : (
              <div className="rules-list">
                {pathSimulations.map((ps, index) => (
                  <div key={ps.simulation_id} className="rule-item">
                    <div className="sim-order">
                      <div className="order-buttons">
                        <button
                          type="button"
                          onClick={() => moveSimulation(index, 'up')}
                          disabled={index === 0}
                          className="order-btn"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSimulation(index, 'down')}
                          disabled={index === pathSimulations.length - 1}
                          className="order-btn"
                        >
                          ↓
                        </button>
                      </div>
                      <GripVertical size={16} className="grip-icon" />
                      <span className="order-number">{index + 1}</span>
                    </div>

                    <div className="sim-info">
                      <div className="sim-name">{ps.simulation?.name}</div>
                      <div className="sim-character">
                        Character: {ps.simulation?.characters?.name || 'N/A'}
                      </div>
                    </div>

                    <div className="sim-attempts">
                      <label style={{fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '600'}}>
                        Max Attempts:
                        <input
                          type="number"
                          min="1"
                          value={ps.max_attempts}
                          onChange={(e) =>
                            handleUpdateAttempts(index, parseInt(e.target.value) || 1)
                          }
                          className="attempts-input"
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSimulation(index)}
                      className="btn-icon-delete"
                      title="Remove"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button 
              type="button"
              onClick={handleSave} 
              disabled={isSaving} 
              className="btn btn-primary"
            >
              <Save size={18} />
              {isSaving ? 'Saving...' : (isEditing ? 'Update Path' : 'Create Path')}
            </button>
            <button 
              type="button"
              onClick={() => navigate('/paths')} 
              className="btn btn-secondary"
              disabled={isSaving}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

