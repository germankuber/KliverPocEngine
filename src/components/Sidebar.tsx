import { Home, PlaySquare, Menu as MenuIcon, ChevronLeft, Bot, Key, MessageSquare, FolderOpen, User, BarChart3, LogOut, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../lib/auth';
import './Sidebar.css';

export const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const menuItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/simulations', icon: PlaySquare, label: 'Simulations' },
    { path: '/characters', icon: User, label: 'Characters' },
    { path: '/moods', icon: Smile, label: 'Moods' },
    { path: '/paths', icon: FolderOpen, label: 'Paths' },
    { path: '/chats', icon: MessageSquare, label: 'History' },
    { path: '/analyses', icon: BarChart3, label: 'Analyses' },
    ...(isAdmin ? [{ path: '/settings', icon: Key, label: 'AI Settings' }] : []),
  ];

  return (
    <motion.div 
      className={clsx("sidebar", { "collapsed": isCollapsed })}
      animate={{ width: isCollapsed ? 80 : 250 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 100 }}
    >
      <div className="sidebar-header">
        <div className="logo-container">
          <Bot size={32} className="logo-icon" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span 
                className="logo-text"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                KliverPoc
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <button className="collapse-btn" onClick={toggleSidebar}>
          {isCollapsed ? <MenuIcon size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path) && item.path !== '/';
          const isHomeActive = location.pathname === '/' && item.path === '/';
          
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              className={clsx("nav-item", { "active": isActive || isHomeActive })}
            >
              <Icon size={24} className="nav-icon" />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span 
                    className="nav-label"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <AnimatePresence>
            {!isCollapsed && user?.email && (
              <motion.div
                className="user-email"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                {user.email}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button 
          className="logout-btn" 
          onClick={handleSignOut}
          title={isCollapsed ? "Sign out" : undefined}
        >
          <LogOut size={20} className="logout-icon" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.div>
  );
};
