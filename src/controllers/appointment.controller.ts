import { Request, Response } from "express";
import Transaction from "@models/transaction";
import User from "@models/user";
import { transactionRequirements } from "@utils/requirements";
import { Op } from "sequelize";
import { createCalendarEvent } from "@services/calendar";
import BlockedDates from "@models/blockdates";
import sequelize from "../config/database";

const updateBlockedSlot = async (date: string, time: string) => {
  return sequelize.transaction(async (t) => {
    const blocked = await BlockedDates.findOne({
      where: { date, time },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (blocked) {
      if (blocked.maxSlots <= 0) {
        throw new Error("No available slots for this date and time");
      }

      await blocked.update(
        { maxSlots: blocked.maxSlots - 1 },
        { transaction: t }
      );

      return blocked;
    }

    return BlockedDates.create(
      {
        date,
        time,
        maxSlots: 5,
      },
      { transaction: t }
    );
  });
};

export const createAppointment = async (req: Request, res: Response) => {
  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:6001";
  try {
    const {
      clientId,
      appointmentDate,
      appointmentTime,
      typeOfTransaction,
      personalInfo,
      appointmentId
    } = req.body;

    const parsedInfo =
      typeof personalInfo === "string"
        ? JSON.parse(personalInfo)
        : personalInfo || {};

    if (clientId) {
      await User.update(
        {
          firstName: parsedInfo.firstName,
          middleName: parsedInfo.middleName,
          lastName: parsedInfo.lastName,
          contactNumber: parsedInfo.contactNumber,
          email: parsedInfo.email,
          birthdate: parsedInfo.birthdate,
          ltmsNumber: parsedInfo.ltmsNumber,

        },
        { where: { id: clientId } }
      );
    }

    const requiredDocs = transactionRequirements[typeOfTransaction];
    if (!requiredDocs) {
      return res.status(400).json({ error: "Invalid transaction type" });
    }

const files = Array.isArray(req.files) ? req.files : [];

const uploadedFiles = files.reduce((acc, file) => {
  acc[file.fieldname] =
    `${req.protocol}://${req.get("host")}/uploads/${clientId}/${appointmentId}/${file.filename}`;
  return acc;
}, {} as Record<string, string>);

    const missing = requiredDocs.filter((reqName) => !uploadedFiles[reqName]);
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Missing required documents: ${missing.join(", ")}`,
      });
    }

    const appointment = await Transaction.create({
      id: appointmentId,
      clientId,
      appointmentDate,
      appointmentTime,
      typeOfTransaction,
      requirement: uploadedFiles,
      status: "pending",
    });

    await updateBlockedSlot(appointmentDate, appointmentTime);

    res.status(201).json({
      message: "Appointment created successfully",
      appointmentId: appointment.id,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const getClientAppointments = async (req: Request, res: Response) => {
  try {
    const { user } = req; 

    const appointments = await Transaction.findAll({
      where: { clientId: user.id },
      attributes: ["id", "appointmentDate", "appointmentTime", "status", "createdAt"],
      include: [
        {
          model: User,
          as: "client",
          attributes: ["firstName", "lastName"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const formatted = appointments.map((a) => ({
      id: a.id,
      name: `${a.client?.firstName} ${a.client?.lastName}`,
      appointmentDate: a.appointmentDate,
      appointmentTime: a.appointmentTime,
      status: a.status,
      createdAt: a.createdAt,
    }));

    res.status(200).json({ appointments: formatted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getClientAppointmentCounts = async (req: Request, res: Response) => {
  try {
    const { user } = req;

    const appointments = await Transaction.findAll({
      where: { clientId: user.id },
      attributes: ["status"],
    });

    const counts = {
      approved: 0,
      rejected: 0,
      cancelled: 0,
      pending: 0,
    };

    appointments.forEach((a) => {
      const status = a.status.toLowerCase();
      if (status in counts) counts[status as keyof typeof counts]++;
    });

    res.status(200).json({ counts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getClientTodaysAppointments = async (req: Request, res: Response) => {
  try {
    const { user } = req;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const appointments = await Transaction.findAll({
      where: {
        clientId: user.id,
        appointmentDate: {
          [Op.gte]: today,
          [Op.lt]: tomorrow,
        },
      },
      order: [["appointmentTime", "ASC"]],
    });

    res.status(200).json({ appointments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const reviewAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const appointment = await Transaction.findByPk(id, {
      include: [{ model: User, as: "client" }],
    });

    if (!appointment) return res.status(404).json({ error: "Appointment not found" });

    if (appointment.clientId !== user.id && user.roleName !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    res.status(200).json({ appointment });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const cancelAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const appointment = await Transaction.findByPk(id);
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });

    if (appointment.clientId !== user.id && user.roleName !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    const previousStatus = appointment.status;

    appointment.status = "cancelled";
    await appointment.save();

    if (appointment.status === "cancelled" && previousStatus !== "cancelled") {
      if (appointment.appointmentDate && appointment.appointmentTime) {
        const blocked = await BlockedDates.findOne({
          where: {
            date: appointment.appointmentDate,
            time: appointment.appointmentTime,
          },
        });

        if (blocked) {
          blocked.maxSlots += 1;
          await blocked.save();
        }
      }
    }

    res.status(200).json({ message: "Appointment cancelled", appointment });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const rescheduleAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newDate, newTime } = req.body;
    const { user } = req;

    const appointment = await Transaction.findByPk(id);
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });

    if (appointment.clientId !== user.id && user.roleName !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    appointment.appointmentDate = newDate;
    appointment.appointmentTime = newTime;
    appointment.status = "pending";
    await appointment.save();

    res.status(200).json({ message: "Appointment rescheduled", appointment });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getClientInfo = async (req: Request, res: Response) => {
  try {
    const { user } = req;

    const client = await User.findByPk(user.id, {
      attributes: ["id", "firstName", "middleName", "lastName", "email", "contactNumber", "birthdate", "ltmsNumber", "createdAt", "updatedAt"],
    });

    if (!client) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ success: true, client });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};
