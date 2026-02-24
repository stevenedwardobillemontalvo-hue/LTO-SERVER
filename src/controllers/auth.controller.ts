import bcrypt from "bcrypt";
import { Request, Response } from "express";
import User from "@models/user";
import Role from "@models/role";
import { generateToken } from "@utils/jwt";
import { randomBytes } from "node:crypto"; 
import { sendVerificationEmail, sendAdminApprovedEmail } from "@utils/email";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 1000 * 10,
};

export const register = async (req: Request, res: Response) => {
  try {
    const { type, adminType } = req.body;
    if (!type || !["client", "admin"].includes(type.toLowerCase()))
      return res.status(400).json({ success: false, message: "Invalid registration type" });

    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ success: false, message: "Missing required fields" });

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&()[\]{}^+=._-])[A-Za-z\d@$!%*?&()[\]{}^+=._-]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters long, include uppercase, lowercase, number, and special character.",
      });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ success: false, message: "Email already exists" });

    const hashed = await bcrypt.hash(password, 12);

    let userData: any = { firstName, lastName, email, password: hashed };

    if (type === "client") {
      const { middleName, birthdate, contactNumber, ltmsNumber } = req.body;
      if (!birthdate || !contactNumber || !ltmsNumber)
        return res.status(400).json({ success: false, message: "Missing required client fields" });

      const clientRole = await Role.findOne({ where: { name: "Client" } });
      if (!clientRole) return res.status(500).json({ success: false, message: "Client role not found" });

      const existingContact = await User.findOne({ where: { contactNumber } });
      if (existingContact) return res.status(400).json({ success: false, message: "Contact Number already exists" });

      const existingLtms = await User.findOne({ where: { ltmsNumber } });
      if (existingLtms) return res.status(400).json({ success: false, message: "LTMS Number already exists" });

      userData = { ...userData, middleName, birthdate, contactNumber, ltmsNumber, roleId: clientRole.id, isVerified: false };
      
      const verificationToken = randomBytes(32).toString("hex");
      userData.verificationToken = verificationToken;
      console.log("first", verificationToken);

    } else {
      let roleName = adminType?.toLowerCase() === "superadmin" ? "SuperAdmin" : "Admin";
      const adminRole = await Role.findOne({ where: { name: roleName } });
      if (!adminRole) return res.status(500).json({ success: false, message: `${roleName} role not found` });

      userData = {
      ...userData,
      roleId: adminRole.id,
      isVerified: true,
      verificationToken: null,
    };

    const user = await User.create(userData);

    await sendAdminApprovedEmail(
      user.email,
      user.firstName
    );

      userData.roleId = adminRole.id;
      userData.isVerified = true; 
      userData.verificationToken = null; 
    }

    const user = await User.create(userData);

    if (type === "client") {
      const verificationToken = randomBytes(32).toString("hex");
      userData.verificationToken = verificationToken;
      await sendVerificationEmail(user.email, user.firstName, verificationToken);
      console.log("Second", verificationToken);
    }

    res.status(201).json({
      success: true,
      message:
        type === "client"
          ? "Registered successfully. Please check your email to verify your account."
          : `${type === "admin" ? adminType || "Admin" : "User"} registered successfully.`,
    });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    if (!token) return res.status(400).json({ success: false, message: "Invalid token" });

    const user = await User.findOne({ where: { verificationToken: token } });
    if (!user) return res.status(400).json({ success: false, message: "Invalid or expired token" });

    user.isVerified = true;
    user.verificationToken = undefined; 
    await user.save();

    res.status(200).json({ success: true, message: "Email verified successfully" });
  } catch (err) {
    console.error("Verify Email Error:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email },
      include: [{ model: Role, as: "role" }],
    });

    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (!user.isVerified)
      return res.status(403).json({ success: false, message: "Please verify your email before logging in" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = generateToken({ id: user.id, email: user.email, role: user.role?.name });
    res.cookie("auth_token", token, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: { id: user.id, email: user.email, role: user.role?.name, token },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const logout = async (_req: Request, res: Response) => {
  res.clearCookie("auth_token", COOKIE_OPTIONS);
  res.status(200).json({ success: true, message: "Logged out successfully" });
};
