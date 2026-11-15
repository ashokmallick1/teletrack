import { spawn, ChildProcess } from 'child_process';
import { categorizeActivity } from './categorizer';
import { ActivityCategory } from '@teletrack/shared-types';

export interface ActiveWindowSample {
  processName: string;
  windowTitle: string;
  idleMs: number;
  isIdle: boolean;
  category: ActivityCategory;
  timestamp: string;
}

export class DesktopTracker {
  private child: ChildProcess | null = null;
  private isRunning = false;
  private onSampleCallback?: (sample: ActiveWindowSample) => void;
  private idleThresholdMs = 180000; // 3 minutes idle threshold

  constructor(idleThresholdMs = 180000) {
    this.idleThresholdMs = idleThresholdMs;
  }

  public start(onSample: (sample: ActiveWindowSample) => void) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.onSampleCallback = onSample;

    const platform = process.platform;

    if (platform === 'win32') {
      this.startWindowsTracker();
    } else if (platform === 'darwin') {
      this.startMacTracker();
    } else {
      this.startLinuxTracker();
    }
  }

  /**
   * Windows Native Activity Tracker (Win32 API via PowerShell)
   */
  private startWindowsTracker() {
    const psScript = `
$code = @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class Win32Tracker {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

    public struct LASTINPUTINFO {
        public uint cbSize;
        public uint dwTime;
    }

    public static string GetInfo() {
        IntPtr hwnd = GetForegroundWindow();
        StringBuilder sb = new StringBuilder(512);
        GetWindowText(hwnd, sb, 512);
        uint pid = 0;
        GetWindowThreadProcessId(hwnd, out pid);
        string proc = "idle";
        try {
            if (pid > 0) {
                proc = System.Diagnostics.Process.GetProcessById((int)pid).ProcessName;
            }
        } catch {}

        LASTINPUTINFO lii = new LASTINPUTINFO();
        lii.cbSize = (uint)Marshal.SizeOf(typeof(LASTINPUTINFO));
        GetLastInputInfo(ref lii);
        uint idle = (uint)Environment.TickCount - lii.dwTime;

        string cleanTitle = sb.ToString().Replace("\\\\", "\\\\\\\\").Replace("\"", "\\\"").Replace("\`n", " ").Replace("\`r", " ");
        string cleanProc = proc.Replace("\\\\", "\\\\\\\\").Replace("\"", "\\\"");

        return "{\\"process\\":\\"" + cleanProc + "\\",\\"title\\":\\"" + cleanTitle + "\\",\\"idleMs\\":" + idle + "}";
    }
}
"@
Add-Type -TypeDefinition $code -Language CSharp

while ($true) {
    try {
        $json = [Win32Tracker]::GetInfo()
        [Console]::WriteLine($json)
    } catch {
        [Console]::WriteLine('{"process":"unknown","title":"","idleMs":0}')
    }
    Start-Sleep -Seconds 5
}
`;
    this.spawnTrackerProcess('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript]);
  }

  /**
   * macOS Native Activity Tracker (AppleScript + ioreg for idle detection)
   */
  private startMacTracker() {
    const shScript = `
while true; do
  IDLE_MS=$(ioreg -c IOHIDSystem 2>/dev/null | awk '/HIDIdleTime/ {print int($NF/1000000); exit}')
  if [ -z "$IDLE_MS" ]; then IDLE_MS=0; fi

  INFO=$(osascript -e '
    tell application "System Events"
      try
        set frontApp to first application process whose frontmost is true
        set appName to name of frontApp
        set winTitle to ""
        try
          set winTitle to name of front window of frontApp
        end try
        return appName & "|||" & winTitle
      on error
        return "Unknown|||"
      end try
    end tell' 2>/dev/null)

  PROC=$(echo "$INFO" | awk -F'|||' '{print $1}' | tr -d '"\n')
  TITLE=$(echo "$INFO" | awk -F'|||' '{print $2}' | tr -d '"\n')

  echo "{\\"process\\":\\"$PROC\\",\\"title\\":\\"$TITLE\\",\\"idleMs\\":$IDLE_MS}"
  sleep 5
done
`;
    this.spawnTrackerProcess('/bin/sh', ['-c', shScript]);
  }

  /**
   * Linux Native Activity Tracker (X11 / xprintidle / xdotool)
   */
  private startLinuxTracker() {
    const shScript = `
while true; do
  IDLE_MS=0
  if command -v xprintidle >/dev/null 2>&1; then
    IDLE_MS=$(xprintidle 2>/dev/null || echo 0)
  fi

  WIN_ID=$(xdotool getactivewindow 2>/dev/null || echo 0)
  PROC="unknown"
  TITLE=""

  if [ "$WIN_ID" != "0" ] && [ -n "$WIN_ID" ]; then
    PROC=$(xprop -id "$WIN_ID" WM_CLASS 2>/dev/null | awk -F'"' '{print $(NF-1)}' || echo "unknown")
    TITLE=$(xprop -id "$WIN_ID" _NET_WM_NAME 2>/dev/null | cut -d '"' -f 2 || echo "")
  fi

  echo "{\\"process\\":\\"$PROC\\",\\"title\\":\\"$TITLE\\",\\"idleMs\\":$IDLE_MS}"
  sleep 5
done
`;
    this.spawnTrackerProcess('/bin/sh', ['-c', shScript]);
  }

  private spawnTrackerProcess(command: string, args: string[]) {
    try {
      this.child = spawn(command, args);

      let buffer = '';
      this.child.stdout?.on('data', data => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
              const parsed = JSON.parse(trimmed);
              const isIdle = (parsed.idleMs || 0) >= this.idleThresholdMs;
              const category = isIdle ? 'NEUTRAL' : categorizeActivity(parsed.process, parsed.title);

              const sample: ActiveWindowSample = {
                processName: parsed.process || 'idle',
                windowTitle: parsed.title || '',
                idleMs: parsed.idleMs || 0,
                isIdle,
                category,
                timestamp: new Date().toISOString()
              };

              if (this.onSampleCallback) {
                this.onSampleCallback(sample);
              }
            } catch (e) {
              // ignore parse errors on partial line
            }
          }
        }
      });

      this.child.stderr?.on('data', _err => {
        // diagnostics
      });

      this.child.on('exit', () => {
        if (this.isRunning) {
          setTimeout(() => {
            if (this.isRunning && this.onSampleCallback) {
              this.start(this.onSampleCallback);
            }
          }, 3000);
        }
      });
    } catch (err) {
      console.error('[DesktopTracker] Failed to spawn activity tracker:', err);
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.child) {
      try {
        this.child.kill();
      } catch {}
      this.child = null;
    }
  }
}
