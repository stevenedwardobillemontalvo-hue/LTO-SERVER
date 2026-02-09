import express from "express";
import authRoute from "./auth.route";
import appointmentRoute from "./appointment.route"

export const router = express.Router();

router.use("/auth", authRoute);
router.use("/appointment", appointmentRoute)
