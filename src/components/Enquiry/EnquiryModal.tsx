import React, { useState } from 'react';
import EditEnquiryModal from './EditEnquiryModal';
import { Phone, Mail, X, Calendar, MapPin, Building, User, Car, Clock, CheckCircle, Plus, Edit, MessageCircle } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Enquiry, FeedbackEntry } from '../../types';

interface EnquiryModalProps {
  enquiry: Enquiry;
  onClose: () => void;
  onUpdate: () => void;
}

const EnquiryModal: React.FC<EnquiryModalProps> = ({ enquiry, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newFeedback, setNewFeedback] = useState('');
  const [editedEnquiry, setEditedEnquiry] = useState<Enquiry>(enquiry);

  const handleAddFeedback = async () => {
    if (!newFeedback.trim()) return;

    try {
      setLoading(true);
      
      const newFeedbackEntry: FeedbackEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        feedback: newFeedback,
        createdAt: new Date()
      };

      const updatedFeedback = [...(enquiry.feedbackRemarks || []), newFeedbackEntry];

      await updateDoc(doc(db, 'enquiries', enquiry.id!), {
        feedbackRemarks: updatedFeedback,
        updatedAt: serverTimestamp()
      });

      setNewFeedback('');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error adding feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setLoading(true);
      
      await updateDoc(doc(db, 'enquiries', enquiry.id!), {
        enquiryStatus: newStatus,
        updatedAt: serverTimestamp()
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  if (isEditing) {
    return (
      <EditEnquiryModal
        enquiry={enquiry}
        onClose={() => setIsEditing(false)}
        onUpdate={() => {
          setIsEditing(false);
          onUpdate();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-blue-100">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-blue-900 tracking-tight">
              {enquiry.customerName}
            </h2>
            <p className="text-base text-blue-500 font-medium">
              Enquiry #{enquiry.enquiryNo || <span className='italic text-gray-400'>N/A</span>}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 hover:bg-blue-100 rounded-full transition-colors border border-blue-200"
              title="Edit Enquiry"
            >
              <Edit className="w-5 h-5 text-blue-700" />
            </button>
            {enquiry.mobileNumber && (
              <a
                href={`tel:${enquiry.mobileNumber}`}
                className="p-2 hover:bg-green-100 rounded-full transition-colors border border-green-200"
                title="Call Customer"
                target="_blank" rel="noopener noreferrer"
              >
                <Phone className="w-5 h-5 text-green-700" />
              </a>
            )}
            {enquiry.mobileNumber && (
              <a
                href={`https://wa.me/${enquiry.mobileNumber}`}
                className="p-2 hover:bg-green-100 rounded-full transition-colors border border-green-200"
                title="WhatsApp Customer"
                target="_blank" rel="noopener noreferrer"
              >
                <MessageCircle className="w-5 h-5 text-green-700" />
              </a>
            )}
            {enquiry.emailId && (
              <a
                href={`mailto:${enquiry.emailId}`}
                className="p-2 hover:bg-blue-100 rounded-full transition-colors border border-blue-200"
                title="Email Customer"
                target="_blank" rel="noopener noreferrer"
              >
                <Mail className="w-5 h-5 text-blue-700" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-blue-100 rounded-full transition-colors border border-blue-200"
              title="Close"
            >
              <X className="w-5 h-5 text-blue-700" />
            </button>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Customer Information */}
          <div>
            <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-blue-500" />
              Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Mobile</p>
                  <p className="font-semibold text-lg text-blue-900">{enquiry.mobileNumber || <span className='italic text-gray-400'>N/A</span>}</p>
                </div>
              </div>
              {enquiry.officePhone && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Office</p>
                    <p className="font-semibold text-lg text-blue-900">{enquiry.officePhone}</p>
                  </div>
                </div>
              )}
              {enquiry.emailId && (
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Email</p>
                    <p className="font-semibold text-lg text-blue-900">{enquiry.emailId}</p>
                  </div>
                </div>
              )}
              {enquiry.companyInstitution && (
                <div className="flex items-center space-x-3">
                  <Building className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Company</p>
                    <p className="font-semibold text-lg text-blue-900">{enquiry.companyInstitution}</p>
                  </div>
                </div>
              )}
            </div>
            {enquiry.address && (
              <div className="mt-4 flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-blue-400 mt-1" />
                <div>
                  <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Address</p>
                  <p className="font-semibold text-blue-900">{enquiry.address}</p>
                  {enquiry.pinCode && (
                    <p className="text-xs text-blue-700">PIN: <span className="font-semibold text-blue-900">{enquiry.pinCode}</span></p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Enquiry Details */}
          <div>
            <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-500" />
              Enquiry Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Enquiry Date</p>
                <p className="font-semibold text-blue-900">{new Date(enquiry.enquiryDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Team Lead</p>
                <p className="font-semibold text-blue-900">{enquiry.teamLeadName || <span className='italic text-gray-400'>N/A</span>}</p>
              </div>
              <div>
                <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">DSE Name</p>
                <p className="font-semibold text-blue-900">{enquiry.dseName || <span className='italic text-gray-400'>N/A</span>}</p>
              </div>
              <div>
                <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Source</p>
                <p className="font-semibold text-blue-900">{enquiry.source || <span className='italic text-gray-400'>N/A</span>}</p>
              </div>
              <div>
                <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Buyer Type</p>
                <p className="font-semibold text-blue-900">{enquiry.buyerType || <span className='italic text-gray-400'>N/A</span>}</p>
              </div>
              <div>
                <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Lead Status</p>
                <p className="font-semibold text-blue-900">{enquiry.leadStatus || <span className='italic text-gray-400'>N/A</span>}</p>
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          {(enquiry.modelName || enquiry.variantName) && (
            <div>
              <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center">
                <Car className="w-5 h-5 mr-2 text-blue-500" />
                Vehicle Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Model</p>
                  <p className="font-semibold text-blue-900">{enquiry.modelName || <span className='italic text-gray-400'>N/A</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Variant</p>
                  <p className="font-semibold text-blue-900">{enquiry.variantName || <span className='italic text-gray-400'>N/A</span>}</p>
                </div>
              </div>
            </div>
          )}

          {/* Appointments */}
          {(enquiry.testDriveAppt || enquiry.homeVisitAppt || enquiry.nextFollowUpDate) && (
            <div>
              <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-500" />
                Appointments
              </h3>
              <div className="space-y-2">
                {enquiry.testDriveAppt && (
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-semibold text-blue-900">Test Drive Appointment</span>
                    {enquiry.testDriveDate && (
                      <span className="text-sm text-blue-700">
                        - {new Date(enquiry.testDriveDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}
                {enquiry.homeVisitAppt && (
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-semibold text-blue-900">Home Visit Appointment</span>
                    {enquiry.evaluationDate && (
                      <span className="text-sm text-blue-700">
                        - {new Date(enquiry.evaluationDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}
                {enquiry.nextFollowUpDate && (
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-semibold text-blue-900">Next Follow-up Date</span>
                    <span className="text-sm text-blue-700">
                      - {new Date(enquiry.nextFollowUpDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lost/Drop Reason - Moved up */}
          {enquiry.lostOrDropReason && (
            <div>
              <h3 className="text-lg font-bold text-red-700 mb-2">Lost/Drop Reason</h3>
              <p className="text-red-800 bg-red-50 p-3 rounded-lg font-semibold">{enquiry.lostOrDropReason}</p>
            </div>
          )}

          {/* Feedback & Remarks - Moved down */}
          <div>
            <h3 className="text-lg font-bold text-blue-900 mb-4">Feedback & Remarks</h3>
            {enquiry.feedbackRemarks && enquiry.feedbackRemarks.length > 0 && (
              <div className="space-y-3 mb-4">
                {enquiry.feedbackRemarks.map((feedback) => (
                  <div key={feedback.id} className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-blue-900">
                        {formatDateTime(feedback.date)}
                      </span>
                    </div>
                    <p className="text-blue-900">{feedback.feedback}</p>
                  </div>
                ))}
              </div>
            )}
            {/* Add New Feedback */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Add New Feedback</h4>
              <textarea
                value={newFeedback}
                onChange={(e) => setNewFeedback(e.target.value)}
                placeholder="Enter feedback or remarks..."
                rows={3}
                className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleAddFeedback}
                  disabled={!newFeedback.trim() || loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>{loading ? 'Adding...' : 'Add Feedback'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnquiryModal;