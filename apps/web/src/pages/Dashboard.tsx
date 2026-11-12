import {useCallback, useEffect, useState} from 'react';
import {API_URL, getTasks, agentQuery, verifyTask, payoutTask, uploadEvidence, createDemoTask, bootstrapDemoTasks} from '../lib/api';
import {ReviewGrid} from '../components/ReviewGrid';
import {FraudTimeline} from '../components/FraudTimeline';
import {MapPanel} from '../components/MapPanel';

export default function Dashboard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState('');
  const [agentProvider, setAgentProvider] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({ title: '', description: '', amount: '50', requiredProduct: '', latitude: '', longitude: '' });
  const selected = tasks.find(t => t.id === selectedId);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTasks();
      if (!Array.isArray(data)) throw new Error('The /api/tasks endpoint did not return an array.');
      setTasks(data); setSelectedId(current => data.some((t: any) => t.id === current) ? current : (data[0]?.id ?? null)); setError('');
    } catch (e: any) { setError(e?.message || 'Failed to load tasks.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await fn(); await refresh(); }
    catch (e: any) { setError(e?.message || 'Action failed.'); }
    finally { setBusy(false); }
  };
  const loadExamples = async () => {
    setBusy(true); setError('');
    try { await bootstrapDemoTasks(); await refresh(); }
    catch (e: any) { setError(e?.message || 'Could not create demo tasks.'); }
    finally { setBusy(false); }
  };
  const submitDemoTask = async () => {
    setBusy(true); setError('');
    try {
      const task = await createDemoTask({
        title: draft.title.trim(), description: draft.description.trim(), amount: Number(draft.amount),
        ...(draft.requiredProduct.trim() ? { requiredProduct: draft.requiredProduct.trim() } : {}),
        ...(draft.latitude.trim() && draft.longitude.trim() ? { latitude: Number(draft.latitude), longitude: Number(draft.longitude) } : {}),
      });
      await refresh();
      setSelectedId(task.id);
      setDraft({ title: '', description: '', amount: '50', requiredProduct: '', latitude: '', longitude: '' });
    } catch (e: any) { setError(e?.message || 'Could not create task.'); }
    finally { setBusy(false); }
  };
  const runAgent = async () => {
    if (!q.trim()) return;
    setBusy(true); setError(''); setAnswer(''); setAgentProvider('');
    try {
      const result = await agentQuery(q.trim());
      setAnswer(result.answer || 'The AI service returned no answer.');
      setAgentProvider(`${result.provider || 'AI'} · ${result.model || 'unknown model'}`);
    } catch (e: any) { setError(e?.message || 'AI request failed.'); }
    finally { setBusy(false); }
  };

  return <div className="app">
    <header><div><div className="brand">Proof<span>Pay</span></div><div className="sub">Proof of work. Verified by AI. Paid by PayPal.</div></div><div className="live"><i/> PAYPAL SANDBOX</div></header>
    <main>
      <section className="hero"><div><div className="eyebrow">EVIDENCE VERIFICATION CONTROL CENTER</div><h1>Donor money, backed by proof.</h1><p>Every payout should be gated by evidence, fraud signals and deterministic eligibility checks.</p></div><div className="score"><b>{tasks.filter(t => t.status === 'VERIFIED' || t.status === 'PAID').length}</b><span>verified tasks</span></div></section>
      {error && <section className="panel" role="alert" style={{border:'1px solid #ef4444'}}><strong>Action or connection failed:</strong> {error} <button className="ghost" onClick={() => void refresh()} disabled={loading}>Retry tasks</button></section>}
      {loading && <p role="status">Loading tasks from API…</p>}
      <section className="stats"><div><b>{tasks.length}</b><span>Total tasks</span></div><div><b>{tasks.filter(t => t.status === 'REVIEW').length}</b><span>Needs review</span></div><div><b>{tasks.filter(t => t.payout).length}</b><span>Payouts</span></div><div><b>{tasks.filter(t => (t.verification?.overallScore ?? 100) < 70).length}</b><span>High risk</span></div></section>
      {import.meta.env.DEV && <section className="panel demo-tools">
        <div className="panel-head"><div><div className="eyebrow">START A REAL LOCAL WORKFLOW</div><h2>Create a demo task</h2></div><button className="ghost" type="button" disabled={busy} onClick={() => void loadExamples()}>Load 2 example tasks</button></div>
        <p className="helper">Tasks created here are stored in PostgreSQL and assigned to local demo users. This does not charge PayPal or fund a task.</p>
        <form className="demo-form" onSubmit={e => { e.preventDefault(); void submitDemoTask(); }}>
          <label>Task title<input required minLength={3} maxLength={140} value={draft.title} placeholder="Repair a community water pump" onChange={e => setDraft(d => ({...d, title:e.target.value}))}/></label>
          <label>Amount (demo USD)<input required type="number" min="0.01" max="100000" step="0.01" value={draft.amount} onChange={e => setDraft(d => ({...d,amount:e.target.value}))}/></label>
          <label className="wide">Description<input required minLength={3} maxLength={3000} value={draft.description} placeholder="What evidence would prove the work is finished?" onChange={e => setDraft(d => ({...d, description:e.target.value}))}/></label>
          <label>Reference item (optional)<input value={draft.requiredProduct} maxLength={140} placeholder="Water pump repair" onChange={e => setDraft(d => ({...d,requiredProduct:e.target.value}))}/></label>
          <label>Task latitude (optional)<input type="number" min="-90" max="90" step="any" value={draft.latitude} placeholder="e.g. 25.3176" onChange={e => setDraft(d => ({...d,latitude:e.target.value}))}/></label>
          <label>Task longitude (optional)<input type="number" min="-180" max="180" step="any" value={draft.longitude} placeholder="e.g. 82.9739" onChange={e => setDraft(d => ({...d,longitude:e.target.value}))}/></label>
          <div className="demo-form-actions"><button type="submit" disabled={busy || !draft.title.trim() || !draft.description.trim() || !(Number(draft.amount) > 0)}>{busy ? 'Working…' : 'Create task'}</button><span>Optional coordinates are the planned task site, not evidence GPS.</span></div>
        </form>
      </section>}
      <section className="panel agent"><div><div className="eyebrow">LIVE AI ANALYST</div><h2>Ask about the evidence and payout trail.</h2><p>This calls a configured AI model with read-only task data. PayPal Agent Toolkit/MCP actions are not enabled by this panel.</p></div><div className="query"><input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void runAgent(); }} placeholder="Show workers with two or more flags, worst first"/><button disabled={busy || !q.trim()} onClick={() => void runAgent()}>{busy ? 'Working…' : 'Run AI analysis'}</button></div>{answer && <div className="answer"><small>{agentProvider}</small><p>{answer}</p></div>}</section>
      <section className="panel"><div className="panel-head"><div><div className="eyebrow">AG GRID · REVIEW WORKBENCH</div><h2>Evidence decisions</h2></div><button className="ghost" onClick={() => void refresh()} disabled={loading}>Refresh</button></div>{!loading && tasks.length === 0 && <p className="empty-note">No task records exist in this database. Use <b>Load 2 example tasks</b> above or create one; the file uploader will then become available.</p>}<ReviewGrid rows={tasks} onSelect={t => setSelectedId(t.id)}/></section>
      {selected && <section className="panel detail"><div className="panel-head"><div><div className="eyebrow">TASK {selected.id.slice(-8)}</div><h2>{selected.title}</h2></div><div className="actions"><button disabled={busy || !selected.evidence?.length} onClick={() => void act(() => verifyTask(selected.id))}>Run verification</button><button className="success" title="Requires AI verification AND captured PayPal Sandbox funding. Payout is disabled by default." disabled={busy || selected.status !== 'VERIFIED' || !selected.paypalOrderId} onClick={() => void act(() => payoutTask(selected.id))}>Pay via PayPal</button></div></div><p className="helper">Run verification is enabled after evidence upload. PayPal funding and payout are not a completed end-to-end UI flow in this prototype.</p><div className="detail-grid"><div><h3>AI proof score</h3><div className="bigscore">{selected.verification?.overallScore ?? '—'}<small>/100</small></div><p>{selected.verification?.explanation || 'Evidence not verified yet.'}</p></div><div><h3>Checks</h3><div className="checks">{(Array.isArray(selected.verification?.checks) ? selected.verification.checks : []).map((c: any) => <div key={c.key}><span>{String(c.key).replaceAll('_',' ')}</span><b>{c.score}</b></div>)}</div></div></div>{selected.evidence?.[0] && <div className="evidence"><img alt="Uploaded evidence" src={`${API_URL}/uploads/${selected.evidence[0].filePath.replaceAll('\\', '/').split('/').pop()}`}/><div><b>{selected.evidence[0].originalName}</b><p>SHA-256: {selected.evidence[0].sha256.slice(0,20)}…</p><p>pHash: {selected.evidence[0].perceptualHash || '—'}</p></div></div>}</section>}
      <section className="two"><section className="panel"><div className="eyebrow">TASK ACTIVITY</div><h2>Task activity timeline</h2><FraudTimeline tasks={tasks}/></section><section className="panel"><div className="eyebrow">EVIDENCE LOCATION</div><h2>Evidence geography</h2><MapPanel tasks={tasks}/></section></section>
      <section className="panel upload"><div><div className="eyebrow">FIELD EVIDENCE</div><h2>Upload proof to selected task</h2><p>{selected ? `Selected task: ${selected.title}. Upload an actual image file (JPEG or PNG, up to 10 MB).` : `No task selected. Create or load tasks above to unlock uploading.`} The backend inspects image metadata and hashes before AI verification.</p></div><input type="file" accept="image/*" disabled={!selected || busy} onChange={e => { const file = e.target.files?.[0]; if (file && selected) void act(() => uploadEvidence(selected.id, file)); e.target.value = ''; }}/></section>
    </main>
  </div>;
}
