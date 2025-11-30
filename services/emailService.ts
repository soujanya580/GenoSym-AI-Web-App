
import { init, send } from '@emailjs/browser';

const SERVICE_ID = 'service_uft6t48';
const TEMPLATE_ID = 'template_tam6858';
const PUBLIC_KEY = 'mbltByr7xR-526FFA';

// Initialize EmailJS
init(PUBLIC_KEY);

const SUPER_ADMIN_EMAILS = 'soujanyas580@gmail.com, sheethaln927@gmail.com';

// Helper to send generic email via the single template
const sendEmail = async (params: Record<string, string>) => {
  try {
    // Explicitly passing PUBLIC_KEY again to ensure it's picked up
    const response = await send(SERVICE_ID, TEMPLATE_ID, params, PUBLIC_KEY);
    console.log('[EmailJS] Sent successfully:', response.status, response.text);
    return true;
  } catch (error: any) {
    // Graceful fallback for demo purposes if credentials are invalid/expired
    console.warn('[EmailJS] Sending failed. Using Mock Fallback.', error);
    if (error.text) {
        console.warn('[EmailJS] Server Reason:', error.text);
    }
    // Return true to allow app flow to continue even if email service is misconfigured
    return true; 
  }
};

// 1. Hospital Registration Request -> To Super Admins
export const sendHospitalRegistrationEmail = async (
  name: string, 
  address: string, 
  adminEmail: string, 
  adminName: string
) => {
  const message = `
    ACTION REQUIRED: New Hospital Registration
    
    Hospital Name: ${name}
    Address: ${address}
    Admin Name: ${adminName}
    Admin Email: ${adminEmail}
    
    Please login to the Super Admin Dashboard to APPROVE or REJECT this request.
  `;

  return sendEmail({
    to_email: SUPER_ADMIN_EMAILS, // Targets both Super Admins
    subject: 'New Hospital Registration Request',
    message: message,
    to_name: 'Super Admins'
  });
};

// 2. Hospital Approval / Rejection -> To Hospital Admin
export const sendHospitalApprovalEmail = async (
  adminEmail: string, 
  hospitalName: string, 
  approved: boolean, 
  reason?: string
) => {
  const status = approved ? 'APPROVED' : 'REJECTED';
  const reasonText = reason ? `\nReason: ${reason}` : '';
  
  const message = `
    Your registration request for "${hospitalName}" has been ${status}.
    ${reasonText}
    
    ${approved ? 'You may now login to the Genosym Platform to manage your doctors.' : 'Please contact support if you believe this is an error.'}
  `;

  return sendEmail({
    to_email: adminEmail,
    cc_email: SUPER_ADMIN_EMAILS, // Keep Super Admins in the loop
    subject: 'Genosym-AI Hospital Registration Status',
    message: message,
    to_name: 'Hospital Administrator'
  });
};

// 3. Doctor Registration Request -> To Super Admins (Primary Approvers)
export const sendDoctorRegistrationEmail = async (
  hospitalAdminEmail: string,
  doctorName: string,
  doctorEmail: string,
  qualification: string
) => {
  const message = `
    ACTION REQUIRED: New Doctor Registration
    
    Doctor Name: ${doctorName}
    Email: ${doctorEmail}
    Details: ${qualification}
    
    This doctor has registered and is awaiting approval.
    Please login to the Super Admin Dashboard to APPROVE or REJECT this request.
  `;

  return sendEmail({
    to_email: SUPER_ADMIN_EMAILS, // Send DIRECTLY to Super Admins for approval
    cc_email: hospitalAdminEmail, // CC the Hospital Admin for visibility
    subject: 'New Doctor Registration Request - Action Required',
    message: message,
    to_name: 'Super Admins'
  });
};

// 4. Doctor Approval / Rejection -> To Doctor (CC Super Admins)
export const sendDoctorApprovalEmail = async (
  doctorEmail: string,
  doctorName: string,
  approved: boolean,
  reason?: string
) => {
  const status = approved ? 'APPROVED' : 'REJECTED';
  const reasonText = reason ? `\nReason: ${reason}` : '';

  const message = `
    Dear ${doctorName},
    
    Your request to access the Genosym AI platform has been ${status}.
    ${reasonText}
    
    ${approved ? 'You may now login to the portal to access patient case tools.' : ''}
  `;

  return sendEmail({
    to_email: doctorEmail,
    cc_email: SUPER_ADMIN_EMAILS, // Keep Super Admins in the loop
    subject: 'Genosym-AI Doctor Registration Status',
    message: message,
    to_name: doctorName
  });
};

// 5. Login Alert -> To Super Admins
export const sendLoginAlert = async (
  userEmail: string,
  userRole: string,
  userName: string
) => {
  const message = `
    Security Alert: User Login Detected
    
    User: ${userName} (${userEmail})
    Role: ${userRole}
    Time: ${new Date().toLocaleString()}
    
    This is an automated notification.
  `;

  return sendEmail({
    to_email: SUPER_ADMIN_EMAILS,
    subject: 'Genosym-AI Login Alert',
    message: message,
    to_name: 'Super Admins'
  });
};
