import React from 'react';

interface SidebarProps {
  children: React.ReactNode;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ children, className = '' }) => {
  return (
    <aside
      className={`w-72 glass-elevated border-r border-glass h-screen overflow-hidden ${className}`}
    >
      {children}
    </aside>
  );
};

export default Sidebar;
