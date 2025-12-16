import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { HomePage } from './pages/HomePage';
import { ChatPage } from './pages/ChatPage';
import { ChatListPage } from './pages/ChatListPage';
import { SimulationPage } from './pages/SimulationPage';
import { SettingsPage } from './pages/SettingsPage';
import { PathsPage } from './pages/PathsPage';
import { PathEditorPage } from './pages/PathEditorPage';
import { PathPlayerPage } from './pages/PathPlayerPage';
import { CharactersPage } from './pages/CharactersPage';
import './App.css';

function AppContent() {
  const location = useLocation();
  const isPublicPath = location.pathname.startsWith('/play/');

  return (
    <div className="app-container">
      {!isPublicPath && <Sidebar />}
      <main className={isPublicPath ? "main-content-full" : "main-content"}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/chats" element={<ChatListPage />} />
          <Route path="/simulations" element={<SimulationPage />} />
          <Route path="/simulations/new" element={<SimulationPage isNew />} />
          <Route path="/simulations/:id" element={<SimulationPage />} />
          <Route path="/characters" element={<CharactersPage />} />
          <Route path="/characters/new" element={<CharactersPage isNew />} />
          <Route path="/characters/:id" element={<CharactersPage />} />
          <Route path="/chat/:id" element={<ChatPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/paths" element={<PathsPage />} />
          <Route path="/paths/new" element={<PathEditorPage />} />
          <Route path="/paths/:pathId/edit" element={<PathEditorPage />} />
          <Route path="/play/:pathId" element={<PathPlayerPage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
