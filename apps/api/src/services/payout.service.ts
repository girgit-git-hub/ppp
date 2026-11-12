import {prisma} from '../lib/prisma.js';
import {createPayout,paypalRequest} from '../lib/paypal.js';
import {env} from '../config/env.js';
import crypto from 'node:crypto';

export async function payoutTask(taskId:string){
  if(env.PAYPAL_ENVIRONMENT!=='SANDBOX')throw new Error('Production payouts are disabled in this prototype.');
  if(process.env.ENABLE_SANDBOX_PAYOUTS!=='true')throw new Error('Sandbox payouts are disabled. Set ENABLE_SANDBOX_PAYOUTS=true only in your private test environment.');
  if(!env.PAYPAL_CLIENT_ID||!env.PAYPAL_CLIENT_SECRET)throw new Error('PayPal Sandbox credentials are required.');
  const task=await prisma.task.findUnique({where:{id:taskId},include:{verification:true,payout:true,worker:true}});
  if(!task)throw new Error('Task not found');
  if(task.verification?.decision!=='VERIFIED'||task.status!=='VERIFIED')throw new Error('Task is not verified and eligible for payout');
  if(task.payout?.status==='SUCCEEDED'||task.payout?.status==='PROCESSING')return task.payout;
  if(!task.paypalOrderId)throw new Error('Task does not have a PayPal funding order.');
  const order:any=await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(task.paypalOrderId)}`);
  const captured=order.purchase_units?.some((u:any)=>u.payments?.captures?.some((c:any)=>c.status==='COMPLETED'));
  if(order.status!=='COMPLETED'||!captured)throw new Error('The PayPal funding order has not been captured.');
  if(!task.worker?.email)throw new Error('A worker email is required for payout.');
  const idempotencyKey=task.payout?.idempotencyKey||crypto.createHash('sha256').update(`proofpay:${taskId}`).digest('hex');
  const payout=await prisma.payout.upsert({where:{taskId},create:{taskId,workerEmail:task.worker.email,amount:task.amount,currency:task.currency,idempotencyKey,status:'PROCESSING'},update:{status:'PROCESSING'}});
  try{
    const result:any=await createPayout(payout.workerEmail,Number(payout.amount),payout.currency,idempotencyKey);
    return await prisma.payout.update({where:{id:payout.id},data:{paypalBatchId:result.batch_header?.payout_batch_id,status:'PROCESSING'}});
  }catch(error){await prisma.payout.update({where:{id:payout.id},data:{status:'FAILED'}});throw error;}
}
