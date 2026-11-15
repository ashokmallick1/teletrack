import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Flame,
  Zap,
  PhoneCall,
  Clock,
  TrendingUp,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Sparkles,
  Award,
  Crown,
  Activity,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { EmployeePerformance } from '@teletrack/shared-types';

export const TvLeaderboard: React.FC = () => {
  const { client, activeOrg } = useAuth();

  const [performers, setPerformers] = useState<EmployeePerformance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [tickerCalls, setTickerCalls] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 12000); // 12-second live refresh
    return () => clearInterval(interval);
  }, [activeOrg?.id]);

  const loadData = async () => {
    try {
      const perfList = await client.getEmployeePerformance();
      if (perfList && Array.isArray(perfList)) {
        // Sort by total calls descending
        const sorted = [...perfList].sort((a, b) => b.totalCalls - a.totalCalls);
        setPerformers(sorted);
      }

      // Fetch recent calls for live ticker tape
      const recent = await client.getCallEvents({ pageSize: 12 });
      if (recent?.data) {
        setTickerCalls(recent.data);
      }
      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Failed to load TV leaderboard data:', err);
      setLoading(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const firstPlace = performers[0];
  const secondPlace = performers[1];
  const thirdPlace = performers[2];
  const remaining = performers.slice(3);

  const formatMinutes = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-white p-6 lg:p-10 flex flex-col justify-between selection:bg-indigo-500 selection:text-white font-sans overflow-x-hidden">
      {/* Background glowing gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-0 w-[30rem] h-[30rem] bg-purple-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 space-y-8 flex-1">
        {/* Top Header Strip */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-purple-500 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="h-full w-full bg-[#0b101d] rounded-[14px] flex items-center justify-center">
                <Trophy className="h-7 w-7 text-amber-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                  LIVE SALES FLOOR ARENA
                </span>
                <span className="text-slate-400 text-xs font-semibold">
                  {activeOrg?.name || 'TeleTrack Enterprise'}
                </span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                <span>Top Telecaller Leaderboard</span>
                <Sparkles className="h-6 w-6 text-amber-400" />
              </h1>
            </div>
          </div>

          {/* Clock, Refresh, & Controls */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-slate-900/80 border border-slate-800 rounded-2xl text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Last Synced</span>
              <span className="text-xs font-mono font-bold text-indigo-400">
                {lastUpdated.toLocaleTimeString()}
              </span>
            </div>

            <button
              onClick={() => setSoundEnabled(prev => !prev)}
              className="p-3 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-2xl text-slate-300 hover:text-white transition"
              title={soundEnabled ? 'Mute Celebration Sound' : 'Enable Celebration Sound'}
            >
              {soundEnabled ? <Volume2 className="h-5 w-5 text-emerald-400" /> : <VolumeX className="h-5 w-5 text-slate-500" />}
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-3 bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/30 rounded-2xl text-white transition shadow-lg shadow-indigo-600/30"
              title="Toggle Fullscreen TV Mode"
            >
              {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {/* Podium: Top 3 Telecallers */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4 max-w-5xl mx-auto">
          {/* 2nd Place: Silver (Left) */}
          {secondPlace && (
            <div className="order-2 md:order-1 bg-gradient-to-t from-slate-900/90 to-slate-800/40 rounded-3xl border border-slate-700/60 p-6 text-center space-y-4 shadow-xl backdrop-blur-md transform transition hover:-translate-y-1">
              <div className="relative inline-block">
                <div className="h-20 w-20 mx-auto rounded-full bg-slate-700/80 border-4 border-slate-400 flex items-center justify-center font-black text-2xl text-slate-200 shadow-lg">
                  {secondPlace.employeeName.charAt(0)}
                </div>
                <div className="absolute -bottom-2 right-2 h-8 w-8 rounded-full bg-slate-300 text-slate-900 border-2 border-slate-900 flex items-center justify-center font-black text-xs shadow">
                  2
                </div>
              </div>

              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-400/20 text-slate-300 border border-slate-400/30 text-[10px] font-black uppercase tracking-wider">
                  🥈 Silver Rank
                </span>
                <h3 className="text-xl font-black text-white mt-1.5">{secondPlace.employeeName}</h3>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Calls</span>
                  <span className="text-lg font-black text-white">{secondPlace.totalCalls}</span>
                </div>
                <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Talk Time</span>
                  <span className="text-lg font-black text-indigo-400">{formatMinutes(secondPlace.totalDurationSeconds)}</span>
                </div>
              </div>
            </div>
          )}

          {/* 1st Place: Gold (Center - Elevated) */}
          {firstPlace && (
            <div className="order-1 md:order-2 bg-gradient-to-t from-amber-950/40 via-slate-900/90 to-amber-900/20 rounded-3xl border-2 border-amber-500/60 p-8 text-center space-y-5 shadow-2xl shadow-amber-500/15 backdrop-blur-md transform md:-translate-y-4 transition hover:-translate-y-6">
              <div className="relative inline-block">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                  <Crown className="h-8 w-8 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)] animate-bounce" />
                </div>
                <div className="h-28 w-28 mx-auto rounded-full bg-gradient-to-tr from-amber-500 via-amber-300 to-amber-600 p-1 shadow-2xl shadow-amber-500/30">
                  <div className="h-full w-full bg-[#0b101d] rounded-full flex items-center justify-center font-black text-4xl text-amber-300">
                    {firstPlace.employeeName.charAt(0)}
                  </div>
                </div>
                <div className="absolute -bottom-2 right-4 h-9 w-9 rounded-full bg-amber-400 text-slate-950 border-2 border-slate-900 flex items-center justify-center font-black text-sm shadow-xl">
                  1
                </div>
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 mx-auto w-fit">
                  <Flame className="h-3.5 w-3.5 text-amber-400" />
                  🥇 Champion Floor Leader
                </span>
                <h2 className="text-2xl font-black text-white mt-2">{firstPlace.employeeName}</h2>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-amber-500/20 text-xs">
                <div className="p-3 bg-slate-950/80 rounded-xl border border-amber-500/20">
                  <span className="text-[10px] uppercase font-bold text-amber-400 block">Total Calls</span>
                  <span className="text-2xl font-black text-white">{firstPlace.totalCalls}</span>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-xl border border-amber-500/20">
                  <span className="text-[10px] uppercase font-bold text-amber-400 block">Talk Time</span>
                  <span className="text-2xl font-black text-amber-300">{formatMinutes(firstPlace.totalDurationSeconds)}</span>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-xl border border-amber-500/20">
                  <span className="text-[10px] uppercase font-bold text-amber-400 block">Answered</span>
                  <span className="text-2xl font-black text-emerald-400">{firstPlace.answeredCalls}</span>
                </div>
              </div>
            </div>
          )}

          {/* 3rd Place: Bronze (Right) */}
          {thirdPlace && (
            <div className="order-3 bg-gradient-to-t from-slate-900/90 to-amber-950/10 rounded-3xl border border-amber-800/40 p-6 text-center space-y-4 shadow-xl backdrop-blur-md transform transition hover:-translate-y-1">
              <div className="relative inline-block">
                <div className="h-20 w-20 mx-auto rounded-full bg-amber-900/60 border-4 border-amber-600/80 flex items-center justify-center font-black text-2xl text-amber-200 shadow-lg">
                  {thirdPlace.employeeName.charAt(0)}
                </div>
                <div className="absolute -bottom-2 right-2 h-8 w-8 rounded-full bg-amber-600 text-white border-2 border-slate-900 flex items-center justify-center font-black text-xs shadow">
                  3
                </div>
              </div>

              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-700/20 text-amber-400 border border-amber-700/30 text-[10px] font-black uppercase tracking-wider">
                  🥉 Bronze Rank
                </span>
                <h3 className="text-xl font-black text-white mt-1.5">{thirdPlace.employeeName}</h3>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Calls</span>
                  <span className="text-lg font-black text-white">{thirdPlace.totalCalls}</span>
                </div>
                <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Talk Time</span>
                  <span className="text-lg font-black text-indigo-400">{formatMinutes(thirdPlace.totalDurationSeconds)}</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Full Telecaller Rankings Table */}
        <section className="bg-slate-900/60 rounded-3xl border border-slate-800/80 p-6 backdrop-blur-md space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-400" />
              <span>Full Sales Floor Standings</span>
            </h3>
            <span className="text-xs text-slate-400 font-semibold">
              {performers.length} active telecallers tracked
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Telecaller</th>
                  <th className="py-3 px-4">Total Calls</th>
                  <th className="py-3 px-4">Answered Calls</th>
                  <th className="py-3 px-4">Total Talk Time</th>
                  <th className="py-3 px-4">Avg Duration</th>
                  <th className="py-3 px-4">Connection Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {performers.map((p, idx) => {
                  const rate = p.totalCalls > 0 ? Math.round((p.answeredCalls / p.totalCalls) * 100) : 0;
                  const isTop = idx === 0;
                  return (
                    <tr
                      key={p.employeeId}
                      className={`hover:bg-slate-800/30 transition ${
                        isTop ? 'bg-amber-500/5 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full font-black text-xs ${
                          idx === 0 ? 'bg-amber-400 text-slate-950 font-black' :
                          idx === 1 ? 'bg-slate-300 text-slate-950' :
                          idx === 2 ? 'bg-amber-700 text-white' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-indigo-600/60 flex items-center justify-center text-xs text-indigo-200 font-bold">
                          {p.employeeName.charAt(0)}
                        </div>
                        <span>{p.employeeName}</span>
                      </td>
                      <td className="py-3.5 px-4 font-black text-white text-sm">{p.totalCalls}</td>
                      <td className="py-3.5 px-4 text-emerald-400 font-bold">{p.answeredCalls}</td>
                      <td className="py-3.5 px-4 text-indigo-300 font-mono font-bold">
                        {formatMinutes(p.totalDurationSeconds)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">{p.avgDurationSeconds}s</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${rate >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {rate}%
                          </span>
                          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Live Bottom Ticker Tape */}
      <footer className="relative z-10 mt-6 pt-4 border-t border-slate-800/80 bg-slate-950/80 -mx-6 -mb-6 lg:-mx-10 lg:-mb-10 px-6 py-4 flex items-center gap-4 overflow-hidden">
        <div className="flex items-center gap-2 shrink-0 bg-indigo-600/30 border border-indigo-500/40 px-3 py-1.5 rounded-xl text-indigo-300 font-black text-xs uppercase tracking-wider">
          <PhoneCall className="h-4 w-4 animate-pulse text-indigo-400" />
          <span>Live Call Ticker</span>
        </div>

        <div className="flex items-center gap-8 text-xs text-slate-300 whitespace-nowrap overflow-x-auto no-scrollbar animate-marquee">
          {tickerCalls.length > 0 ? (
            tickerCalls.map((call, idx) => (
              <div key={idx} className="flex items-center gap-2 shrink-0">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="font-bold text-white">{call.employeeName || 'Agent'}</span>
                <span className="text-slate-400">called</span>
                <span className="font-mono text-indigo-300">{call.displayPhoneNumber || call.rawPhoneNumber}</span>
                <span className="text-slate-500">({call.durationSeconds}s • {call.outcome})</span>
                <span className="text-slate-600">|</span>
              </div>
            ))
          ) : (
            <span className="text-slate-500">Waiting for next inbound/outbound call event...</span>
          )}
        </div>
      </footer>
    </div>
  );
};
