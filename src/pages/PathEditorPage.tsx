import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, GripVertical, Save, ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import './PathEditorPage.css';

type Simulation = {
    id: string;
    name: string;
    character: string;
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
                .select('id, name, character')
                .order('name');

            if (simsError) throw simsError;
            setAvailableSimulations(sims || []);

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
            simulations(id, name, character)
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
            <div className="editor-header">
                <button onClick={() => navigate('/paths')} className="back-btn">
                    <ArrowLeft size={20} />
                    Back to Paths
                </button>
                <h1>{isEditing ? 'Edit Path' : 'Create New Path'}</h1>
            </div>

            <div className="editor-content">
                <div className="editor-section">
                    <label className="form-label">
                        Path Name *
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Customer Service Training"
                            className="form-input"
                        />
                    </label>

                    <label className="form-label">
                        Description
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of this learning path"
                            className="form-textarea"
                            rows={3}
                        />
                    </label>

                    <label className="form-checkbox">
                        <input
                            type="checkbox"
                            checked={isPublic}
                            onChange={(e) => setIsPublic(e.target.checked)}
                        />
                        <span>Make this path publicly accessible</span>
                    </label>
                </div>

                <div className="editor-section">
                    <div className="section-header">
                        <h2>Simulations</h2>
                        <button
                            onClick={() => setShowSimulationPicker(!showSimulationPicker)}
                            className="add-simulation-btn"
                        >
                            <Plus size={18} />
                            Add Simulation
                        </button>
                    </div>

                    {showSimulationPicker && (
                        <div className="simulation-picker">
                            <h3>Select a simulation to add:</h3>
                            <div className="simulations-list">
                                {availableSimulations.map(sim => (
                                    <button
                                        key={sim.id}
                                        onClick={() => handleAddSimulation(sim)}
                                        className="simulation-item"
                                    >
                                        <div>
                                            <div className="sim-name">{sim.name}</div>
                                            <div className="sim-character">Character: {sim.character}</div>
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
                        <div className="path-simulations-list">
                            {pathSimulations.map((ps, index) => (
                                <div key={ps.simulation_id} className="path-simulation-item">
                                    <div className="sim-order">
                                        <div className="order-buttons">
                                            <button
                                                onClick={() => moveSimulation(index, 'up')}
                                                disabled={index === 0}
                                                className="order-btn"
                                            >
                                                ↑
                                            </button>
                                            <button
                                                onClick={() => moveSimulation(index, 'down')}
                                                disabled={index === pathSimulations.length - 1}
                                                className="order-btn"
                                            >
                                                ↓
                                            </button>
                                        </div>
                                        <GripVertical size={20} className="grip-icon" />
                                        <span className="order-number">{index + 1}</span>
                                    </div>

                                    <div className="sim-info">
                                        <div className="sim-name">{ps.simulation?.name}</div>
                                        <div className="sim-character">
                                            Character: {ps.simulation?.character}
                                        </div>
                                    </div>

                                    <div className="sim-attempts">
                                        <label>
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
                                        onClick={() => handleRemoveSimulation(index)}
                                        className="remove-btn"
                                        title="Remove"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="editor-actions">
                    <button onClick={() => navigate('/paths')} className="cancel-btn">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="save-btn">
                        <Save size={18} />
                        {isSaving ? 'Saving...' : 'Save Path'}
                    </button>
                </div>
            </div>
        </div>
    );
};

