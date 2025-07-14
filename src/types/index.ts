export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'user';
  createdAt: Date;
}

export interface Enquiry {
  id?: string;
  customerName: string;
  enquiryNo: string;
  enquiryDate: string;
  mobileNumber: string;
  officePhone: string;
  address: string;
  pinCode: string;
  emailId: string;
  companyInstitution: string;
  teamLeadName: string;
  dseName: string;
  enquiryStatus: string;
  testDriveAppt: boolean;
  testDriveDate: string;
  homeVisitAppt: boolean;
  evaluationDate: string;
  modelName: string;
  variantName: string;
  ColourName: string;
  source: string;
  buyerType: string;
  leadStatus?: string;
  lostOrDropReason: string;
  nextFollowUpDate: string;
  feedbackRemarks: FeedbackEntry[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedbackEntry {
  id: string;
  date: string;
  feedback: string;
  createdAt: Date;
}

export interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}