import React, { useState, useEffect } from 'react';
import { Users, Eye, Shield, Calendar, Activity, FileText, Search, Filter, Download } from 'lucide-react';
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { User, Enquiry } from '../../types';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface UserWithStats extends User {
  totalEnquiries: number;
  activeEnquiries: number;
  convertedEnquiries: number;
  lastActivity: Date | null;
  isActive: boolean;
  enquiries: Enquiry[];
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithStats[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);

  useEffect(() => {
    fetchUsersAndEnquiries();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, statusFilter]);

  const fetchUsersAndEnquiries = async () => {
    try {
      setLoading(true);
      
      // Fetch all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        // Defensive: fallback for missing fields and handle Firestore Timestamp or string
        return {
          id: doc.id,
          uid: data.uid || doc.id,
          email: data.email || '',
          displayName: data.displayName || '',
          role: data.role || 'user',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : null),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null)
        };
      }) as User[];

      // Fetch all enquiries
      const enquiriesSnapshot = await getDocs(query(collection(db, 'enquiries'), orderBy('createdAt', 'desc')));
      const enquiriesData = enquiriesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : null),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null)
        };
      }) as Enquiry[];

      setEnquiries(enquiriesData);

      // Calculate user statistics
      const usersWithStats: UserWithStats[] = usersData.map(user => {
        const userEnquiries = enquiriesData.filter(enquiry => enquiry.createdBy === user.uid);
        const activeEnquiries = userEnquiries.filter(e => 
          ['Active', 'Follow-up', 'In Progress', 'New'].includes(e.enquiryStatus)
        );
        const convertedEnquiries = userEnquiries.filter(e => e.enquiryStatus === 'Converted');
        
        // Calculate last activity (most recent enquiry or update)
        let lastActivity: Date | null = null;
        if (userEnquiries.length > 0) {
          const dates = userEnquiries.map(e => {
            const createdAt = e.createdAt?.toDate?.() || new Date(e.createdAt);
            const updatedAt = e.updatedAt?.toDate?.() || new Date(e.updatedAt);
            return updatedAt > createdAt ? updatedAt : createdAt;
          });
          lastActivity = new Date(Math.max(...dates.map(d => d.getTime())));
        }

        // Consider user active if they have activity in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const isActive = lastActivity ? lastActivity > thirtyDaysAgo : false;

        return {
          ...user,
          totalEnquiries: userEnquiries.length,
          activeEnquiries: activeEnquiries.length,
          convertedEnquiries: convertedEnquiries.length,
          lastActivity,
          isActive,
          enquiries: userEnquiries
        };
      });

      setUsers(usersWithStats);
    } catch (error) {
      console.error('Error fetching users and enquiries:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Enhanced Search filter: by displayName, email, role, and status
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        (user.displayName && user.displayName.toLowerCase().includes(lower)) ||
        user.email.toLowerCase().includes(lower) ||
        user.role.toLowerCase().includes(lower) ||
        (user.isActive ? 'active' : 'inactive').includes(lower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(user => user.isActive);
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(user => !user.isActive);
      } else if (statusFilter === 'admin') {
        filtered = filtered.filter(user => user.role === 'admin');
      } else if (statusFilter === 'user') {
        filtered = filtered.filter(user => user.role === 'user');
      }
    }

    setFilteredUsers(filtered);
  };

  const exportUsersToCSV = () => {
    const csvData = filteredUsers.map(user => ({
      'Name': user.displayName || 'N/A',
      'Email': user.email,
      'Role': user.role,
      'Status': user.isActive ? 'Active' : 'Inactive',
      'Total Enquiries': user.totalEnquiries,
      'Active Enquiries': user.activeEnquiries,
      'Converted Enquiries': user.convertedEnquiries,
      'Conversion Rate': user.totalEnquiries > 0 ? `${((user.convertedEnquiries / user.totalEnquiries) * 100).toFixed(1)}%` : '0%',
      'Last Activity': user.lastActivity ? user.lastActivity.toLocaleDateString() : 'Never',
      'Member Since': new Date(user.createdAt).toLocaleDateString()
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportUsersToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    doc.setFontSize(16);
    doc.text('Users Management Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 25);
    doc.text(`Total Users: ${filteredUsers.length}`, 14, 30);
    doc.text(`Active Users: ${filteredUsers.filter(u => u.isActive).length}`, 14, 35);

    const tableData = filteredUsers.map(user => [
      user.displayName || 'N/A',
      user.email,
      user.role,
      user.isActive ? 'Active' : 'Inactive',
      user.totalEnquiries.toString(),
      user.activeEnquiries.toString(),
      user.convertedEnquiries.toString(),
      user.lastActivity ? user.lastActivity.toLocaleDateString() : 'Never'
    ]);

    doc.autoTable({
      head: [['Name', 'Email', 'Role', 'Status', 'Total', 'Active', 'Converted', 'Last Activity']],
      body: tableData,
      startY: 45,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    doc.save(`users_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const getActivityStatus = (user: UserWithStats) => {
    if (!user.lastActivity) return { color: 'bg-slate-700 text-slate-300 border-slate-600', text: 'Never Active' };
    if (user.isActive) return { color: 'bg-green-900 text-green-300 border-green-700', text: 'Active' };
    return { color: 'bg-red-900 text-red-300 border-red-700', text: 'Inactive' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">User Management</h2>
            <p className="text-slate-400 mt-1">Monitor user activity and manage system access</p>
          </div>
          
          {/* Export Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={exportUsersToCSV}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={exportUsersToPDF}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Total Users</p>
                <p className="text-2xl font-bold text-white mt-2">{users.length}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-900">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Active Users</p>
                <p className="text-2xl font-bold text-white mt-2">{users.filter(u => u.isActive).length}</p>
              </div>
              <div className="p-3 rounded-full bg-green-900">
                <Activity className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Admins</p>
                <p className="text-2xl font-bold text-white mt-2">{users.filter(u => u.role === 'admin').length}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-900">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Total Enquiries</p>
                <p className="text-2xl font-bold text-white mt-2">{enquiries.length}</p>
              </div>
              <div className="p-3 rounded-full bg-orange-900">
                <FileText className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 w-full bg-slate-800 border border-slate-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 appearance-none text-white"
            >
              <option value="all">All Users</option>
              <option value="active">Active Users</option>
              <option value="inactive">Inactive Users</option>
              <option value="admin">Admins</option>
              <option value="user">Regular Users</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-750">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    User Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Role & Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Enquiry Stats
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-slate-800 divide-y divide-slate-700">
                {filteredUsers.map((user) => {
                  const activityStatus = getActivityStatus(user);
                  const conversionRate = user.totalEnquiries > 0 ? ((user.convertedEnquiries / user.totalEnquiries) * 100).toFixed(1) : '0';
                  
                  return (
                    <tr key={user.uid} className="hover:bg-slate-750 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {(user.displayName || user.email).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">
                              {user.displayName || 'No Name'}
                            </div>
                            <div className="text-sm text-slate-400">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                            user.role === 'admin' ? 'bg-purple-900 text-purple-300 border-purple-700' : 'bg-blue-900 text-blue-300 border-blue-700'
                          }`}>
                            {user.role}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${activityStatus.color}`}>
                            {activityStatus.text}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">
                          <div>Total: <span className="font-medium">{user.totalEnquiries}</span></div>
                          <div>Active: <span className="font-medium text-orange-400">{user.activeEnquiries}</span></div>
                          <div>Converted: <span className="font-medium text-green-400">{user.convertedEnquiries}</span></div>
                          <div>Rate: <span className="font-medium">{conversionRate}%</span></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">
                          {user.lastActivity ? (
                            <>
                              <div>{user.lastActivity.toLocaleDateString()}</div>
                              <div className="text-xs text-slate-400">
                                {user.lastActivity.toLocaleTimeString()}
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-400">Never</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-slate-700 transition-colors"
                          title="View User Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Details Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
              <div className="flex items-center justify-between p-6 border-b border-slate-700">
                <h2 className="text-xl font-semibold text-white">
                  User Details: {selectedUser.displayName || selectedUser.email}
                </h2>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 hover:bg-slate-700 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* User Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">User Information</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-slate-400">Name:</span>
                        <span className="ml-2 font-medium text-white">{selectedUser.displayName || 'Not set'}</span>
                      </div>
                      <div>
                        <span className="text-sm text-slate-400">Email:</span>
                        <span className="ml-2 font-medium text-white">{selectedUser.email}</span>
                      </div>
                      <div>
                        <span className="text-sm text-slate-400">Role:</span>
                        <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full border ${
                          selectedUser.role === 'admin' ? 'bg-purple-900 text-purple-300 border-purple-700' : 'bg-blue-900 text-blue-300 border-blue-700'
                        }`}>
                          {selectedUser.role}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-slate-400">Member Since:</span>
                        <span className="ml-2 font-medium text-white">{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Activity Statistics</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-slate-400">Total Enquiries:</span>
                        <span className="ml-2 font-medium text-lg text-white">{selectedUser.totalEnquiries}</span>
                      </div>
                      <div>
                        <span className="text-sm text-slate-400">Active Enquiries:</span>
                        <span className="ml-2 font-medium text-lg text-orange-400">{selectedUser.activeEnquiries}</span>
                      </div>
                      <div>
                        <span className="text-sm text-slate-400">Converted:</span>
                        <span className="ml-2 font-medium text-lg text-green-400">{selectedUser.convertedEnquiries}</span>
                      </div>
                      <div>
                        <span className="text-sm text-slate-400">Conversion Rate:</span>
                        <span className="ml-2 font-medium text-lg text-white">
                          {selectedUser.totalEnquiries > 0 ? 
                            `${((selectedUser.convertedEnquiries / selectedUser.totalEnquiries) * 100).toFixed(1)}%` : 
                            '0%'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Enquiries */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Recent Enquiries ({selectedUser.enquiries.length})
                  </h3>
                  {selectedUser.enquiries.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">No enquiries found for this user.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-700">
                        <thead className="bg-slate-750">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">Customer</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">Enquiry No.</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">Date</th>
                          </tr>
                        </thead>
                        <tbody className="bg-slate-800 divide-y divide-slate-700">
                          {selectedUser.enquiries.slice(0, 10).map((enquiry) => (
                            <tr key={enquiry.id}>
                              <td className="px-4 py-3 text-sm text-white">{enquiry.customerName}</td>
                              <td className="px-4 py-3 text-sm text-white">{enquiry.enquiryNo}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                                  enquiry.enquiryStatus === 'Active' ? 'bg-green-900 text-green-300 border-green-700' :
                                  enquiry.enquiryStatus === 'Converted' ? 'bg-purple-900 text-purple-300 border-purple-700' :
                                  enquiry.enquiryStatus === 'Lost' ? 'bg-red-900 text-red-300 border-red-700' :
                                  'bg-blue-900 text-blue-300 border-blue-700'
                                }`}>
                                  {enquiry.enquiryStatus}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-400">
                                {new Date(enquiry.enquiryDate).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {selectedUser.enquiries.length > 10 && (
                        <p className="text-sm text-slate-400 text-center py-2">
                          Showing 10 of {selectedUser.enquiries.length} enquiries
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;