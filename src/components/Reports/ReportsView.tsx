import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Calendar, Download, Filter, TrendingUp, Users, FileText, CheckCircle } from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Enquiry } from '../../types';

const ReportsView: React.FC = () => {
  const { currentUser } = useAuth();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchEnquiries();
  }, [currentUser, dateRange]);

  const fetchEnquiries = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const enquiriesRef = collection(db, 'enquiries');
      let enquiriesQuery;
      
      if (currentUser.role === 'admin') {
        enquiriesQuery = query(enquiriesRef, orderBy('createdAt', 'desc'));
      } else {
        enquiriesQuery = query(
          enquiriesRef, 
          where('createdBy', '==', currentUser.uid)
        );
      }

      const snapshot = await getDocs(enquiriesQuery);
      let fetchedEnquiries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Enquiry[];

      // Filter by date range
      fetchedEnquiries = fetchedEnquiries.filter(enquiry => {
        const enquiryDate = new Date(enquiry.enquiryDate);
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        return enquiryDate >= startDate && enquiryDate <= endDate;
      });

      setEnquiries(fetchedEnquiries);
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      setEnquiries([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = {
    total: enquiries.length,
    active: enquiries.filter(e => ['Active', 'Follow-up', 'In Progress'].includes(e.enquiryStatus)).length,
    converted: enquiries.filter(e => e.enquiryStatus === 'Converted').length,
    lost: enquiries.filter(e => e.enquiryStatus === 'Lost').length
  };

  // Status distribution data
  const statusData = [
    { name: 'New', value: enquiries.filter(e => e.enquiryStatus === 'New').length, color: '#3B82F6' },
    { name: 'Active', value: enquiries.filter(e => e.enquiryStatus === 'Active').length, color: '#10B981' },
    { name: 'Follow-up', value: enquiries.filter(e => e.enquiryStatus === 'Follow-up').length, color: '#F59E0B' },
    { name: 'In Progress', value: enquiries.filter(e => e.enquiryStatus === 'In Progress').length, color: '#EF4444' },
    { name: 'Closed', value: enquiries.filter(e => e.enquiryStatus === 'Closed').length, color: '#6B7280' },
    { name: 'Converted', value: enquiries.filter(e => e.enquiryStatus === 'Converted').length, color: '#8B5CF6' },
    { name: 'Lost', value: enquiries.filter(e => e.enquiryStatus === 'Lost').length, color: '#EF4444' }
  ].filter(item => item.value > 0);

  // Source distribution data
  const sourceData = [
    { name: 'Walk-in', value: enquiries.filter(e => e.source === 'Walk-in').length },
    { name: 'Online', value: enquiries.filter(e => e.source === 'Online').length },
    { name: 'Reference', value: enquiries.filter(e => e.source === 'Reference').length },
    { name: 'Advertisement', value: enquiries.filter(e => e.source === 'Advertisement').length },
    { name: 'Campaign', value: enquiries.filter(e => e.source === 'Campaign').length },
    { name: 'Cold Call', value: enquiries.filter(e => e.source === 'Cold Call').length }
  ].filter(item => item.value > 0);

  // Monthly trend data
  const monthlyData = () => {
    const months = {};
    enquiries.forEach(enquiry => {
      const month = new Date(enquiry.enquiryDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      months[month] = (months[month] || 0) + 1;
    });
    
    return Object.entries(months).map(([month, count]) => ({
      month,
      enquiries: count
    })).slice(-6); // Last 6 months
  };

  const conversionRate = stats.total > 0 ? ((stats.converted / stats.total) * 100).toFixed(1) : '0';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Reports & Analytics</h2>
        
        {/* Date Range Filter */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Enquiries</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Enquiries</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.active}</p>
            </div>
            <div className="p-3 rounded-full bg-orange-100">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversions</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.converted}</p>
            </div>
            <div className="p-3 rounded-full bg-green-100">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{conversionRate}%</p>
            </div>
            <div className="p-3 rounded-full bg-purple-100">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Enquiry Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Source Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Enquiry Sources</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sourceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Enquiry Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyData()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="enquiries" stroke="#3B82F6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Summary Statistics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metric
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {statusData.map((status) => (
                <tr key={status.name}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {status.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {status.value}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stats.total > 0 ? ((status.value / stats.total) * 100).toFixed(1) : '0'}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;