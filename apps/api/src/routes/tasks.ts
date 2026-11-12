import type {FastifyInstance} from 'fastify';
import {prisma} from '../lib/prisma.js';
import {env} from '../config/env.js';
import {z} from 'zod';
import {createOrder, paypalRequest} from '../lib/paypal.js';

const demoTaskSchema = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(3).max(3000),
  amount: z.coerce.number().positive().max(100000),
  requiredProduct: z.string().trim().max(140).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

async function demoUsers(){
  const funder = await prisma.user.upsert({where:{email:'funder@proofpay.demo'},update:{},create:{name:'Demo Funder',email:'funder@proofpay.demo',role:'FUNDER'}});
  const worker = await prisma.user.upsert({where:{email:'worker@proofpay.demo'},update:{},create:{name:'Demo Worker',email:'worker@proofpay.demo',role:'WORKER'}});
  return {funder,worker};
}

export async function taskRoutes(app:FastifyInstance){
  app.get('/api/tasks',async()=>prisma.task.findMany({include:{verification:true,payout:true,evidence:true},orderBy:{createdAt:'desc'}}));

  // These two convenience routes are LOCAL-DEVELOPMENT ONLY. They do not claim that the
  // application has user login or production-ready funding/task creation.
  app.post('/api/demo/tasks',async(req,reply)=>{
    if(env.NODE_ENV!=='development')return reply.code(404).send({error:'Demo task creation is only available in local development.'});
    const parsed=demoTaskSchema.safeParse(req.body);
    if(!parsed.success)return reply.code(400).send({error:parsed.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')});
    const {funder,worker}=await demoUsers();
    const task=await prisma.task.create({data:{...parsed.data,currency:'USD',status:'IN_PROGRESS',funderId:funder.id,workerId:worker.id}});
    return reply.code(201).send(task);
  });
  app.post('/api/demo/bootstrap',async(req,reply)=>{
    if(env.NODE_ENV!=='development')return reply.code(404).send({error:'Demo bootstrap is only available in local development.'});
    const {funder,worker}=await demoUsers();
    const examples=[
      {title:'Repair village water pump',description:'Repair the water pump and upload genuine before/after evidence.',amount:800,requiredProduct:'Water pump repair'},
      {title:'Deliver 5L pressure cooker',description:'Deliver one 5L pressure cooker and upload actual delivery evidence.',amount:2400,requiredProduct:'5L pressure cooker'},
    ];
    let created=0;
    for(const example of examples){
      const exists=await prisma.task.findFirst({where:{funderId:funder.id,title:example.title},select:{id:true}});
      if(!exists){await prisma.task.create({data:{...example,currency:'USD',status:'IN_PROGRESS',funderId:funder.id,workerId:worker.id}});created++;}
    }
    return {created,keptExisting:true,tasks:await prisma.task.count()};
  });

  // Original API contract retained for callers that provide explicit user IDs.
  app.post('/api/tasks',async(req,reply)=>{
    const parsed=z.object({title:z.string().min(1),description:z.string().min(1),amount:z.coerce.number().positive(),currency:z.string().default('USD'),requiredProduct:z.string().optional(),funderId:z.string(),workerId:z.string().optional()}).safeParse(req.body);
    if(!parsed.success)return reply.code(400).send({error:'Invalid task details.'});
    const task=await prisma.task.create({data:parsed.data});
    return reply.code(201).send(task);
  });
  app.post('/api/tasks/:id/fund',async(req,reply)=>{
    if(env.PAYPAL_ENVIRONMENT!=='SANDBOX')return reply.code(403).send({error:'This demo only supports PayPal Sandbox.'});
    if(!env.PAYPAL_CLIENT_ID||!env.PAYPAL_CLIENT_SECRET)return reply.code(503).send({error:'PayPal Sandbox credentials are missing.'});
    const id=(req.params as any).id;
    const task=await prisma.task.findUnique({where:{id}});
    if(!task)return reply.code(404).send({error:'Task not found'});
    try{
      const order:any=await createOrder(Number(task.amount),task.currency,task.id);
      // Creating an order is NOT payment. Funding is recorded only after capture succeeds.
      await prisma.task.update({where:{id},data:{paypalOrderId:order.id}});
      return {orderId:order.id,status:order.status,approvalUrl:order.links?.find((l:any)=>l.rel==='approve'||l.rel==='payer-action')?.href||null};
    }catch(e:any){return reply.code(502).send({error:e.message});}
  });
  app.post('/api/tasks/:id/fund/capture',async(req,reply)=>{
    if(env.PAYPAL_ENVIRONMENT!=='SANDBOX')return reply.code(403).send({error:'Sandbox only.'});
    const id=(req.params as any).id;
    const task=await prisma.task.findUnique({where:{id}});
    if(!task?.paypalOrderId)return reply.code(400).send({error:'No PayPal order was created for this task.'});
    try{
      const order:any=await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(task.paypalOrderId)}/capture`,{method:'POST',body:'{}'});
      if(order.status!=='COMPLETED')return reply.code(409).send({error:`PayPal capture is ${order.status||'incomplete'}.`});
      await prisma.task.update({where:{id},data:{status:'FUNDED'}});
      return {captured:true,orderId:order.id,status:order.status};
    }catch(e:any){return reply.code(502).send({error:e.message});}
  });
}
