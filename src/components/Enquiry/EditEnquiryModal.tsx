import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Enquiry } from '../../types'; // Assuming FeedbackEntry is not used in this file

interface EditEnquiryModalProps {
  enquiry: Enquiry;
  onClose: () => void;
  onUpdate: () => void;
}

const EditEnquiryModal: React.FC<EditEnquiryModalProps> = ({ enquiry, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(() => ({
    customerName: enquiry.customerName || '',
    enquiryNo: enquiry.enquiryNo || '',
    enquiryDate: enquiry.enquiryDate || '',
    mobileNumber: enquiry.mobileNumber || '',
    officePhone: enquiry.officePhone || '',
    address: enquiry.address || '',
    pinCode: enquiry.pinCode || '',
    emailId: enquiry.emailId || '',
    companyInstitution: enquiry.companyInstitution || '',
    teamLeadName: enquiry.teamLeadName || '',
    dseName: enquiry.dseName || '',
    enquiryStatus: enquiry.enquiryStatus || '',
    testDriveAppt: enquiry.testDriveAppt || false,
    testDriveDate: enquiry.testDriveDate || '',
    homeVisitAppt: enquiry.homeVisitAppt || false,
    evaluationDate: enquiry.evaluationDate || '',
    modelName: enquiry.modelName || '',
    variantName: enquiry.variantName || '',
    ColourName: enquiry.ColourName || '',
    source: enquiry.source || '',
    buyerType: enquiry.buyerType || '',
    lostOrDropReason: enquiry.lostOrDropReason || '',
    nextFollowUpDate: enquiry.nextFollowUpDate || ''
  }));

  // Update formData if enquiry changes (when switching between different enquiries)
  React.useEffect(() => {
    const formatDate = (dateString: string | undefined) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
      } catch (error) {
        return '';
      }
    };

    setFormData({
      customerName: enquiry.customerName || '',
      enquiryNo: enquiry.enquiryNo || '',
      enquiryDate: formatDate(enquiry.enquiryDate),
      mobileNumber: enquiry.mobileNumber || '',
      officePhone: enquiry.officePhone || '',
      address: enquiry.address || '',
      pinCode: enquiry.pinCode || '',
      emailId: enquiry.emailId || '',
      companyInstitution: enquiry.companyInstitution || '',
      teamLeadName: enquiry.teamLeadName || '',
      dseName: enquiry.dseName || '',
      enquiryStatus: enquiry.enquiryStatus || '',
      testDriveAppt: enquiry.testDriveAppt || false,
      testDriveDate: formatDate(enquiry.testDriveDate),
      homeVisitAppt: enquiry.homeVisitAppt || false,
      evaluationDate: formatDate(enquiry.evaluationDate),
      modelName: enquiry.modelName || '',
      variantName: enquiry.variantName || '',
      ColourName: enquiry.ColourName || '',
      source: enquiry.source || '',
      buyerType: enquiry.buyerType || '',
      lostOrDropReason: enquiry.lostOrDropReason || '',
      nextFollowUpDate: formatDate(enquiry.nextFollowUpDate)
    });
  }, [enquiry]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    // Handle checkbox change
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiry.id) {
        console.error("Enquiry ID is missing.");
        alert("Cannot update enquiry without an ID.");
        return;
    }

    try {
      setLoading(true);
      
      await updateDoc(doc(db, 'enquiries', enquiry.id), {
        ...formData,
        nextFollowUpDate: formData.nextFollowUpDate || '',
        updatedAt: serverTimestamp()
      });

      onUpdate(); // Refresh the list in the parent component
      onClose(); // Close the modal
    } catch (error) {
      console.error('Error updating enquiry:', error);
      alert('Failed to update enquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto border border-blue-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white rounded-t-2xl">
          <h2 className="text-2xl font-bold text-blue-900 tracking-tight">
            Edit Enquiry - {enquiry.customerName}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-100 rounded-full transition-colors border border-blue-200"
          >
            <X className="w-5 h-5 text-blue-700" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-8">
          {/* Customer Information */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Customer Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name *
                </label>
                <input
                  id="customerName"
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
                  Enquiry Date
                </label>
                <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-700">
                  {formData.enquiryDate}
                </div>
              </div>
          <div>
            <label htmlFor="nextFollowUpDate" className="block text-sm font-medium text-gray-700 mb-1">
              Next Follow-up Date
            </label>
            <input
              id="nextFollowUpDate"
              type="date"
              name="nextFollowUpDate"
              value={formData.nextFollowUpDate || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
              <div>
                <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number *
                </label>
                <input
                  id="mobileNumber"
                  type="tel"
                  name="mobileNumber"
                  required
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="emailId" className="block text-sm font-medium text-gray-700 mb-1">
                  Email ID
                </label>
                <input
                  id="emailId"
                  type="email"
                  name="emailId"
                  value={formData.emailId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="officePhone" className="block text-sm font-medium text-gray-700 mb-1">
                  Office Phone
                </label>
                <input
                  id="officePhone"
                  type="tel"
                  name="officePhone"
                  value={formData.officePhone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="companyInstitution" className="block text-sm font-medium text-gray-700 mb-1">
                  Company/Institution
                </label>
                <input
                  id="companyInstitution"
                  type="text"
                  name="companyInstitution"
                  value={formData.companyInstitution}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="pinCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Pin Code
                </label>
                <input
                  id="pinCode"
                  type="text"
                  name="pinCode"
                  value={formData.pinCode}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                id="address"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="enquiryStatus" className="block text-sm font-medium text-gray-700 mb-1">
                  Enquiry Status
                </label>
                <select
                  id="enquiryStatus"
                  name="enquiryStatus"
                  value={formData.enquiryStatus}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Enquiry Status</option>
                  <option value="New">New</option>
                  <option value="Active">Active</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Closed">Closed</option>
                  <option value="Converted">Converted</option>
                  <option value="Invoiced">Invoiced</option>
                  <option value="Cold">Cold</option>
                  <option value="Hot">Hot</option>
                  <option value="Warm">Warm</option>
                  <option value="Order">Order</option>
                  <option value="Lost">Lost</option>
                  <option value="Request to Lost">Request to Lost</option>
                  <option value="Postponed">Postponed</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="teamLeadName" className="block text-sm font-medium text-gray-700 mb-1">
                  Team Lead Name
                </label>
                <input
                  id="teamLeadName"
                  type="text"
                  name="teamLeadName"
                  value={formData.teamLeadName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="dseName" className="block text-sm font-medium text-gray-700 mb-1">
                  DSE Name
                </label>
                <input
                  id="dseName"
                  type="text"
                  name="dseName"
                  value={formData.dseName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-1">
                  Source
                </label>
                <select
                  id="source"
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Source</option>
                  <option value="Cold Visits">Cold Visits</option>
                  <option value="Web Enquiry">Web Enquiry</option>
                  <option value="TeleCalling">TeleCalling</option>
                  <option value="Showroom Walk-In">Showroom Walk-In</option>
                  <option value="References">References</option>
                  <option value="Business Associates">Business Associates</option>
                  <option value="Inbound Calls">Inbound Calls</option>
                  <option value="Workshop Enquiry">Workshop Enquiry</option>
                  <option value="Market Place">Market Place</option>
                  <option value="Campaign/Events">Campaign/Events</option>
                  <option value="Email">Email</option>
                  <option value="aCRM">aCRM</option>
                  <option value="Anytime Maruti">Anytime Maruti</option>
                  <option value="Advertisement">Advertisement</option>
                  <option value="Mobile Terminal">Mobile Terminal</option>
                  <option value="Maruti Driving School">Maruti Driving School</option>
                </select>
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Vehicle Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="modelName" className="block text-sm font-medium text-gray-700 mb-1">
                  Model Name
                </label>
                <select
                  id="modelName"
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
                <label htmlFor="variantName" className="block text-sm font-medium text-gray-700 mb-1">
                  Variant Name
                </label>
                <input
                  id="variantName"
                  type="text"
                  name="variantName"
                  value={formData.variantName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="ColourName" className="block text-sm font-medium text-gray-700 mb-1">
                  Colour Name
                </label>
                <input
                  id="ColourName"
                  type="text"
                  name="ColourName"
                  value={formData.ColourName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="buyerType" className="block text-sm font-medium text-gray-700 mb-1">
                  Buyer Type
                </label>
                <select
                  id="buyerType"
                  name="buyerType"
                  value={formData.buyerType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Type</option>
                  <option value="First Time">First Time Buyer</option>
                  <option value="Replacement">Replacement Buyer</option>
                  <option value="Additional">Additional Buyer</option>
                </select>
              </div>
              {/* Lead Status Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Status</label>
                <select
                  name="leadStatus"
                  value={formData.leadStatus || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Lead Status</option>
                  <option value="Call Connected">Call Connected</option>
                  <option value="Call Not Connected">Call Not Connected</option>
                </select>
              </div>
            </div>
          </div>

          {/* Appointments */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Appointments & Visits</h4>
            <div className="flex flex-wrap gap-6 items-center">
              {/* Test Drive Appointment */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="testDriveAppt"
                  name="testDriveAppt"
                  checked={formData.testDriveAppt}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="testDriveAppt" className="text-sm text-gray-700">
                  Test Drive Appointment
                </label>
                {formData.testDriveAppt && (
                  <input
                    type="date"
                    name="testDriveDate"
                    value={formData.testDriveDate}
                    onChange={handleChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 min-w-[160px]"
                  />
                )}
              </div>
              {/* Home Visit Appointment */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="homeVisitAppt"
                  name="homeVisitAppt"
                  checked={formData.homeVisitAppt}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="homeVisitAppt" className="text-sm text-gray-700">
                  Home Visit Appointment
                </label>
                {formData.homeVisitAppt && (
                  <input
                    type="date"
                    name="evaluationDate"
                    value={formData.evaluationDate}
                    onChange={handleChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 min-w-[160px]"
                  />
                )}
              </div>
              {/* Next Follow-up Date */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="nextFollowUpDateCheckbox"
                  name="nextFollowUpDateCheckbox"
                  checked={!!formData.nextFollowUpDate}
                  onChange={e => {
                    if (e.target.checked) {
                      setFormData(prev => ({ ...prev, nextFollowUpDate: prev.nextFollowUpDate || new Date().toISOString().split('T')[0] }));
                    } else {
                      setFormData(prev => ({ ...prev, nextFollowUpDate: '' }));
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="nextFollowUpDateCheckbox" className="text-sm text-gray-700">
                  Next Follow-up Date
                </label>
                {formData.nextFollowUpDate && (
                  <input
                    id="nextFollowUpDate"
                    type="date"
                    name="nextFollowUpDate"
                    value={formData.nextFollowUpDate}
                    onChange={handleChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 min-w-[160px]"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Lost/Drop Reason */}
          <div>
            <label htmlFor="lostOrDropReason" className="block text-sm font-medium text-gray-700 mb-1">
              Lost or Drop Reason
            </label>
            <textarea
              id="lostOrDropReason"
              name="lostOrDropReason"
              rows={3}
              value={formData.lostOrDropReason}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="If status is 'Lost' or 'Request to Lost', explain why..."
            />
          </div>

          {/* Footer with action buttons */}
          <div className="flex flex-col sm:flex-row justify-end pt-6 border-t border-gray-200 gap-3 sm:space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Updating...' : 'Update Enquiry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEnquiryModal;