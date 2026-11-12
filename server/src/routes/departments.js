import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
export const departmentsRouter=Router();
departmentsRouter.use(requireAuth,requirePermission('departments.read'));
departmentsRouter.get('/',async(_req,res,next)=>{try{const items=await prisma.department.findMany({where:{isActive:true},orderBy:{nameAr:'asc'},select:{id:true,code:true,nameAr:true,nameEn:true,_count:{select:{doctors:true,patients:true}}}});res.json({items});}catch(error){next(error);}});
