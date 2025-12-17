import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { Sidebar } from './components/Sidebar';
import { HomePage } from './pages/HomePage';
import { ChatPage } from './pages/ChatPage';
import { ChatListPage } from './pages/ChatListPage';
import { ChatAnalysesPage } from './pages/ChatAnalysesPage';
import { ChatAnalysisResultPage } from './pages/ChatAnalysisResultPage';
import { SimulationPage } from './pages/SimulationPage';
import { SettingsPage } from './pages/SettingsPage';
import { PathsPage } from './pages/PathsPage';
import { PathEditorPage } from './pages/PathEditorPage';
import { PathPlayerPage } from './pages/PathPlayerPage';
import { PublicChatPage } from './pages/PublicChatPage';
import { CharactersPage } from './pages/CharactersPage';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { LoadingSpinner } from './components/LoadingSpinner';
import './App.css';

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const isPublicPath = location.pathname.startsWith('/play/') || location.pathname.startsWith('/play-chat/');
  const isAuthPath = location.pathname === '/login' || location.pathname === '/signup';

  // Redirect to home if logged in user tries to access auth pages
  if (user && isAuthPath) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  return (
    <div className="app-container">
      {!isPublicPath && !isAuthPath && <Sidebar />}
      <main className={isPublicPath || isAuthPath ? "main-content-full" : "main-content"}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/play/:pathId" element={<PathPlayerPage />} />
          <Route path="/play-chat/:id" element={<PublicChatPage />} />
          
          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/chats" element={<ProtectedRoute><ChatListPage /></ProtectedRoute>} />
          <Route path="/analyses" element={<ProtectedRoute><ChatAnalysesPage /></ProtectedRoute>} />
          <Route path="/analyses/:id" element={<ProtectedRoute><ChatAnalysisResultPage /></ProtectedRoute>} />
          <Route path="/simulations" element={<ProtectedRoute><SimulationPage /></ProtectedRoute>} />
          <Route path="/simulations/new" element={<ProtectedRoute><SimulationPage isNew /></ProtectedRoute>} />
          <Route path="/simulations/:id" element={<ProtectedRoute><SimulationPage /></ProtectedRoute>} />
          <Route path="/characters" element={<ProtectedRoute><CharactersPage /></ProtectedRoute>} />
          <Route path="/characters/new" element={<ProtectedRoute><CharactersPage isNew /></ProtectedRoute>} />
          <Route path="/characters/:id" element={<ProtectedRoute><CharactersPage /></ProtectedRoute>} />
          <Route path="/chat/:id" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/paths" element={<ProtectedRoute><PathsPage /></ProtectedRoute>} />
          <Route path="/paths/new" element={<ProtectedRoute><PathEditorPage /></ProtectedRoute>} />
          <Route path="/paths/:pathId/edit" element={<ProtectedRoute><PathEditorPage /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
