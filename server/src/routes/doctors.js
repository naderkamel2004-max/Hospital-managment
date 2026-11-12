import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth,requirePermission} from '../middleware/auth.js';
import {doctorScopeWhere} from '../lib/access-scopes.js';
export const doctorsRouter=Router();
doctorsRouter.use(requireAuth);
doctorsRouter.get('/',requirePermission('doctors.read'),async(req,res,next)=>{try{const items=await prisma.doctor.findMany({where:doctorScopeWhere(req.user),orderBy:{fullName:'asc'},include:{department:{select:{id:true,nameAr:true,nameEn:true}},_count:{select:{appointments:true,operations:true}}}});res.json({items});}catch(error){next(error);}});
doctorsRouter.post('/',requirePermission('doctors.create'),async(req,res,next)=>{try{const p=z.object({fullName:z.string().trim().min(2).max(120),specialty:z.string().trim().max(120).optional().nullable(),departmentId:z.string().min(1)}).safeParse(req.body);if(!p.success)return res.status(400).json({error:'Invalid doctor data',details:p.error.flatten()});const item=await prisma.doctor.create({data:p.data,include:{department:true}});await prisma.auditLog.create({data:{userId:req.user.id,action:'DOCTOR_CREATED',entity:'Doctor',entityId:item.id,ipAddress:req.ip,afterData:p.data}});res.status(201).json({item});}catch(error){next(error);}});

doctorsRouter.patch('/:id',requirePermission('doctors.update'),async(req,res,next)=>{try{
 const p=z.object({fullName:z.string().trim().min(2).max(120).optional(),specialty:z.string().trim().max(120).nullable().optional(),departmentId:z.string().min(1).optional()}).strict().refine(v=>Object.keys(v).length>0).safeParse(req.body);
 if(!p.success)return res.status(400).json({error:'Invalid doctor update',details:p.error.flatten()});
 const existing=await prisma.doctor.findFirst({where:{id:req.params.id,...(req.user.role!=='SUPER_ADMIN'&&req.user.scopes.some(x=>x.resource==='doctor')?{id:{in:req.user.scopes.filter(x=>x.resource==='doctor').map(x=>x.resourceId)}}:{})},select:{id:true}});
 if(!existing)return res.status(404).json({error:'Doctor not found'});
 if(p.data.departmentId){const department=await prisma.department.findFirst({where:{id:p.data.departmentId,isActive:true},select:{id:true}});if(!department)return res.status(400).json({error:'Active department not found'});}
 const item=await prisma.$transaction(async tx=>{const updated=await tx.doctor.update({where:{id:existing.id},data:p.data,include:{department:true}});await tx.auditLog.create({data:{userId:req.user.id,action:'DOCTOR_UPDATED',entity:'Doctor',entityId:updated.id,ipAddress:req.ip,beforeData:{id:existing.id},afterData:p.data}});return updated;});
 res.json({item});
}catch(error){if(error.code==='P2025')return res.status(404).json({error:'Doctor not found'});next(error);}});
