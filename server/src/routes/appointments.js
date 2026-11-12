import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
export const appointmentsRouter=Router();
appointmentsRouter.use(requireAuth);
const schema=z.object({patientId:z.string().min(1),doctorId:z.string().min(1),departmentId:z.string().min(1),startsAt:z.coerce.date(),reason:z.string().trim().max(500).optional().nullable()});
appointmentsRouter.get('/',requirePermission('appointments.read'),async(req,res,next)=>{try{
 const from=req.query.from?new Date(String(req.query.from)):new Date(new Date().setHours(0,0,0,0));
 const to=req.query.to?new Date(String(req.query.to)):new Date(new Date().setDate(new Date().getDate()+7));
 if(Number.isNaN(from.valueOf())||Number.isNaN(to.valueOf())||from>to)return res.status(400).json({error:'Invalid date range'});
 const items=await prisma.appointment.findMany({where:{startsAt:{gte:from,lte:to}},orderBy:{startsAt:'asc'},take:500,include:{patient:{select:{id:true,medicalRecordNo:true,firstName:true,lastName:true,phone:true}},doctor:{select:{id:true,fullName:true,specialty:true}},department:{select:{id:true,nameAr:true,nameEn:true}}}});
 res.json({items});
}catch(error){next(error);}});
appointmentsRouter.post('/',requirePermission('appointments.create'),async(req,res,next)=>{try{
 const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Invalid appointment data',details:parsed.error.flatten()});
 const {patientId,doctorId,departmentId,startsAt,reason}=parsed.data;
 const refs=await prisma.$transaction([
  prisma.patient.findUnique({where:{id:patientId},select:{id:true}}),
  prisma.doctor.findUnique({where:{id:doctorId},select:{id:true,departmentId:true}}),
  prisma.department.findUnique({where:{id:departmentId},select:{id:true,isActive:true}})
 ]);
 if(!refs[0]||!refs[1]||!refs[2]?.isActive)return res.status(400).json({error:'Patient, doctor or active department not found'});
 if(refs[1].departmentId!==departmentId)return res.status(400).json({error:'Doctor does not belong to the selected department'});
 const item=await prisma.$transaction(async tx=>{const created=await tx.appointment.create({data:{patientId,doctorId,departmentId,startsAt,reason},include:{patient:{select:{medicalRecordNo:true,firstName:true,lastName:true}},doctor:{select:{fullName:true}},department:{select:{nameAr:true,nameEn:true}}}});await tx.auditLog.create({data:{userId:req.user.id,action:'APPOINTMENT_CREATED',entity:'Appointment',entityId:created.id,ipAddress:req.ip}});return created;});
 res.status(201).json({item});
}catch(error){next(error);}});
