import React from 'react';
import { Home, Plus, FileText, BarChart3, User, Table, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const { currentUser } = useAuth();

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'new-enquiry', label: 'New Enquiry', icon: Plus },
    { id: 'enquiries', label: 'My Enquiries', icon: FileText },
    { id: 'enquiries-table', label: 'Enquiries Table', icon: Table },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: User },
    ...(currentUser?.role === 'admin' ? [
      { id: 'all-enquiries', label: 'All Enquiries', icon: BarChart3 },
      { id: 'user-management', label: 'User Management', icon: Users }
    ] : [])
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;