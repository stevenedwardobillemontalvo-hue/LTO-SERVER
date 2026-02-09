import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token provided" });

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;

    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized" });
  }
};

export const authorizeRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!roles.map(r => r.toLowerCase()).includes(user.role.toLowerCase())) {
      return res.status(403).json({ error: "Forbidden – insufficient permissions" });
    }

    next();
  };
};

