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

    try {
      this.child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript]);

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
              const isIdle = parsed.idleMs >= this.idleThresholdMs;
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

      this.child.stderr?.on('data', err => {
        // Log stderr for diagnostics
      });

      this.child.on('exit', () => {
        if (this.isRunning) {
          // Auto-restart if closed unexpectedly
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
