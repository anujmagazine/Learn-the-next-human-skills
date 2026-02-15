
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface VisualizerProps {
  taskCount: number;
}

const Visualizer: React.FC<VisualizerProps> = ({ taskCount }) => {
  const serialTime = taskCount * 120; // Assume 2 hours per task in a serial world
  const parallelTime = 120 + 20; // Same 2 hours but concurrent + coordination

  const data = [
    { name: 'Doing it yourself', time: serialTime, color: '#475569', label: 'Sequential (Linear)' },
    { name: 'AI Orchestration', time: parallelTime, color: '#818cf8', label: 'Parallel (Exponential)' },
  ];

  const hoursSaved = ((serialTime - parallelTime) / 60).toFixed(1);

  return (
    <div className="glass p-6 rounded-3xl border-indigo-500/20">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold">The Efficiency Gap</h3>
          <p className="text-xs text-slate-400">Time comparison in minutes</p>
        </div>
        <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-500/20">
          SAVED: {hoursSaved} HOURS
        </div>
      </div>
      
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: -20, right: 20 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" hide />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
            />
            <Bar dataKey="time" radius={[0, 10, 10, 0]} barSize={40}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-4 text-center">
        <div className="p-3 bg-white/5 rounded-xl">
          <div className="text-xs text-slate-500 mb-1">Serial Output</div>
          <div className="font-mono text-sm">1.0x Velocity</div>
        </div>
        <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
          <div className="text-xs text-indigo-400 mb-1">ParaFlow Output</div>
          <div className="font-mono text-sm text-indigo-200">~{taskCount}x Velocity</div>
        </div>
      </div>
    </div>
  );
};

export default Visualizer;
