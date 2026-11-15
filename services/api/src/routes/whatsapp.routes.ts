import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { WhatsAppTemplate } from '@teletrack/shared-types';
import { evolutionApi } from '../services/evolution-api.service';

export const whatsappRouter = Router();

/**
 * GET /api/v1/whatsapp/templates
 * Retrieve available WhatsApp message templates
 */
whatsappRouter.get('/templates', async (_req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const templates = await db.getWhatsAppTemplates();
  res.json({ success: true, count: templates.length, data: templates });
});

/**
 * POST /api/v1/whatsapp/generate-link
 * Generate a pre-filled https://wa.me/ link with template variable substitutions
 */
whatsappRouter.post('/generate-link', async (req: Request, res: Response): Promise<void> => {
  const db = getDatabase();
  const { phoneNumber, templateId, customMessage, variables } = req.body;

  if (!phoneNumber) {
    res.status(400).json({ error: 'Bad Request', message: 'phoneNumber is required' });
    return;
  }

  // Clean phone number (strip spaces, hyphens, brackets, ensure digits only)
  let cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone; // Default to India prefix if 10-digit
  }

  let text = customMessage || '';

  if (templateId) {
    const templates = await db.getWhatsAppTemplates();
    const template = templates.find(t => t.id === templateId);
    if (template) {
      text = template.templateText;
      const vars = {
        name: 'Valued Client',
        callerName: 'TeleTrack Team',
        company: 'TeleTrack',
        link: 'https://teletrack.bhashaai.in/pricing',
        time: 'tomorrow at 11:00 AM',
        apkUrl: 'https://teletrack.bhashaai.in/teletrack.apk',
        desktopUrl: 'https://teletrack.bhashaai.in/teletrack-desktop.zip',
        orgSlug: 'acme-teleservices',
        ...(variables || {})
      };

      for (const [key, val] of Object.entries(vars)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        text = text.replace(regex, String(val));
      }
    }
  }

  const encodedText = encodeURIComponent(text);
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

  res.json({
    success: true,
    phoneNumber: cleanPhone,
    messageText: text,
    whatsappUrl: waUrl
  });
});

/**
 * Evolution API WhatsApp Gateway Integration
 */

// GET /api/v1/whatsapp/evolution/status
whatsappRouter.get('/evolution/status', async (req: Request, res: Response): Promise<void> => {
  const instanceName = (req.query.instanceName as string) || undefined;
  const status = await evolutionApi.getInstanceStatus(instanceName);
  res.json({ success: true, data: status });
});

// POST /api/v1/whatsapp/evolution/connect
whatsappRouter.post('/evolution/connect', async (req: Request, res: Response): Promise<void> => {
  const { instanceName } = req.body;
  const status = await evolutionApi.connectInstance(instanceName);
  res.json({ success: true, data: status });
});

// POST /api/v1/whatsapp/evolution/disconnect
whatsappRouter.post('/evolution/disconnect', async (req: Request, res: Response): Promise<void> => {
  const { instanceName } = req.body;
  await evolutionApi.disconnectInstance(instanceName);
  res.json({ success: true, message: 'Instance disconnected successfully' });
});

// POST /api/v1/whatsapp/evolution/config
whatsappRouter.post('/evolution/config', async (req: Request, res: Response): Promise<void> => {
  const { apiUrl, apiKey, instanceName } = req.body;
  evolutionApi.updateConfiguration(apiUrl, apiKey, instanceName);
  const status = await evolutionApi.getInstanceStatus();
  res.json({ success: true, data: status });
});

// POST /api/v1/whatsapp/evolution/send
whatsappRouter.post('/evolution/send', async (req: Request, res: Response): Promise<void> => {
  const { phoneNumber, messageText, templateId, variables, mediaUrl, mediaType, fileName, instanceName } = req.body;

  if (!phoneNumber) {
    res.status(400).json({ error: 'Bad Request', message: 'phoneNumber is required' });
    return;
  }

  const db = getDatabase();
  let text = messageText || '';

  if (templateId) {
    const templates = await db.getWhatsAppTemplates();
    const template = templates.find(t => t.id === templateId);
    if (template) {
      text = template.templateText;
      const vars = {
        name: 'Valued Client',
        callerName: 'TeleTrack Team',
        company: 'TeleTrack',
        link: 'https://teletrack.bhashaai.in/pricing',
        time: 'tomorrow at 11:00 AM',
        apkUrl: 'https://teletrack.bhashaai.in/teletrack.apk',
        desktopUrl: 'https://teletrack.bhashaai.in/teletrack-desktop.zip',
        orgSlug: 'acme-teleservices',
        ...(variables || {})
      };

      for (const [key, val] of Object.entries(vars)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        text = text.replace(regex, String(val));
      }
    }
  }

  let result;
  if (mediaUrl) {
    result = await evolutionApi.sendMediaMessage(phoneNumber, mediaUrl, text, mediaType || 'document', fileName, instanceName);
  } else {
    result = await evolutionApi.sendTextMessage(phoneNumber, text, instanceName);
  }

  res.json({
    success: true,
    data: result
  });
});

// POST /api/v1/whatsapp/evolution/webhook
// Inbound event hook from Evolution API
whatsappRouter.post('/evolution/webhook', async (req: Request, res: Response): Promise<void> => {
  const event = req.body;
  // Evolution API sends { event: 'messages.upsert', data: { ... } }
  console.log(`[Evolution API Webhook] Received event: ${event?.event || 'generic'}`);
  res.json({ success: true, status: 'RECEIVED' });
});

