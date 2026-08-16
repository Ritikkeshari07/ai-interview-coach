import dotenv from "dotenv"; import app from "./app.js"; import path from "node:path"; import { fileURLToPath } from "node:url";
const __dirname=path.dirname(fileURLToPath(import.meta.url));
// Always load the root project configuration, regardless of whether npm starts this file from /server or the repository root.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
const dist=path.resolve(__dirname,"../../client/dist"); app.use((await import("express")).default.static(dist));app.get("*",(_req,res)=>res.sendFile(path.join(dist,"index.html"),err=>{if(err)res.status(404).json({error:"Frontend build not found. Run npm run build."});}));const port=Number(process.env.PORT)||8080;

process.on("unhandledRejection", (reason) => {
  console.error("[server] Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[server] Uncaught exception:", error);
});

const server = app.listen(port,"0.0.0.0",()=>console.log(`AI Interview Coach listening on ${port}`));

server.on("error", (error) => {
  console.error("[server] HTTP server error:", error);
});
