import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Calendar, Download, FileText } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Enquiry } from '../../types';
import EnquiryModal from './EnquiryModal';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface EnquiryListProps {
  showAll?: boolean;
}

const EnquiryList: React.FC<EnquiryListProps> = ({ showAll = false }) => {
  const { currentUser } = useAuth();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [filteredEnquiries, setFilteredEnquiries] = useState<Enquiry[]>([]);
  const [userMap, setUserMap] = useState<{ [uid: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  // Pagination state
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchEnquiries();
  }, [currentUser, showAll]);

  useEffect(() => {
    // Fetch user display names for all unique createdBy UIDs in enquiries
    const fetchUserNames = async () => {
      const uids = Array.from(new Set(enquiries.map(e => e.createdBy)));
      const newUserMap: { [uid: string]: string } = {};
      for (const uid of uids) {
        if (!uid) continue;
        try {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            newUserMap[uid] = data.displayName || data.email || uid;
          } else {
            newUserMap[uid] = uid;
          }
        } catch {
          newUserMap[uid] = uid;
        }
      }
      setUserMap(newUserMap);
    };
    if (enquiries.length > 0) fetchUserNames();
  }, [enquiries]);

  useEffect(() => {
    filterEnquiries();
  }, [enquiries, searchTerm, statusFilter]);

  const fetchEnquiries = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const enquiriesRef = collection(db, 'enquiries');
      let enquiriesQuery;
      
      if (showAll && currentUser.role === 'admin') {
        // For admin viewing all enquiries, just order by createdAt
        enquiriesQuery = query(enquiriesRef, orderBy('createdAt', 'desc'));
      } else {
        // For user-specific enquiries, use where clause without orderBy to avoid index requirement
        // We'll sort the results in memory after fetching
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

      // Sort in memory if we didn't use orderBy in the query
      if (!showAll || currentUser.role !== 'admin') {
        fetchedEnquiries = fetchedEnquiries.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
      }

      setEnquiries(fetchedEnquiries);
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      
      // Show user-friendly error message
      if (error instanceof Error && error.message.includes('index')) {
        console.warn('Firestore composite index required. Please create the index in Firebase Console.');
        // You could show a toast notification here if you have a toast system
      }
      
      // Set empty array to prevent UI from breaking
      setEnquiries([]);
    } finally {
      setLoading(false);
    }
  };

  const filterEnquiries = () => {
    let filtered = enquiries;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(enquiry =>
        enquiry.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enquiry.enquiryNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enquiry.mobileNumber.includes(searchTerm) ||
        enquiry.emailId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(enquiry => enquiry.enquiryStatus === statusFilter);
    }

    setFilteredEnquiries(filtered);
  };

  const exportToCSV = () => {
    const csvData = filteredEnquiries.map(enquiry => ({
      'Customer Name': enquiry.customerName,
      'Enquiry No.': enquiry.enquiryNo,
      'Enquiry Date': new Date(enquiry.enquiryDate).toLocaleDateString(),
      'Mobile Number': enquiry.mobileNumber,
      'Office Phone': enquiry.officePhone || '',
      'Email ID': enquiry.emailId || '',
      'Address': enquiry.address || '',
      'Pin Code': enquiry.pinCode || '',
      'Company/Institution': enquiry.companyInstitution || '',
      'Team Lead Name': enquiry.teamLeadName || '',
      'DSE Name': enquiry.dseName || '',
      'Enquiry Status': enquiry.enquiryStatus,
      'Model Name': enquiry.modelName || '',
      'Variant Name': enquiry.variantName || '',
      'Source': enquiry.source || '',
      'Buyer Type': enquiry.buyerType || '',
      'Test Drive Appointment': enquiry.testDriveAppt ? 'Yes' : 'No',
      'Test Drive Date': enquiry.testDriveDate || '',
      'Home Visit Appointment': enquiry.homeVisitAppt ? 'Yes' : 'No',
      'Evaluation Date': enquiry.evaluationDate || '',
      'Lost or Drop Reason': enquiry.lostOrDropReason || '',
      'Feedback Remarks': enquiry.feedbackRemarks?.map(f => f.feedback).join('; ') || ''
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `my_enquiries_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // landscape orientation
    
    doc.setFontSize(16);
    doc.text('My Enquiries Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 25);
    doc.text(`Total Records: ${filteredEnquiries.length}`, 14, 30);

    const tableData = filteredEnquiries.map(enquiry => [
      enquiry.customerName,
      enquiry.enquiryNo,
      new Date(enquiry.enquiryDate).toLocaleDateString(),
      enquiry.mobileNumber,
      enquiry.emailId || '',
      enquiry.enquiryStatus,
      enquiry.modelName || '',
      enquiry.source || ''
    ]);

    doc.autoTable({
      head: [['Customer Name', 'Enquiry No.', 'Date', 'Mobile', 'Email', 'Status', 'Model', 'Source']],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    doc.save(`my_enquiries_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'New':
        return 'bg-blue-100 text-blue-800';
      case 'Follow-up':
        return 'bg-yellow-100 text-yellow-800';
      case 'In Progress':
        return 'bg-orange-100 text-orange-800';
      case 'Closed':
        return 'bg-gray-100 text-gray-800';
      case 'Converted':
        return 'bg-purple-100 text-purple-800';
      case 'Lost':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {showAll ? 'All Enquiries' : 'My Enquiries'}
        </h2>
        
        {/* Export Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>
        
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search enquiries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
          >
            <option value="all">All Status</option>
            <option value="New">New</option>
            <option value="Active">Active</option>
            <option value="Follow-up">Follow-up</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
            <option value="Converted">Converted</option>
            <option value="Lost">Lost</option>
          </select>
        </div>
      </div>

      {/* Enquiries Grid */}
      {filteredEnquiries.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500 text-lg">No enquiries found</p>
          <p className="text-gray-400 text-sm mt-1">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Create your first enquiry to get started'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredEnquiries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((enquiry) => (
              <div key={enquiry.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center mb-1">
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 rounded px-2 py-1 mr-2">
                          Username: {userMap[enquiry.createdBy] || enquiry.createdBy}
                        </span>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {enquiry.customerName}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600">
                        {enquiry.enquiryNo}
                      </p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(enquiry.enquiryStatus)}`}>
                      {enquiry.enquiryStatus}
                    </span>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {enquiry.mobileNumber}
                    </div>
                    {enquiry.emailId && (
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {enquiry.emailId}
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(enquiry.enquiryDate).toLocaleDateString()}
                    </div>
                    {enquiry.modelName && (
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {enquiry.modelName} {enquiry.variantName && `- ${enquiry.variantName}`}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      {enquiry.feedbackRemarks?.length || 0} feedback entries
                    </div>
                    <button
                      onClick={() => setSelectedEnquiry(enquiry)}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Details</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Pagination Bar */}
          <div className="bg-[#233886] text-white flex items-center justify-between px-6 py-3 rounded-b-lg mt-0">
            <div className="flex items-center gap-2">
              <span className="text-sm">Rows per page:</span>
              <select
                className="bg-[#233886] border-none text-white text-sm focus:outline-none"
                value={rowsPerPage}
                onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
              >
                {[5, 10, 20, 50].map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm">{filteredEnquiries.length === 0 ? 0 : (page * rowsPerPage + 1)}-{Math.min((page + 1) * rowsPerPage, filteredEnquiries.length)} of {filteredEnquiries.length}</span>
              <button
                className={`rounded-full p-1 bg-white/20 text-white ${page === 0 ? 'cursor-not-allowed opacity-50' : ''}`}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button
                className={`rounded-full p-1 bg-white/20 text-white ${(page + 1) * rowsPerPage >= filteredEnquiries.length ? 'cursor-not-allowed opacity-50' : ''}`}
                onClick={() => setPage(p => ((p + 1) * rowsPerPage < filteredEnquiries.length ? p + 1 : p))}
                disabled={(page + 1) * rowsPerPage >= filteredEnquiries.length}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Enquiry Modal */}
      {selectedEnquiry && (
        <EnquiryModal
          enquiry={selectedEnquiry}
          onClose={() => setSelectedEnquiry(null)}
          onUpdate={fetchEnquiries}
        />
      )}
    </div>
  );
};

export default EnquiryList;