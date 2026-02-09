import express from "express";
import {
  createAppointment,
  getClientAppointments,
  reviewAppointment,
  cancelAppointment,
  rescheduleAppointment,
  getClientInfo,
  getClientTodaysAppointments,
  getClientAppointmentCounts
} from "@controllers/appointment.controller";

import {
  updateAppointmentStatus,
  getAppointmentDetails,
  blockDates,
  getblockDates,
  getAllClients,
  getAllAppointments,
  editClientInfo,
  getAppointmentCounts,
  getTodaysAppointments,
  getAllAdmins,
  addAppointmentNote,
  getAppointmentCharts
} from "@controllers/admin.controller";
import { upload } from "@middlewares/upload";



import { createTransactionValidator } from "@validations/appointment.validation";
import { authenticateUser, authorizeRole } from "@middlewares/auth.middleware";

const router = express.Router();

router.get("/client/info", authenticateUser, authorizeRole("Client"), getClientInfo);
router.post("/client", authenticateUser, authorizeRole("Client"), upload.any(), createTransactionValidator, createAppointment); 
router.get("/client", authenticateUser, authorizeRole("Client"), getClientAppointments);
router.get("/client/counts", authenticateUser, authorizeRole("Client"), getClientAppointmentCounts);
router.get("/client/today", authenticateUser, authorizeRole("Client"), getClientTodaysAppointments);
router.get("/client/review/:id", authenticateUser, authorizeRole("Client"), reviewAppointment);
router.put("/client/cancel/:id", authenticateUser, authorizeRole("Client"), cancelAppointment);
router.put("/client/reschedule/:id", authenticateUser, authorizeRole("Client"), rescheduleAppointment); 

router.get("/block-dates", authenticateUser, authorizeRole("Admin", "Client", "SuperAdmin"), getblockDates); 

router.get("/admin/users", authenticateUser, authorizeRole("Admin", "SuperAdmin"), getAllClients); 
router.put("/admin/users/:id", authenticateUser, authorizeRole("Admin", "SuperAdmin"), editClientInfo);
router.get("/admin/appointments/counts", authenticateUser, authorizeRole("Admin", "SuperAdmin"), getAppointmentCounts);
router.get("/admin/appointments/charts", authenticateUser, authorizeRole("Admin", "SuperAdmin"), getAppointmentCharts);
router.get("/admin/appointments/today", authenticateUser, authorizeRole("Admin", "SuperAdmin"), getTodaysAppointments);
router.get("/admin/appointment", authenticateUser, authorizeRole("Admin", "SuperAdmin"), getAllAppointments);
router.get("/admin/:id", authenticateUser, authorizeRole("Admin", "SuperAdmin"), getAppointmentDetails); 
router.put("/admin/:id/status", authenticateUser, authorizeRole("Admin", "SuperAdmin"), updateAppointmentStatus);
router.post("/admin/block-dates", authenticateUser, authorizeRole("Admin", "SuperAdmin"), blockDates); 
router.post("/admin/:id/notes", authenticateUser, authorizeRole("Admin", "SuperAdmin"), addAppointmentNote); 

router.get("/admins", authenticateUser, authorizeRole("SuperAdmin"), getAllAdmins); 

export default router;
