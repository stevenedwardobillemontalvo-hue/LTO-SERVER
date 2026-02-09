import express from "express";
import { register, login, logout, verifyEmail } from "@controllers/auth.controller";
import { forgotPassword, resetPassword } from "@controllers/password.controller";
import { getAuthUrl, getTokens } from "../utils/googleCalendar";
import User from "@models/user";
import Transaction from "@models/transaction";
import { createCalendarEvent } from "@services/calendar"

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/verify-email", verifyEmail);
router.post("/logout", logout);

router.get("/google", (req, res) => {
  const url = getAuthUrl();
  res.redirect(url);
});

router.get("/google/callback", async (req, res) => {
  const code = req.query.code as string;
  if (!code) return res.status(400).send("No code provided");

  try {
    const tokens = await getTokens(code);

    const userId = req.session.userId;
    const appointmentId = req.session.pendingAppointmentId;

    if (!userId || !appointmentId) {
      return res.status(400).send("Missing session data");
    }

    if (tokens.refresh_token) {
      await User.update(
        { google_refresh_token: tokens.refresh_token },
        { where: { id: userId } }
      );
    }

    const appointment = await Transaction.findByPk(appointmentId);
    const user = await User.findByPk(userId);

    if (!appointment || !user) {
      return res.status(404).send("Appointment or user not found");
    }

    const appointmentDate =
      appointment.appointmentDate instanceof Date
        ? appointment.appointmentDate
        : new Date(appointment.appointmentDate);

    await createCalendarEvent({
      date: appointmentDate.toISOString().split("T")[0],
      time: appointment.appointmentTime,
      transactionType: appointment.typeOfTransaction,
      refreshToken: user.google_refresh_token!,
      clientInfo: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        contactNumber: user.contactNumber!,
      },
    });

    delete req.session.pendingAppointmentId;

    res.redirect(`https://lto-naic-appointment-system.vercel.app/appointments?google=success`);
  } catch (err) {
    console.error(err);
    console.log("SESSION:", req.session);
    res.status(500).send("Failed to complete Google authorization");
  }
});

router.get("/confirmation", async (req, res) => {
  try {
    let token: string | undefined;

    if (typeof req.query.token === "string") {
      token = req.query.token;
    } else if (Array.isArray(req.query.token) && typeof req.query.token[0] === "string") {
      token = req.query.token[0];
    }

    if (!token) return res.status(400).send("No token provided");

    const appointment = await Transaction.findByPk(token);
    if (!appointment) return res.status(404).send("Appointment not found");

    const user = await User.findByPk(appointment.clientId);
    if (!user) return res.status(404).send("User not found");

    (req.session as any).userId = user.id;
    (req.session as any).pendingAppointmentId = appointment.id;
    await (req.session as any).save();

    const googleAuthUrl = getAuthUrl();
    return res.redirect(googleAuthUrl);

  } catch (err) {
    console.error(err);
    return res.status(500).send("Something went wrong");
  }
});


export default router;
