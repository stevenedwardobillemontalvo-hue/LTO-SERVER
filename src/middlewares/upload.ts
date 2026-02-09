import fs from "fs";
import path from "path";
import multer from "multer";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const clientId = req.body.clientId;
    const appointmentId = req.body.appointmentId;

    const uploadPath = path.join("uploads", clientId, appointmentId);

    fs.mkdirSync(uploadPath, { recursive: true });

    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = file.originalname.split(".").pop();
    cb(null, `${unique}.${ext}`);
  }
});

export const upload = multer({ storage });
