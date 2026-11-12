import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';
export const auditRouter=Router();
auditRouter.use(requireAuth,(req,res,next)=>req.user.role==='SUPER_ADMIN'?next():res.status(403).json({error:'Super administrator access required'}));
auditRouter.get('/',async(req,res,next)=>{try{
 const page=Math.max(1,Number.parseInt(req.query.page,10)||1),pageSize=Math.min(100,Math.max(1,Number.parseInt(req.query.pageSize,10)||50));
 const where={};
 if(typeof req.query.userId==='string')where.userId=req.query.userId;
 if(typeof req.query.entity==='string')where.entity=req.query.entity.slice(0,80);
 if(typeof req.query.action==='string')where.action={contains:req.query.action.slice(0,80),mode:'insensitive'};
 if(req.query.from||req.query.to){where.createdAt={};if(req.query.from){const d=new Date(String(req.query.from));if(Number.isNaN(d.valueOf()))return res.status(400).json({error:'Invalid from date'});where.createdAt.gte=d;}if(req.query.to){const d=new Date(String(req.query.to));if(Number.isNaN(d.valueOf()))return res.status(400).json({error:'Invalid to date'});where.createdAt.lte=d;}}
 const [items,total]=await prisma.$transaction([prisma.auditLog.findMany({where,skip:(page-1)*pageSize,take:pageSize,orderBy:{createdAt:'desc'},include:{user:{select:{id:true,email:true,fullName:true}}}}),prisma.auditLog.count({where})]);
 res.json({items,pagination:{page,pageSize,total,totalPages:Math.ceil(total/pageSize)}});
}catch(error){next(error);}});
