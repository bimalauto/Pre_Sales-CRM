import React, { useState } from 'react';
import Sidebar from '../components/Layout/Sidebar';
import TopHeader from '../components/Layout/TopHeader';
import DashboardView from '../components/Dashboard/DashboardView';
import EnquiryForm from '../components/Enquiry/EnquiryForm';
import EnquiryList from '../components/Enquiry/EnquiryList';
import EnquiryTable from '../components/Enquiry/EnquiryTable';
import ReportsView from '../components/Reports/ReportsView';
import UserProfile from '../components/Profile/UserProfile';
import UserManagement from '../components/Admin/UserManagement';
import { useAuth } from '../contexts/AuthContext';
import UserReportDashboard from '../components/Reports/UserReportDashboard';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { currentUser } = useAuth();

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard';
      case 'new-enquiry':
        return 'New Enquiry';
      case 'enquiries':
        return 'My Enquiries';
      case 'enquiries-table':
        return 'Enquiries Table';
      case 'reports':
        return 'Reports';
      case 'profile':
        return 'Profile';
      case 'all-enquiries':
        return 'All Enquiries';
      case 'user-management':
        return 'User Management';
      case 'user-report-dashboard':
        return 'User Report Dashboard';
      default:
        return 'Dashboard';
    }
  };

  const getPageSubtitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return `Welcome back, ${currentUser?.displayName || 'User'}! Here's your overview for today.`;
      case 'new-enquiry':
        return 'Create a new customer enquiry with detailed information';
      case 'enquiries':
        return 'View and manage your personal enquiries';
      case 'enquiries-table':
        return 'Detailed table view of your enquiries';
      case 'reports':
        return 'Analytics and insights for your sales performance';
      case 'profile':
        return 'Manage your account settings and preferences';
      case 'all-enquiries':
        return 'System-wide enquiry management and oversight';
      case 'user-management':
        return 'Manage users, roles, and system access';
      case 'user-report-dashboard':
        return 'View and analyze reports from all users';
      default:
        return '';
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView showReports showUserReportDashboard />;
      case 'new-enquiry':
        return <EnquiryForm />;
      case 'enquiries':
        return <EnquiryList showAll={false} />;
      // removed Enquiries Table
      // removed reports
      case 'profile':
        return <UserProfile />;
      case 'all-enquiries':
        return currentUser?.role === 'admin' ? <EnquiryTable showAll={true} /> : <DashboardView />;
      case 'user-management':
        return currentUser?.role === 'admin' ? <UserManagement /> : <DashboardView />;
      // removed user-report-dashboard
      default:
        return <DashboardView showReports showUserReportDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Top Header */}
      <TopHeader title={getPageTitle()} subtitle={getPageSubtitle()} />
      
      {/* Main Content */}
      <main className="ml-64 pt-20 p-6">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;