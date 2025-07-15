import React, { useEffect, useState } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Enquiry } from '../../types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

const FILTERS = [
  { label: 'MTD', value: 'mtd' },
  { label: 'Today', value: 'today' }
];

const UserReportDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [userStats, setUserStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Fetch all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users: User[] = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as User);
      // Fetch all enquiries
      const enquiriesSnapshot = await getDocs(query(collection(db, 'enquiries')));
      const enquiries: Enquiry[] = enquiriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Enquiry);
      // Calculate stats for each user
      const stats = users.map(user => {
        const userEnquiries = enquiries.filter(e => e.createdBy === user.uid);
        return {
          username: user.displayName || user.email,
          totalEnquiry: userEnquiries.length,
          totalGenerated: userEnquiries.filter(e => e.enquiryStatus).length,
          testDriveAppt: userEnquiries.filter(e => e.testDriveAppt).length,
          homeVisitAppt: userEnquiries.filter(e => e.homeVisitAppt).length,
          evaluationAppt: userEnquiries.filter(e => e.evaluationDate).length,
          totalBooking: userEnquiries.filter(e => e.enquiryStatus === 'Order').length,
          totalInvoice: userEnquiries.filter(e => e.enquiryStatus === 'Invoiced').length,
        };
      });
      // Add admin summary row if current user is admin
      if (currentUser && currentUser.role === 'admin') {
        stats.unshift({
          username: 'Admin (All Enquiries)',
          totalEnquiry: enquiries.length,
          totalGenerated: enquiries.filter(e => e.enquiryStatus).length,
          testDriveAppt: enquiries.filter(e => e.testDriveAppt).length,
          homeVisitAppt: enquiries.filter(e => e.homeVisitAppt).length,
          evaluationAppt: enquiries.filter(e => e.evaluationDate).length,
          totalBooking: enquiries.filter(e => e.enquiryStatus === 'Order').length,
          totalInvoice: enquiries.filter(e => e.enquiryStatus === 'Invoiced').length,
        });
      }
      setUserStats(stats);
      setLoading(false);
    };
    fetchData();
  }, [currentUser]);

  const HEADERS = [
    'Username',
    'Total Enquiry',
    'Total Enquiry Generated',
    'Test-Drive Appt',
    'Home Visit Appt',
    'Evaluation Appt',
    'Total Booking Done',
    'Total Invoice Done',
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-6xl mx-auto mt-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">User Report Dashboard</h2>
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        <>
          <div className="w-full h-96 mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userStats.filter(u => u.username !== 'Admin (All Enquiries)')} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="username" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalEnquiry" fill="#2563eb" name="Total Enquiry" />
                <Bar dataKey="totalGenerated" fill="#10b981" name="Total Generated" />
                <Bar dataKey="testDriveAppt" fill="#f59e42" name="Test-Drive Appt" />
                <Bar dataKey="homeVisitAppt" fill="#fbbf24" name="Home Visit Appt" />
                <Bar dataKey="evaluationAppt" fill="#a78bfa" name="Evaluation Appt" />
                <Bar dataKey="totalBooking" fill="#f43f5e" name="Total Booking" />
                <Bar dataKey="totalInvoice" fill="#6366f1" name="Total Invoice" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  {HEADERS.map(header => (
                    <th key={header} className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userStats.map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 whitespace-nowrap">{row.username}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{row.totalEnquiry}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{row.totalGenerated}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{row.testDriveAppt}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{row.homeVisitAppt}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{row.evaluationAppt}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{row.totalBooking}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{row.totalInvoice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="bg-blue-50 rounded-lg p-4 flex flex-col items-center shadow-sm">
    <span className="text-lg font-semibold text-gray-700 mb-1">{label}</span>
    <span className="text-2xl font-bold text-blue-700">{value}</span>
  </div>
);

export default UserReportDashboard;
