import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth,requirePermission} from '../middleware/auth.js';
import {patientScopeWhere,combineWhere} from '../lib/access-scopes.js';
export const encountersRouter=Router();
encountersRouter.use(requireAuth);
encountersRouter.get('/',requirePermission('encounters.read'),async(req,res,next)=>{try{
 const where=combineWhere({},patientScopeWhere(req.user));
 const items=await prisma.encounter.findMany({where,orderBy:{startedAt:'desc'},take:300,include:{patient:{select:{id:true,medicalRecordNo:true,firstName:true,lastName:true}}}});
 res.json({items});
}catch(e){next(e);}});
encountersRouter.post('/',requirePermission('encounters.create'),async(req,res,next)=>{try{
 const p=z.object({patientId:z.string().min(1),chiefComplaint:z.string().trim().min(2).max(1000),clinicalNotes:z.string().trim().max(10000).optional().nullable()}).strict().safeParse(req.body);
 if(!p.success)return res.status(400).json({error:'Invalid encounter data',details:p.error.flatten()});
 const patient=await prisma.patient.findFirst({where:combineWhere({id:p.data.patientId},patientScopeWhere(req.user)),select:{id:true}});
 if(!patient)return res.status(404).json({error:'Patient not found'});
 const item=await prisma.$transaction(async tx=>{const created=await tx.encounter.create({data:{...p.data,clinicianId:req.user.id},include:{patient:{select:{id:true,medicalRecordNo:true,firstName:true,lastName:true}}}});await tx.auditLog.create({data:{userId:req.user.id,action:'ENCOUNTER_CREATED',entity:'Encounter',entityId:created.id,ipAddress:req.ip}});return created;});
 res.status(201).json({item});
}catch(e){next(e);}});
encountersRouter.patch('/:id',requirePermission('encounters.update'),async(req,res,next)=>{try{
 const p=z.object({status:z.enum(['IN_PROGRESS','CLOSED']).optional(),diagnosis:z.string().trim().max(2000).nullable().optional(),clinicalNotes:z.string().trim().max(10000).nullable().optional()}).strict().refine(v=>Object.keys(v).length>0).safeParse(req.body);
 if(!p.success)return res.status(400).json({error:'Invalid encounter update',details:p.error.flatten()});
 const result=await prisma.$transaction(async tx=>{
  const where=combineWhere({id:req.params.id},patientScopeWhere(req.user));
  const before=await tx.encounter.findFirst({where,select:{id:true,status:true,patientId:true}});
  if(!before)throw Object.assign(new Error('Encounter not found'),{status:404});
  if(p.data.status&&before.status==='CLOSED')throw Object.assign(new Error('Closed encounters cannot be reopened or edited'),{status:409});
  const data={...p.data,...(p.data.status==='CLOSED'?{closedAt:new Date()}:{}),...(p.data.status==='IN_PROGRESS'&&before.status==='OPEN'?{}:{})};
  const changed=await tx.encounter.updateMany({where:{id:before.id,status:before.status},data});
  if(changed.count!==1)throw Object.assign(new Error('Encounter changed concurrently'),{status:409});
  const item=await tx.encounter.findUnique({where:{id:before.id},include:{patient:{select:{medicalRecordNo:true,firstName:true,lastName:true}}}});
  await tx.auditLog.create({data:{userId:req.user.id,action:'ENCOUNTER_UPDATED',entity:'Encounter',entityId:item.id,ipAddress:req.ip,beforeData:{status:before.status},afterData:p.data}});
  return item;
 });
 res.json({item:result});
}catch(e){next(e);}});
