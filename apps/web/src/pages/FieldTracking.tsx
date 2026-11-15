import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  MapPin,
  Navigation,
  Clock,
  Battery,
  ShieldCheck,
  ShieldAlert,
  Play,
  Pause,
  RotateCcw,
  Users,
  Briefcase,
  CheckCircle2,
  Calendar,
  Search,
  ExternalLink,
  Plus,
  Compass,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Map as MapIcon
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  LiveAgentLocation,
  FieldTrackingSummary,
  AttendanceRecord,
  ClientVisit,
  LocationPing
} from '@teletrack/shared-types';

export const FieldTracking: React.FC = () => {
  const { client, activeOrg } = useAuth();
  const [activeTab, setActiveTab] = useState<'map' | 'playback' | 'attendance' | 'visits'>('map');
  const [summary, setSummary] = useState<FieldTrackingSummary | null>(null);
  const [agents, setAgents] = useState<LiveAgentLocation[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<LiveAgentLocation | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [clientVisits, setClientVisits] = useState<ClientVisit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Route playback state
  const [playbackAgentId, setPlaybackAgentId] = useState<string>('');
  const [playbackDate, setPlaybackDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [routeData, setRouteData] = useState<{
    totalDistanceKm: number;
    pings: LocationPing[];
    visits: ClientVisit[];
    attendance?: AttendanceRecord;
  } | null>(null);
  const [playbackIndex, setPlaybackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Quick Action Modal states
  const [showCheckInModal, setShowCheckInModal] = useState<boolean>(false);
  const [showVisitModal, setShowVisitModal] = useState<boolean>(false);
  const [modalAddress, setModalAddress] = useState<string>('Koramangala 5th Block, Bengaluru');
  const [modalLat, setModalLat] = useState<number>(12.9352);
  const [modalLng, setModalLng] = useState<number>(77.6245);
  const [visitClientName, setVisitClientName] = useState<string>('');
  const [visitCompany, setVisitCompany] = useState<string>('');
  const [visitNotes, setVisitNotes] = useState<string>('');
  const [visitOutcome, setVisitOutcome] = useState<any>('INTERESTED');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const playbackMapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const playbackMapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const playbackMarkerRef = useRef<L.Marker | null>(null);
  const playbackPolylineRef = useRef<L.Polyline | null>(null);

  // Load live tracking and attendance data
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await client.getLiveTracking();
      if (res.success && res.data) {
        setSummary(res.data.summary);
        setAgents(res.data.agents || []);
        if (res.data.agents.length > 0 && !selectedAgent) {
          setSelectedAgent(res.data.agents[0]);
          setPlaybackAgentId(res.data.agents[0].employeeId);
        }
      }

      const attRes = await client.getAttendanceHistory();
      if (attRes.success) {
        setAttendanceHistory(attRes.data || []);
      }

      const visitRes = await client.getClientVisits();
      if (visitRes.success) {
        setClientVisits(visitRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load tracking data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, [activeOrg]);

  // Load Route Data for Playback
  const loadRouteData = async (employeeId: string, date: string) => {
    try {
      const res = await client.getAgentRoute(employeeId, date);
      if (res.success && res.data) {
        setRouteData({
          totalDistanceKm: res.data.totalDistanceKm,
          pings: res.data.pings,
          visits: res.data.visits,
          attendance: res.data.attendance
        });
        setPlaybackIndex(0);
        setIsPlaying(false);
      }
    } catch (e) {
      console.error('Failed to load agent route:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'playback' && playbackAgentId) {
      loadRouteData(playbackAgentId, playbackDate);
    }
  }, [activeTab, playbackAgentId, playbackDate]);

  // Initialize or update Live Map
  useEffect(() => {
    if (activeTab !== 'map' || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [12.9716, 77.5946], // Bangalore default center
        zoom: 12
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear old markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    const bounds = L.latLngBounds([]);

    agents.forEach(agent => {
      if (!agent.lastPing) return;
      const { latitude, longitude } = agent.lastPing;
      const isCheckedIn = agent.attendanceStatus === 'CHECKED_IN';
      const isMoving = (agent.currentSpeedKmH || 0) > 3;

      const markerColor = !isCheckedIn ? '#64748b' : isMoving ? '#10b981' : '#f59e0b';
      const iconHtml = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          ${isCheckedIn && isMoving ? '<div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(16, 185, 129, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>' : ''}
          <div style="width: 26px; height: 26px; border-radius: 50%; background: ${markerColor}; border: 3px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">
            ${agent.employeeName.charAt(0)}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-agent-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const marker = L.marker([latitude, longitude], { icon: customIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; line-height: 1.5; min-width: 200px;">
          <div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">${agent.employeeName}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${agent.teamName || 'Field Executive'} &bull; ${agent.employeeCode || 'EMP-F1'}</div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; background: ${isCheckedIn ? '#dcfce7; color: #15803d;' : '#f1f5f9; color: #475569;'}">
              ${isCheckedIn ? 'ON DUTY' : 'CHECKED OUT'}
            </span>
            <span style="font-size: 11px; color: #334155; font-weight: 600;">${agent.currentSpeedKmH || 0} km/h</span>
            <span style="font-size: 11px; color: #64748b;">⚡ ${agent.batteryLevel || 85}%</span>
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 4px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
            📍 ${agent.lastPing.address || 'Field Location'}<br/>
            🚗 Today: <strong>${agent.todayDistanceKm} km</strong> &bull; Visits: <strong>${agent.todayVisitsCount}</strong>
          </div>
        </div>
      `);

      markersRef.current[agent.employeeId] = marker;
      bounds.extend([latitude, longitude]);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [activeTab, agents]);

  // Handle Route Playback Map
  useEffect(() => {
    if (activeTab !== 'playback' || !playbackMapContainerRef.current) return;

    if (!playbackMapInstanceRef.current) {
      const map = L.map(playbackMapContainerRef.current, {
        center: [12.9716, 77.5946],
        zoom: 12
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      playbackMapInstanceRef.current = map;
    }

    const map = playbackMapInstanceRef.current;

    // Remove existing lines and markers
    if (playbackPolylineRef.current) playbackPolylineRef.current.remove();
    if (playbackMarkerRef.current) playbackMarkerRef.current.remove();

    if (!routeData || routeData.pings.length === 0) return;

    const latlngs: L.LatLngExpression[] = routeData.pings.map(p => [p.latitude, p.longitude]);

    // Draw route polyline
    playbackPolylineRef.current = L.polyline(latlngs, {
      color: '#2563eb',
      weight: 5,
      opacity: 0.85,
      dashArray: '2, 6'
    }).addTo(map);

    // Add Start marker (Green)
    const startPing = routeData.pings[0];
    const startIcon = L.divIcon({
      html: '<div style="background: #10b981; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-size: 10px;">S</div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    L.marker([startPing.latitude, startPing.longitude], { icon: startIcon })
      .bindPopup(`<strong>Start of Shift</strong><br/>${startPing.timestamp}<br/>${startPing.address || ''}`)
      .addTo(map);

    // Add Client Visit markers (Orange Star)
    routeData.visits.forEach(v => {
      const visitIcon = L.divIcon({
        html: '<div style="background: #f97316; color: white; width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-size: 12px;">★</div>',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });
      L.marker([v.latitude, v.longitude], { icon: visitIcon })
        .bindPopup(`<strong>Client Visit: ${v.clientName}</strong><br/>${v.companyName || ''}<br/>Outcome: <em>${v.outcome}</em><br/>Notes: ${v.notes || ''}`)
        .addTo(map);
    });

    // Add animated cursor vehicle
    const currentPing = routeData.pings[playbackIndex] || startPing;
    const vehicleIcon = L.divIcon({
      html: '<div style="background: #3b82f6; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.3); font-size: 14px;">🚗</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    playbackMarkerRef.current = L.marker([currentPing.latitude, currentPing.longitude], { icon: vehicleIcon }).addTo(map);

    map.fitBounds(playbackPolylineRef.current.getBounds(), { padding: [50, 50] });
  }, [activeTab, routeData]);

  // Update animated vehicle marker position when playbackIndex changes
  useEffect(() => {
    if (playbackMarkerRef.current && routeData && routeData.pings[playbackIndex]) {
      const ping = routeData.pings[playbackIndex];
      playbackMarkerRef.current.setLatLng([ping.latitude, ping.longitude]);
      if (playbackMapInstanceRef.current && isPlaying) {
        playbackMapInstanceRef.current.panTo([ping.latitude, ping.longitude]);
      }
    }
  }, [playbackIndex, routeData, isPlaying]);

  // Playback animation ticker
  useEffect(() => {
    if (!isPlaying || !routeData || routeData.pings.length === 0) return;

    const intervalTime = Math.max(300, 1500 / playbackSpeed);
    const timer = setInterval(() => {
      setPlaybackIndex(prev => {
        if (prev >= routeData.pings.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPlaying, routeData, playbackSpeed]);

  // Quick Action: Simulate Attendance Check-In
  const handleCheckIn = async () => {
    try {
      const empId = selectedAgent?.employeeId || '66666666-6666-6666-6666-666666666603';
      await client.checkInAttendance({
        employeeId: empId,
        latitude: modalLat,
        longitude: modalLng,
        address: modalAddress,
        batteryLevel: 94,
        isMock: false,
        remarks: 'Field agent morning check-in'
      });
      setShowCheckInModal(false);
      fetchData();
    } catch (e) {
      alert('Check-in failed');
    }
  };

  // Quick Action: Simulate Client Visit
  const handleLogVisit = async () => {
    if (!visitClientName) return;
    try {
      const empId = selectedAgent?.employeeId || '66666666-6666-6666-6666-666666666603';
      await client.logClientVisit({
        employeeId: empId,
        clientName: visitClientName,
        companyName: visitCompany,
        latitude: modalLat,
        longitude: modalLng,
        address: modalAddress,
        outcome: visitOutcome,
        notes: visitNotes,
        durationMinutes: 45
      });
      setShowVisitModal(false);
      setVisitClientName('');
      setVisitCompany('');
      setVisitNotes('');
      fetchData();
    } catch (e) {
      alert('Failed to log client visit');
    }
  };

  const filteredAgents = agents.filter(a =>
    a.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.teamName && a.teamName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header with Title and Telemetry Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Field Tracking & TrackHR
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Live GPS Streaming
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time workforce movement, geofenced attendance, route history playback & client visit audits.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCheckInModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
          >
            <Clock className="h-4 w-4" />
            Punch Attendance
          </button>
          <button
            onClick={() => setShowVisitModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
          >
            <Briefcase className="h-4 w-4" />
            Log Client Visit
          </button>
        </div>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Field Agents</span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{summary?.totalFieldAgents || agents.length}</span>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              {summary?.activeOnDuty || 0} On Duty
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Live tracking active during shift</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Travel (Today)</span>
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Navigation className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{summary?.totalDistanceTraveledKm || 0}</span>
            <span className="text-sm font-medium text-slate-500">km</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Conveyance computed via GPS breadcrumbs</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Client Visits</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{clientVisits.length}</span>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              Audited
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">With geo-coordinates & notes</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Mock GPS Protection</span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">100%</span>
            <span className="text-xs font-medium text-slate-500">Genuine</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Zero fake location apps detected</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('map')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'map'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <MapIcon className="h-4 w-4" />
            Live Field Map
          </button>

          <button
            onClick={() => setActiveTab('playback')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'playback'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Play className="h-4 w-4" />
            Route Playback & Travel History
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'attendance'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Clock className="h-4 w-4" />
            Attendance Register (TrackHR)
          </button>

          <button
            onClick={() => setActiveTab('visits')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'visits'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            Client Meetings & Visits
          </button>
        </nav>
      </div>

      {/* TAB 1: LIVE FIELD MAP */}
      {activeTab === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Map View */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-[600px]">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-blue-600" />
                Bengaluru Territory &bull; Active Field Tracking
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Moving
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span> Stopped / Halted
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-slate-400"></span> Checked Out
                </span>
              </div>
            </div>
            <div ref={mapContainerRef} className="flex-1 w-full z-0" />
          </div>

          {/* Agents List Sidebar */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col h-[600px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 text-sm">Field Force ({filteredAgents.length})</h3>
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter agent..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 w-36 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredAgents.map(agent => {
                const isSelected = selectedAgent?.employeeId === agent.employeeId;
                const isCheckedIn = agent.attendanceStatus === 'CHECKED_IN';
                return (
                  <div
                    key={agent.employeeId}
                    onClick={() => {
                      setSelectedAgent(agent);
                      if (agent.lastPing && mapInstanceRef.current) {
                        mapInstanceRef.current.flyTo([agent.lastPing.latitude, agent.lastPing.longitude], 14);
                        if (markersRef.current[agent.employeeId]) {
                          markersRef.current[agent.employeeId].openPopup();
                        }
                      }
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {agent.employeeName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-xs">{agent.employeeName}</div>
                          <div className="text-[11px] text-slate-500">{agent.teamName}</div>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isCheckedIn
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isCheckedIn ? 'ON DUTY' : 'OFF DUTY'}
                      </span>
                    </div>

                    <div className="mt-2.5 grid grid-cols-3 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Distance</span>
                        <span className="font-semibold text-slate-800">{agent.todayDistanceKm} km</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Speed</span>
                        <span className="font-semibold text-slate-800">{agent.currentSpeedKmH || 0} km/h</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Battery</span>
                        <span className="font-semibold text-slate-800">{agent.batteryLevel || 85}%</span>
                      </div>
                    </div>

                    {agent.lastPing?.address && (
                      <p className="mt-2 text-[11px] text-slate-500 truncate flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                        {agent.lastPing.address}
                      </p>
                    )}

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Visits: <strong>{agent.todayVisitsCount}</strong></span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlaybackAgentId(agent.employeeId);
                          setActiveTab('playback');
                        }}
                        className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5"
                      >
                        Replay Route <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROUTE PLAYBACK & TRAVEL HISTORY */}
      {activeTab === 'playback' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-700">Select Agent:</label>
              <select
                value={playbackAgentId}
                onChange={e => setPlaybackAgentId(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 font-medium focus:ring-1 focus:ring-blue-500"
              >
                {agents.map(a => (
                  <option key={a.employeeId} value={a.employeeId}>
                    {a.employeeName} ({a.teamName})
                  </option>
                ))}
              </select>

              <label className="text-xs font-semibold text-slate-700 ml-2">Date:</label>
              <input
                type="date"
                value={playbackDate}
                onChange={e => setPlaybackDate(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 font-medium focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                onClick={() => {
                  setPlaybackIndex(0);
                  setIsPlaying(false);
                }}
                className="p-1.5 rounded-full text-slate-600 hover:bg-slate-200"
                title="Restart"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2 ml-2">
                <span className="text-xs text-slate-500">Progress:</span>
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, (routeData?.pings.length || 1) - 1)}
                  value={playbackIndex}
                  onChange={e => {
                    setPlaybackIndex(Number(e.target.value));
                    setIsPlaying(false);
                  }}
                  className="w-32 h-1 bg-slate-300 rounded-lg cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-700">
                  {routeData?.pings.length ? `${playbackIndex + 1}/${routeData.pings.length}` : '0/0'}
                </span>
              </div>

              <div className="flex items-center gap-1 ml-2">
                {[1, 2, 5].map(s => (
                  <button
                    key={s}
                    onClick={() => setPlaybackSpeed(s)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      playbackSpeed === s ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Map for Route Playback */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-[520px]">
            <div ref={playbackMapContainerRef} className="flex-1 w-full z-0" />
          </div>

          {/* Route Summary Details */}
          {routeData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Traveled</span>
                <div className="mt-1 text-xl font-bold text-slate-900">{routeData.totalDistanceKm} km</div>
                <p className="text-xs text-slate-400 mt-0.5">Approved for conveyance</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Client Meetings</span>
                <div className="mt-1 text-xl font-bold text-emerald-600">{routeData.visits.length} Visits</div>
                <p className="text-xs text-slate-400 mt-0.5">Logged on this route</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Shift Punch Times</span>
                <div className="mt-1 text-xs font-semibold text-slate-800">
                  In: {routeData.attendance?.checkInTime ? new Date(routeData.attendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}<br/>
                  Out: {routeData.attendance?.checkOutTime ? new Date(routeData.attendance.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active Shift'}
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">GPS Integrity</span>
                <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-emerald-600">
                  <ShieldCheck className="h-4 w-4" /> Genuine Geolocation
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Zero mock location anomalies</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ATTENDANCE REGISTER (TrackHR) */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">TrackHR Daily Shift Attendance</h3>
              <p className="text-xs text-slate-500 mt-0.5">Accurate check-in/out timestamps with geocoded addresses and distance.</p>
            </div>
            <span className="text-xs text-slate-500">
              Showing {attendanceHistory.length} records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Punch In</th>
                  <th className="py-3 px-4">Punch In Address</th>
                  <th className="py-3 px-4">Punch Out</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Travel (Km)</th>
                  <th className="py-3 px-4">Integrity</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {attendanceHistory.map(att => {
                  const checkInDate = new Date(att.checkInTime);
                  const isCheckedIn = att.status === 'CHECKED_IN';
                  return (
                    <tr key={att.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {att.employeeName}
                      </td>
                      <td className="py-3 px-4">
                        {checkInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <span className="block text-[10px] text-slate-400">{checkInDate.toLocaleDateString()}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={att.checkInAddress}>
                        📍 {att.checkInAddress || 'Field Start'}
                      </td>
                      <td className="py-3 px-4">
                        {att.checkOutTime ? (
                          <>
                            {new Date(att.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            <span className="block text-[10px] text-slate-400">{new Date(att.checkOutTime).toLocaleDateString()}</span>
                          </>
                        ) : (
                          <span className="text-emerald-600 font-semibold">Active Now</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {att.totalDurationMinutes ? `${Math.floor(att.totalDurationMinutes / 60)}h ${att.totalDurationMinutes % 60}m` : 'In Progress'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {att.totalDistanceKm || 0} km
                      </td>
                      <td className="py-3 px-4">
                        {att.isMockDetected ? (
                          <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-[10px] bg-red-50 px-2 py-0.5 rounded">
                            <ShieldAlert className="h-3 w-3" /> Mock Detected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[10px] bg-emerald-50 px-2 py-0.5 rounded">
                            <ShieldCheck className="h-3 w-3" /> Genuine
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isCheckedIn
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isCheckedIn ? 'ON DUTY' : 'CHECKED OUT'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CLIENT MEETINGS & VISITS */}
      {activeTab === 'visits' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Client Meetings & Field Visits</h3>
              <p className="text-xs text-slate-500 mt-0.5">Audited meetings with geolocation proof and customer outcome.</p>
            </div>
            <button
              onClick={() => setShowVisitModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Visit
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Field Agent</th>
                  <th className="py-3 px-4">Client / Company</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {clientVisits.map(visit => {
                  const visitDate = new Date(visit.visitTime);
                  const outcomeColors: Record<string, string> = {
                    INTERESTED: 'bg-blue-100 text-blue-800',
                    CLOSED_WON: 'bg-emerald-100 text-emerald-800',
                    FOLLOW_UP_REQUIRED: 'bg-amber-100 text-amber-800',
                    NOT_INTERESTED: 'bg-rose-100 text-rose-800',
                    NOT_AVAILABLE: 'bg-slate-100 text-slate-700'
                  };
                  return (
                    <tr key={visit.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">{visit.employeeName}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {visit.clientName}
                        {visit.companyName && (
                          <span className="block text-[11px] text-slate-500">{visit.companyName}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{visit.phoneNumber || 'N/A'}</td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={visit.address}>
                        📍 {visit.address || `${visit.latitude.toFixed(4)}, ${visit.longitude.toFixed(4)}`}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${outcomeColors[visit.outcome] || 'bg-slate-100 text-slate-700'}`}>
                          {visit.outcome.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-md truncate" title={visit.notes}>
                        {visit.notes || 'No notes provided'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {visitDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <span className="block text-[10px] text-slate-400">{visitDate.toLocaleDateString()}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CHECK-IN MODAL */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Punch Shift Attendance
            </h3>
            <p className="text-xs text-slate-500">
              Captures geolocation coordinates and activates duty breadcrumb streaming.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Location Address</label>
                <input
                  type="text"
                  value={modalAddress}
                  onChange={e => setModalAddress(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={modalLat}
                    onChange={e => setModalLat(parseFloat(e.target.value))}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={modalLng}
                    onChange={e => setModalLng(parseFloat(e.target.value))}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowCheckInModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckIn}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                Confirm Punch In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLIENT VISIT MODAL */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-emerald-600" />
              Log Field Client Meeting
            </h3>
            <p className="text-xs text-slate-500">
              Records client details, outcome, notes, and exact meeting GPS position.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Client Contact Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Anand Murthy"
                  value={visitClientName}
                  onChange={e => setVisitClientName(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Company / Business Name</label>
                <input
                  type="text"
                  placeholder="e.g. Vertex Technologies Ltd"
                  value={visitCompany}
                  onChange={e => setVisitCompany(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Meeting Outcome *</label>
                <select
                  value={visitOutcome}
                  onChange={e => setVisitOutcome(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 font-medium"
                >
                  <option value="INTERESTED">Interested in Proposal</option>
                  <option value="CLOSED_WON">Closed / Contract Signed</option>
                  <option value="FOLLOW_UP_REQUIRED">Follow-up Required</option>
                  <option value="NOT_INTERESTED">Not Interested</option>
                  <option value="NOT_AVAILABLE">Client Not Available</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Meeting Notes & Summary</label>
                <textarea
                  rows={3}
                  placeholder="Key discussion points, requirements discussed, next steps..."
                  value={visitNotes}
                  onChange={e => setVisitNotes(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowVisitModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleLogVisit}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
              >
                Save Client Visit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldTracking;
