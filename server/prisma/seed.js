import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
const prisma=new PrismaClient();

const permissions=[
  ['patients.read','Read patient records'],['patients.create','Register patients'],['patients.update','Update patient records'],
  ['departments.read','Read departments'],['appointments.read','Read appointments'],['appointments.create','Create appointments']
];

async function main(){
  const email=process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password=process.env.SEED_ADMIN_PASSWORD;
  if(!email||!password||password.length<14) throw new Error('Set SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of at least 14 characters before seeding.');
  const role=await prisma.role.upsert({where:{code:'SUPER_ADMIN'},update:{nameAr:'مدير النظام',nameEn:'Super Administrator'},create:{code:'SUPER_ADMIN',nameAr:'مدير النظام',nameEn:'Super Administrator'}});
  for(const [code,description] of permissions){
    const permission=await prisma.permission.upsert({where:{code},update:{description},create:{code,description}});
    await prisma.rolePermission.upsert({where:{roleId_permissionId:{roleId:role.id,permissionId:permission.id}},update:{},create:{roleId:role.id,permissionId:permission.id}});
  }
  const passwordHash=await bcrypt.hash(password,12);
  await prisma.user.upsert({
    where:{email},
    update:{fullName:process.env.SEED_ADMIN_NAME||'System Administrator',roleId:role.id,isActive:true,status:'ACTIVE'},
    create:{email,passwordHash,fullName:process.env.SEED_ADMIN_NAME||'System Administrator',roleId:role.id}
  });
  console.log('HMS bootstrap role and administrator are ready.');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>prisma.$disconnect());
