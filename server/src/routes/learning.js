import { Router } from "express"; import { z } from "zod"; import { streamLearning } from "../services/ai.js";
const router=Router(); router.post("/explain",(req,res,next)=>{try{const body=z.object({topic:z.string().min(2).max(300),level:z.enum(["Beginner","Intermediate","Advanced"])}).parse(req.body);streamLearning(res,body);}catch(e){next(e);}}); export default router;
