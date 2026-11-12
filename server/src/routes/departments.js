import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
export const departmentsRouter=Router();
departmentsRouter.use(requireAuth);
departmentsRouter.get('/',requirePermission('departments.read'),async(_req,res,next)=>{try{const items=await prisma.department.findMany({where:req.user.permissions?.includes('departments.manage')||req.user.role==='SUPER_ADMIN'?{}:{isActive:true},orderBy:{nameAr:'asc'},select:{id:true,code:true,nameAr:true,nameEn:true,isActive:true,_count:{select:{doctors:true,patients:true}}}});res.json({items});}catch(error){next(error);}});

departmentsRouter.post('/',requirePermission('departments.manage'),async(req,res,next)=>{try{
 const p=z.object({code:z.string().trim().min(2).max(30).regex(/^[A-Za-z0-9_-]+$/),nameAr:z.string().trim().min(2).max(120),nameEn:z.string().trim().min(2).max(120)}).strict().safeParse(req.body);
 if(!p.success)return res.status(400).json({error:'Invalid department data',details:p.error.flatten()});
 const item=await prisma.department.create({data:{...p.data,code:p.data.code.toUpperCase()}});
 await prisma.auditLog.create({data:{userId:req.user.id,action:'DEPARTMENT_CREATED',entity:'Department',entityId:item.id,ipAddress:req.ip,afterData:p.data}});
 res.status(201).json({item});
}catch(error){if(error.code==='P2002')return res.status(409).json({error:'Department code already exists'});next(error);}});
departmentsRouter.patch('/:id',requirePermission('departments.manage'),async(req,res,next)=>{try{
 const p=z.object({code:z.string().trim().min(2).max(30).regex(/^[A-Za-z0-9_-]+$/).optional(),nameAr:z.string().trim().min(2).max(120).optional(),nameEn:z.string().trim().min(2).max(120).optional(),isActive:z.boolean().optional()}).strict().refine(v=>Object.keys(v).length>0).safeParse(req.body);
 if(!p.success)return res.status(400).json({error:'Invalid department update',details:p.error.flatten()});
 const before=await prisma.department.findUnique({where:{id:req.params.id}});
 if(!before)return res.status(404).json({error:'Department not found'});
 const data={...p.data,...(p.data.code?{code:p.data.code.toUpperCase()}:{})};
 const item=await prisma.$transaction(async tx=>{const updated=await tx.department.update({where:{id:before.id},data});await tx.auditLog.create({data:{userId:req.user.id,action:'DEPARTMENT_UPDATED',entity:'Department',entityId:updated.id,ipAddress:req.ip,beforeData:before,afterData:data}});return updated;});
 res.json({item});
}catch(error){if(error.code==='P2002')return res.status(409).json({error:'Department code already exists'});next(error);}});
