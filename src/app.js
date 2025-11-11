import express from "express";
// import cors from "cors";
import uploadRoutes from "./routes/uploadRoutes.js";


const app = express();


// app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));


app.use("/api", uploadRoutes);


app.get("/", (req, res) => res.json({ ok: true, message: "Resume parser backend" }));


export default app;