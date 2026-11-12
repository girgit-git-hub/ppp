import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {answerAgentQuery} from '../services/analysis.service.js';
export async function agentRoutes(app:FastifyInstance){
  app.post('/api/agent/query',async(req,reply)=>{
    const parsed=z.object({query:z.string().trim().min(1).max(1000)}).safeParse(req.body);
    if(!parsed.success)return reply.code(400).send({error:'Enter a question (up to 1000 characters).'});
    try{return await answerAgentQuery(parsed.data.query);}
    catch(e:any){req.log.error(e,'AI query failed');return reply.code(502).send({error:e?.message||'AI request failed'});}
  });
}
