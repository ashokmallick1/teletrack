import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getDatabase } from '../db';
import { UserRole } from '@teletrack/shared-types';

export const JWT_SECRET = process.env.JWT_SECRET || 'teletrack-super-secret-jwt-key-2026';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  isSuperAdmin: boolean;
}

export interface AuthenticatedDevice {
  id: string;
  organizationId: string;
  employeeId: string;
  deviceIdentifier: string;
  deviceName: string;
}

export interface AuthenticatedDesktopDevice {
  id: string;
  organizationId: string;
  employeeId: string;
  hostname: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      organizationId?: string;
      membership?: {
        id: string;
        role: UserRole;
        teamId?: string;
      };
      device?: AuthenticatedDevice;
      desktopDevice?: AuthenticatedDesktopDevice;
    }
  }
}

export async function requireUserAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', message: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const db = getDatabase();
    const profile = await db.findProfileById(payload.sub || payload.id);
    if (!profile) {
      res.status(401).json({ error: 'Unauthorized', message: 'User profile not found' });
      return;
    }

    req.user = {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      isSuperAdmin: profile.isSuperAdmin
    };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}

export async function requireOrgMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const orgId = (req.headers['x-organization-id'] as string) || req.params.organizationId || req.query.organizationId as string;
  if (!orgId) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing organization identifier (x-organization-id header)' });
    return;
  }

  const db = getDatabase();

  // Super admins have universal access
  if (req.user.isSuperAdmin) {
    req.organizationId = orgId;
    req.membership = {
      id: 'super-admin-membership',
      role: 'SUPER_ADMIN' as UserRole
    };
    next();
    return;
  }

  const membership = await db.getMembership(orgId, req.user.id);
  if (!membership || !membership.isActive) {
    res.status(403).json({ error: 'Forbidden', message: 'You are not a member of this organization' });
    return;
  }

  req.organizationId = orgId;
  req.membership = {
    id: membership.id,
    role: membership.role,
    teamId: membership.teamId
  };
  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.user?.isSuperAdmin) {
      next();
      return;
    }

    if (!req.membership || !allowedRoles.includes(req.membership.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Requires one of roles: [${allowedRoles.join(', ')}]`
      });
      return;
    }
    next();
  };
}

export async function requireDeviceAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const apiKey = req.headers['x-device-api-key'] as string;
  if (!apiKey) {
    res.status(401).json({ error: 'Unauthorized', message: 'Missing x-device-api-key header' });
    return;
  }

  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const db = getDatabase();
  const device = await db.findDeviceByApiKeyHash(apiKeyHash);

  if (!device) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or revoked device API key' });
    return;
  }

  req.device = {
    id: device.id,
    organizationId: device.organizationId,
    employeeId: device.employeeId,
    deviceIdentifier: device.deviceIdentifier,
    deviceName: device.deviceName
  };
  next();
}

export async function requireDesktopAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const apiKey = (req.headers['x-desktop-api-key'] || req.headers['x-device-api-key']) as string;
  if (!apiKey) {
    res.status(401).json({ error: 'Unauthorized', message: 'Missing x-desktop-api-key header' });
    return;
  }

  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const db = getDatabase();
  const desktop = await db.findDesktopDeviceByApiKeyHash(apiKeyHash);

  if (!desktop) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or revoked desktop API key' });
    return;
  }

  req.desktopDevice = {
    id: desktop.id,
    organizationId: desktop.organizationId,
    employeeId: desktop.employeeId,
    hostname: desktop.hostname
  };
  next();
}
