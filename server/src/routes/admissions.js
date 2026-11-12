import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth,requirePermission} from '../middleware/auth.js';
import {patientScopeWhere,combineWhere} from '../lib/access-scopes.js';
export const admissionsRouter=Router();
admissionsRouter.use(requireAuth);
admissionsRouter.get('/',requirePermission('admissions.read'),async(req,res,next)=>{try{
 const items=await prisma.admission.findMany({where:combineWhere({},patientScopeWhere(req.user)),orderBy:{admittedAt:'desc'},take:300,include:{patient:{select:{id:true,medicalRecordNo:true,firstName:true,lastName:true,phone:true}}}});
 res.json({items});
}catch(e){next(e);}});
admissionsRouter.post('/',requirePermission('admissions.create'),async(req,res,next)=>{try{
 const p=z.object({patientId:z.string().min(1),admissionNo:z.string().trim().min(2).max(40),ward:z.string().trim().max(100).optional().nullable(),bedLabel:z.string().trim().max(40).optional().nullable()}).strict().safeParse(req.body);
 if(!p.success)return res.status(400).json({error:'Invalid admission data',details:p.error.flatten()});
 const patient=await prisma.patient.findFirst({where:combineWhere({id:p.data.patientId},patientScopeWhere(req.user)),select:{id:true}});
 if(!patient)return res.status(404).json({error:'Patient not found'});
 const existing=await prisma.admission.findFirst({where:{patientId:patient.id,status:'ADMITTED'},select:{id:true}});
 if(existing)return res.status(409).json({error:'Patient already has an active admission'});
 const item=await prisma.$transaction(async tx=>{const created=await tx.admission.create({data:p.data,include:{patient:{select:{medicalRecordNo:true,firstName:true,lastName:true}}}});await tx.auditLog.create({data:{userId:req.user.id,action:'PATIENT_ADMITTED',entity:'Admission',entityId:created.id,ipAddress:req.ip}});return created;});
 res.status(201).json({item});
}catch(e){if(e.code==='P2002')return res.status(409).json({error:'Admission number already exists'});next(e);}});
admissionsRouter.patch('/:id',requirePermission('admissions.update'),async(req,res,next)=>{try{
 const p=z.object({status:z.enum(['DISCHARGED','TRANSFERRED']).optional(),ward:z.string().trim().max(100).nullable().optional(),bedLabel:z.string().trim().max(40).nullable().optional()}).strict().refine(v=>Object.keys(v).length>0).safeParse(req.body);
 if(!p.success)return res.status(400).json({error:'Invalid admission update',details:p.error.flatten()});
 const result=await prisma.$transaction(async tx=>{
  const before=await tx.admission.findFirst({where:combineWhere({id:req.params.id},patientScopeWhere(req.user)),select:{id:true,status:true}});
  if(!before)throw Object.assign(new Error('Admission not found'),{status:404});
  if(before.status!=='ADMITTED')throw Object.assign(new Error('Only active admissions can be updated'),{status:409});
  const data={...p.data,...(p.data.status==='DISCHARGED'?{dischargedAt:new Date()}:{}),...(p.data.status==='TRANSFERRED'?{dischargedAt:new Date()}: {})};
  const changed=await tx.admission.updateMany({where:{id:before.id,status:'ADMITTED'},data});
  if(changed.count!==1)throw Object.assign(new Error('Admission changed concurrently'),{status:409});
  const item=await tx.admission.findUnique({where:{id:before.id},include:{patient:{select:{medicalRecordNo:true,firstName:true,lastName:true}}}});
  await tx.auditLog.create({data:{userId:req.user.id,action:p.data.status==='DISCHARGED'?'PATIENT_DISCHARGED':p.data.status==='TRANSFERRED'?'PATIENT_TRANSFERRED':'ADMISSION_UPDATED',entity:'Admission',entityId:item.id,ipAddress:req.ip,beforeData:before,afterData:p.data}});
  return item;
 });
 res.json({item:result});
}catch(e){next(e);}});
