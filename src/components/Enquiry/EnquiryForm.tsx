import React, { useState } from 'react';
import { Plus, Calendar, Save } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Enquiry, FeedbackEntry } from '../../types';

const EnquiryForm: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>([
    { id: '1', date: new Date().toISOString(), feedback: '', createdAt: new Date() }
  ]);

  const [formData, setFormData] = useState({
    customerName: '',
    enquiryNo: '', // Now empty by default
    enquiryDate: new Date().toISOString().split('T')[0],
    mobileNumber: '',
    officePhone: '',
    address: '',
    pinCode: '',
    emailId: '',
    companyInstitution: '',
    teamLeadName: '',
    dseName: '',
    enquiryStatus: 'New',
    testDriveAppt: false,
    testDriveDate: '',
    homeVisitAppt: false,
    evaluationDate: '',
    modelName: '',
    variantName: '',
    ColourName: '',
    source: '',
    buyerType: '',
    lostOrDropReason: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleFeedbackChange = (id: string, field: keyof FeedbackEntry, value: string) => {
    setFeedbackEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const addFeedbackEntry = () => {
    const newEntry: FeedbackEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      feedback: '',
      createdAt: new Date()
    };
    setFeedbackEntries(prev => [...prev, newEntry]);
  };

  const removeFeedbackEntry = (id: string) => {
    if (feedbackEntries.length > 1) {
      setFeedbackEntries(prev => prev.filter(entry => entry.id !== id));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    // Validate required fields
    // (Enquiry No. is now optional, so no validation here)

    try {
      setLoading(true);
      
      const enquiryData: Omit<Enquiry, 'id'> = {
        ...formData,
        feedbackRemarks: feedbackEntries.filter(entry => entry.feedback.trim() !== ''),
        createdBy: currentUser.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'enquiries'), {
        ...enquiryData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setSuccess(true);
      // Reset form
      setFormData({
        customerName: '',
        enquiryNo: '',
        enquiryDate: new Date().toISOString().split('T')[0],
        mobileNumber: '',
        officePhone: '',
        address: '',
        pinCode: '',
        emailId: '',
        companyInstitution: '',
        teamLeadName: '',
        dseName: '',
        enquiryStatus: 'New',
        testDriveAppt: false,
        testDriveDate: '',
        homeVisitAppt: false,
        evaluationDate: '',
        modelName: '',
        variantName: '',
        source: '',
        buyerType: '',
        lostOrDropReason: ''
      });
      setFeedbackEntries([
        { id: '1', date: new Date().toISOString(), feedback: '', createdAt: new Date() }
      ]);

      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error creating enquiry:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="text-green-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">
                Enquiry created successfully!
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Create New Enquiry</h3>
          <p className="text-sm text-gray-600 mt-1">Fill in the customer details and enquiry information</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Information */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Customer Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  name="customerName"
                  required
                  value={formData.customerName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  name="mobileNumber"
                  required
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email ID
                </label>
                <input
                  type="email"
                  name="emailId"
                  value={formData.emailId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Office Phone
                </label>
                <input
                  type="tel"
                  name="officePhone"
                  value={formData.officePhone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company/Institution
                </label>
                <input
                  type="text"
                  name="companyInstitution"
                  value={formData.companyInstitution}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pin Code
                </label>
                <input
                  type="text"
                  name="pinCode"
                  value={formData.pinCode}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                name="address"
                rows={3}
                value={formData.address}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Enquiry Details */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Enquiry Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enquiry No.
                </label>
                <input
                  type="text"
                  name="enquiryNo"
                  value={formData.enquiryNo}
                  onChange={handleChange}
                  placeholder="Enter enquiry number (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enquiry Date
                </label>
                <input
                  type="date"
                  name="enquiryDate"
                  value={formData.enquiryDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enquiry Status
                </label>
                <select
                  name="enquiryStatus"
                  value={formData.enquiryStatus}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Source</option>
                  <option value="Hot">Hot</option>
                  <option value="Warm">Warm</option>
                  <option value="Cold">Cold</option>
                  <option value="Order">Order</option>
                  <option value="Invoiced">Invoiced</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team Lead Name
                </label>
                <input
                  type="text"
                  name="teamLeadName"
                  value={formData.teamLeadName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  DSE Name
                </label>
                <input
                  type="text"
                  name="dseName"
                  value={formData.dseName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source
                </label>
                <select
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Source</option>
                  <option value="Cardekho">Cardekho</option>
                  <option value="Carwale">Carwale</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Whatsup">Whatsup</option>
                  <option value="Data maning">Data maning</option>
                  <option value="My New car">My New car</option>
                  <option value="Justdial">Justdial</option>
                  <option value="a-CRM">a-CRM</option>
                  <option value="Web Leads">Web Leads</option>
                  <option value="Hyperlocal">Hyperlocal</option>
                  <option value="Inbound Source">Inbound Source</option>
                  <option value="Others">Others</option>
                </select>
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Vehicle Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model Name
                </label>
                <select
                  name="modelName"
                  value={formData.modelName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Model</option>
                  <option value="NEW ALTO K10">NEW ALTO K10</option>
                  <option value="EECO">EECO</option>
                  <option value="NEW CELERIO">NEW CELERIO</option>
                  <option value="Epic New Swift">Epic New Swift</option>
                  <option value="DZIRE Tour">DZIRE Tour</option>
                  <option value="Dazzling New Dzire">Dazzling New Dzire</option>
                  <option value="S-PRESSO">S-PRESSO</option>
                  <option value="NEW ERTIGA">NEW ERTIGA</option>
                  <option value="NEW BREZZA">NEW BREZZA</option>
                  <option value="WagonR">WagonR</option>
                  <option value="SUPER CARRY">SUPER CARRY</option>
                  <option value="NEW BALENO">NEW BALENO</option>
                  <option value="Ignis">Ignis</option>
                  <option value="CIAZ">CIAZ</option>
                  <option value="FRONX">FRONX</option>
                  <option value="GRAND VITARA">GRAND VITARA</option>
                  <option value="INVICTO">INVICTO</option>
                  <option value="JIMNY">JIMNY</option>
                  <option value="XL6">XL6</option>
                  <option value="e VITARA">e VITARA</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variant Name
                </label>
                <input
                  type="text"
                  name="variantName"
                  value={formData.variantName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Colour Name
                </label>
                <input
                  type="text"
                  name="ColourName"
                  value={formData.ColourName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buyer Type
                </label>
                <select
                  name="buyerType"
                  value={formData.buyerType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Type</option>
                  <option value="First Time">First Time</option>
                  <option value="Replacement">Replacement</option>
                  <option value="Additional">Additional</option>
                </select>
              </div>
            </div>
          </div>

          {/* Appointments */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Appointments</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="testDriveAppt"
                    checked={formData.testDriveAppt}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Test Drive Appointment</span>
                </label>
                {formData.testDriveAppt && (
                  <input
                    type="date"
                    name="testDriveDate"
                    value={formData.testDriveDate}
                    onChange={handleChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="homeVisitAppt"
                    checked={formData.homeVisitAppt}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Home Visit Appointment</span>
                </label>
                {formData.homeVisitAppt && (
                  <input
                    type="date"
                    name="homeVisitDate"
                    value={formData.homeVisitDate || ''}
                    onChange={handleChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="evaluationAppt"
                    checked={formData.evaluationAppt || false}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Evaluation Appointment</span>
                </label>
                {formData.evaluationAppt && (
                  <input
                    type="date"
                    name="evaluationDate"
                    value={formData.evaluationDate}
                    onChange={handleChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Lost/Drop Reason - only enabled if status is Lost */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lost or Drop Reason
            </label>
            <textarea
              name="lostOrDropReason"
              rows={3}
              value={formData.lostOrDropReason}
              onChange={handleChange}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 ${formData.enquiryStatus !== 'Lost' ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
              placeholder="If applicable, mention the reason for losing the enquiry..."
              disabled={formData.enquiryStatus !== 'Lost'}
            />
          </div>

          {/* Feedback & Remarks */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900">Feedback & Remarks</h4>
              <button
                type="button"
                onClick={addFeedbackEntry}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Add Entry</span>
              </button>
            </div>
            
            <div className="space-y-4">
              {feedbackEntries.map((entry, index) => (
                <div key={entry.id} className="flex space-x-4 items-start">
                  <div className="flex-shrink-0">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {formatDateTime(entry.date)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={entry.feedback}
                      onChange={(e) => handleFeedbackChange(entry.id, 'feedback', e.target.value)}
                      placeholder="Enter feedback or remarks..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {feedbackEntries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFeedbackEntry(entry.id)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Creating...' : 'Create Enquiry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnquiryForm;