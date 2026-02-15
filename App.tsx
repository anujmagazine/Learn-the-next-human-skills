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
    // Using shades from the brand palette for agent colors
    const initialAgents: AgentStream[] = drill.agents.map((role, i) => ({
      id: `agent-${i}`,
      role,
      color: ['#94c840', '#e5e6e6', '#80a836', '#c0c2c2'][i % 4],
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
    <div className="max-w-7xl mx-auto py-16 animate-in fade-in duration-700">
      <div className="text-center mb-16">
        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-brand-platinum uppercase leading-tight">
          Learn the Next <span className="gradient-text">Human Skills</span>
        </h1>
        <p className="text-xl text-brand-platinum/60 max-w-3xl mx-auto leading-relaxed">
          In a world where AI agents produce at infinite scale, the bottleneck is human judgment. 
          Build the cognitive infrastructure to thrive in the age of intelligence.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
        {/* Parallelism Tile */}
        <div 
          onClick={() => setView(AppView.LANDING)}
          className="group relative glass p-10 rounded-[40px] border-brand-platinum/5 hover:border-brand-green/50 transition-all cursor-pointer overflow-hidden shadow-2xl hover:shadow-brand-green/10 flex flex-col h-full"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity text-brand-green">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
          </div>
          <div className="relative z-10 flex-1">
            <div className="w-16 h-16 bg-brand-green/10 rounded-2xl flex items-center justify-center mb-6 border border-brand-green/20 group-hover:scale-110 transition-transform">
              <span className="text-3xl">⚡</span>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-brand-platinum group-hover:text-brand-green transition-colors">Parallelism</h2>
            <p className="text-brand-platinum/60 text-lg leading-relaxed mb-8">
              The "Orchestration Gym." Learn to maintain a unified vision while multiple agents bombard you with conflicting logs and critical decisions.
            </p>
          </div>
          <div className="relative z-10 mt-auto flex items-center gap-2 text-brand-green font-bold uppercase tracking-widest text-sm">
            Launch Skill Trainer <span className="group-hover:translate-x-2 transition-transform">→</span>
          </div>
        </div>

        {/* Verification Fatigue Tile */}
        <div 
          className="group relative glass p-10 rounded-[40px] border-brand-platinum/5 opacity-60 grayscale hover:grayscale-0 transition-all cursor-not-allowed overflow-hidden flex flex-col h-full"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 text-brand-platinum">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          </div>
          <div className="relative z-10 flex-1">
            <div className="w-16 h-16 bg-brand-platinum/10 rounded-2xl flex items-center justify-center mb-6 border border-brand-platinum/20">
              <span className="text-3xl">👁️</span>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-brand-platinum">Verification Fatigue</h2>
            <p className="text-brand-platinum/60 text-lg leading-relaxed mb-8">
              Master high-speed auditing. Train your ability to spot hallucinations and logic errors without succumbing to cognitive exhaustion.
            </p>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="inline-block px-4 py-1 rounded-full bg-brand-navy text-brand-platinum/40 text-xs font-bold uppercase tracking-widest">
              Coming Soon
            </div>
          </div>
        </div>

        {/* Interview AI Models Tile */}
        <div 
          className="group relative glass p-10 rounded-[40px] border-brand-platinum/5 opacity-60 grayscale hover:grayscale-0 transition-all cursor-not-allowed overflow-hidden flex flex-col h-full"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 text-brand-platinum">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M11.5 3C7.36 3 4 6.36 4 10.5S7.36 18 11.5 18c1.71 0 3.29-.58 4.55-1.56l4.74 4.74 1.41-1.41-4.74-4.74c.98-1.26 1.56-2.84 1.56-4.55C19 6.36 15.64 3 11.5 3zm0 2C14.54 5 17 7.46 17 10.5S14.54 16 11.5 16 6 13.54 6 10.5 8.46 5 11.5 5z"/></svg>
          </div>
          <div className="relative z-10 flex-1">
            <div className="w-16 h-16 bg-brand-platinum/10 rounded-2xl flex items-center justify-center mb-6 border border-brand-platinum/20">
              <span className="text-3xl">🤝</span>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-brand-platinum">Interview AI Models</h2>
            <p className="text-brand-platinum/60 text-lg leading-relaxed mb-8">
              Learn the art of "Agent Onboarding." Protocols to stress-test and validate an AI's logic and personality before delegating tasks.
            </p>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="inline-block px-4 py-1 rounded-full bg-brand-navy text-brand-platinum/40 text-xs font-bold uppercase tracking-widest">
              Coming Soon
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-20 glass p-10 rounded-[40px] border-brand-platinum/5 text-center">
        <h3 className="text-sm font-bold text-brand-platinum/30 uppercase tracking-widest mb-6">The Future Skill Matrix</h3>
        <div className="flex flex-wrap justify-center gap-4">
          {['Context Switching', 'Hallucination Spotting', 'System Prompting', 'Agent Synthesis', 'Strategic De-coupling', 'Agent Vetting'].map(skill => (
            <span key={skill} className="px-4 py-2 bg-brand-platinum/5 rounded-full text-xs font-medium text-brand-platinum/40 border border-brand-platinum/5">
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
        <button onClick={() => setView(AppView.HUB)} className="text-brand-platinum/50 hover:text-brand-green transition-colors flex items-center gap-2 font-bold uppercase text-xs tracking-widest">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Skill Hub
        </button>
      </div>
      <h1 className="text-5xl font-black mb-6 tracking-tighter text-brand-platinum">
        The <span className="gradient-text">Orchestration</span> Gym
      </h1>
      <p className="text-xl text-brand-platinum/60 mb-12 max-w-2xl leading-relaxed">
        Parallelism is a high-stakes cognitive skill. In this gym, you'll manage multiple AI agents simultaneously. Read their logs, catch contradictions, and give directives.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
        {DRILLS.map(drill => (
          <div key={drill.id} className="glass p-8 rounded-[32px] border-brand-platinum/5 hover:border-brand-green/50 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                drill.difficulty === 'Extreme' ? 'border-red-500/50 text-red-400 bg-red-500/10' : 'border-brand-green/50 text-brand-green bg-brand-green/10'
              }`}>
                {drill.difficulty.toUpperCase()}
              </span>
              <span className="text-brand-platinum/40 text-xs font-mono uppercase">Active Agents: {drill.agents.length}</span>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-brand-platinum">{drill.title}</h3>
            <p className="text-brand-platinum/50 text-sm mb-8 leading-relaxed">{drill.description}</p>
            <button 
              onClick={() => startDrill(drill)}
              className="w-full bg-brand-green hover:brightness-110 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-brand-green/10 text-brand-black"
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
      <div className="flex items-center justify-between glass p-4 rounded-2xl border-brand-green/20">
        <div className="flex items-center gap-4">
          <div className="bg-brand-green w-3 h-3 rounded-full animate-pulse"></div>
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-brand-platinum/40">Live Parallelism Drill</h2>
            <h1 className="font-bold text-brand-platinum">{activeDrill?.title}</h1>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-center px-4 border-r border-brand-platinum/5">
            <div className="text-[10px] font-bold text-brand-platinum/40 uppercase">Directives</div>
            <div className="font-mono text-brand-green">{stats.interventions}</div>
          </div>
          <button 
            onClick={() => { setView(AppView.LANDING); setIsDrillRunning(false); }}
            className="bg-brand-platinum/5 hover:bg-brand-platinum/10 text-brand-platinum px-4 py-1 rounded-lg text-xs font-bold transition-all border border-brand-platinum/5"
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
              agent.status === 'awaiting_input' ? 'ring-2 ring-brand-green animate-pulse bg-brand-green/5' : ''
            }`}
            style={{ borderTopColor: agent.color }}
          >
            <div className="p-3 bg-brand-platinum/5 flex justify-between items-center border-b border-brand-platinum/5">
              <span className="font-bold text-xs uppercase tracking-wider" style={{ color: agent.color }}>
                {agent.role}
              </span>
              <span className="text-[10px] text-brand-platinum/30 font-mono">
                {agent.status === 'working' ? 'EXECUTING...' : 'HALTED'}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[11px] scrollbar-hide">
              {agent.logs.map((log, i) => (
                <div key={i} className={log.startsWith('Human') ? 'text-brand-green' : 'text-brand-platinum/40'}>
                  <span className="opacity-30 mr-2">[{i}]</span> {log}
                </div>
              ))}
              <div ref={el => logContainerRef.current[agent.id] = el}></div>
            </div>
          </div>
        ))}
      </div>

      {intervention && (
        <div className="fixed inset-0 z-[100] bg-brand-black/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="glass w-full max-w-2xl rounded-[32px] p-10 border-brand-green/30 shadow-2xl shadow-brand-green/10">
            <div className="mb-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-green px-3 py-1 bg-brand-green/10 rounded-full border border-brand-green/20">
                Action Required: {agents.find(a => a.id === intervention.agentId)?.role}
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-6 leading-tight text-brand-platinum">
              {intervention.prompt}
            </h2>
            <p className="text-xs text-brand-platinum/40 mb-8 italic">
              Critical Synchronization: Your directive must align across all active streams.
            </p>
            <div className="flex gap-3">
              <input 
                autoFocus
                type="text" 
                placeholder="Directive for the agent..." 
                className="flex-1 bg-brand-black/50 border border-brand-platinum/10 rounded-xl px-4 py-3 outline-none focus:border-brand-green transition-all text-brand-platinum"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInterventionResponse((e.target as HTMLInputElement).value);
                }}
              />
              <button 
                onClick={(e) => {
                   const input = (e.currentTarget.previousSibling as HTMLInputElement).value;
                   handleInterventionResponse(input);
                }}
                className="bg-brand-green px-6 py-3 rounded-xl font-bold hover:brightness-110 transition-all text-brand-black"
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