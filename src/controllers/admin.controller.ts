import { Request, Response } from "express";
import Transaction from "@models/transaction";
import User from "@models/user";
import BlockedDates from "@models/blockdates";
import Role from "@models/role";
import { Op, Sequelize } from "sequelize";
import { sendAppointmentApprovedEmail, sendAppointmentRejectedEmail } from "@utils/email";

export const getAllAppointments = async (req: Request, res: Response) => {
  try {
    const appointments = await Transaction.findAll({
      include: [
        {
          model: User,
          as: "client",
          attributes: ["firstName", "lastName"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const now = new Date();

    for (const a of appointments) {
      const appointmentDateTime = new Date(`${a.appointmentDate} ${a.appointmentTime}`);

      if (a.status === "pending" && appointmentDateTime < now) {
        a.status = "rejected";
        await a.save(); 
      }
    }

    const formatted = appointments.map((a) => ({
      id: a.id,
      name: `${a.client?.firstName || ""} ${a.client?.lastName || ""}`.trim(),
      appointmentDate: a.appointmentDate,
      appointmentTime: a.appointmentTime,
      status: a.status,
    }));

    res.status(200).json({ appointments: formatted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getAppointmentCounts = async (req: Request, res: Response) => {
  try {
    const appointments = await Transaction.findAll({
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

export const getAppointmentCharts = async (req: Request, res: Response) => {
  try {
    const currentYear = new Date().getFullYear(); 

    const appointments = await Transaction.findAll({
      attributes: ["status", "appointmentDate"],
      where: {
        appointmentDate: {
          [Op.gte]: new Date(`${currentYear}-01-01`),
          [Op.lt]: new Date(`${currentYear + 1}-01-01`),
        },
      },
    });

    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    const monthlyData: Record<string, any> = {};

    months.forEach((m) => {
      monthlyData[m] = {
        month: m,
        approved: 0,
        rejected: 0,
        pending: 0,
        cancelled: 0,
      };
    });

    appointments.forEach((a: any) => {
      const date = new Date(a.appointmentDate);
      const month = months[date.getMonth()];
      const status = a.status?.toLowerCase();

      if (monthlyData[month] && status in monthlyData[month]) {
        monthlyData[month][status]++;
      }
    });

    const totals = {
      approved: 0,
      rejected: 0,
      pending: 0,
      cancelled: 0,
    };

    Object.values(monthlyData).forEach((m: any) => {
      totals.approved += m.approved;
      totals.rejected += m.rejected;
      totals.pending += m.pending;
      totals.cancelled += m.cancelled;
    });

    res.status(200).json({
      totals,
      monthly: Object.values(monthlyData),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getTodaysAppointments = async (req: Request, res: Response) => {
  try {
    const todayStr = new Date().toISOString().split("T")[0]; 

    const appointments = await Transaction.findAll({
      include: [
        {
          model: User,
          as: "client",
          attributes: ["firstName", "lastName"],
        },
      ],
      where: Sequelize.where(
        Sequelize.fn("DATE", Sequelize.col("appointmentDate")),
        todayStr
      ),
      order: [["appointmentTime", "ASC"]],
    });

    const formatted = appointments.map((a) => ({
      id: a.id,
      name: `${a.client?.firstName || ""} ${a.client?.lastName || ""}`.trim(),
      appointmentDate: a.appointmentDate,
      appointmentTime: a.appointmentTime,
      status: a.status,
    }));

    res.status(200).json({ appointments: formatted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateAppointmentStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const appointment = await Transaction.findByPk(id, {
      include: [
        {
          model: User,
          as: "client",
          attributes: ["firstName", "lastName", "email", "contactNumber"],
        },
      ],
    });

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const previousStatus = appointment.status;

    appointment.status = status;
    await appointment.save();

    if (status === "rejected" && previousStatus !== "rejected") {
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

    const email = appointment.client?.email;
    const fullName = `${appointment.client?.firstName || ""} ${appointment.client?.lastName || ""}`.trim();
    const transactionType = appointment.typeOfTransaction;

    if (email) {
      const formattedDate = appointment.appointmentDate
        ? new Date(appointment.appointmentDate).toISOString().split("T")[0]
        : "";

      const formattedTime = appointment.appointmentTime || "";
      const phone = appointment.client?.contactNumber || "";

      if (status === "approved") {
        await sendAppointmentApprovedEmail(
          email,
          phone,
          fullName,
          transactionType,
          formattedDate,
          formattedTime,
          note,
          appointment.id
        );
      }

      if (status === "rejected") {
        await sendAppointmentRejectedEmail(
          email,
          phone,
          fullName,
          formattedDate,
          formattedTime,
          transactionType,
          note
        );
      }
    }

    return res.json({
      success: true,
      message: `Appointment ${status}`,
      appointment,
    });

  } catch (err: any) {
    console.error("Error updating appointment:", err);
    return res.status(500).json({ error: err.message });
  }
};

export const addAppointmentNote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const appointment = await Transaction.findByPk(id);
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    appointment.note = note;
    await appointment.save();

    res.status(200).json({
      success: true,
      message: "Note saved successfully",
      note: appointment.note,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};


export const getAppointmentDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const appointment = await Transaction.findByPk(id, { include: [{ model: User, as: "client" }] });
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });

    res.json({
      success: true,
      appointment,
      files: appointment.requirement,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const blockDates = async (req: Request, res: Response) => {
  try {
    const { date, time, maxSlots } = req.body;

    const block = await BlockedDates.create({ date, time, maxSlots });
    res.json({ success: true, message: "Slot blocked", block });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getAllClients = async (_req: Request, res: Response) => {
  try {
    const users = await User.findAll({
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["name"],
          where: { name: "Client" }
        },
      ],
      attributes: [
        "id",
        "firstName",
        "middleName",
        "lastName",
        "ltmsNumber",
        "email",
        "birthdate",
      ],
      order: [["createdAt", "DESC"]],
    });

    const formatted = users.map((u: any) => ({
      id: u.id,
      name: `${u.firstName} ${u.middleName ? u.middleName + " " : ""}${u.lastName}`,
      ltmsNumber: u.ltmsNumber,
      email: u.email,
      birthdate: u.birthdate,
      role: u.role?.name,
    }));

    res.status(200).json({ success: true, users: formatted });
  } catch (err: any) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users", details: err.message });
  }
};

export const editClientInfo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, birthdate, ltms_number } = req.body;

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: "Email is already in use by another account" });
      }
      user.email = email;
    }

    if (birthdate !== undefined) {
      user.birthdate = birthdate; 
    }

    if (ltms_number !== undefined) {
      user.ltmsNumber = ltms_number;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "User info updated successfully",
      user: {
        id: user.id,
        email: user.email,
        birthdate: user.birthdate,
        ltms_number: user.ltmsNumber,
      },
    });
  } catch (err: any) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: "Failed to update user", details: err.message });
  }
};

export const getblockDates = async (req: Request, res: Response) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    const { date } = req.query; 

    if (!date) {
      return res.status(400).json({ error: "Missing date parameter" });
    }

    const blocks = await BlockedDates.findAll({ where: { date } });

    res.json({
      success: true,
      blocks,
    });
  } catch (err: any) {
    console.error("❌ Error fetching block dates:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getAllAdmins = async (_req: Request, res: Response) => {
  try {
    const admins = await User.findAll({
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["name"],
          where: { name: "Admin" }, 
        },
      ],
      attributes: ["id", "firstName", "middleName", "lastName", "email", "createdAt"],
      order: [["createdAt", "DESC"]],
    });

    const formatted = admins.map((admin: any) => ({
      id: admin.id,
      name: `${admin.firstName}${admin.middleName ? " " + admin.middleName : ""} ${admin.lastName}`,
      email: admin.email,
      createdAt: admin.createdAt,
    }));

    res.status(200).json({ success: true, admins: formatted });
  } catch (err: any) {
    console.error("Error fetching admins:", err);
    res.status(500).json({ error: "Failed to fetch admins", details: err.message });
  }
};

