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
import { MoodsPage } from './pages/MoodsPage';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { LogoutPage } from './pages/LogoutPage';
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

// Admin Only Route component
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const location = useLocation();
  const { user, loading } = useAuth();
  
  console.log('AppContent: pathname =', location.pathname, 'user =', user?.email, 'loading =', loading);
  
  const isPublicPath = location.pathname.startsWith('/play/') || 
                       location.pathname.startsWith('/play-chat/') ||
                       location.pathname.startsWith('/analyses/');
  const isAuthPath = location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/logout';

  // Redirect to home if logged in user tries to access login/signup pages
  if (user && (location.pathname === '/login' || location.pathname === '/signup')) {
    console.log('AppContent: Redirecting logged-in user from auth page to home');
    return <Navigate to="/" replace />;
  }

  if (loading) {
    console.log('AppContent: Still loading auth state...');
    return <LoadingSpinner message="Loading..." />;
  }

  return (
    <div className="app-container">
      {!isPublicPath && !isAuthPath && <Sidebar />}
      <main className={isPublicPath || isAuthPath ? "main-content-full" : "main-content"}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/logout" element={<LogoutPage />} />
          <Route path="/play/:pathId" element={<PathPlayerPage />} />
          <Route path="/play-chat/:id" element={<PublicChatPage />} />
          <Route path="/analyses/:id" element={<ChatAnalysisResultPage />} />
          
          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/chats" element={<ProtectedRoute><ChatListPage /></ProtectedRoute>} />
          <Route path="/analyses" element={<ProtectedRoute><ChatAnalysesPage /></ProtectedRoute>} />
          <Route path="/simulations" element={<ProtectedRoute><SimulationPage /></ProtectedRoute>} />
          <Route path="/simulations/new" element={<ProtectedRoute><SimulationPage isNew /></ProtectedRoute>} />
          <Route path="/simulations/:id" element={<ProtectedRoute><SimulationPage /></ProtectedRoute>} />
          <Route path="/characters" element={<ProtectedRoute><CharactersPage /></ProtectedRoute>} />
          <Route path="/characters/new" element={<ProtectedRoute><CharactersPage isNew /></ProtectedRoute>} />
          <Route path="/characters/:id" element={<ProtectedRoute><CharactersPage /></ProtectedRoute>} />
          <Route path="/moods" element={<ProtectedRoute><MoodsPage /></ProtectedRoute>} />
          <Route path="/moods/new" element={<ProtectedRoute><MoodsPage isNew /></ProtectedRoute>} />
          <Route path="/moods/edit/:id" element={<ProtectedRoute><MoodsPage /></ProtectedRoute>} />
          <Route path="/chat/:id" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/paths" element={<ProtectedRoute><PathsPage /></ProtectedRoute>} />
          <Route path="/paths/new" element={<ProtectedRoute><PathEditorPage /></ProtectedRoute>} />
          <Route path="/paths/:pathId/edit" element={<ProtectedRoute><PathEditorPage /></ProtectedRoute>} />
          
          {/* Admin only routes */}
          <Route path="/settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
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
