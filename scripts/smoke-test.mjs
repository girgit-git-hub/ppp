// ProofPay E2E gate. Run after `npm run dev`; Node 22+.
const base=(process.env.API_URL||'http://localhost:4000').replace(/\/$/,'');
const timeout=120000;
async function call(label,path,init){
  const response=await fetch(base+path,{...init,signal:AbortSignal.timeout(timeout)});
  const raw=await response.text();
  let result={};try{result=JSON.parse(raw);}catch{result={raw:raw.slice(0,500)}}
  if(!response.ok)throw Error(`${label}: HTTP ${response.status} ${result.error||result.raw||''}`);
  console.log(`PASS ${label} (${response.status})`);return result;
}
try{
  const health=await call('API health','/api/health');
  if(health.ok!==true)throw Error('Health body does not report ok=true');
  const tasks=await call('Postgres task read','/api/tasks');
  if(!Array.isArray(tasks))throw Error('Tasks endpoint did not return an array');
  console.log(`      Database returned ${tasks.length} tasks.`);
  if (!tasks.length) console.warn('WARNING: Database is empty. The dashboard has no task to select; load example tasks or create one before testing uploads or verification.');
  const answer=await call('Real AI request','/api/agent/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'How many tasks exist and which need review? Use only actual task data.'})});
  if(!answer.provider||!answer.model||!answer.answer)throw Error('AI response lacks model/provider/answer; this may be a fake endpoint.');
  console.log(`      AI provider: ${answer.provider}, model: ${answer.model}`);
  console.log('INFRASTRUCTURE SMOKE PASSED: API + DB + AI responded. This does not prove uploads, vision verification, PayPal, MCP or deployment.');
}catch(e){console.error('SMOKE TEST FAILED:',e?.message||e);process.exitCode=1;}
