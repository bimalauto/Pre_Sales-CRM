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
  interface EnquiryWithUserName extends Enquiry {
    createdByName?: string;
  }
  const [recentEnquiries, setRecentEnquiries] = useState<EnquiryWithUserName[]>([]);
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
      // Fetch display names for recent enquiries
      const recent = enquiries.slice(0, 5);
      const userMap: { [key: string]: string } = {};
      for (const enquiry of recent) {
        if (enquiry.createdBy && !userMap[enquiry.createdBy]) {
          try {
            const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', enquiry.createdBy)));
            if (!userDoc.empty) {
              const userData = userDoc.docs[0].data();
              userMap[enquiry.createdBy] = userData.displayName || enquiry.createdBy;
            } else {
              userMap[enquiry.createdBy] = enquiry.createdBy;
            }
          } catch {
            userMap[enquiry.createdBy] = enquiry.createdBy;
          }
        }
      }
      setRecentEnquiries(recent.map(e => ({ ...e, createdByName: userMap[e.createdBy] })));
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

      {/* Recent Enquiries as Cards */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Recent Enquiries</h3>
        </div>
        <div className="p-6 pb-0">
          {recentEnquiries.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No enquiries found. Create your first enquiry to get started!</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-7">
                {recentEnquiries.slice(0, 10).map((enquiry) => (
                  <div key={enquiry.id} className="relative bg-white rounded-xl border-l-4 border-blue-500 shadow-lg flex flex-col min-h-[260px] p-5 hover:shadow-2xl transition-shadow duration-200">
                    {/* Username */}
                    <div className="mb-1">
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 rounded px-2 py-1 inline-block mb-1" title={enquiry.createdBy || 'N/A'}>
                        <span className="material-icons text-sm mr-1 align-middle">person</span> Username
                      </span>
                      <div className="text-xs font-medium text-gray-800 truncate" title={enquiry.createdByName || enquiry.createdBy || 'N/A'}>
                        {enquiry.createdByName || enquiry.createdBy || 'N/A'}
                      </div>
                    </div>
                    {/* Customer Name */}
                    <div className="text-lg font-extrabold text-gray-900 truncate mb-2 mt-1" title={enquiry.customerName}>{enquiry.customerName}</div>
                    <div className="flex flex-col gap-1 mb-2">
                      {/* Enquiry No. */}
                      <div className="flex items-center gap-2">
                        <span className="material-icons text-base text-gray-400">confirmation_number</span>
                        <span className="text-xs font-semibold text-gray-600">Enquiry No.:</span>
                        <span className="text-xs text-blue-700 font-semibold underline truncate" title={enquiry.enquiryNo}>{enquiry.enquiryNo}</span>
                      </div>
                      {/* Phone */}
                      <div className="flex items-center gap-2">
                        <span className="material-icons text-base text-gray-400">phone</span>
                        <span className="text-xs text-gray-700">{enquiry.mobileNumber || 'N/A'}</span>
                      </div>
                      {/* Email */}
                      <div className="flex items-center gap-2">
                        <span className="material-icons text-base text-gray-400">mail</span>
                        <span className="text-xs text-gray-700 truncate">{enquiry.emailId || 'N/A'}</span>
                      </div>
                      {/* Date */}
                      <div className="flex items-center gap-2">
                        <span className="material-icons text-base text-gray-400">event</span>
                        <span className="text-xs text-gray-700">{enquiry.enquiryDate ? new Date(enquiry.enquiryDate).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      {/* Model & Variant */}
                      <div className="flex items-center gap-2">
                        <span className="material-icons text-base text-gray-400">directions_car</span>
                        <span className="text-xs text-gray-700 truncate">{enquiry.modelName || 'N/A'}{enquiry.variantName ? ` (${enquiry.variantName})` : ''}</span>
                      </div>
                    </div>
                    {/* Status Bar */}
                    <div className="absolute left-0 bottom-0 w-full px-5 pb-3">
                      <div className="rounded-b-xl py-1 px-2 text-xs font-semibold text-white" style={{background: enquiry.enquiryStatus === 'Active' ? '#22c55e' : '#64748b'}}>
                        Status: {enquiry.enquiryStatus}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* Pagination Bar */}
        <div className="bg-[#233886] text-white flex items-center justify-between px-6 py-3 rounded-b-2xl mt-0">
          <div className="flex items-center gap-2">
            <span className="text-sm">Rows per page:</span>
            <select className="bg-[#233886] border-none text-white text-sm focus:outline-none cursor-not-allowed" disabled value={10}>
              <option value={10}>10</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm">1-10 of {recentEnquiries.length}</span>
            <button className="rounded-full p-1 bg-white/20 text-white cursor-not-allowed" disabled>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button className="rounded-full p-1 bg-white/20 text-white cursor-not-allowed" disabled>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;