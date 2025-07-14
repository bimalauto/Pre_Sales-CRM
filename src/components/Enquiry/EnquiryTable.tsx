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
    // Ensure User Name is always the first column and present in all rows
    const csvData = filteredEnquiries.map(enquiry => {
      const row: any = {};
      row['User Name'] = enquiry.createdByName || '';
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

      const tableData = filteredEnquiries.map(enquiry => [
        enquiry.createdByName || '',
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
        head: [['User Name', 'Customer Name', 'Enquiry No.', 'Date', 'Mobile', 'Email', 'Status', 'Model', 'Source']],
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
    <div className="min-h-screen text-white">
      <div className="space-y-6 p-6 bg-blue-50">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-black">
              {showAll ? 'All Enquiries' : 'My Enquiries'}
            </h2>
            <p className="text-slate-400 mt-1">
              {showAll ? 'System-wide enquiry management' : 'Your personal enquiry dashboard'}
            </p>
          </div>
          
          {/* Export Buttons */}
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={exportToCSV}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all duration-200"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">CSV</span>
            </button>
            <button
              onClick={exportToPDF}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all duration-200"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Export PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 bg-blue-50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search enquiries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 w-full bg-white border border-blue-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-black placeholder-slate-400"
            />
          </div>
          
          <div className="relative sm:w-48">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-3 w-full bg-white border border-blue-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 appearance-none text-black"
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

        {/* Table */}
        {filteredEnquiries.length === 0 ? (
          <div className="text-center py-16 bg-blue-50 rounded-lg border border-blue-100">
            <div className="text-slate-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-slate-300 text-lg">No enquiries found</p>
            <p className="text-slate-400 text-sm mt-1">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Create your first enquiry to get started'}
            </p>
          </div>
        ) : (
          <div className="bg-blue-50 shadow-sm rounded-lg border border-blue-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-blue-200">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">
                      Customer Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">
                      Enquiry Info
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">
                      Vehicle
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-blue-100">
                  {filteredEnquiries.map((enquiry) => (
                    <tr key={enquiry.id} className="hover:bg-blue-100 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-700">
                          {/* Username: displayName only, always fetch for admin */}
                          {enquiry.createdByName === undefined
                            ? <span className="italic text-slate-400">Loading...</span>
                            : enquiry.createdByName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-black">
                            {enquiry.customerName}
                          </div>
                          <div className="text-sm text-blue-700">
                            {enquiry.mobileNumber}
                          </div>
                          {enquiry.emailId && (
                            <div className="text-sm text-blue-700">
                              {enquiry.emailId}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-black">
                            {enquiry.enquiryNo}
                          </div>
                          <div className="text-sm text-blue-700">
                            {new Date(enquiry.enquiryDate).toLocaleDateString()}
                          </div>
                          {enquiry.source && (
                            <div className="text-sm text-blue-700">
                              Source: {enquiry.source}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          {enquiry.modelName && (
                            <div className="text-sm font-medium text-black">
                              {enquiry.modelName}
                            </div>
                          )}
                          {enquiry.variantName && (
                            <div className="text-sm text-blue-700">
                              {enquiry.variantName}
                            </div>
                          )}
                          {enquiry.buyerType && (
                            <div className="text-sm text-blue-700">
                              {enquiry.buyerType}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(enquiry.enquiryStatus)}`}>
                          {enquiry.enquiryStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setSelectedEnquiry({ ...enquiry })}
                            className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-blue-100 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(currentUser?.role === 'admin' || !enquiry.createdBy || enquiry.createdBy === currentUser?.uid) && (
                            <button
                              type="button"
                              onClick={() => {
                                console.log('Editing enquiry:', enquiry);
                                setEditingEnquiry({ ...enquiry });
                              }}
                              className="text-green-400 hover:text-green-300 p-2 rounded-lg hover:bg-blue-100 transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {/* Only show delete button to admin users */}
                          {currentUser?.role === 'admin' && (
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  handleDelete(enquiry);
                                } catch (error) {
                                  console.error('Error deleting enquiry:', error);
                                  alert('Failed to delete enquiry.');
                                }
                              }}
                              className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-blue-100 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                handleCall(enquiry.mobileNumber);
                              } catch (error) {
                                console.error('Error calling:', error);
                                alert('Failed to initiate call.');
                              }
                            }}
                            className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-blue-100 transition-colors"
                            title="Call"
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                handleWhatsApp(enquiry.mobileNumber);
                              } catch (error) {
                                console.error('Error opening WhatsApp:', error);
                                alert('Failed to open WhatsApp.');
                              }
                            }}
                            className="text-green-400 hover:text-green-300 p-2 rounded-lg hover:bg-blue-100 transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          {enquiry.emailId && (
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  handleEmail(enquiry.emailId);
                                } catch (error) {
                                  console.error('Error opening email:', error);
                                  alert('Failed to open email client.');
                                }
                              }}
                              className="text-purple-400 hover:text-purple-300 p-2 rounded-lg hover:bg-blue-100 transition-colors"
                              title="Email"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
        // Removed outer close button for View Details modal to avoid duplicate close icons

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