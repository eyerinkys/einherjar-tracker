'use client';

import React, { useState } from 'react';
import type { BodyweightSummaryDTO } from '@/types';
import { logBodyweight, deleteBodyweightEntry, getBodyweightSummaryAction } from '@/actions/bodyweight';
import { RunePanel } from '@/components/ui/RunePanel';
import { EmptyState } from '@/components/ui/EmptyState';
import { Scale, Plus, Calendar, TrendingDown, ArrowDownRight, Trash2 } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface BodyweightViewProps {
  initialSummary?: BodyweightSummaryDTO;
}

export const BodyweightView: React.FC<BodyweightViewProps> = ({ initialSummary }) => {
  const [summary, setSummary] = useState<BodyweightSummaryDTO>(() => initialSummary ?? {
    currentWeight: null,
    startWeight: null,
    startDate: null,
    netChange: null,
    trend: null,
    logs: [],
  });

  const [newWeight, setNewWeight] = useState<string>('80.5');
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [pending, setPending] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const logs = summary.logs;
  const currentWeight = summary.currentWeight ?? (logs[logs.length - 1]?.weightKg || 0);
  const startWeight = summary.startWeight ?? (logs[0]?.weightKg || 0);
  const netChange = summary.netChange ?? Math.round((currentWeight - startWeight) * 10) / 10;

  const refreshSummary = async () => {
    const res = await getBodyweightSummaryAction();
    if (res.ok) {
      setSummary(res.data);
    }
  };

  const handleAddLog = async () => {
    const val = parseFloat(newWeight);
    if (isNaN(val) || val < 20 || val > 500) {
      setErrorMsg('Weight must be between 20 and 500 kg.');
      return;
    }
    setErrorMsg(null);
    setPending(true);

    const today = new Date().toISOString().split('T')[0];
    const res = await logBodyweight({
      date: today,
      weightKg: val,
    });

    setPending(false);

    if (!res.ok) {
      setErrorMsg(res.message);
      return;
    }

    setShowLogModal(false);
    await refreshSummary();
  };

  const handleDeleteEntry = async (id: string) => {
    setPending(true);
    setErrorMsg(null);
    const res = await deleteBodyweightEntry({ id });
    setPending(false);

    if (!res.ok) {
      setErrorMsg(res.message);
      return;
    }

    await refreshSummary();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Entry Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#393E46]">
        <div>
          <h2 className="font-mono text-base font-bold text-[#DFD0B8] uppercase tracking-wider">
            BODYWEIGHT TRAINING LOG
          </h2>
          <p className="font-mono text-xs text-[#948979]">
            Track bodyweight trend over time (no body measurements)
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setShowLogModal(true);
          }}
          disabled={pending}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#40534C] hover:bg-[#677D6A] text-[#DFD0B8] font-mono text-xs uppercase tracking-wider rounded-xs border border-[#677D6A] transition-all disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>Log Weight</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-[#3A1C1C] border border-[#8B0000] text-[#FF9999] font-mono text-xs rounded-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-xs uppercase font-bold underline">Dismiss</button>
        </div>
      )}

      {logs.length === 0 ? (
        <EmptyState
          title="No Bodyweight Entries Logged"
          description="Log your daily or weekly bodyweight to begin tracking weight trend over time."
          actionLabel="Log Weight Now"
          onAction={() => {
            setErrorMsg(null);
            setShowLogModal(true);
          }}
          icon={<Scale className="w-6 h-6 text-[#677D6A]" />}
        />
      ) : (
        <>
          {/* Stats Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <RunePanel variant="carved" className="p-4 space-y-1">
              <div className="text-[10px] font-mono text-[#948979] uppercase">CURRENT WEIGHT</div>
              <div className="font-mono text-2xl font-bold text-[#DFD0B8]">{currentWeight} <span className="text-xs text-[#948979]">kg</span></div>
              <div className="text-[11px] font-mono text-[#677D6A]">Latest record</div>
            </RunePanel>

            <RunePanel variant="carved" className="p-4 space-y-1">
              <div className="text-[10px] font-mono text-[#948979] uppercase">STARTING WEIGHT</div>
              <div className="font-mono text-2xl font-bold text-[#948979]">{startWeight} <span className="text-xs text-[#635B50]">kg</span></div>
              <div className="text-[11px] font-mono text-[#948979]">{summary.startDate || logs[0]?.date}</div>
            </RunePanel>

            <RunePanel variant="carved" className="p-4 space-y-1">
              <div className="text-[10px] font-mono text-[#948979] uppercase">NET CHANGE</div>
              <div className="font-mono text-2xl font-bold text-[#8DAA91]">
                {netChange > 0 ? `+${netChange}` : netChange} <span className="text-xs text-[#677D6A]">kg</span>
              </div>
              <div className="text-[11px] font-mono text-[#8DAA91] flex items-center gap-1">
                <ArrowDownRight className="w-3.5 h-3.5" /> Steady Progress
              </div>
            </RunePanel>
          </div>

          {/* Bodyweight Trend Chart */}
          <RunePanel variant="carved" className="p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#393E46] pb-3">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#DFD0B8]">
                <TrendingDown className="w-4 h-4 text-[#677D6A]" />
                <span className="uppercase">Bodyweight Trend</span>
              </div>
              <span className="text-xs font-mono text-[#948979]">Daily / Weekly Logs</span>
            </div>

            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={logs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#393E46" opacity={0.5} />
                  <XAxis dataKey="date" stroke="#948979" fontSize={11} fontFamily="monospace" />
                  <YAxis stroke="#948979" fontSize={11} fontFamily="monospace" domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1C2128',
                      borderColor: '#4D5460',
                      color: '#DFD0B8',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                    }}
                  />
                  <Line type="monotone" dataKey="weightKg" stroke="#8DAA91" strokeWidth={2.5} dot={{ fill: '#677D6A', r: 4 }} name="Weight (kg)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </RunePanel>

          {/* Chronological Table */}
          <RunePanel variant="carved" className="p-4 sm:p-5 space-y-3">
            <h3 className="font-mono text-sm font-bold text-[#DFD0B8] uppercase tracking-wider">
              CHRONOLOGICAL WEIGHT ENTRIES
            </h3>

            <div className="divide-y divide-[#2A303A] font-mono text-xs">
              {logs.slice().reverse().map((entry) => (
                <div key={entry.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#948979]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{entry.date}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#DFD0B8]">{entry.weightKg} kg</span>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      disabled={pending}
                      data-testid={`delete-bw-${entry.id}`}
                      className="text-[#948979] hover:text-[#FF9999] transition-colors p-1"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </RunePanel>
        </>
      )}

      {/* Quick Entry Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1C2128] border border-[#677D6A] p-5 rounded-xs max-w-xs w-full space-y-4 rune-panel">
            <h3 className="font-mono text-sm font-bold text-[#DFD0B8] uppercase">LOG TODAY&apos;S WEIGHT</h3>
            <div>
              <label htmlFor="bw-weight-input" className="block text-xs font-mono text-[#948979] mb-1">Bodyweight (kg)</label>
              <input
                id="bw-weight-input"
                type="number"
                step="0.1"
                min="20"
                max="500"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                className="w-full bg-[#222831] border border-[#393E46] p-2 text-center text-lg font-mono font-bold text-[#DFD0B8] rounded-xs focus:outline-none focus:border-[#677D6A]"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#393E46]">
              <button
                onClick={() => setShowLogModal(false)}
                disabled={pending}
                className="px-3 py-1.5 bg-[#222831] text-[#948979] font-mono text-xs rounded-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLog}
                disabled={pending}
                className="px-4 py-1.5 bg-[#40534C] text-[#DFD0B8] font-mono text-xs font-bold rounded-xs hover:bg-[#677D6A] disabled:opacity-50"
              >
                {pending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
