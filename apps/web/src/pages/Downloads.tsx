import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Smartphone,
  Monitor,
  Apple,
  Terminal,
  Download,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  Cpu,
  HardDrive,
  Globe,
  Radio,
  FileCode,
  Sparkles
} from 'lucide-react';

export const Downloads: React.FC = () => {
  const { activeOrg } = useAuth();
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const orgSlug = activeOrg?.slug || 'teletrack-demo';
  const webDomain = 'https://teletrack.bhashaai.in';
  const apiDomain = 'https://teletrack-api.bhashaai.in';

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(key);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const platforms = [
    {
      id: 'android',
      title: 'Android Mobile App',
      tagline: 'Enterprise Field & Telephony Client',
      os: 'Android 8.0 - 15 (API 26+)',
      version: 'v1.2.0 (Build 202611)',
      size: '11.47 MB',
      icon: Smartphone,
      color: 'emerald',
      downloadUrl: '/teletrack.apk',
      absoluteUrl: `${webDomain}/teletrack.apk`,
      filename: 'teletrack.apk',
      features: [
        'Native Call Log & SIM-Slot Auto-Detection',
        'Geofenced Attendance Check-In / Check-Out (TrackHR)',
        'Continuous GPS Breadcrumb Streaming & Mileage Log',
        'Client Meeting & Field Visit Geotagged Logger',
        'Mock Location & Fake GPS Prevention Shield',
        'Offline SQLite Buffering with Auto-Retry Sync',
        'WhatsApp 1-Click Message Templates'
      ],
      instructions: [
        'Download the APK directly or scan the QR code with your Android phone.',
        'Tap "Install" (Allow installation from this source if prompted).',
        'Log in with your employee credentials or scan your organization QR.',
        'Grant Phone State, Call Log & Location permissions.'
      ]
    },
    {
      id: 'windows',
      title: 'Windows Desktop Agent',
      tagline: 'Silent Telecaller & Screen Productivity Tracker',
      os: 'Windows 10 / 11 (64-bit)',
      version: 'v1.2.0 Win64',
      size: '11.4 KB (Runner + Engine)',
      icon: Monitor,
      color: 'blue',
      downloadUrl: '/teletrack-windows.zip',
      absoluteUrl: `${webDomain}/teletrack-windows.zip`,
      filename: 'teletrack-windows.zip',
      features: [
        'Native Win32 Foreground Window Title Monitor',
        'GetLastInputInfo Idle vs Active Time Detection',
        'PowerDialer & Cloud CRM Sync in Background',
        'One-Click run-teletrack.bat Silent Launcher',
        'Zero Admin Elevation / Zero UAC Prompts Needed',
        'Automatic Crash Recovery & Local State Persistence'
      ],
      instructions: [
        'Download and extract `teletrack-windows.zip` to any folder.',
        'Double-click `run-teletrack.bat`.',
        'The agent will connect to your TeleTrack organization instantly and begin streaming activity.'
      ]
    },
    {
      id: 'mac',
      title: 'macOS Desktop Agent',
      tagline: 'Apple Silicon (M1-M4) & Intel Universal',
      os: 'macOS 12.0+ (Monterey, Sonoma, Sequoia)',
      version: 'v1.2.0 Universal',
      size: '11.5 KB (Runner + Engine)',
      icon: Apple,
      color: 'slate',
      downloadUrl: '/teletrack-mac.zip',
      absoluteUrl: `${webDomain}/teletrack-mac.zip`,
      filename: 'teletrack-mac.zip',
      features: [
        'Native AppleScript frontmostApplication Tracking',
        'CoreGraphics IOHIDSystem Hardware Idle Monitoring',
        'Optimized for Apple Silicon ARM64 & Intel x86_64',
        'run-teletrack.sh Self-Contained Bash Script',
        'Encrypted JWT Keychain Credential Caching',
        'Ultra-low CPU & Battery Footprint (< 0.2%)'
      ],
      instructions: [
        'Download and unzip `teletrack-mac.zip`.',
        'Open Terminal, navigate to the folder, and run: `chmod +x run-teletrack.sh && ./run-teletrack.sh`',
        'Grant Accessibility permission when prompted in System Settings.'
      ]
    },
    {
      id: 'linux',
      title: 'Linux Server & Workstation',
      tagline: 'Systemd Background Daemon & Desktop Tracker',
      os: 'Ubuntu 20.04+, Debian 11+, RHEL, Fedora',
      version: 'v1.2.0 (x86_64 / arm64)',
      size: '11.7 KB',
      icon: Terminal,
      color: 'amber',
      downloadUrl: '/teletrack-linux.tar.gz',
      absoluteUrl: `${webDomain}/teletrack-linux.tar.gz`,
      filename: 'teletrack-linux.tar.gz',
      features: [
        'X11 & Wayland Window Title Tracking (xdotool / xprop)',
        'xprintidle Hardware Inactivity Detection',
        'systemd Unit file (teletrack.service) Included',
        'Headless Server & Workstation Multi-Mode',
        'Runs as Standard Non-Root User'
      ],
      instructions: [
        'Download and extract: `tar -xzf teletrack-linux.tar.gz`',
        'Run interactively: `./run-teletrack.sh`',
        'Or install as systemd service: `sudo cp teletrack.service /etc/systemd/system/ && sudo systemctl enable --now teletrack`'
      ]
    }
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Download TeleTrack Native Apps & Binaries
          </h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            Multi-Platform Cloud
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1 max-w-3xl">
          Equip your field sales executives, telecallers, and remote teams with native TeleTrack tracking clients. All binaries connect securely to your Cloudflare-secured TeleTrack cloud infrastructure.
        </p>
      </div>

      {/* Cloud Server Connectivity Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-xs font-bold tracking-wider uppercase text-emerald-400">
                Production Server Online
              </span>
            </div>
            <h3 className="text-lg font-bold">Connected to Oracle Cloud & Cloudflare Tunnel</h3>
            <p className="text-xs text-slate-300 max-w-2xl">
              Clients auto-route through single-origin edge endpoints. No manual proxy configuration required.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-2.5">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Web Portal</span>
              <span className="text-xs font-mono font-medium text-blue-300">{webDomain}</span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-2.5">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">REST API Engine</span>
              <span className="text-xs font-mono font-medium text-emerald-300">{apiDomain}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Multi-OS Download Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {platforms.map(platform => {
          const Icon = platform.icon;
          const isCopied = copiedLink === platform.id;

          return (
            <div
              key={platform.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-slate-300 transition"
            >
              <div>
                {/* Header of Card */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md">
                      <Icon className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{platform.title}</h3>
                      <p className="text-xs text-slate-500">{platform.tagline}</p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                    {platform.version}
                  </span>
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-5">
                  {/* Meta Pills */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium">
                      OS: {platform.os}
                    </span>
                    <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md font-medium">
                      Size: {platform.size}
                    </span>
                    <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md font-medium">
                      Status: Ready
                    </span>
                  </div>

                  {/* Android QR Code Section */}
                  {platform.id === 'android' && (
                    <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4 flex items-center gap-4">
                      {/* SVG QR Code Illustration */}
                      <div className="bg-white p-2 rounded-lg shadow-sm border border-emerald-100 shrink-0">
                        <svg className="w-20 h-20" viewBox="0 0 100 100">
                          {/* Corner Squares */}
                          <rect x="5" y="5" width="26" height="26" rx="4" fill="#0f172a" />
                          <rect x="9" y="9" width="18" height="18" rx="2" fill="#ffffff" />
                          <rect x="13" y="13" width="10" height="10" fill="#10b981" />

                          <rect x="69" y="5" width="26" height="26" rx="4" fill="#0f172a" />
                          <rect x="73" y="9" width="18" height="18" rx="2" fill="#ffffff" />
                          <rect x="77" y="13" width="10" height="10" fill="#10b981" />

                          <rect x="5" y="69" width="26" height="26" rx="4" fill="#0f172a" />
                          <rect x="9" y="73" width="18" height="18" rx="2" fill="#ffffff" />
                          <rect x="13" y="77" width="10" height="10" fill="#10b981" />

                          {/* Data Patterns */}
                          <rect x="36" y="8" width="8" height="8" fill="#0f172a" />
                          <rect x="48" y="8" width="8" height="8" fill="#10b981" />
                          <rect x="36" y="20" width="12" height="6" fill="#0f172a" />
                          <rect x="52" y="20" width="8" height="6" fill="#0f172a" />

                          <rect x="8" y="36" width="8" height="8" fill="#0f172a" />
                          <rect x="20" y="36" width="8" height="8" fill="#10b981" />
                          <rect x="8" y="48" width="6" height="12" fill="#0f172a" />
                          <rect x="20" y="48" width="10" height="10" fill="#0f172a" />

                          <rect x="36" y="36" width="14" height="14" rx="2" fill="#2563eb" />
                          <rect x="54" y="36" width="10" height="8" fill="#0f172a" />
                          <rect x="68" y="36" width="8" height="14" fill="#0f172a" />
                          <rect x="80" y="36" width="12" height="8" fill="#10b981" />

                          <rect x="36" y="54" width="8" height="10" fill="#0f172a" />
                          <rect x="48" y="54" width="16" height="6" fill="#0f172a" />
                          <rect x="68" y="54" width="10" height="10" fill="#10b981" />
                          <rect x="82" y="48" width="10" height="16" fill="#0f172a" />

                          <rect x="36" y="68" width="12" height="10" fill="#10b981" />
                          <rect x="52" y="68" width="16" height="8" fill="#0f172a" />
                          <rect x="72" y="68" width="10" height="12" fill="#0f172a" />
                          <rect x="36" y="82" width="14" height="10" fill="#0f172a" />
                          <rect x="54" y="80" width="8" height="12" fill="#2563eb" />
                          <rect x="66" y="84" width="16" height="8" fill="#10b981" />
                        </svg>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-bold text-emerald-950 block">Instant Phone Camera Install</span>
                        <p className="text-[11px] text-emerald-800 leading-relaxed">
                          Scan with any phone camera to install directly onto employee Android devices without USB cables.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Capabilities List */}
                  <div>
                    <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider block mb-2.5">
                      Key Capabilities Included:
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {platform.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Quick Setup Instructions */}
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-700 block mb-1.5">
                      Quick Setup:
                    </span>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-500 leading-relaxed">
                      {platform.instructions.map((ins, idx) => (
                        <li key={idx}>{ins}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center gap-3">
                <a
                  href={platform.downloadUrl}
                  download={platform.filename}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
                >
                  <Download className="h-4 w-4" />
                  Download {platform.filename}
                </a>

                <button
                  onClick={() => copyToClipboard(platform.absoluteUrl, platform.id)}
                  className="px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 transition"
                  title="Copy direct download link"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {isCopied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Organization Enrollment Helper Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="font-bold text-slate-900 text-base mb-2 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          Employee Device Enrollment Credentials
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Share these organization connection details with employees when setting up their new Android or Desktop clients.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Organization Code</span>
            <span className="text-sm font-bold font-mono text-slate-800">{orgSlug}</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Production Cloud Domain</span>
            <span className="text-sm font-semibold font-mono text-blue-600">teletrack.bhashaai.in</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">API Gateway URL</span>
            <span className="text-sm font-semibold font-mono text-emerald-600">teletrack-api.bhashaai.in</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Downloads;
