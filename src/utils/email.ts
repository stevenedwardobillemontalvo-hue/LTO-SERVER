import nodemailer from "nodemailer";
import axios from "axios";
// import twilio from "twilio";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// const twilioClient = twilio(
//   process.env.TWILIO_ACCOUNT_SID!,
//   process.env.TWILIO_AUTH_TOKEN!
// );

// const sendSMS = async (to: string, message: string) => {
//   const formattedNumber = formatPhone(to);

//   try {
//     const result = await twilioClient.messages.create({
//       body: message,
//       messagingServiceSid: process.env.TWILIO_SID,
//       to: formattedNumber,
//     });

//     console.log("SMS sent to", formattedNumber, "SID:", result.sid);
//   } catch (error: any) {
//     console.error("Error sending SMS:", error.message);
//   }
// };

const sendSMS = async (to: string, message: string) => {
  const formattedNumber = formatPhone(to);

  try {
    const response = await axios.post(
      process.env.IPROG_SMS_URL!,
      {
        api_token: process.env.IPROG_API_TOKEN,
        phone_number: formattedNumber,
        message,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("SMS sent:", response.data);
  } catch (error: any) {
    console.error(
      "Error sending SMS:",
      error.response?.data || error.message
    );
  }
};

const formatPhone = (number: string) => {
  number = number.replace(/\D/g, ""); 
  if (number.startsWith("0")) number = "+63" + number.slice(1);
  else if (!number.startsWith("+")) number = "+" + number;
  return number;
};


export const sendVerificationEmail = async (to: string, name: string, token: string) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  console.log("Verification URL:", verificationUrl);

  await transporter.sendMail({
    from: `"LTO NAIC" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Verify Your Email",
    html: `<p>Hello ${name},</p>
           <p>Click <a href="${verificationUrl}">here</a> to verify your email.</p>
           
            <br>
            <p>LTO NAIC</p>`,
           
  });
};

export const sendPasswordResetEmail = async (to: string, name: string, token: string) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: `"LTO NAIC" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Reset your password",
    html: `
      <p>Hi ${name},</p>
      <p>You requested a password reset. Click below to set a new password:</p>
      <a href="${resetUrl}" target="_blank">${resetUrl}</a>
      <p>This link will expire in 30 minutes.</p>
      <p>If you didn’t request this, you can ignore this email.</p>

      
      <br>
      <p>LTO NAIC</p>
    `,
  });
};

export const sendAppointmentApprovedEmail = async (
  email: string,
  phone: string,
  name: string,
  transactionType: string,
  appointmentDate: string,
  appointmentTime: string,
  note: string,
  appointmentId: string
) => {
  
  const confirmLink = `${process.env.FRONTEND_URL}/confirmation?token=${appointmentId}`;

  await transporter.sendMail({
    from: `"LTO NAIC APPOINTMENT SYSTEM" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: " LTO Naic Appointment Approved!",
    html: `
      <p>Hello ${name},</p>
      <p>We are pleased to inform you that your appointment request for the LTO Naic Appointment System has been <strong>APPROVED</strong>.</p><br>
      <p>Appointment request details: </p> 
      <p>Transaction Type: ${transactionType}</p>
      <p>Date of Appointment: ${appointmentDate} </p>
      <p>Time: ${appointmentTime}<p>
      ${note ? `<p>Note: ${note}</p>` : ""}<br>
      <p>Please confirm your appointment by clicking the link below: <br>${confirmLink}<p> <br>
      <p>Please arrive at least 15–30 minutes early and bring all hard copy of required documents for your transaction.</p>
      <br><p>Thank you, and we look forward to assisting you. </p>
      <br><p>LTO Naic Appointment System Land Transportation Office – Naic</p>
    `,
  });

  await sendSMS(
    formatPhone(phone),
    `Hello ${name}, your appointment for ${transactionType} on ${appointmentDate} at ${appointmentTime} has been APPROVED. ${note ? `Note: ${note}` : ""}`
  );
};

export const sendAdminApprovedEmail = async (
  email: string,
  name: string
) => {

  await transporter.sendMail({
    from: `"LTO NAIC APPOINTMENT SYSTEM" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "LTO Naic Appointment Account",
    html: `
      <p>Hello ${name},</p><br>
      <p>Welcome to LTO Naic Appointment System! </p> <br>
      <p>Your account has been created, and we're ready for you to dive in. Click the button below to log in to your portal and start exploring.</p><br>
      <p>Login in to Your Portal</p><br>
      <p>Your login details are: <p>
      <p>Username: <br>${email}<p> <br>
      <p>Important: For your security, we highly recommend changing your password immediately by clicking the forgot password.</p>
      <br><p>Best regards,</p>
      <p>LTO Naic Appointment System Land Transportation Office – Naic</p>
    `,
  });
};

export const sendAppointmentRejectedEmail = async (
  email: string,
  phone: string,
  name: string,
  transactionType: string,
  appointmentDate: string,
  appointmentTime: string,
  note: string
) => {
  
  await transporter.sendMail({
    from: `"LTO NAIC APPOINTMENT SYSTEM" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "LTO Naic Appointment Disapproved",
    html: `
      <p>Hello ${name},</p>
      <p>We regret to inform you that your appointment request for the LTO Naic Appointment System has been <strong>DISAPPROVED</strong>.</p><br>
      <p>Appointment request details: </p> 
      <p>Transaction Type: ${transactionType}</p>
      <p>Date of Appointment: ${appointmentDate} </p>
      <p>Time: ${appointmentTime}<p>
      ${note ? `<p>Note: ${note}</p>` : ""}<br>
      <p>You may submit a new appointment request by choosing another available schedule. </p><br>
      <p>Thank you for your understanding. </p><br>
      <br><p>LTO Naic Appointment System Land Transportation Office – Naic</p>
    `,
  });

  await sendSMS(
    formatPhone(phone),
    `Hello ${name}, your appointment for ${transactionType} has been REJECTED. ${note ? `Note: ${note}` : ""}`
  );
};
