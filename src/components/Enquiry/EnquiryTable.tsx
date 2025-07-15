import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Edit, Trash2, Phone, MessageCircle, Mail, Download, FileText } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Enquiry } from '../../types';
import EnquiryModal from './EnquiryModal';
import EditEnquiryModal from './EditEnquiryModal';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface EnquiryTableProps {
  showAll?: boolean;
}

interface EnquiryWithUser extends Enquiry {
  createdByName?: string; // displayName
  createdByEmail?: string; // email
}

const EnquiryTable: React.FC<EnquiryTableProps> = ({ showAll = false }) => {
  const { currentUser } = useAuth();
  const [enquiries, setEnquiries] = useState<EnquiryWithUser[]>([]);
  const [filteredEnquiries, setFilteredEnquiries] = useState<EnquiryWithUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [editingEnquiry, setEditingEnquiry] = useState<Enquiry | null>(null);

  useEffect(() => {
    fetchEnquiries();
  }, [currentUser, showAll]);

  useEffect(() => {
    filterEnquiries();
  }, [enquiries, searchTerm, statusFilter]);

  // Fetch both displayName and email for username and created by columns
  const fetchUserInfo = async (uid: string): Promise<{ displayName: string; email: string }> => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        return {
          displayName: userData.displayName || '',
          email: userData.email || ''
        };
      } else {
        return { displayName: '', email: '' };
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
      return { displayName: '', email: '' };
    }
  };

  const fetchEnquiries = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const enquiriesRef = collection(db, 'enquiries');
      let enquiriesQuery;
      
      if (showAll && currentUser.role === 'admin') {
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
      })) as EnquiryWithUser[];

      if (!showAll || currentUser.role !== 'admin') {
        fetchedEnquiries = fetchedEnquiries.sort((a, b) => {
          const dateA = typeof a.createdAt === 'object' && 'seconds' in a.createdAt
            ? new Date((a.createdAt as any).seconds * 1000)
            : new Date(a.createdAt);
          const dateB = typeof b.createdAt === 'object' && 'seconds' in b.createdAt
            ? new Date((b.createdAt as any).seconds * 1000)
            : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
      }

      // Fetch user names for all enquiries with better error handling
      const enquiriesWithUserNames = await Promise.all(
        fetchedEnquiries.map(async (enquiry) => {
          try {
            const userInfo = await fetchUserInfo(enquiry.createdBy);
            return {
              ...enquiry,
              createdByName: userInfo.displayName,
              createdByEmail: userInfo.email
            };
          } catch (error) {
            console.error(`Failed to fetch user info for ${enquiry.createdBy}:`, error);
            return {
              ...enquiry,
              createdByName: '',
              createdByEmail: ''
            };
          }
        })
      );

      setEnquiries(enquiriesWithUserNames);
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      setEnquiries([]);
    } finally {
      setLoading(false);
    }
  };

  const filterEnquiries = () => {
    let filtered = enquiries;

    // Only filter by Enquiry No and Mobile Number
    if (searchTerm) {
      filtered = filtered.filter(enquiry =>
        enquiry.enquiryNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enquiry.mobileNumber.includes(searchTerm)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(enquiry => enquiry.enquiryStatus === statusFilter);
    }

    setFilteredEnquiries(filtered);
  };

  const handleDelete = async (enquiry: Enquiry) => {
    if (!enquiry.id) return;
    
    if (window.confirm(`Are you sure you want to delete enquiry for ${enquiry.customerName}?`)) {
      try {
        await deleteDoc(doc(db, 'enquiries', enquiry.id));
        fetchEnquiries();
      } catch (error) {
        console.error('Error deleting enquiry:', error);
        alert('Failed to delete enquiry');
      }
    }
  };

  const handleCall = (phoneNumber: string) => {
    window.open(`tel:${phoneNumber}`, '_self');
  };

  const handleWhatsApp = (phoneNumber: string) => {
    const cleanNumber = phoneNumber.replace(/[^\d]/g, '');
    window.open(`https://wa.me/${cleanNumber}`, '_blank');
  };

  const handleEmail = (email: string) => {
    window.open(`mailto:${email}`, '_self');
  };

  const exportToCSV = () => {
    // Ensure User Name is always the first column and present in all rows, fallback to email or N/A
    const csvData = filteredEnquiries.map(enquiry => {
      const row: any = {};
      row['User Name'] = enquiry.createdByName || enquiry.createdByEmail || 'N/A';
      row['Customer Name'] = enquiry.customerName;
      row['Enquiry No.'] = enquiry.enquiryNo;
      row['Enquiry Date'] = new Date(enquiry.enquiryDate).toLocaleDateString();
      row['Mobile Number'] = enquiry.mobileNumber;
      row['Office Phone'] = enquiry.officePhone || '';
      row['Email ID'] = enquiry.emailId || '';
      row['Address'] = enquiry.address || '';
      row['Pin Code'] = enquiry.pinCode || '';
      row['Company/Institution'] = enquiry.companyInstitution || '';
      row['Team Lead Name'] = enquiry.teamLeadName || '';
      row['DSE Name'] = enquiry.dseName || '';
      row['Enquiry Status'] = enquiry.enquiryStatus;
      row['Model Name'] = enquiry.modelName || '';
      row['Variant Name'] = enquiry.variantName || '';
      row['Colour Name'] = enquiry.ColourName || '';
      row['Source'] = enquiry.source || '';
      row['Buyer Type'] = enquiry.buyerType || '';
      row['Test Drive Appointment'] = enquiry.testDriveAppt ? 'Yes' : 'No';
      row['Test Drive Date'] = enquiry.testDriveDate || '';
      row['Home Visit Appointment'] = enquiry.homeVisitAppt ? 'Yes' : 'No';
      row['Evaluation Date'] = enquiry.evaluationDate || '';
      row['Lost or Drop Reason'] = enquiry.lostOrDropReason || '';
      row['Feedback Remarks'] = enquiry.feedbackRemarks?.map(f => f.feedback).join('; ') || '';
      return row;
    });

    // Force header order for CSV
    const csv = Papa.unparse({
      fields: [
        'User Name',
        'Customer Name',
        'Enquiry No.',
        'Enquiry Date',
        'Mobile Number',
        'Office Phone',
        'Email ID',
        'Address',
        'Pin Code',
        'Company/Institution',
        'Team Lead Name',
        'DSE Name',
        'Enquiry Status',
        'Model Name',
        'Variant Name',
        'Colour Name',
        'Source',
        'Buyer Type',
        'Test Drive Appointment',
        'Test Drive Date',
        'Home Visit Appointment',
        'Evaluation Date',
        'Lost or Drop Reason',
        'Feedback Remarks'
      ],
      data: csvData
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `enquiries_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      doc.setFontSize(16);
      doc.text('Enquiries Report', 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 25);
      doc.text(`Total Records: ${filteredEnquiries.length}`, 14, 30);

      // Match columns to CSV export, always include Username as first column
      const tableHead = [
        'User Name',
        'Customer Name',
        'Enquiry No.',
        'Enquiry Date',
        'Mobile Number',
        'Office Phone',
        'Email ID',
        'Address',
        'Pin Code',
        'Company/Institution',
        'Team Lead Name',
        'DSE Name',
        'Enquiry Status',
        'Model Name',
        'Variant Name',
        'Colour Name',
        'Source',
        'Buyer Type',
        'Test Drive Appointment',
        'Test Drive Date',
        'Home Visit Appointment',
        'Evaluation Date',
        'Lost or Drop Reason',
        'Feedback Remarks'
      ];
      const tableData = filteredEnquiries.map(enquiry => [
        enquiry.createdByName || enquiry.createdByEmail || 'N/A',
        enquiry.customerName,
        enquiry.enquiryNo,
        new Date(enquiry.enquiryDate).toLocaleDateString(),
        enquiry.mobileNumber,
        enquiry.officePhone || '',
        enquiry.emailId || '',
        enquiry.address || '',
        enquiry.pinCode || '',
        enquiry.companyInstitution || '',
        enquiry.teamLeadName || '',
        enquiry.dseName || '',
        enquiry.enquiryStatus,
        enquiry.modelName || '',
        enquiry.variantName || '',
        enquiry.ColourName || '',
        enquiry.source || '',
        enquiry.buyerType || '',
        enquiry.testDriveAppt ? 'Yes' : 'No',
        enquiry.testDriveDate || '',
        enquiry.homeVisitAppt ? 'Yes' : 'No',
        enquiry.evaluationDate || '',
        enquiry.lostOrDropReason || '',
        enquiry.feedbackRemarks?.map(f => f.feedback).join('; ') || ''
      ]);

      doc.autoTable({
        head: [tableHead],
        body: tableData,
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      doc.save(`enquiries_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      alert('Failed to generate PDF. Please ensure jsPDF and jspdf-autotable are installed and try again.');
      console.error('PDF export error:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'New':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Follow-up':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'In Progress':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Closed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Converted':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Lost':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-black">
      <div className="space-y-6 p-6 bg-blue-50">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-2xl font-bold text-black">
            {showAll ? 'All Enquiries' : 'My Enquiries'}
          </h2>
          {/* Export Buttons */}
          {/* Place export buttons here if needed */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEnquiries.map((enquiry) => (
              <div key={enquiry.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center mb-1">
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 rounded px-2 py-1 mr-2">
                          Username: {enquiry.createdByName ? enquiry.createdByName : (enquiry.createdByEmail ? enquiry.createdByEmail : 'N/A')}
                        </span>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {enquiry.customerName}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600">
                        {enquiry.enquiryNo}
                      </p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(enquiry.enquiryStatus)}`}> 
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
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10m-12 8a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2H7a2 2 0 00-2 2v10z" />
                      </svg>
                      {new Date(enquiry.enquiryDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 11h18M3 15h18" />
                      </svg>
                      {enquiry.modelName} {enquiry.variantName ? `- ${enquiry.variantName}` : ''}
                    </div>
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
        )}

        {/* View Modal */}
        {selectedEnquiry && (
          <EnquiryModal
            enquiry={selectedEnquiry}
            onClose={() => setSelectedEnquiry(null)}
            onUpdate={fetchEnquiries}
          />
        )}
        {/* Edit Modal */}
        {editingEnquiry && (
          <EditEnquiryModal
            key={editingEnquiry.id}
            enquiry={JSON.parse(JSON.stringify(editingEnquiry))}
            onClose={() => setEditingEnquiry(null)}
            onUpdate={fetchEnquiries}
          />
        )}
      </div>
    </div>
  );
};

export default EnquiryTable;