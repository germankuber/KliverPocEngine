import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, Calendar } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import './ChatAnalysisResultPage.css';

type EvaluationJson = {
  overall_score: number;
  skills: Array<{
    skill_id: string;
    skill_name: string;
    score: number;
    signals_detected: string[];
    signals_missing: string[];
    evidence: string[];
    summary: string;
  }>;
  strengths: string[];
  improvement_areas: string[];
};

type ChatRow = {
  id: string;
  created_at: string;
  analysis_updated_at?: string | null;
  analysis_result?: any;
  simulations: {
    name: string;
    character: string;
  };
};

export const ChatAnalysisResultPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [row, setRow] = useState<ChatRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchRow(id);
  }, [id]);

  const fetchRow = async (chatId: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('chats')
        .select(`
          id,
          created_at,
          analysis_updated_at,
          analysis_result,
          simulations(
            name,
            character
          )
        `)
        .eq('id', chatId)
        .single();

      if (error) throw error;
      setRow(data as any);
    } catch (error) {
      console.error('Error loading analysis:', error);
      navigate('/analyses');
    } finally {
      setIsLoading(false);
    }
  };

  const analysis: EvaluationJson | null = useMemo(() => {
    const raw = row?.analysis_result;
    if (!raw) return null;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return raw as EvaluationJson;
  }, [row]);

  if (isLoading) {
    return (
      <div className="chat-analysis-result-page">
        <LoadingSpinner message="Loading analysis..." />
      </div>
    );
  }

  if (!row) {
    return (
      <div className="chat-analysis-result-page">
        <div className="empty-state">
          <BarChart3 size={48} className="text-gray-300 mb-4" />
          <h3>Analysis not found</h3>
          <p>Return to the analyses list.</p>
          <button className="btn btn-primary" onClick={() => navigate('/analyses')}>Go to Analyses</button>
        </div>
      </div>
    );
  }

  const updatedAt = row.analysis_updated_at || row.created_at;

  return (
    <div className="chat-analysis-result-page">
      <div className="page-header">
        <div className="header-left">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/analyses')}>
            <ArrowLeft size={16} /> Back
          </button>
          <h1><BarChart3 className="text-primary" /> Analysis</h1>
        </div>
        <div className="header-right">
          <span className="analysis-date">
            <Calendar size={14} />
            {new Date(updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="analysis-summary">
        <div className="summary-top">
          <div className="summary-title">
            <h2 className="analysis-title">{row.simulations?.name || 'Unknown Simulation'}</h2>
            <div className="analysis-subtitle">{row.simulations?.character || 'N/A'}</div>
          </div>
          <div className="summary-score">
            <div className="summary-score-label">Overall</div>
            <div className="summary-score-value">{analysis?.overall_score ?? '—'}</div>
          </div>
        </div>
      </div>

      {!analysis ? (
        <div className="empty-state">
          <h3>No analysis result</h3>
          <p>This chat has no stored analysis yet.</p>
        </div>
      ) : (
        <div className="analysis-content">
          <div className="panel-grid">
            <section className="panel">
              <h3>Strengths</h3>
              {analysis.strengths?.length ? (
                <ul>
                  {analysis.strengths.map((s, idx) => <li key={idx}>{s}</li>)}
                </ul>
              ) : (
                <p className="muted">No strengths returned.</p>
              )}
            </section>

            <section className="panel">
              <h3>Improvement areas</h3>
              {analysis.improvement_areas?.length ? (
                <ul>
                  {analysis.improvement_areas.map((s, idx) => <li key={idx}>{s}</li>)}
                </ul>
              ) : (
                <p className="muted">No improvement areas returned.</p>
              )}
            </section>
          </div>

          <section className="panel">
            <h3>Skills</h3>
            {analysis.skills?.length ? (
              <div className="skills-list">
                {analysis.skills.map((sk) => (
                  <div key={sk.skill_id || sk.skill_name} className="skill-card">
                    <div className="skill-header">
                      <div className="skill-name">
                        <div className="skill-name-main">{sk.skill_name}</div>
                        {!!sk.skill_id && <div className="skill-id">{sk.skill_id}</div>}
                      </div>
                      <div className="skill-score">{sk.score}</div>
                    </div>
                    {!!sk.summary && <div className="skill-summary">{sk.summary}</div>}

                    <div className="skill-grid">
                      <div>
                        <div className="skill-subtitle">Signals detected</div>
                        {sk.signals_detected?.length ? (
                          <ul>
                            {sk.signals_detected.map((x, idx) => <li key={idx}>{x}</li>)}
                          </ul>
                        ) : (
                          <div className="muted">None</div>
                        )}
                      </div>
                      <div>
                        <div className="skill-subtitle">Signals missing</div>
                        {sk.signals_missing?.length ? (
                          <ul>
                            {sk.signals_missing.map((x, idx) => <li key={idx}>{x}</li>)}
                          </ul>
                        ) : (
                          <div className="muted">None</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="skill-subtitle">Evidence</div>
                      {sk.evidence?.length ? (
                        <ul>
                          {sk.evidence.map((x, idx) => <li key={idx}>{x}</li>)}
                        </ul>
                      ) : (
                        <div className="muted">None</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No skills returned.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
