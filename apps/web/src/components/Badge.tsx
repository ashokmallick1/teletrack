import React from 'react';
import { CallDirection, CallOutcome, DeviceStatus, LeadStatus } from '@callyzer/shared-types';

export const DirectionBadge: React.FC<{ direction: CallDirection }> = ({ direction }) => {
  switch (direction) {
    case 'INCOMING':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
          Incoming
        </span>
      );
    case 'OUTGOING':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
          Outgoing
        </span>
      );
    case 'MISSED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800">
          Missed
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
          Rejected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
          Unknown
        </span>
      );
  }
};

export const OutcomeBadge: React.FC<{ outcome: CallOutcome }> = ({ outcome }) => {
  switch (outcome) {
    case 'ANSWERED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800">
          Answered
        </span>
      );
    case 'MISSED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
          Missed
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
          Rejected
        </span>
      );
    case 'BUSY':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
          Busy
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
          {outcome}
        </span>
      );
  }
};

export const SyncStatusBadge: React.FC<{ status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'NEVER_SYNCED' }> = ({ status }) => {
  switch (status) {
    case 'HEALTHY':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-green-500"></span>
          Healthy
        </span>
      );
    case 'WARNING':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-500"></span>
          Delayed (&gt;1h)
        </span>
      );
    case 'CRITICAL':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-red-500"></span>
          Stale (&gt;24h)
        </span>
      );
    case 'NEVER_SYNCED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-slate-400"></span>
          Never Synced
        </span>
      );
  }
};

export const LeadStatusBadge: React.FC<{ status: LeadStatus }> = ({ status }) => {
  const styles: Record<LeadStatus, string> = {
    NEW: 'bg-blue-50 text-blue-700 border-blue-200',
    CONTACTED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    QUALIFIED: 'bg-amber-50 text-amber-700 border-amber-200',
    PROPOSAL: 'bg-purple-50 text-purple-700 border-purple-200',
    WON: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    LOST: 'bg-rose-50 text-rose-700 border-rose-200'
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[status]}`}>
      {status}
    </span>
  );
};
