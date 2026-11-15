import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneCall,
  PhoneForwarded,
  PhoneOff,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  SkipForward,
  User,
  Building,
  MessageSquare,
  Sparkles,
  Flame,
  Zap,
  ArrowRight,
  Plus,
  RefreshCw,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CallingCampaign, CampaignLead, WhatsAppTemplate } from '@teletrack/shared-types';

export const PowerDialer: React.FC = () => {
  const { client, activeOrg, user } = useAuth();

  const [campaigns, setCampaigns] = useState<CallingCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [currentLeadIndex, setCurrentLeadIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Dialer state
  const [callState, setCallState] = useState<'IDLE' | 'CALLING' | 'CONNECTED' | 'WRAP_UP'>('IDLE');
  const [callSeconds, setCallSeconds] = useState<number>(0);
  const [wrapUpSeconds, setWrapUpSeconds] = useState<number>(15);
  const [wrapUpPaused, setWrapUpPaused] = useState<boolean>(false);

  // Wrap up inputs
  const [selectedOutcome, setSelectedOutcome] = useState<'CONNECTED' | 'BUSY' | 'SKIPPED'>('CONNECTED');
  const [leadNotes, setLeadNotes] = useState<string>('');
  const [qualification, setQualification] = useState<'HOT' | 'WARM' | 'COLD'>('WARM');

  // WhatsApp template selector
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tmpl-quotation');

  // New campaign modal
  const [showNewCampaignModal, setShowNewCampaignModal] = useState<boolean>(false);
  const [newCampaignName, setNewCampaignName] = useState<string>('');
  const [newCampaignDesc, setNewCampaignDesc] = useState<string>('');
  const [newLeadsText, setNewLeadsText] = useState<string>('');

  // Timers
  const callTimerRef = useRef<any>(null);
  const wrapUpTimerRef = useRef<any>(null);

  useEffect(() => {
    loadCampaigns();
    loadTemplates();
  }, [activeOrg?.id]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const res = await client.getCampaigns();
      if (res.data && res.data.length > 0) {
        setCampaigns(res.data);
        if (!selectedCampaignId || !res.data.find(c => c.id === selectedCampaignId)) {
          setSelectedCampaignId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await client.getWhatsAppTemplates();
      if (res.data) {
        setTemplates(res.data);
      }
    } catch (err) {
      console.error('Failed to load whatsapp templates:', err);
    }
  };

  const currentCampaign = campaigns.find(c => c.id === selectedCampaignId) || campaigns[0];
  const leads = currentCampaign?.leads || [];
  const currentLead: CampaignLead | undefined = leads[currentLeadIndex] || leads[0];

  // Call timer
  useEffect(() => {
    if (callState === 'CALLING' || callState === 'CONNECTED') {
      callTimerRef.current = setInterval(() => {
        setCallSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [callState]);

  // Wrap up countdown timer (15 seconds)
  useEffect(() => {
    if (callState === 'WRAP_UP' && !wrapUpPaused) {
      wrapUpTimerRef.current = setInterval(() => {
        setWrapUpSeconds(prev => {
          if (prev <= 1) {
            clearInterval(wrapUpTimerRef.current);
            handleSaveAndNext();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (wrapUpTimerRef.current) clearInterval(wrapUpTimerRef.current);
    }
    return () => {
      if (wrapUpTimerRef.current) clearInterval(wrapUpTimerRef.current);
    };
  }, [callState, wrapUpPaused, currentLeadIndex, selectedOutcome, leadNotes]);

  const startDialing = async (lead?: CampaignLead) => {
    const target = lead || currentLead;
    if (!target || !currentCampaign) return;

    setCallSeconds(0);
    setCallState('CALLING');
    setSelectedOutcome('CONNECTED');
    setLeadNotes('');

    try {
      await client.dialCampaignLead(currentCampaign.id, target.id);
      // Trigger native browser / phone dialer
      window.location.href = `tel:${target.phoneNumber}`;
    } catch (e) {
      console.error('Failed to record dial attempt:', e);
    }

    // Auto transition to CONNECTED after 3 seconds for realistic simulation
    setTimeout(() => {
      setCallState(prev => (prev === 'CALLING' ? 'CONNECTED' : prev));
    }, 3000);
  };

  const endCallAndWrapUp = () => {
    setCallState('WRAP_UP');
    setWrapUpSeconds(15);
    setWrapUpPaused(false);
  };

  const handleSaveAndNext = async () => {
    if (!currentCampaign || !currentLead) return;

    try {
      await client.updateCampaignLead(currentCampaign.id, currentLead.id, {
        status: selectedOutcome,
        notes: leadNotes ? `[${qualification}] ${leadNotes}` : `[${qualification}] Outcome: ${selectedOutcome}`
      });

      // Update local state
      const updatedLeads = [...currentCampaign.leads];
      updatedLeads[currentLeadIndex] = {
        ...currentLead,
        status: selectedOutcome,
        notes: leadNotes
      };
      const updatedCampaign = {
        ...currentCampaign,
        leads: updatedLeads,
        dialedLeads: updatedLeads.filter(l => l.status !== 'PENDING').length,
        connectedLeads: updatedLeads.filter(l => l.status === 'CONNECTED').length
      };

      setCampaigns(prev => prev.map(c => (c.id === updatedCampaign.id ? updatedCampaign : c)));

      // Advance to next pending lead
      const nextPendingIndex = updatedLeads.findIndex((l, idx) => idx > currentLeadIndex && l.status === 'PENDING');
      if (nextPendingIndex !== -1) {
        setCurrentLeadIndex(nextPendingIndex);
      } else {
        const anyPending = updatedLeads.findIndex(l => l.status === 'PENDING');
        if (anyPending !== -1) {
          setCurrentLeadIndex(anyPending);
        } else {
          // Completed
          setCurrentLeadIndex(0);
        }
      }
    } catch (e) {
      console.error('Failed to update lead:', e);
    }

    setCallState('IDLE');
    setCallSeconds(0);
    setWrapUpSeconds(15);
    setLeadNotes('');
  };

  const [evoDispatchStatus, setEvoDispatchStatus] = useState<string | null>(null);

  const sendWhatsAppViaEvolution = async (templateId: string) => {
    if (!currentLead) return;
    try {
      setEvoDispatchStatus('Dispatching via Evolution API...');
      const res = await client.sendEvolutionMessage({
        phoneNumber: currentLead.phoneNumber,
        messageText: '',
        templateId,
        variables: {
          name: currentLead.name,
          callerName: user?.fullName || 'TeleTrack Agent',
          company: currentLead.company || 'TeleTrack'
        }
      });
      setEvoDispatchStatus(`Delivered via Evolution API! (ID: ${res.data.messageId.slice(0, 14)}...)`);
      setTimeout(() => {
        setEvoDispatchStatus(null);
        setShowWhatsAppModal(false);
      }, 1800);
    } catch (e: any) {
      setEvoDispatchStatus(`Failed: ${e.message}`);
    }
  };

  const sendWhatsApp = async (templateId: string) => {
    if (!currentLead) return;
    try {
      const res = await client.generateWhatsAppLink({
        phoneNumber: currentLead.phoneNumber,
        templateId,
        variables: {
          name: currentLead.name,
          callerName: user?.fullName || 'TeleTrack Agent',
          company: currentLead.company || 'TeleTrack'
        }
      });
      if (res.whatsappUrl) {
        window.open(res.whatsappUrl, '_blank');
      }
      setShowWhatsAppModal(false);
    } catch (e) {
      console.error('Failed to generate WhatsApp link:', e);
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaignName) return;

    const parsedLeads: Array<{ name: string; phoneNumber: string; company?: string }> = [];
    const lines = newLeadsText.split('\n');
    for (const line of lines) {
      const parts = line.split(',').map(s => s.trim());
      if (parts[0] && parts[1]) {
        parsedLeads.push({
          name: parts[0],
          phoneNumber: parts[1],
          company: parts[2] || 'Lead'
        });
      }
    }

    if (parsedLeads.length === 0) {
      parsedLeads.push(
        { name: 'Aditi Rao', phoneNumber: '+91-9812345678', company: 'Nova Tech' },
        { name: 'Sanjay Gupta', phoneNumber: '+91-9876543219', company: 'Zenith Logistics' }
      );
    }

    try {
      const res = await client.createCampaign({
        name: newCampaignName,
        description: newCampaignDesc,
        leads: parsedLeads
      });
      if (res.data) {
        setCampaigns(prev => [res.data, ...prev]);
        setSelectedCampaignId(res.data.id);
        setCurrentLeadIndex(0);
        setShowNewCampaignModal(false);
        setNewCampaignName('');
        setNewCampaignDesc('');
        setNewLeadsText('');
      }
    } catch (e) {
      console.error('Failed to create campaign:', e);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 rounded-3xl text-white shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Pillar 1: Power Dialer Live
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-bold text-xs">
              Web-to-Handset Click-to-Call
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Enterprise Outbound Power Dialer</h1>
          <p className="text-indigo-200 text-xs max-w-xl">
            Streamlined outbound calling queue with 1-click handset dialing, 15-second wrap-up automation, and instant WhatsApp follow-up templates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewCampaignModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold flex items-center gap-2 transition shadow-lg"
          >
            <Plus className="h-4 w-4" />
            <span>New Campaign</span>
          </button>
          <button
            onClick={loadCampaigns}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition"
            title="Refresh campaigns"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Campaign Selector & Metrics Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Campaign Selection */}
        <div className="lg:col-span-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase block tracking-wider">
            Active Campaign Queue
          </label>
          <select
            value={selectedCampaignId}
            onChange={e => {
              setSelectedCampaignId(e.target.value);
              setCurrentLeadIndex(0);
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.totalLeads} leads)
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 line-clamp-2">
            {currentCampaign?.description || 'Campaign outbound calling lead list'}
          </p>
        </div>

        {/* Total Leads */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-11 w-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
            {currentCampaign?.totalLeads || 0}
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Leads</span>
            <span className="text-lg font-black text-slate-900">{currentCampaign?.totalLeads || 0}</span>
          </div>
        </div>

        {/* Dialed Leads */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
            {currentCampaign?.dialedLeads || 0}
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dialed</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-slate-900">{currentCampaign?.dialedLeads || 0}</span>
              <span className="text-xs font-semibold text-slate-400">
                ({currentCampaign?.totalLeads ? Math.round((currentCampaign.dialedLeads / currentCampaign.totalLeads) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>

        {/* Connected Leads */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            {currentCampaign?.connectedLeads || 0}
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Connected</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-slate-900">{currentCampaign?.connectedLeads || 0}</span>
              <span className="text-xs font-semibold text-emerald-600">
                ({currentCampaign?.dialedLeads ? Math.round((currentCampaign.connectedLeads / currentCampaign.dialedLeads) * 100) : 0}% conv.)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dialer Interface: Left Card (Dialer Action) / Right (Queue & Details) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Dialing Card (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            {/* Lead Header */}
            <div className="p-6 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-white border-b border-slate-200/80 flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] uppercase tracking-wider">
                    Lead #{currentLeadIndex + 1} of {leads.length}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    currentLead?.status === 'CONNECTED' ? 'bg-emerald-100 text-emerald-700' :
                    currentLead?.status === 'DIALED' ? 'bg-blue-100 text-blue-700' :
                    currentLead?.status === 'BUSY' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {currentLead?.status || 'PENDING'}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900">{currentLead?.name || 'No Leads in Queue'}</h2>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Building className="h-3.5 w-3.5 text-slate-400" />
                    {currentLead?.company || 'Prospect Organization'}
                  </span>
                  <span>•</span>
                  <span>Attempts: <strong>{currentLead?.attempts || 0}</strong></span>
                </div>
              </div>

              {/* Large Phone Number Display */}
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Phone</span>
                <span className="text-lg font-mono font-black text-indigo-600">
                  {currentLead?.phoneNumber || '—'}
                </span>
              </div>
            </div>

            {/* Central Dialing Console */}
            <div className="p-6 space-y-6">
              {/* STATUS 1: IDLE */}
              {callState === 'IDLE' && (
                <div className="text-center py-8 space-y-4">
                  <div className="h-20 w-20 rounded-full bg-emerald-50 text-emerald-600 border-2 border-emerald-200 mx-auto flex items-center justify-center shadow-lg">
                    <PhoneCall className="h-10 w-10 animate-bounce" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-800">Ready to Dial {currentLead?.name}</h3>
                    <p className="text-xs text-slate-500">
                      Clicking below will initiate the call on your linked handset or softphone.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={() => startDialing()}
                      className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-xl hover:shadow-emerald-500/25 transition flex items-center gap-2 transform active:scale-95"
                    >
                      <PhoneCall className="h-5 w-5" />
                      <span>Dial {currentLead?.phoneNumber}</span>
                    </button>
                    <button
                      onClick={() => setShowWhatsAppModal(true)}
                      className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition flex items-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4 text-emerald-600" />
                      <span>1-Click WhatsApp</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STATUS 2: CALLING / CONNECTED */}
              {(callState === 'CALLING' || callState === 'CONNECTED') && (
                <div className="text-center py-6 space-y-5 bg-gradient-to-b from-indigo-50/50 to-white rounded-2xl p-6 border border-indigo-100">
                  <div className="flex items-center justify-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-xs font-black uppercase tracking-wider text-rose-600">
                      {callState === 'CALLING' ? 'Connecting Call...' : 'Call Live in Progress'}
                    </span>
                  </div>

                  <div className="text-4xl font-mono font-black text-slate-900 tracking-tight">
                    {formatTime(callSeconds)}
                  </div>

                  <p className="text-xs text-slate-500">
                    Audio recording and AI speech analysis running automatically on TeleTrack Android SIM capture.
                  </p>

                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      onClick={endCallAndWrapUp}
                      className="px-8 py-3.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-black text-sm rounded-2xl shadow-xl hover:shadow-rose-500/25 transition flex items-center gap-2 transform active:scale-95"
                    >
                      <PhoneOff className="h-5 w-5" />
                      <span>End Call & Start Wrap-Up</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STATUS 3: WRAP-UP COUNTDOWN (15 SECONDS) */}
              {callState === 'WRAP_UP' && (
                <div className="space-y-5 bg-slate-50/80 p-6 rounded-2xl border border-slate-200">
                  {/* Countdown Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2 text-indigo-700">
                        <Clock className="h-4 w-4 animate-spin" />
                        <span>Wrap-Up Countdown: Auto-advancing in {wrapUpSeconds}s</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setWrapUpPaused(prev => !prev)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] text-slate-600 font-bold"
                        >
                          {wrapUpPaused ? 'Resume Timer' : 'Pause Timer'}
                        </button>
                        <button
                          onClick={handleSaveAndNext}
                          className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold"
                        >
                          Save & Next Now
                        </button>
                      </div>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 transition-all duration-1000 rounded-full"
                        style={{ width: `${(wrapUpSeconds / 15) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Outcome Selector */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Call Outcome
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setSelectedOutcome('CONNECTED')}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition text-center ${
                          selectedOutcome === 'CONNECTED'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        ✓ Connected
                      </button>
                      <button
                        onClick={() => setSelectedOutcome('BUSY')}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition text-center ${
                          selectedOutcome === 'BUSY'
                            ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        📵 Busy / No Answer
                      </button>
                      <button
                        onClick={() => setSelectedOutcome('SKIPPED')}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition text-center ${
                          selectedOutcome === 'SKIPPED'
                            ? 'bg-slate-100 border-slate-400 text-slate-800'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        ⏭️ Not Interested / Skip
                      </button>
                    </div>
                  </div>

                  {/* Qualification Stage */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Lead Temperature
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setQualification('HOT')}
                        className={`p-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                          qualification === 'HOT'
                            ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/20'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <Flame className="h-3.5 w-3.5 text-rose-500" />
                        <span>HOT (Demo Approved)</span>
                      </button>
                      <button
                        onClick={() => setQualification('WARM')}
                        className={`p-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                          qualification === 'WARM'
                            ? 'bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-500/20'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        <span>WARM (Follow-up)</span>
                      </button>
                      <button
                        onClick={() => setQualification('COLD')}
                        className={`p-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                          qualification === 'COLD'
                            ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <span>COLD</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Wrap-up Notes */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Instant Telecaller Notes
                    </label>
                    <textarea
                      value={leadNotes}
                      onChange={e => setLeadNotes(e.target.value)}
                      placeholder="e.g. Needs pricing sheet for 15 users, pilot scheduled for Monday 10:00 AM..."
                      rows={2}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Actions: 1-Click WhatsApp & Complete */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setShowWhatsAppModal(true)}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>1-Click WhatsApp Follow-up</span>
                    </button>

                    <button
                      onClick={handleSaveAndNext}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-lg"
                    >
                      <span>Save & Next Lead</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Campaign Lead Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Queue Progression</h3>
                <p className="text-[11px] text-slate-500">
                  {leads.filter(l => l.status === 'PENDING').length} pending calls remaining
                </p>
              </div>
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl">
                {currentCampaign?.name}
              </span>
            </div>

            {/* Leads List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {leads.map((lead, idx) => {
                const isSelected = idx === currentLeadIndex;
                return (
                  <div
                    key={lead.id}
                    onClick={() => {
                      if (callState === 'IDLE') {
                        setCurrentLeadIndex(idx);
                      }
                    }}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">{lead.name}</span>
                        {lead.company && (
                          <span className="text-[10px] text-slate-500">• {lead.company}</span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">{lead.phoneNumber}</div>
                      {lead.notes && (
                        <div className="text-[10px] text-slate-600 italic line-clamp-1">{lead.notes}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        lead.status === 'CONNECTED' ? 'bg-emerald-100 text-emerald-700' :
                        lead.status === 'DIALED' ? 'bg-blue-100 text-blue-700' :
                        lead.status === 'BUSY' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {lead.status}
                      </span>
                      {callState === 'IDLE' && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setCurrentLeadIndex(idx);
                            startDialing(lead);
                          }}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                          title="Dial lead now"
                        >
                          <PhoneCall className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* WHATSAPP TEMPLATE MODAL */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <MessageSquare className="h-4 w-4" />
                <span>1-Click WhatsApp Follow-up</span>
              </div>
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-500">Recipient</span>
              <div className="font-bold text-slate-800 text-sm">
                {currentLead?.name} ({currentLead?.phoneNumber})
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Choose Instant Template
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {templates.map(tmpl => (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className={`p-3 rounded-2xl border text-xs cursor-pointer transition ${
                      selectedTemplateId === tmpl.id
                        ? 'bg-emerald-50/70 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="font-bold">{tmpl.title}</div>
                    <div className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                      {tmpl.templateText}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {evoDispatchStatus && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 text-center animate-in fade-in">
                {evoDispatchStatus}
              </div>
            )}

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => sendWhatsApp(selectedTemplateId)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                  title="Open WhatsApp Web in new tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open WhatsApp Web</span>
                </button>

                <button
                  onClick={() => sendWhatsAppViaEvolution(selectedTemplateId)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/20"
                  title="Dispatch instantly via server Evolution API"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>⚡ Send via Evolution API</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW CAMPAIGN MODAL */}
      {showNewCampaignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Create New Outbound Campaign</h3>
              <button
                onClick={() => setShowNewCampaignModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Campaign Name</label>
                <input
                  type="text"
                  value={newCampaignName}
                  onChange={e => setNewCampaignName(e.target.value)}
                  placeholder="e.g. Q4 Inbound Web Trials"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
                <input
                  type="text"
                  value={newCampaignDesc}
                  onChange={e => setNewCampaignDesc(e.target.value)}
                  placeholder="e.g. Follow-up for users downloading trial APK"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Leads (Format: Name, Phone, Company per line)
                </label>
                <textarea
                  value={newLeadsText}
                  onChange={e => setNewLeadsText(e.target.value)}
                  rows={4}
                  placeholder={`Rajesh Sharma, +91-98201-12345, Acme Corp\nPriya Patel, +91-98112-23344, Horizon Tech`}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setShowNewCampaignModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCampaign}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black"
              >
                Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
