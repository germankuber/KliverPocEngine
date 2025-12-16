import './LoadingSpinner.css';

type LoadingSpinnerProps = {
  message?: string;
  size?: 'small' | 'medium' | 'large';
};

export const LoadingSpinner = ({ message = 'Loading...', size = 'medium' }: LoadingSpinnerProps) => {
  return (
    <div className="loading-spinner-container">
      <div className={`loading-spinner ${size}`}>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
};


