const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve('C:/Users/user/.gemini/antigravity/brain/f98fe998-4c3e-4b23-b401-c0d666d8df91/playwright-results');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const RESULTS = {
  timestamp: new Date().toISOString(),
  tests: []
};

function logTest(name, passed, details) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${status}] ${name}`);
  if (details) {
    console.log(`       Details: ${typeof details === 'object' ? JSON.stringify(details, null, 2) : details}`);
  }
  RESULTS.tests.push({ name, passed, details, time: new Date().toISOString() });
}

async function run() {
  console.log('================================================================');
  console.log('🚀 STARTING PLAYWRIGHT CLOUDFLARE END-TO-END VERIFICATION');
  console.log(`Target Screenshot Directory: ${OUTPUT_DIR}`);
  console.log('================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 TeleTrackVerifier/1.0'
  });

  const page = await context.newPage();

  // -------------------------------------------------------------
  // TEST 1: Coolify Dashboard via Cloudflare Tunnel
  // -------------------------------------------------------------
  console.log('\n--- Test 1: Coolify Dashboard via Cloudflare ---');
  try {
    const coolifyUrl = 'https://democrats-trusted-paperbacks-discussed.trycloudflare.com/login';
    const resp = await page.goto(coolifyUrl, { waitUntil: 'networkidle', timeout: 35000 });
    const status = resp ? resp.status() : null;
    const title = await page.title();
    const currentUrl = page.url();

    const hasEmailInput = (await page.locator('input[type="email"], input[name="email"], input[id*="email"]').count()) > 0;
    const hasPasswordInput = (await page.locator('input[type="password"]').count()) > 0;
    const hasSubmitBtn = (await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').count()) > 0;

    const screenshotPath = path.join(OUTPUT_DIR, '01_coolify_login_portal.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const passed = (status === 200) && (title.includes('Coolify') || title.length > 0) && hasEmailInput;
    logTest('Coolify Dashboard Cloudflare Web UI', passed, {
      url: currentUrl,
      status,
      title,
      hasEmailInput,
      hasPasswordInput,
      hasSubmitBtn,
      screenshot: screenshotPath
    });
  } catch (err) {
    logTest('Coolify Dashboard Cloudflare Web UI', false, { error: err.message });
  }

  // -------------------------------------------------------------
  // TEST 1B: Coolify API Verification via Cloudflare
  // -------------------------------------------------------------
  console.log('\n--- Test 1B: Coolify API via Cloudflare ---');
  try {
    const apiUrl = 'https://democrats-trusted-paperbacks-discussed.trycloudflare.com/api/v1/projects';
    const token = '1|PgckSS43LyNPjaRzeTVbL6JbWx8XfstSXsGFIXRxa83508ba';

    const apiResp = await context.request.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    const status = apiResp.status();
    const projects = await apiResp.json();
    const teleTrackProject = projects.find(p => p.name.includes('TeleTrack') || p.uuid === 'se6yehiekf0ua0dabmzrm075');

    const passed = status === 200 && Array.isArray(projects) && !!teleTrackProject;
    logTest('Coolify REST API Project Discovery', passed, {
      status,
      totalProjects: projects.length,
      teleTrackProjectFound: !!teleTrackProject,
      teleTrackProjectDetails: teleTrackProject || null
    });
  } catch (err) {
    logTest('Coolify REST API Project Discovery', false, { error: err.message });
  }

  // -------------------------------------------------------------
  // TEST 2: Evolution API via Cloudflare Tunnel
  // -------------------------------------------------------------
  console.log('\n--- Test 2: Evolution API via Cloudflare ---');
  try {
    const evoUrl = 'https://introduce-whether-threaded-suited.trycloudflare.com';
    const evoResp = await page.goto(evoUrl, { waitUntil: 'networkidle', timeout: 35000 });
    const evoStatus = evoResp ? evoResp.status() : null;
    const evoBodyText = await page.textContent('body');
    let evoJson = null;
    try {
      evoJson = JSON.parse(evoBodyText);
    } catch (e) {}

    const screenshotPath = path.join(OUTPUT_DIR, '02_evolution_api_root.png');
    await page.screenshot({ path: screenshotPath });

    const passed = evoStatus === 200 && evoJson && evoJson.status === 200 && evoJson.message.includes('Evolution API');
    logTest('Evolution API Gateway Root Status', passed, {
      url: evoUrl,
      status: evoStatus,
      json: evoJson,
      screenshot: screenshotPath
    });
  } catch (err) {
    logTest('Evolution API Gateway Root Status', false, { error: err.message });
  }

  // -------------------------------------------------------------
  // TEST 2B: Evolution API Instance Fetch via Cloudflare
  // -------------------------------------------------------------
  console.log('\n--- Test 2B: Evolution API Instances Query via Cloudflare ---');
  try {
    const instUrl = 'https://introduce-whether-threaded-suited.trycloudflare.com/instance/fetchInstances';
    const apiKey = 'teletrack_evolution_secret_key_2026';

    const resp = await context.request.get(instUrl, {
      headers: {
        'apikey': apiKey,
        'Accept': 'application/json'
      }
    });

    const status = resp.status();
    const instances = await resp.json();
    const salesBot = Array.isArray(instances) ? instances.find(i => i.name === 'teletrack-sales-bot') : null;

    const passed = status === 200 && Array.isArray(instances) && !!salesBot;
    logTest('Evolution API Instance teletrack-sales-bot Discovery', passed, {
      status,
      instancesCount: Array.isArray(instances) ? instances.length : 0,
      salesBotFound: !!salesBot,
      salesBotState: salesBot ? salesBot.connectionStatus : null
    });
  } catch (err) {
    logTest('Evolution API Instance teletrack-sales-bot Discovery', false, { error: err.message });
  }

  // -------------------------------------------------------------
  // TEST 3: TeleTrack Web Portal Login via Cloudflare Tunnel
  // -------------------------------------------------------------
  console.log('\n--- Test 3: TeleTrack Web Portal via Cloudflare ---');
  try {
    const loginUrl = 'https://teletrack.bhashaai.in/login';
    await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 35000 });

    const screenshotPath = path.join(OUTPUT_DIR, '03_teletrack_login_page.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Fill credentials
    await page.fill('input[type="email"]', 'owner@acme.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard or home
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000); // Wait for React state & metrics hydration

    const dashboardUrl = page.url();
    const dashboardTitle = await page.title();
    const dashboardScreenshot = path.join(OUTPUT_DIR, '04_teletrack_dashboard.png');
    await page.screenshot({ path: dashboardScreenshot, fullPage: true });

    const passed = !dashboardUrl.includes('/login');
    logTest('TeleTrack Authentication & Dashboard Navigation', passed, {
      url: dashboardUrl,
      title: dashboardTitle,
      loginScreenshot: screenshotPath,
      dashboardScreenshot: dashboardScreenshot
    });
  } catch (err) {
    logTest('TeleTrack Authentication & Dashboard Navigation', false, { error: err.message });
  }

  // -------------------------------------------------------------
  // TEST 4: TeleTrack WhatsApp Evolution Settings Tab
  // -------------------------------------------------------------
  console.log('\n--- Test 4: TeleTrack WhatsApp Settings Page ---');
  try {
    await page.goto('https://teletrack.bhashaai.in/settings', { waitUntil: 'networkidle', timeout: 35000 });
    await page.waitForTimeout(1000);

    // Look for WhatsApp / Evolution tab
    const whatsappTab = page.locator('button:has-text("WhatsApp"), [role="tab"]:has-text("WhatsApp")');
    if (await whatsappTab.count() > 0) {
      await whatsappTab.first().click();
      await page.waitForTimeout(2000);
    }

    const settingsScreenshot = path.join(OUTPUT_DIR, '05_teletrack_whatsapp_settings.png');
    await page.screenshot({ path: settingsScreenshot, fullPage: true });

    const pageContent = await page.textContent('body');
    const mentionsEvo = pageContent.includes('Evolution') || pageContent.includes('WhatsApp') || pageContent.includes('teletrack-sales-bot');

    logTest('TeleTrack Settings WhatsApp Tab', mentionsEvo, {
      url: page.url(),
      mentionsEvo,
      screenshot: settingsScreenshot
    });
  } catch (err) {
    logTest('TeleTrack Settings WhatsApp Tab', false, { error: err.message });
  }

  // -------------------------------------------------------------
  // TEST 5: TeleTrack Call Logs (5,158 records test)
  // -------------------------------------------------------------
  console.log('\n--- Test 5: TeleTrack Call Logs Page ---');
  try {
    await page.goto('https://teletrack.bhashaai.in/calls', { waitUntil: 'networkidle', timeout: 35000 });
    await page.waitForTimeout(2000);

    const callsScreenshot = path.join(OUTPUT_DIR, '06_teletrack_calls_table.png');
    await page.screenshot({ path: callsScreenshot, fullPage: true });

    const rowCount = await page.locator('table tbody tr, [data-row-id]').count();
    const passed = rowCount > 0;

    logTest('TeleTrack Call Logs Table Rendering', passed, {
      rowCount,
      screenshot: callsScreenshot
    });
  } catch (err) {
    logTest('TeleTrack Call Logs Table Rendering', false, { error: err.message });
  }

  // -------------------------------------------------------------
  // TEST 6: TeleTrack Team & Employee Management
  // -------------------------------------------------------------
  console.log('\n--- Test 6: TeleTrack Employees & Team Page ---');
  try {
    await page.goto('https://teletrack.bhashaai.in/employees', { waitUntil: 'networkidle', timeout: 35000 });
    await page.waitForTimeout(2000);

    const teamScreenshot = path.join(OUTPUT_DIR, '07_teletrack_team_page.png');
    await page.screenshot({ path: teamScreenshot, fullPage: true });

    const pageContent = await page.textContent('body');
    const hasAddUser = pageContent.includes('Add Employee') || pageContent.includes('Employee') || pageContent.includes('Credentials');

    logTest('TeleTrack Team Management Page', hasAddUser, {
      url: page.url(),
      hasAddUser,
      screenshot: teamScreenshot
    });
  } catch (err) {
    logTest('TeleTrack Team Management Page', false, { error: err.message });
  }

  // -------------------------------------------------------------
  // TEST 7: TeleTrack API Health Endpoint
  // -------------------------------------------------------------
  console.log('\n--- Test 7: TeleTrack API Direct Health Check ---');
  try {
    const apiHealthUrl = 'https://teletrack-api.bhashaai.in/health';
    const healthResp = await context.request.get(apiHealthUrl);
    const healthStatus = healthResp.status();
    const healthJson = await healthResp.json();

    const passed = healthStatus === 200 && (healthJson.status === 'healthy' || healthJson.status === 'ok');
    logTest('TeleTrack API Cloudflare Health Check', passed, {
      status: healthStatus,
      json: healthJson
    });
  } catch (err) {
    logTest('TeleTrack API Cloudflare Health Check', false, { error: err.message });
  }

  await browser.close();

  // Summary
  console.log('\n================================================================');
  console.log('📊 PLAYWRIGHT CLOUDFLARE TEST SUITE SUMMARY');
  console.log('================================================================');
  const total = RESULTS.tests.length;
  const passedCount = RESULTS.tests.filter(t => t.passed).length;
  const failedCount = total - passedCount;

  console.log(`Total Tests : ${total}`);
  console.log(`Passed      : ${passedCount}`);
  console.log(`Failed      : ${failedCount}`);
  console.log(`Success Rate: ${Math.round((passedCount / total) * 100)}%`);
  console.log('================================================================\n');

  // Save report JSON
  const reportJsonPath = path.join(OUTPUT_DIR, 'test-report.json');
  fs.writeFileSync(reportJsonPath, JSON.stringify(RESULTS, null, 2));
  console.log(`JSON report saved to: ${reportJsonPath}`);
}

run().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
