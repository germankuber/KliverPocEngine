import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, Calendar } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import * as Accordion from '@radix-ui/react-accordion';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import './ChatAnalysisResultPage.css';

// Register Chart.js components
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

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
  player_responses_analysis?: Array<{
    turn_number: number;
    player_message: string;
    context: string;
    what_worked: string[];
    what_didnt_work: string[];
    improved_version: string;
    improvement_rationale: string;
  }>;
  strengths: string[];
  improvement_areas: string[];
};

type Message = {
  role: string;
  content: string;
};

type ChatRow = {
  id: string;
  created_at: string;
  analysis_updated_at?: string | null;
  analysis_result?: EvaluationJson | string;
  messages?: Message[];
  simulations: {
    name: string;
    character: string;
  }[];
};

export const ChatAnalysisResultPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [row, setRow] = useState<ChatRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRow = useCallback(async (chatId: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('chats')
        .select(`
          id,
          created_at,
          analysis_updated_at,
          analysis_result,
          messages,
          simulations(
            name,
            character
          )
        `)
        .eq('id', chatId)
        .single();

      if (error) throw error;
      setRow(data as ChatRow);
    } catch (error) {
      console.error('Error loading analysis:', error);
      navigate('/analyses');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!id) return;
    fetchRow(id);
  }, [id, fetchRow]);

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
          <button className="btn btn-primary" onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    );
  }

  const updatedAt = row.analysis_updated_at || row.created_at;

  const getScoreColor = (score: number | undefined) => {
    if (!score) return 'gray';
    if (score >= 4) return 'green';
    if (score >= 3) return 'yellow';
    return 'red';
  };

  const scoreColor = getScoreColor(analysis?.overall_score);

  return (
    <div className="chat-analysis-result-page">
      <button className="back-button" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Volver
      </button>

      <div className="hero-section">
        <div className="hero-badge">
          <BarChart3 size={20} />
          Reporte de Análisis Completo
        </div>
        <h1 className="hero-title">{row.simulations?.[0]?.name || 'Simulación desconocida'}</h1>
        <div className="hero-meta">
          <div className="hero-meta-item">
            <span className="meta-label">Personaje:</span>
            <span className="meta-value">{row.simulations?.[0]?.character || 'N/A'}</span>
          </div>
          <div className="hero-meta-item">
            <Calendar size={16} />
            <span className="meta-value">{new Date(updatedAt).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}</span>
          </div>
        </div>
      </div>

      <div className={`score-hero score-${scoreColor}`}>
        <div className="score-hero-content">
          <div className="score-hero-label">Puntuación General</div>
          <div className="score-hero-value">
            {analysis?.overall_score ?? '—'}
            <span className="score-hero-max">/5</span>
          </div>
          <div className="score-hero-description">
            {scoreColor === 'green' && '🎉 Excelente desempeño'}
            {scoreColor === 'yellow' && '👍 Buen desempeño'}
            {scoreColor === 'red' && '💪 Oportunidad de mejora'}
            {scoreColor === 'gray' && 'Sin puntuación'}
          </div>
        </div>
      </div>

      {!analysis ? (
        <div className="empty-state">
          <h3>Sin resultado de análisis</h3>
          <p>Este chat aún no tiene un análisis almacenado.</p>
        </div>
      ) : (
        <div className="analysis-content">
          {/* Radar Chart Section */}
          {analysis.skills && analysis.skills.length > 0 && (
            <section className="radar-chart-section">
              <div className="section-header">
                <div className="section-icon">📊</div>
                <div>
                  <h2 className="section-title">Resumen Visual de Habilidades</h2>
                  <p className="section-subtitle">Visualización comparativa de tu desempeño</p>
                </div>
              </div>
              <div className="radar-chart-container">
                <Radar
                  data={{
                    labels: analysis.skills.map(skill => skill.skill_name),
                    datasets: [
                      {
                        label: 'Tu Puntuación',
                        data: analysis.skills.map(skill => skill.score),
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 2,
                        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgba(59, 130, 246, 1)',
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    scales: {
                      r: {
                        beginAtZero: true,
                        max: 5,
                        min: 0,
                        ticks: {
                          stepSize: 1,
                          font: {
                            size: 12,
                          },
                          backdropColor: 'transparent',
                        },
                        pointLabels: {
                          font: {
                            size: 14,
                            weight: 'bold',
                          },
                          color: '#374151',
                          callback: function (label, index) {
                            const score = analysis.skills[index]?.score || 0;
                            return `${label}\n(${score})`;
                          },
                        },
                        grid: {
                          color: 'rgba(0, 0, 0, 0.1)',
                        },
                      },
                    },
                    plugins: {
                      legend: {
                        display: true,
                        position: 'top',
                        labels: {
                          font: {
                            size: 14,
                          },
                        },
                      },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            return `${context.dataset.label}: ${context.parsed.r}/5`;
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            </section>
          )}

          <div className="insights-grid">
            <section className="insight-card strengths-card">
              <div className="insight-header">
                <div className="insight-icon">💪</div>
                <div>
                  <h3 className="insight-title">Fortalezas</h3>
                  <p className="insight-subtitle">Lo que hiciste bien</p>
                </div>
              </div>
              {analysis.strengths?.length ? (
                <ul className="insight-list">
                  {analysis.strengths.map((s, idx) => (
                    <li key={idx} className="insight-item">
                      <span className="insight-bullet">✓</span>
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No se identificaron fortalezas.</p>
              )}
            </section>

            <section className="insight-card improvements-card">
              <div className="insight-header">
                <div className="insight-icon">📈</div>
                <div>
                  <h3 className="insight-title">Áreas de Mejora</h3>
                  <p className="insight-subtitle">Oportunidades de crecimiento</p>
                </div>
              </div>
              {analysis.improvement_areas?.length ? (
                <ul className="insight-list">
                  {analysis.improvement_areas.map((s, idx) => (
                    <li key={idx} className="insight-item">
                      <span className="insight-bullet">→</span>
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No se identificaron áreas de mejora.</p>
              )}
            </section>
          </div>

          {/* Conversation with Improvements Section */}
          {analysis.player_responses_analysis && analysis.player_responses_analysis.length > 0 && row.messages && (
            <section className="conversation-section">
              <div className="section-header">
                <div className="section-icon">💬</div>
                <div>
                  <h2 className="section-title">Conversación Completa y Mejoras</h2>
                  <p className="section-subtitle">Revisa la conversación con análisis y sugerencias</p>
                </div>
              </div>
              <Accordion.Root type="multiple" className="conversation-list">
                {analysis.player_responses_analysis.map((response, idx) => {
                  // Find messages around this turn
                  const messages = Array.isArray(row.messages) ? row.messages : [];
                  const userMsgIndex = messages.findIndex((m: Message, i: number) =>
                    m.role === 'user' && i >= (response.turn_number - 1) * 2
                  );

                  const assistantMsg = messages[userMsgIndex + 1];

                  return (
                    <Accordion.Item key={idx} value={`turn-${response.turn_number}`} className="conversation-turn">
                      <Accordion.Header>
                        <Accordion.Trigger className="turn-header">
                          <div className="turn-header-left">
                            <span className="turn-number">Turno {response.turn_number}</span>
                            {response.context && (
                              <span className="turn-context">{response.context}</span>
                            )}
                          </div>
                          <span className="turn-arrow">▼</span>
                        </Accordion.Trigger>
                      </Accordion.Header>

                      <Accordion.Content className="accordion-content">
                        {/* Full conversation messages */}
                        <div className="conversation-messages">
                          <div className="chat-message user-message">
                            <div className="message-header">
                              <span className="message-role">👤 Tú</span>
                            </div>
                            <div className="message-text">
                              {response.player_message}
                            </div>
                          </div>

                          {assistantMsg && (
                            <div className="chat-message assistant-message">
                              <div className="message-header">
                                <span className="message-role">🤖 Personaje</span>
                              </div>
                              <div className="message-text">
                                {typeof assistantMsg.content === 'string'
                                  ? assistantMsg.content
                                  : JSON.stringify(assistantMsg.content)}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Analysis and improvement */}
                        <div className="message-analysis">
                          <div className="analysis-section">
                            <h4 className="analysis-title">📊 Análisis de tu respuesta</h4>
                            {response.what_worked && response.what_worked.length > 0 && (
                              <div className="message-feedback positive">
                                <strong>✓ Qué funcionó:</strong>
                                <ul>
                                  {response.what_worked.map((item, i) => (
                                    <li key={i}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {response.what_didnt_work && response.what_didnt_work.length > 0 && (
                              <div className="message-feedback negative">
                                <strong>✗ Qué no funcionó:</strong>
                                <ul>
                                  {response.what_didnt_work.map((item, i) => (
                                    <li key={i}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          <div className="improvement-section">
                            <h4 className="improvement-title">✨ Versión Mejorada</h4>
                            <div className="message-improved-box">
                              {response.improved_version}
                            </div>
                            {response.improvement_rationale && (
                              <div className="message-rationale">
                                <strong>💡 Por qué es mejor:</strong>
                                <p>{response.improvement_rationale}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </Accordion.Content>
                    </Accordion.Item>
                  );
                })}
              </Accordion.Root>
            </section>
          )}

          <section className="skills-section">
            <div className="section-header">
              <div className="section-icon">📊</div>
              <div>
                <h2 className="section-title">Evaluación Detallada de Habilidades</h2>
                <p className="section-subtitle">Análisis profundo de cada competencia evaluada</p>
              </div>
            </div>
            {analysis.skills?.length ? (
              <div className="skills-list">
                {analysis.skills.map((sk) => {
                  const skillScore = sk.score || 0;
                  const skillColor = skillScore >= 4 ? 'green' : skillScore >= 3 ? 'yellow' : 'red';

                  return (
                    <div key={sk.skill_id || sk.skill_name} className={`skill-card skill-${skillColor}`}>
                      <div className="skill-top">
                        <div className="skill-header">
                          <div className="skill-name">
                            <h3 className="skill-name-main">{sk.skill_name}</h3>
                            {!!sk.skill_id && <div className="skill-id">ID: {sk.skill_id}</div>}
                          </div>
                          <div className={`skill-score score-badge-${skillColor}`}>
                            <span className="score-number">{sk.score}</span>
                            <span className="score-label">pts</span>
                          </div>
                        </div>
                        {!!sk.summary && (
                          <div className="skill-summary">
                            <div className="summary-icon">💡</div>
                            <p>{sk.summary}</p>
                          </div>
                        )}
                      </div>

                      <div className="skill-details">
                        <div className="skill-detail-section">
                          <div className="detail-header">
                            <span className="detail-icon detected">✓</span>
                            <h4 className="detail-title">Señales Detectadas</h4>
                          </div>
                          {sk.signals_detected?.length ? (
                            <ul className="detail-list">
                              {sk.signals_detected.map((x, idx) => <li key={idx}>{x}</li>)}
                            </ul>
                          ) : (
                            <div className="muted">Ninguna</div>
                          )}
                        </div>

                        <div className="skill-detail-section">
                          <div className="detail-header">
                            <span className="detail-icon missing">✗</span>
                            <h4 className="detail-title">Señales Faltantes</h4>
                          </div>
                          {sk.signals_missing?.length ? (
                            <ul className="detail-list">
                              {sk.signals_missing.map((x, idx) => <li key={idx}>{x}</li>)}
                            </ul>
                          ) : (
                            <div className="muted">Ninguna</div>
                          )}
                        </div>

                        <div className="skill-detail-section full-width">
                          <div className="detail-header">
                            <span className="detail-icon evidence">📝</span>
                            <h4 className="detail-title">Evidencia</h4>
                          </div>
                          {sk.evidence?.length ? (
                            <ul className="detail-list">
                              {sk.evidence.map((x, idx) => <li key={idx}>{x}</li>)}
                            </ul>
                          ) : (
                            <div className="muted">Sin evidencia</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="muted">No se evaluaron habilidades.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
