import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart3, Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LoadingSpinner } from '../components/LoadingSpinner';
import './ChatAnalysesPage.css';

type AnalysisResult = {
  overall_score?: number;
  skills?: unknown[];
  strengths?: unknown[];
  improvement_areas?: unknown[];
};

type ChatAnalysisRow = {
  id: string;
  created_at: string;
  analysis_updated_at?: string | null;
  analysis_result?: AnalysisResult;
  simulations: {
    name: string;
    character: string;
  }[];
};

export const ChatAnalysesPage = () => {
  const [rows, setRows] = useState<ChatAnalysisRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('chats')
        .select(`
          id,
          created_at,
          analysis_updated_at,
          analysis_result,
          simulations (
            name,
            character
          )
        `)
        .not('analysis_result', 'is', null)
        .order('analysis_updated_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setRows((data as ChatAnalysisRow[]) || []);
    } catch (error) {
      console.error('Error fetching analyses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getOverallScore = (analysis: AnalysisResult | string | null | undefined): number | null => {
    if (!analysis) return null;
    if (typeof analysis === 'string') {
      try {
        const parsed = JSON.parse(analysis);
        return typeof parsed?.overall_score === 'number' ? parsed.overall_score : null;
      } catch {
        return null;
      }
    }
    return typeof analysis?.overall_score === 'number' ? analysis.overall_score : null;
  };

  const getCounts = (analysis: AnalysisResult | string | null | undefined) => {
    const obj = typeof analysis === 'string' ? (() => {
      try { return JSON.parse(analysis); } catch { return null; }
    })() : analysis;

    const skills = Array.isArray(obj?.skills) ? obj.skills.length : 0;
    const strengths = Array.isArray(obj?.strengths) ? obj.strengths.length : 0;
    const improvements = Array.isArray(obj?.improvement_areas) ? obj.improvement_areas.length : 0;
    return { skills, strengths, improvements };
  };

  return (
    <div className="chat-analyses-page">
      <div className="page-header">
        <h1><BarChart3 className="text-primary" /> Analyses</h1>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Loading analyses..." />
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <BarChart3 size={48} className="text-gray-300 mb-4" />
          <h3>No analyses yet</h3>
          <p>Analyze a completed chat to see results here.</p>
          <Link to="/chats" className="btn btn-primary mt-4">Go to Chat History</Link>
        </div>
      ) : (
        <div className="analyses-grid">
          {rows.map((row) => {
            const overall = getOverallScore(row.analysis_result);
            const counts = getCounts(row.analysis_result);
            const updatedAt = row.analysis_updated_at || row.created_at;

            return (
              <Link key={row.id} to={`/analyses/${row.id}`} className="analysis-card">
                <div className="analysis-card-top">
                  <div className="analysis-card-title">
                    <h3>{row.simulations?.[0]?.name || 'Unknown Simulation'}</h3>
                    <div className="analysis-card-subtitle">{row.simulations?.[0]?.character || 'N/A'}</div>
                  </div>
                  <div className="analysis-card-score">
                    <div className="score-label">Overall</div>
                    <div className="score-value">{typeof overall === 'number' ? overall : '—'}</div>
                  </div>
                </div>

                <div className="analysis-card-meta">
                  <span className="analysis-date">
                    <Calendar size={14} />
                    {new Date(updatedAt).toLocaleDateString()}
                  </span>
                  <span className="analysis-cta">
                    View <ArrowRight size={14} />
                  </span>
                </div>

                <div className="analysis-card-stats">
                  <div className="stat">
                    <div className="stat-value">{counts.skills}</div>
                    <div className="stat-label">Skills</div>
                  </div>
                  <div className="stat">
                    <div className="stat-value">{counts.strengths}</div>
                    <div className="stat-label">Strengths</div>
                  </div>
                  <div className="stat">
                    <div className="stat-value">{counts.improvements}</div>
                    <div className="stat-label">Improvements</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
