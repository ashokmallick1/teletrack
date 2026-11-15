import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  Sparkles,
  Smile,
  Meh,
  Frown,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  FileText,
  ListChecks,
  RefreshCw,
  X,
  Share2,
  Check,
  ChevronRight,
  ShieldCheck,
  PhoneCall,
  Zap,
  Flame,
  Building,
  DollarSign,
  Users,
  Calendar,
  MessageSquare,
  Activity
} from 'lucide-react';
import { CallEvent, CallAiAnalysis, TranscriptItem } from '@teletrack/shared-types';
import { Modal } from './Modal';
import { useAuth } from '../context/AuthContext';

interface AiCallModalProps {
  call: CallEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onAnalysisUpdated?: (updatedCall: CallEvent) => void;
}

export const AiCallModal: React.FC<AiCallModalProps> = ({
  call,
  isOpen,
  onClose,
  onAnalysisUpdated
}) => {
  const { client, activeOrg } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState<'TRANSCRIPT' | 'OVERVIEW' | 'SCORECARD'>('OVERVIEW');
  const [reanalyzing, setReanalyzing] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audioUrl = call ? client.getCallAudioUrl(call.id) : '';

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [call?.id, isOpen]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => console.log('Audio play error:', err));
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    setCurrentTime(target);
    if (audioRef.current) {
      audioRef.current.currentTime = target;
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const [evoStatus, setEvoStatus] = useState<string | null>(null);

  const sendWhatsAppViaEvolution = async (phone: string, name: string) => {
    try {
      setEvoStatus('Dispatching via Evolution API...');
      const res = await client.sendEvolutionMessage({
        phoneNumber: phone,
        messageText: '',
        templateId: 'tmpl-quotation',
        variables: {
          name,
          callerName: call?.employeeName || 'TeleTrack Agent'
        }
      });
      setEvoStatus(`✓ Delivered via Evolution API! (ID: ${res.data.messageId.slice(0, 14)}...)`);
      setTimeout(() => setEvoStatus(null), 3000);
    } catch (e: any) {
      setEvoStatus(`Failed: ${e.message}`);
    }
  };

  const openWhatsAppFollowup = async (phone: string, name: string) => {
    try {
      const res = await client.generateWhatsAppLink({
        phoneNumber: phone,
        templateId: 'tmpl-quotation',
        variables: {
          name,
          callerName: call?.employeeName || 'TeleTrack Agent'
        }
      });
      if (res.whatsappUrl) {
        window.open(res.whatsappUrl, '_blank');
      }
    } catch (e) {
      console.error('Failed to generate WhatsApp link:', e);
      window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}`, '_blank');
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatAudioTime = (sec: number) => {
    if (isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleReanalyze = async () => {
    if (!call) return;
    setReanalyzing(true);
    try {
      const res = await client.reanalyzeCall(call.id);
      if (res.aiAnalysis && onAnalysisUpdated) {
        onAnalysisUpdated({
          ...call,
          aiAnalysis: res.aiAnalysis
        });
      }
    } catch (err) {
      console.error('Re-analysis error:', err);
    } finally {
      setReanalyzing(false);
    }
  };

  const copyFullTranscript = () => {
    if (!call?.aiAnalysis?.transcript) return;
    const text = call.aiAnalysis.transcript
      .map(t => `[${t.timestamp}] ${t.speaker}: ${t.text}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  if (!call || !isOpen) return null;

  const analysis = call.aiAnalysis;

  const getSentimentBadge = (sent?: string) => {
    switch (sent) {
      case 'POSITIVE':
      case 'INTERESTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Smile className="h-3.5 w-3.5 text-emerald-600" />
            <span>Positive ({analysis?.sentimentScore ?? 90}%)</span>
          </span>
        );
      case 'NEGATIVE':
      case 'FRUSTRATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <Frown className="h-3.5 w-3.5 text-rose-600" />
            <span>Negative ({analysis?.sentimentScore ?? 45}%)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Meh className="h-3.5 w-3.5 text-slate-500" />
            <span>Neutral ({analysis?.sentimentScore ?? 70}%)</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-indigo-50/40 to-blue-50/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">AI Call Speech Analytics</h3>
                {getSentimentBadge(analysis?.sentiment)}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {call.employeeName || 'Telecaller'} ↔ {call.leadName || call.displayPhoneNumber} • {new Date(call.startedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReanalyze}
              disabled={reanalyzing}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-sm transition disabled:opacity-50"
              title="Re-run AI Speech Analysis"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-indigo-600 ${reanalyzing ? 'animate-spin' : ''}`} />
              <span>{reanalyzing ? 'Analyzing...' : 'Re-Analyze'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Audio Player Bar */}
        <div className="p-4 bg-slate-900 text-white shrink-0 shadow-inner">
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
          />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Play controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition shadow-lg shadow-blue-500/30 shrink-0"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </button>

              <div className="text-xs font-mono text-slate-300">
                <span>{formatAudioTime(currentTime)}</span>
                <span className="text-slate-500 mx-1">/</span>
                <span className="text-slate-400">{formatAudioTime(duration || call.durationSeconds)}</span>
              </div>
            </div>

            {/* Scrubber Timeline */}
            <div className="flex-1 mx-2 sm:mx-4">
              <input
                type="range"
                min={0}
                max={duration || call.durationSeconds || 100}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Playback rate & volume controls */}
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                {[1, 1.25, 1.5, 2].map(r => (
                  <button
                    key={r}
                    onClick={() => handleRateChange(r)}
                    className={`px-2 py-1 rounded text-[11px] font-bold transition ${
                      playbackRate === r ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {r}x
                  </button>
                ))}
              </div>

              <button
                onClick={toggleMute}
                className="p-2 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>

              <a
                href={audioUrl}
                download={`call_${call.id}.wav`}
                className="p-2 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800"
                title="Download Call Recording Audio"
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50 text-xs font-bold uppercase tracking-wider shrink-0">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'OVERVIEW'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Overview & Insights</span>
          </button>
          <button
            onClick={() => setActiveTab('TRANSCRIPT')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'TRANSCRIPT'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Full Transcript ({analysis?.transcript?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('SCORECARD')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'SCORECARD'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Quality Scorecard ({analysis?.qualityScore?.overall || 0}%)</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              {/* Executive Summary Card */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/60 rounded-2xl border border-blue-200/70 space-y-2">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="h-4 w-4" />
                  <span>Executive AI Summary</span>
                </div>
                <p className="text-sm text-slate-800 font-medium leading-relaxed">
                  {analysis?.summary || 'AI analysis is currently processing this call recording...'}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-blue-200/40 text-xs text-slate-600">
                  <span><strong>Disposition:</strong> <span className="font-semibold text-indigo-700">{analysis?.disposition || 'Completed'}</span></span>
                  <span>•</span>
                  <span><strong>Intent:</strong> <span className="font-semibold text-slate-700">{analysis?.intent || 'General Inquiry'}</span></span>
                  <span>•</span>
                  <span><strong>Language:</strong> {analysis?.languageDetected || 'English/Hindi'}</span>
                </div>
              </div>

              {/* Talk-to-Listen Ratio & Speech Diagnostics */}
              {analysis?.speechDiagnostics && (
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
                      <Activity className="h-4 w-4 text-indigo-600" />
                      <span>Speech Diagnostics & Talk-to-Listen Ratio</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      Optimal Balance: 40-55% Telecaller
                    </span>
                  </div>

                  {/* Visual Split Bar */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-indigo-600">
                        Telecaller: {analysis.speechDiagnostics.telecallerTalkPercent}%
                      </span>
                      <span className="text-emerald-600">
                        Customer: {analysis.speechDiagnostics.customerTalkPercent}%
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden p-0.5 border border-slate-200">
                      <div
                        className="bg-indigo-600 rounded-l-full transition-all duration-500"
                        style={{ width: `${analysis.speechDiagnostics.telecallerTalkPercent}%` }}
                      />
                      <div
                        className="bg-emerald-500 rounded-r-full transition-all duration-500"
                        style={{ width: `${analysis.speechDiagnostics.customerTalkPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Diagnostic Badges */}
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div className="p-2.5 bg-slate-50 rounded-xl text-center border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Speaking Pace</span>
                      <span className="text-sm font-bold text-slate-800">{analysis.speechDiagnostics.wordsPerMinute} WPM</span>
                      <span className="text-[10px] text-slate-500 block">
                        {analysis.speechDiagnostics.wordsPerMinute > 160 ? 'Rapid pace' : analysis.speechDiagnostics.wordsPerMinute < 110 ? 'Slow pace' : 'Balanced pace'}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl text-center border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Interruptions</span>
                      <span className="text-sm font-bold text-slate-800">{analysis.speechDiagnostics.interruptionsCount}</span>
                      <span className="text-[10px] text-slate-500 block">
                        {analysis.speechDiagnostics.interruptionsCount <= 1 ? 'Smooth flow' : 'High collisions'}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl text-center border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Longest Monologue</span>
                      <span className="text-sm font-bold text-slate-800">{analysis.speechDiagnostics.longestMonologueSeconds}s</span>
                      <span className="text-[10px] text-slate-500 block">
                        {analysis.speechDiagnostics.longestMonologueSeconds > 30 ? 'One-sided pitch' : 'Good back-and-forth'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Extracted CRM Lead Data Card */}
              {analysis?.extractedLeadData && (
                <div className="p-4 bg-gradient-to-br from-indigo-50/40 via-purple-50/20 to-white rounded-2xl border border-indigo-200/80 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-purple-700 font-bold text-xs uppercase tracking-wider">
                      <Zap className="h-4 w-4 text-purple-600" />
                      <span>AI Extracted CRM Opportunity</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {analysis.extractedLeadData.qualification === 'HOT' && (
                        <span className="px-2.5 py-1 bg-rose-100 text-rose-700 font-bold text-xs rounded-full flex items-center gap-1">
                          <Flame className="h-3 w-3" /> HOT LEAD
                        </span>
                      )}
                      {analysis.extractedLeadData.qualification === 'WARM' && (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-700 font-bold text-xs rounded-full flex items-center gap-1">
                          <Zap className="h-3 w-3" /> WARM LEAD
                        </span>
                      )}
                      {analysis.extractedLeadData.qualification === 'COLD' && (
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-700 font-bold text-xs rounded-full">
                          COLD LEAD
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {analysis.extractedLeadData.decisionMaker && (
                      <div className="p-2.5 bg-white/90 rounded-xl border border-indigo-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Decision Maker</span>
                        <span className="font-semibold text-slate-800">{analysis.extractedLeadData.decisionMaker}</span>
                      </div>
                    )}
                    {analysis.extractedLeadData.estimatedBudget && (
                      <div className="p-2.5 bg-white/90 rounded-xl border border-indigo-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Est. Budget</span>
                        <span className="font-semibold text-emerald-700">{analysis.extractedLeadData.estimatedBudget}</span>
                      </div>
                    )}
                    {analysis.extractedLeadData.userCount && (
                      <div className="p-2.5 bg-white/90 rounded-xl border border-indigo-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Team Size</span>
                        <span className="font-semibold text-slate-800">{analysis.extractedLeadData.userCount} Seats</span>
                      </div>
                    )}
                    {analysis.extractedLeadData.timeline && (
                      <div className="p-2.5 bg-white/90 rounded-xl border border-indigo-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Timeline</span>
                        <span className="font-semibold text-purple-700">{analysis.extractedLeadData.timeline}</span>
                      </div>
                    )}
                  </div>

                  {analysis.extractedLeadData.keyNeeds && analysis.extractedLeadData.keyNeeds.length > 0 && (
                    <div className="pt-2 border-t border-indigo-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Identified Customer Needs</span>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.extractedLeadData.keyNeeds.map((need, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-white rounded-lg border border-indigo-100 text-[11px] font-medium text-slate-700">
                            • {need}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {evoStatus && (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 text-center animate-in fade-in">
                      {evoStatus}
                    </div>
                  )}

                  <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
                    <button
                      onClick={() => openWhatsAppFollowup(call.displayPhoneNumber || call.rawPhoneNumber, call.leadName || 'Customer')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                    >
                      <span>Open WhatsApp Web</span>
                    </button>
                    <button
                      onClick={() => sendWhatsAppViaEvolution(call.displayPhoneNumber || call.rawPhoneNumber, call.leadName || 'Customer')}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                      <span>⚡ Send via Evolution API</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Two columns: Objections & Action Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Detected Objections */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-wider">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span>Customer Objections Detected</span>
                  </div>
                  {analysis?.keyObjections && analysis.keyObjections.length > 0 ? (
                    <ul className="space-y-2">
                      {analysis.keyObjections.map((obj, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No customer objections detected on this call.</p>
                  )}
                </div>

                {/* Action Items */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                    <ListChecks className="h-4 w-4 text-emerald-600" />
                    <span>Follow-Up Action Items</span>
                  </div>
                  {analysis?.actionItems && analysis.actionItems.length > 0 ? (
                    <ul className="space-y-2">
                      {analysis.actionItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No specific action items identified.</p>
                  )}
                </div>
              </div>

              {/* Call Details Quick Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">Duration</span>
                  <span className="font-bold text-slate-800 text-sm">{call.durationSeconds}s ({Math.floor(call.durationSeconds / 60)}m {call.durationSeconds % 60}s)</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">Outcome</span>
                  <span className="font-bold text-slate-800 text-sm">{call.outcome}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">SIM Carrier</span>
                  <span className="font-bold text-slate-800 text-sm">{call.simCarrier || 'Jio 5G'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">Compliance</span>
                  <span className={`font-bold text-sm ${analysis?.compliancePassed ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {analysis?.compliancePassed ? '✓ Passed' : 'Under Review'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FULL TRANSCRIPT */}
          {activeTab === 'TRANSCRIPT' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Diarized multi-speaker dialogue • Synchronized with audio recording
                </p>
                <button
                  onClick={copyFullTranscript}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                >
                  {copiedTranscript ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5" />}
                  <span>{copiedTranscript ? 'Copied Transcript!' : 'Copy Transcript'}</span>
                </button>
              </div>

              {analysis?.transcript && analysis.transcript.length > 0 ? (
                <div className="space-y-3">
                  {analysis.transcript.map((item, i) => {
                    const isCaller = item.speaker === 'TELECALLER';
                    return (
                      <div
                        key={i}
                        className={`flex gap-3 p-3.5 rounded-2xl border transition ${
                          isCaller
                            ? 'bg-blue-50/70 border-blue-200/80 mr-8'
                            : 'bg-emerald-50/70 border-emerald-200/80 ml-8'
                        }`}
                      >
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isCaller
                              ? 'bg-blue-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {isCaller ? 'T' : 'C'}
                        </div>

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900">
                              {isCaller ? (call.employeeName || 'Telecaller') : (call.leadName || 'Customer')}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400 bg-white/80 px-1.5 py-0.5 rounded border border-slate-200/50">
                              {item.timestamp}
                            </span>
                          </div>
                          <p className="text-sm text-slate-800 leading-relaxed font-normal">
                            {item.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No transcript available for this call.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: QUALITY & COMPLIANCE SCORECARD */}
          {activeTab === 'SCORECARD' && (
            <div className="space-y-6">
              {/* Overall Score Banner */}
              <div className="p-5 bg-gradient-to-br from-indigo-900 to-blue-900 text-white rounded-2xl flex items-center justify-between shadow-lg">
                <div>
                  <span className="text-xs uppercase font-bold text-indigo-300">Overall Conversation Score</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-4xl font-extrabold">{analysis?.qualityScore?.overall ?? 90}%</span>
                    <span className="text-sm text-indigo-200 font-medium">Performance Rating</span>
                  </div>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <ShieldCheck className="h-8 w-8 text-emerald-400" />
                </div>
              </div>

              {/* 5-Metric Breakdown */}
              <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200">
                <h4 className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                  Detailed Telecaller Competency Evaluation
                </h4>

                {[
                  { label: 'Greeting & Opening Introduction', value: analysis?.qualityScore?.greeting ?? 92, desc: 'Professional opening, clear company identity, polite demeanor' },
                  { label: 'Product Knowledge & Pitch Clarity', value: analysis?.qualityScore?.productKnowledge ?? 90, desc: 'Accurate articulation of TeleTrack features and value' },
                  { label: 'Objection Handling', value: analysis?.qualityScore?.objectionHandling ?? 85, desc: 'Addressed budget, competition, and timeline concerns without friction' },
                  { label: 'Closing & Follow-up Commitment', value: analysis?.qualityScore?.closingEffectiveness ?? 88, desc: 'Secured concrete next step (demo, quotation, or callback)' },
                  { label: 'Professionalism & Tone', value: analysis?.qualityScore?.professionalism ?? 95, desc: 'Courtesy, active listening, and compliance adherence' }
                ].map((metric, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{metric.label}</span>
                      <span className="font-bold text-indigo-700">{metric.value}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          metric.value >= 90 ? 'bg-emerald-500' : metric.value >= 75 ? 'bg-indigo-600' : 'bg-amber-500'
                        }`}
                        style={{ width: `${metric.value}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">{metric.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
