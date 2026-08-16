import express from "express"; import helmet from "helmet"; import cors from "cors"; import rateLimit from "express-rate-limit"; import interview from "./routes/interview.js"; import learning from "./routes/learning.js";
const app=express(); app.use(helmet({contentSecurityPolicy:false}));app.use(cors({origin:process.env.CLIENT_ORIGIN?.split(",")||true}));app.use(express.json({limit:"100kb"}));app.use("/api",rateLimit({windowMs:15*60*1000,max:120,standardHeaders:true,legacyHeaders:false}));app.get("/api/health",(_q,res)=>res.json({status:"ok"}));app.use("/api/interview",interview);app.use("/api/learning",learning);app.use((err,_q,res,_n)=>{
  if (err.name==="ZodError") {
    return res.status(400).json({error:"Please check the submitted fields.",details:err.issues.map(x=>x.message)});
  }

  console.error("[api]", err?.status || err?.code || "error", err?.message || err);

  if (err?.status === 429) {
    return res.status(503).json({error:"The AI service is temporarily busy. Please wait a moment and retry."});
  }

  if (err?.message?.includes("invalid evaluation")) {
    return res.status(502).json({error:"The AI returned an invalid evaluation. Please retry."});
  }

  return res.status(503).json({error:"The AI service is temporarily unavailable. Please retry."});
}); export default app;
