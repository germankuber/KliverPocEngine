import { useNavigate } from 'react-router-dom';
import { Settings, ArrowRight } from 'lucide-react';

export const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div style={{ 
      textAlign: 'center', 
      padding: '4rem 2rem', 
      width: '100%' 
    }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '64px',
        height: '64px',
        backgroundColor: '#eef2ff',
        borderRadius: '16px',
        color: '#4f46e5',
        marginBottom: '2rem'
      }}>
        <Settings size={32} />
      </div>
      
      <h1 style={{ 
        fontSize: '3rem', 
        fontWeight: '800', 
        marginBottom: '1rem',
        background: 'linear-gradient(135deg, #111827 0%, #4b5563 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        Welcome to KliverPoc Engine
      </h1>
      
      <p style={{ 
        fontSize: '1.25rem', 
        color: '#6b7280', 
        marginBottom: '3rem',
        lineHeight: '1.6' 
      }}>
        Design, configure, and test your AI agents in a powerful and intuitive environment.
      </p>

      <button 
        onClick={() => navigate('/config')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '1rem 2rem',
          backgroundColor: '#4f46e5',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: '1.1rem',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(79, 70, 229, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(79, 70, 229, 0.2)';
        }}
      >
        Start Configuration <ArrowRight size={20} />
      </button>
    </div>
  );
};
