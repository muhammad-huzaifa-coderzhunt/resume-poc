
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import process from "process";
import dotenv from "dotenv";
dotenv.config();

const arg = process.argv[2];

if (!arg || arg === "help") {
  console.log(`
Usage:
  npm run cli -- start           # start server (same as npm start)
  npm run cli -- process <file>  # process a single docx file (upload & parse)
`);
  process.exit(0);
}

if (arg === "start") {
  const proc = spawn("node", ["server.js"], { stdio: "inherit" });
  proc.on("exit", code => process.exit(code));
  return;
}

if (arg === "process") {
  const file = process.argv[3];
  if (!file) {
    console.error("Missing file path");
    process.exit(2);
  }
 
  import("axios").then(({ default: axios }) => {
    import("form-data").then(({ default: FormData }) => {
      const form = new FormData();
      form.append("resume", fs.createReadStream(path.resolve(file)));
      axios.post((process.env.SERVER_URL || `http://localhost:${process.env.PORT||3000}`) + "/api/upload", form, {
        headers: form.getHeaders()
      }).then(r => {
        console.log("Result:", JSON.stringify(r.data, null, 2));
      }).catch(e => {
        console.error("Error:", e?.response?.data || e.message);
      });
    });
  });
  return;
}
console.error("Unknown command");
process.exit(2);
