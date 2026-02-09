import { body } from "express-validator";

export const createTransactionValidator = [
  body("clientId").notEmpty().withMessage("Client ID is required"),
  body("appointmentDate").isDate().withMessage("Appointment date is invalid"),
  body("appointmentTime").notEmpty().withMessage("Appointment time is required"),
  body("typeOfTransaction").notEmpty().withMessage("Type of transaction is required"),
];
