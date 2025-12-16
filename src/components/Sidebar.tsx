import { Home, PlaySquare, Menu as MenuIcon, ChevronLeft, Bot, Key, MessageSquare, FolderOpen, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import './Sidebar.css';

export const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  const menuItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/simulations', icon: PlaySquare, label: 'Simulations' },
    { path: '/characters', icon: User, label: 'Characters' },
    { path: '/paths', icon: FolderOpen, label: 'Paths' },
    { path: '/chats', icon: MessageSquare, label: 'History' },
    { path: '/settings', icon: Key, label: 'AI Settings' },
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
              {(isActive || isHomeActive) && (
                <motion.div 
                  layoutId="active-indicator" 
                  className="active-indicator"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {/* Optional footer content */}
      </div>
    </motion.div>
  );
};
