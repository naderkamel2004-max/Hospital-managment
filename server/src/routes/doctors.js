import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth,requirePermission} from '../middleware/auth.js';
export const doctorsRouter=Router();
doctorsRouter.use(requireAuth);
doctorsRouter.get('/',requirePermission('doctors.read'),async(_req,res,next)=>{try{const items=await prisma.doctor.findMany({orderBy:{fullName:'asc'},include:{department:{select:{id:true,nameAr:true,nameEn:true}},_count:{select:{appointments:true,operations:true}}}});res.json({items});}catch(error){next(error);}});
doctorsRouter.post('/',requirePermission('doctors.create'),async(req,res,next)=>{try{const p=z.object({fullName:z.string().trim().min(2).max(120),specialty:z.string().trim().max(120).optional().nullable(),departmentId:z.string().min(1)}).safeParse(req.body);if(!p.success)return res.status(400).json({error:'Invalid doctor data',details:p.error.flatten()});const item=await prisma.doctor.create({data:p.data,include:{department:true}});await prisma.auditLog.create({data:{userId:req.user.id,action:'DOCTOR_CREATED',entity:'Doctor',entityId:item.id,ipAddress:req.ip,afterData:p.data}});res.status(201).json({item});}catch(error){next(error);}});
