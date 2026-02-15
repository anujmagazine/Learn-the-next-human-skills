
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import { AppView, AgentStream, DrillScenario } from './types';
import { orchestrationService } from './services/gemini';

const DRILLS: DrillScenario[] = [
  {
    id: 'crisis-1',
    title: 'The Global Launch Pivot',
    difficulty: 'Hard',
    description: 'A major competitor just released a similar product 2 hours before your launch. Manage 4 agents to pivot the entire strategy in real-time.',
    agents: ['Marketing Strategist', 'Technical Lead', 'Legal Counsel', 'PR Spokesperson']
  },
  {
    id: 'crisis-2',
    title: 'Cyber-Security Breach',
    difficulty: 'Extreme',
    description: 'Active data exfiltration in progress. Coordinate Defense, PR, Customer Support, and Forensic teams simultaneously.',
    agents: ['Infra Security', 'PR Manager', 'Support Lead', 'Legal']
  }
];

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HUB);
  const [activeDrill, setActiveDrill] = useState<DrillScenario | null>(null);
  const [agents, setAgents] = useState<AgentStream[]>([]);
  const [isDrillRunning, setIsDrillRunning] = useState(false);
  const [intervention, setIntervention] = useState<{ agentId: string, prompt: string } | null>(null);
  const [stats, setStats] = useState({ switches: 0, interventions: 0 });
  const logContainerRef = useRef<Record<string, HTMLDivElement | null>>({});

  const startDrill = (drill: DrillScenario) => {
    const initialAgents: AgentStream[] = drill.agents.map((role, i) => ({
      id: `agent-${i}`,
      role,
      color: ['#818cf8', '#fbbf24', '#f472b6', '#34d399'][i % 4],
      logs: [`System: Agent ${role} initialized...`],
      status: 'working',
      currentTask: 'Analyzing baseline scenario...'
    }));
    setAgents(initialAgents);
    setActiveDrill(drill);
    setView(AppView.TRAINER);
    setIsDrillRunning(true);
    setStats({ switches: 0, interventions: 0 });
  };

  useEffect(() => {
    if (!isDrillRunning || !activeDrill || intervention) return;

    const interval = setInterval(async () => {
      const randomIndex = Math.floor(Math.random() * agents.length);
      const agent = agents[randomIndex];
      
      const otherContext = agents
        .filter(a => a.id !== agent.id)
        .map(a => `${a.role}: ${a.logs[a.logs.length-1]}`)
        .join(' | ');

      try {
        const update = await orchestrationService.generateAgentUpdate(
          agent.role, 
          activeDrill.description, 
          agent.logs.slice(-3),
          otherContext
        );

        setAgents(prev => prev.map(a => {
          if (a.id === agent.id) {
            const newLogs = [...a.logs, update.text];
            if (update.needsInput) {
              setIntervention({ agentId: a.id, prompt: update.prompt || "Awaiting directive..." });
              return { ...a, logs: newLogs, status: 'awaiting_input' };
            }
            return { ...a, logs: newLogs, status: 'working' };
          }
          return a;
        }));
      } catch (e) {
        console.error("Agent update failed", e);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isDrillRunning, activeDrill, agents, intervention]);

  const handleInterventionResponse = (response: string) => {
    if (!intervention) return;
    
    setAgents(prev => prev.map(a => {
      if (a.id === intervention.agentId) {
        return { 
          ...a, 
          logs: [...a.logs, `Human Directive: ${response}`],
          status: 'working' 
        };
      }
      return a;
    }));
    setStats(prev => ({ ...prev, interventions: prev.interventions + 1 }));
    setIntervention(null);
  };

  const renderHub = () => (
    <div className="max-w-6xl mx-auto py-16 animate-in fade-in duration-700">
      <div className="text-center mb-16">
        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-white uppercase leading-tight">
          Learn the Next <span className="gradient-text">Human Skills</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
          In a world where AI agents produce at infinite scale, the bottleneck is human judgment. 
          Build the cognitive infrastructure to thrive in the age of intelligence.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Parallelism Tile */}
        <div 
          onClick={() => setView(AppView.LANDING)}
          className="group relative glass p-10 rounded-[40px] border-white/5 hover:border-indigo-500/50 transition-all cursor-pointer overflow-hidden shadow-2xl hover:shadow-indigo-500/10"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
          </div>
          <div className="relative z-10">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/20 group-hover:scale-110 transition-transform">
              <span className="text-3xl">⚡</span>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-white group-hover:text-indigo-400 transition-colors">Parallelism</h2>
            <p className="text-slate-400 text-lg leading-relaxed mb-8">
              The "Orchestration Gym." Learn to maintain a unified vision while multiple agents bombard you with conflicting logs and critical decisions.
            </p>
            <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-widest text-sm">
              Launch Skill Trainer <span className="group-hover:translate-x-2 transition-transform">→</span>
            </div>
          </div>
        </div>

        {/* Verification Fatigue Tile */}
        <div 
          className="group relative glass p-10 rounded-[40px] border-white/5 opacity-60 grayscale hover:grayscale-0 transition-all cursor-not-allowed overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          </div>
          <div className="relative z-10">
            <div className="w-16 h-16 bg-slate-500/10 rounded-2xl flex items-center justify-center mb-6 border border-slate-500/20">
              <span className="text-3xl">👁️</span>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-white">Verification Fatigue</h2>
            <p className="text-slate-400 text-lg leading-relaxed mb-8">
              Master high-speed auditing. Train your ability to spot hallucinations and logic errors without succumbing to cognitive exhaustion.
            </p>
            <div className="inline-block px-4 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-bold uppercase tracking-widest">
              Coming Soon
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-20 glass p-10 rounded-[40px] border-white/5 text-center">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">The Future Skill Matrix</h3>
        <div className="flex flex-wrap justify-center gap-4">
          {['Context Switching', 'Hallucination Spotting', 'System Prompting', 'Agent Synthesis', 'Strategic De-coupling'].map(skill => (
            <span key={skill} className="px-4 py-2 bg-white/5 rounded-full text-xs font-medium text-slate-400 border border-white/5">
              {skill}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDrillSelector = () => (
    <div className="max-w-4xl mx-auto py-12 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-12">
        <button onClick={() => setView(AppView.HUB)} className="text-slate-500 hover:text-white transition-colors flex items-center gap-2 font-bold uppercase text-xs tracking-widest">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Skill Hub
        </button>
      </div>
      <h1 className="text-5xl font-black mb-6 tracking-tighter text-white">
        The <span className="gradient-text">Orchestration</span> Gym
      </h1>
      <p className="text-xl text-slate-400 mb-12 max-w-2xl leading-relaxed">
        Parallelism is a high-stakes cognitive skill. In this gym, you'll manage multiple AI agents simultaneously. Read their logs, catch contradictions, and give directives.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
        {DRILLS.map(drill => (
          <div key={drill.id} className="glass p-8 rounded-[32px] border-white/5 hover:border-indigo-500/50 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                drill.difficulty === 'Extreme' ? 'border-red-500/50 text-red-400 bg-red-500/10' : 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10'
              }`}>
                {drill.difficulty.toUpperCase()}
              </span>
              <span className="text-slate-500 text-xs font-mono">{drill.agents.length} AGENTS ACTIVE</span>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">{drill.title}</h3>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">{drill.description}</p>
            <button 
              onClick={() => startDrill(drill)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/20 text-white"
            >
              Start Session
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTrainer = () => (
    <div className="h-[80vh] flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between glass p-4 rounded-2xl border-indigo-500/20">
        <div className="flex items-center gap-4">
          <div className="bg-red-500 w-3 h-3 rounded-full animate-pulse"></div>
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Live Parallelism Drill</h2>
            <h1 className="font-bold text-white">{activeDrill?.title}</h1>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-center px-4 border-r border-white/5">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Directives</div>
            <div className="font-mono text-emerald-400">{stats.interventions}</div>
          </div>
          <button 
            onClick={() => { setView(AppView.LANDING); setIsDrillRunning(false); }}
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-1 rounded-lg text-xs font-bold transition-all border border-white/5"
          >
            Abort Session
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
        {agents.map(agent => (
          <div 
            key={agent.id}
            className={`flex flex-col glass rounded-2xl border-t-4 overflow-hidden transition-all ${
              agent.status === 'awaiting_input' ? 'ring-2 ring-amber-500 animate-pulse bg-amber-500/5' : ''
            }`}
            style={{ borderTopColor: agent.color }}
          >
            <div className="p-3 bg-white/5 flex justify-between items-center border-b border-white/5">
              <span className="font-bold text-xs uppercase tracking-wider" style={{ color: agent.color }}>
                {agent.role}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {agent.status === 'working' ? 'EXECUTING...' : 'AWAITING RESPONSE'}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[11px] scrollbar-hide">
              {agent.logs.map((log, i) => (
                <div key={i} className={log.startsWith('Human') ? 'text-indigo-300' : 'text-slate-400'}>
                  <span className="opacity-30 mr-2">[{i}]</span> {log}
                </div>
              ))}
              <div ref={el => logContainerRef.current[agent.id] = el}></div>
            </div>
          </div>
        ))}
      </div>

      {intervention && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="glass w-full max-w-2xl rounded-[32px] p-10 border-amber-500/30 shadow-2xl shadow-amber-500/10">
            <div className="mb-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">
                Action Required: {agents.find(a => a.id === intervention.agentId)?.role}
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-6 leading-tight text-white">
              {intervention.prompt}
            </h2>
            <p className="text-xs text-slate-500 mb-8 italic">
              Careful: Your directive must maintain alignment across all active streams. Check other terminal logs.
            </p>
            <div className="flex gap-3">
              <input 
                autoFocus
                type="text" 
                placeholder="Give your directive..." 
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all text-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInterventionResponse((e.target as HTMLInputElement).value);
                }}
              />
              <button 
                onClick={(e) => {
                   const input = (e.currentTarget.previousSibling as HTMLInputElement).value;
                   handleInterventionResponse(input);
                }}
                className="bg-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-500 transition-all text-white"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (view) {
      case AppView.HUB: return renderHub();
      case AppView.LANDING: return renderDrillSelector();
      case AppView.TRAINER: return renderTrainer();
      default: return renderHub();
    }
  };

  return (
    <Layout activeView={view} setView={setView}>
      {renderContent()}
    </Layout>
  );
};

export default App;
