import OpenAI from 'openai';
import {env} from '../config/env.js';
import {prisma} from '../lib/prisma.js';

export async function answerAgentQuery(query:string){
  const tasks=await prisma.task.findMany({
    include:{verification:true,payout:true,evidence:true,worker:true},
    orderBy:{createdAt:'desc'},take:100
  });
  const data=tasks.map(t=>({
    id:t.id,title:t.title,status:t.status,createdAt:t.createdAt,
    amount:Number(t.amount),currency:t.currency,
    worker:t.worker?.email || 'unassigned',
    proofScore:t.verification?.overallScore ?? null,
    aiDecision:t.verification?.decision ?? null,
    evidenceCount:t.evidence.length,
    payoutStatus:t.payout?.status ?? null
  }));
  const instructions=`You are the ProofPay read-only finance and evidence analyst. Answer the user's question using only the task records below. You must not invent transactions, tool invocations, balances, verification decisions, or PayPal activity. Identify gaps in the dataset. Explain that this interface only analyzes local tasks; it does not invoke PayPal Agent Toolkit or MCP actions. Answer concisely and cite relevant task IDs where useful.
TASK_DATA=${JSON.stringify(data)}`;
  if(env.AI_PROVIDER==='openai'){
    if(!env.OPENAI_API_KEY)throw new Error('OPENAI_API_KEY missing. Configure it in the root .env or switch AI_PROVIDER.');
    const client=new OpenAI({apiKey:env.OPENAI_API_KEY});
    const response=await client.chat.completions.create({model:env.OPENAI_MODEL,messages:[{role:'system',content:instructions},{role:'user',content:query}],temperature:0});
    return {answer:response.choices[0]?.message?.content||'No AI response.',provider:'openai',model:env.OPENAI_MODEL,tasksConsulted:data.length};
  }
  if(!env.GOOGLE_API_KEY)throw new Error('GOOGLE_API_KEY missing. Configure it in the root .env or switch AI_PROVIDER.');
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GOOGLE_MODEL)}:generateContent`,{
    method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':env.GOOGLE_API_KEY},
    body:JSON.stringify({contents:[{role:'user',parts:[{text:instructions+'\n\nUSER QUESTION: '+query}]}],generationConfig:{temperature:0}})
  });
  const body:any=await response.json();
  if(!response.ok)throw new Error(`Gemini API ${response.status}: ${body.error?.message||'request failed'}`);
  const answer=body.candidates?.[0]?.content?.parts?.map((part:any)=>part.text||'').join('')||'No AI response.';
  return {answer,provider:'gemini',model:env.GOOGLE_MODEL,tasksConsulted:data.length};
}
