import { ActivityCategory } from '@teletrack/shared-types';

export function categorizeActivity(processName: string, windowTitle: string): ActivityCategory {
  const proc = (processName || '').toLowerCase();
  const title = (windowTitle || '').toLowerCase();

  // 1. Unproductive indicators (entertainment, games, social media)
  const unproductiveProcs = [
    'netflix', 'spotify', 'steam', 'epicgames', 'riotclient', 'valorant',
    'discord', 'vlc', 'tiktok', 'instagram', 'facebook'
  ];
  if (unproductiveProcs.some(p => proc.includes(p))) {
    return 'UNPRODUCTIVE';
  }

  const unproductiveTitles = [
    'netflix', 'prime video', 'disney+', 'twitch', 'steam', 'roblox',
    'instagram', 'facebook', 'reddit', 'tiktok'
  ];
  if (unproductiveTitles.some(t => title.includes(t))) {
    return 'UNPRODUCTIVE';
  }

  // 2. Productive work indicators
  const productiveProcs = [
    'code', 'devenv', 'webstorm', 'idea64', 'pycharm', 'sublime_text',
    'excel', 'winword', 'powerpnt', 'onenote', 'notion', 'obsidian',
    'slack', 'teams', 'zoom', 'outlook', 'thunderbird',
    'postman', 'dbeaver', 'figma', 'linear', 'jira'
  ];
  if (productiveProcs.some(p => proc.includes(p))) {
    return 'PRODUCTIVE';
  }

  // 3. Web browsers (check window title for CRM, work portals, documentation)
  const browserProcs = ['chrome', 'msedge', 'firefox', 'brave', 'opera'];
  if (browserProcs.some(p => proc.includes(p))) {
    const workKeywords = [
      'crm', 'hubspot', 'salesforce', 'zoho', 'lead', 'teletrack',
      'callyzer', 'gmail', 'google sheets', 'google docs', 'github',
      'gitlab', 'trello', 'asana', 'jira', 'confluence', 'notion',
      'analytics', 'dashboard', 'portal', 'erp', 'bhashaai'
    ];
    if (workKeywords.some(k => title.includes(k))) {
      return 'PRODUCTIVE';
    }

    const entertainmentInBrowser = ['youtube', 'netflix', 'facebook', 'instagram', 'reddit', 'twitter', 'x.com'];
    if (entertainmentInBrowser.some(k => title.includes(k))) {
      return 'UNPRODUCTIVE';
    }

    return 'NEUTRAL';
  }

  // 4. Neutral system tools
  const neutralProcs = [
    'explorer', 'cmd', 'powershell', 'windowsterminal', 'taskmgr',
    'calculator', 'systemsettings', 'notepad'
  ];
  if (neutralProcs.some(p => proc.includes(p))) {
    return 'NEUTRAL';
  }

  return 'PRODUCTIVE';
}
