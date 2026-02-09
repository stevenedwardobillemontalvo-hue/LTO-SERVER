import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { randomBytes } from "node:crypto";
import User from "@models/user"; 
import { sendPasswordResetEmail } from "@utils/email";

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before resetting your password.",
      });
    }

    const resetToken = randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 1000 * 60 * 30);

    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    await sendPasswordResetEmail(user.email, user.firstName, resetToken);

    res.status(200).json({ success: true, message: "Password reset email sent" });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
      return res.status(400).json({ success: false, message: "Missing token or new password" });

    const user = await User.findOne({ where: { resetToken: token } });
    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date())
      return res.status(400).json({ success: false, message: "Invalid or expired token" });

    const hashed = await bcrypt.hash(newPassword, 12);
    user.password = hashed;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.status(200).json({ success: true, message: "Password has been reset successfully" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
