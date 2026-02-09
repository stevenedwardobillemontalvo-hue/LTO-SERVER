import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many login or registration attempts. Please try again later.",
  },
  standardHeaders: true, 
  legacyHeaders: false, 
});
