import React, { useEffect, useState } from 'react';
import { LogOut, Bell, Search } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';

interface TopHeaderProps {
  title: string;
  subtitle?: string;
}

const TopHeader: React.FC<TopHeaderProps> = ({ title, subtitle }) => {
  const { currentUser, logout } = useAuth();
  const [pendingFollowUps, setPendingFollowUps] = useState<number>(0);

  useEffect(() => {
    const fetchPendingFollowUps = async () => {
      if (!currentUser) return;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      try {
        const enquiriesRef = collection(db, 'enquiries');
        const q = query(
          enquiriesRef,
          where('createdBy', '==', currentUser.uid),
          where('nextFollowUpDate', '!=', ''),
        );
        const snapshot = await getDocs(q);
        const pending = snapshot.docs.filter(docSnap => {
          const data = docSnap.data();
          if (!data.nextFollowUpDate) return false;
          const followUpDate = new Date(data.nextFollowUpDate);
          followUpDate.setHours(0, 0, 0, 0);
          return followUpDate <= today;
        });
        setPendingFollowUps(pending.length);
      } catch (err) {
        setPendingFollowUps(0);
      }
    };
    fetchPendingFollowUps();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 right-0 left-0 z-20 ml-64">
      <div className="px-6 py-2">
        <div className="flex justify-between items-center">
          {/* Title Section */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
          
          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Notifications */}
            <div className="relative">
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                {pendingFollowUps > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center font-bold">
                    {pendingFollowUps}
                  </span>
                )}
              </button>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {currentUser?.displayName || 'User'}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {currentUser?.role}
                </p>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;