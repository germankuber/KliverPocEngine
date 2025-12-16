import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { HomePage } from './pages/HomePage';
import { ChatPage } from './pages/ChatPage';
import { ChatListPage } from './pages/ChatListPage';
import { SimulationPage } from './pages/SimulationPage';
import { SettingsPage } from './pages/SettingsPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/chats" element={<ChatListPage />} />
            <Route path="/simulations" element={<SimulationPage />} />
            <Route path="/simulations/new" element={<SimulationPage isNew />} />
            <Route path="/simulations/:id" element={<SimulationPage />} />
            <Route path="/chat/:id" element={<ChatPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
