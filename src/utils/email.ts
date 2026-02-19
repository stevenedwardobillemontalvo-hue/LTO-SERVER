import { google } from "googleapis";
import axios from "axios";
// import twilio from "twilio";

// const transporter = nodemailer.createTransport({
//   host: process.env.EMAIL_HOST,
//   port: Number(process.env.EMAIL_PORT),
//   secure: false,
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

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

const { OAuth2 } = google.auth;

const oAuth2Client = new OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });


const formatRefId = (id: string) => id.slice(0, 8).toUpperCase();


const sendGmail = async (to: string, subject: string, html: string) => {
  try {
  const res = await oAuth2Client.getAccessToken();
  console.log("Access token object:", res);
} catch (err: any) {
  console.error("Failed to get access token:", err.response?.data || err.message);
}
  try {
    console.log("📌 Starting to send email to:", to)

    const accessTokenResponse = await oAuth2Client.getAccessToken();
    const accessToken = typeof accessTokenResponse === "string"
      ? accessTokenResponse
      : accessTokenResponse?.token;

      console.log("🔑 Access token obtained:", accessToken ? "✅ Success" : "❌ Failed");

    if (!accessToken) throw new Error("Failed to get access token");

    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

    const messageParts = [
      `From: "LTO NAIC" <${process.env.EMAIL_USER}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/html; charset=UTF-8",
      "",
      html,
    ];
    const message = messageParts.join("\n");

    console.log("✉️ Message prepared:\n", message);
    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log(`Email sent to ${to}`);
  } catch (error: any) {
    console.error("Error sending email:", error.message);
  }
};

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

    const html = `<p>Hello ${name},</p>
           <p>Plaease verify your email address by clicking the link below. </p>
           ${verificationUrl}
           
            <br>
            <p>Regards</p>
            <p>LTO Naic Appointment System</p>
            <p>Land Transportation Office – Naic </p>
    `;
    await sendGmail(to, "Verify Your Email", html);
     
};

export const sendPasswordResetEmail = async (to: string, name: string, token: string) => {

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const html = `
      <p>Hi ${name},</p>
      <p>You requested a password reset. Click below to set a new password:</p>
      <a href="${resetUrl}" target="_blank">${resetUrl}</a>
      <p>This link will expire in 30 minutes.</p>
      <p>If you didn’t request this, you can ignore this email.</p>

      
      <br>
      <p>LTO Naic Appointment System</p>
      <p>Land Transportation Office – Naic</p>
    `;
    await sendGmail(to, "Reset your password", html);
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
  const displayNote = note && note.trim() !== "" ? note : "None";
  const refId = formatRefId(appointmentId);

    const html = `
      <p>Hello ${name},</p>
      <p>We are pleased to inform you that your appointment request for the LTO Naic Appointment System has been <strong>APPROVED</strong>.</p><br>
      <p>Appointment Details: </p>
      <p>REF. ID: ${refId}</p>
      <p>Transaction Type: ${transactionType}</p>
      <p>Date of Appointment: ${appointmentDate} </p>
      <p>Time: ${appointmentTime}</p>
      <p>Note: ${displayNote}</p><br>
      <p>Please confirm your appointment by clicking the link below: <br>${confirmLink}</p> <br>
      <p>Please arrive at least 15–30 minutes early and bring all hard copy of required documents for your transaction.</p>
      <br><p>Thank you, and we look forward to assisting you. </p>
      <br><p>LTO Naic Appointment System</p>
      <p>Land Transportation Office – Naic</p>
    `;
    await sendGmail(email, "LTO Naic Appointment Approved", html);

  await sendSMS(
    formatPhone(phone),
    `Hello ${name}, your appointment (REF. ID: ${refId}) for ${transactionType} on ${appointmentDate} at ${appointmentTime} has been APPROVED. Note: ${displayNote}}`
  );
};

export const sendAdminApprovedEmail = async (
  email: string,
  name: string
) => {

    const html = `
      <p>Hello ${name},</p><br>
      <p>Welcome to LTO Naic Appointment System! </p> <br>
      <p>Your account has been created, and we're ready for you to dive in. Click the button below to log in to your portal and start exploring.</p><br>
      <p>Login in to Your Portal</p><br>
      <p>Your login details are: </p>
      <p>Email: <br>${email}</p> <br>
      <p>Important: For your security, we highly recommend changing your password immediately by clicking the forgot password.</p>
      
      <p>Login your account here:</p>
      <p><a href="https://lto-naic-appointment-system.vercel.app" target="_blank">https://lto-naic-appointment-system.vercel.app</a></p>
      <br><p>Best regards,</p>
      <p>LTO Naic Appointment System</p>
      <p>Land Transportation Office – Naic</p>
    `;
    await sendGmail(email, "LTO Naic Appointment Account", html);
};

export const sendAppointmentRejectedEmail = async (
  email: string,
  phone: string,
  name: string,
  transactionType: string,
  appointmentDate: string,
  appointmentTime: string,
  note: string,
  appointmentId: string
) => {

    const displayNote = note && note.trim() !== "" ? note : "None";
    const refId = formatRefId(appointmentId);
    
    const html = `
      <p>Hello ${name},</p>
      <p>We regret to inform you that your appointment request for the LTO Naic Appointment System has been <strong>DISAPPROVED</strong>.</p><br>
      <p>Appointment Details: </p>
      <p>REF. ID: ${refId}</p>
      <p>Transaction Type: ${transactionType}</p>
      <p>Date of Appointment: ${appointmentDate} </p>
      <p>Time: ${appointmentTime}</p>
      <p>Note: ${displayNote}</p> <br>
      <p>You may submit a new appointment request by choosing another available schedule. </p><br>
      <p>Thank you for your understanding. </p><br>
      <br><p>LTO Naic Appointment System</p>
      <p>Land Transportation Office – Naic</p>
    `;
    await sendGmail(email, "LTO Naic Appointment Disapproved", html);

  await sendSMS(
    formatPhone(phone),
    `Hello ${name}, your appointment (REF. ID: ${refId}) for ${transactionType} has been REJECTED. Note: ${displayNote}`
  );
};
