// import express from "express";
// import multer from "multer";
// import UploadController from "../controllers/upload-controller.js";
// import path from "path";
// import fs from "fs";

// const router = express.Router();

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const dir = path.resolve("uploads");
//     if (!fs.existsSync(dir)) fs.mkdirSync(dir);
//     cb(null, dir);
//   },
//   filename: (req, file, cb) => {
//     const now = new Date();
//     const ts = now.toISOString().replace(/[:.]/g,"").slice(0,15);
//     const safe = path.basename(file.originalname).replace(/\s+/g,"_").replace(/[^\w\.\-]/g,"").toLowerCase();
//     cb(null, `${ts}_${safe}`);
//   }
// });
// const upload = multer({ storage });

// /**
//  * @route 
//  * @summary 
//  */
// router.post("/upload", upload.single("resume"), UploadController.upload);

// export default router;
