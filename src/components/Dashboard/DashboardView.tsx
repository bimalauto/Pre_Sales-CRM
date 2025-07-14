import React, { useState, useEffect } from 'react';
import { Users, FileText, CheckCircle, Clock } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Enquiry } from '../../types';
import StatCard from './StatCard';
import ReportsView from '../Reports/ReportsView';
import UserReportDashboard from '../Reports/UserReportDashboard';

const DashboardView: React.FC<{ showReports?: boolean; showUserReportDashboard?: boolean }> = ({ showReports, showUserReportDashboard }) => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalLeadsGenerated: 0,
    totalConnected: 0,
    notConnected: 0,
    callBack: 0,
    totalBooking: 0,
    totalRetail: 0,
    todayLeads: 0,
    mtdLeads: 0,
  });
  const [recentEnquiries, setRecentEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser]);

  const fetchDashboardData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      // Build query based on user role
      const enquiriesRef = collection(db, 'enquiries');
      let enquiriesQuery;
      
      if (currentUser.role === 'admin') {
        // For admin, get all enquiries ordered by createdAt
        enquiriesQuery = query(enquiriesRef, orderBy('createdAt', 'desc'));
      } else {
        // For non-admin users, filter by createdBy without ordering to avoid composite index requirement
        enquiriesQuery = query(
          enquiriesRef, 
          where('createdBy', '==', currentUser.uid)
        );
      }

      const snapshot = await getDocs(enquiriesQuery);
      let enquiries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Enquiry[];

      // For non-admin users, sort the results in memory after fetching
      if (currentUser.role !== 'admin') {
        enquiries = enquiries.sort((a, b) => {
          const dateA = new Date(a.createdAt?.seconds ? a.createdAt.seconds * 1000 : a.createdAt);
          const dateB = new Date(b.createdAt?.seconds ? b.createdAt.seconds * 1000 : b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
      }

      // Calculate metrics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const totalLeads = enquiries.length;
      const totalLeadsGenerated = enquiries.filter(e => e.enquiryStatus !== 'Lost').length;
      const totalConnected = enquiries.filter(e => e.leadStatus === 'Call Connected').length;
      const notConnected = enquiries.filter(e => e.leadStatus === 'Call Not Connected').length;
      const callBack = enquiries.filter(e => e.enquiryStatus === 'Call Back').length;
      const totalBooking = enquiries.filter(e => e.enquiryStatus === 'Booking').length;
      const totalRetail = enquiries.filter(e => e.enquiryStatus === 'Retail').length;
      const todayLeads = enquiries.filter(e => {
        const d = new Date(e.enquiryDate);
        return d >= today;
      }).length;
      const mtdLeads = enquiries.filter(e => {
        const d = new Date(e.enquiryDate);
        return d >= monthStart && d <= today;
      }).length;

      setStats({
        totalLeads,
        totalLeadsGenerated,
        totalConnected,
        notConnected,
        callBack,
        totalBooking,
        totalRetail,
        todayLeads,
        mtdLeads,
      });

      // Get recent enquiries (last 5)
      setRecentEnquiries(enquiries.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* CRE Dashboard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Leads" value={stats.totalLeads} icon={FileText} color="bg-blue-500" />
        <StatCard title="Total Leads Generated" value={stats.totalLeadsGenerated} icon={FileText} color="bg-blue-400" />
        <StatCard title="Total Connected" value={stats.totalConnected} icon={CheckCircle} color="bg-green-500" />
        <StatCard title="Not Connected" value={stats.notConnected} icon={Clock} color="bg-red-500" />
        <StatCard title="Call Back" value={stats.callBack} icon={Clock} color="bg-yellow-500" />
        <StatCard title="Total Booking" value={stats.totalBooking} icon={CheckCircle} color="bg-indigo-500" />
        <StatCard title="Total Retail" value={stats.totalRetail} icon={CheckCircle} color="bg-purple-500" />
        <StatCard title="Today's Summary" value={stats.todayLeads} icon={FileText} color="bg-pink-500" />
        <StatCard title="MTD Summary" value={stats.mtdLeads} icon={FileText} color="bg-teal-500" />
      </div>

      {/* Reports/Charts Section */}
      {showReports && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <ReportsView />
        </div>
      )}

      {/* User Report Dashboard Section */}
      {showUserReportDashboard && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <UserReportDashboard />
        </div>
      )}

      {/* Recent Enquiries */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Enquiries</h3>
        </div>
        <div className="p-6">
          {recentEnquiries.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No enquiries found. Create your first enquiry to get started!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Enquiry No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentEnquiries.map((enquiry) => (
                    <tr key={enquiry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {enquiry.customerName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {enquiry.mobileNumber}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {enquiry.enquiryNo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          enquiry.enquiryStatus === 'Active' ? 'bg-green-100 text-green-800' :
                          enquiry.enquiryStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          enquiry.enquiryStatus === 'Closed' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {enquiry.enquiryStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(enquiry.enquiryDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;