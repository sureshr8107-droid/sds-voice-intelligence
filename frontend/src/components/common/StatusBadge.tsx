import React from 'react';
import {
  CallStatus,
  AvailabilityStatus,
  DependencyStatus,
  UserRole,
  HealthStatus,
} from '@call-screening/shared';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  PhoneForwarded,
  XCircle,
  PhoneCall,
  UserCheck,
  Shield,
  Headphones,
} from 'lucide-react';

interface StatusBadgeProps {
  type?: 'call' | 'availability' | 'dependency' | 'role' | 'health';
  value: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type = 'call', value, className = '' }) => {
  // Call status
  if (type === 'call') {
    const callStatus = value as CallStatus;
    switch (callStatus) {
      case 'completed':
        return (
          <span className={`badge-status badge-status-completed ${className}`}>
            <CheckCircle2 size={12} />
            <span>Completed</span>
          </span>
        );
      case 'bridged':
      case 'answered_by_ai':
      case 'processing':
      case 'connecting':
        return (
          <span className={`badge-status badge-status-bridged ${className}`}>
            <PhoneForwarded size={12} />
            <span>{callStatus.replace(/_/g, ' ')}</span>
          </span>
        );
      case 'awaiting_staff':
      case 'ringing':
      case 'initiated':
        return (
          <span className={`badge-status badge-status-awaiting_staff ${className}`}>
            <Clock size={12} />
            <span>{callStatus.replace(/_/g, ' ')}</span>
          </span>
        );
      case 'rejected':
      case 'timed_out':
      case 'failed':
        return (
          <span className={`badge-status badge-status-rejected ${className}`}>
            <XCircle size={12} />
            <span>{callStatus.replace(/_/g, ' ')}</span>
          </span>
        );
      case 'callback_requested':
        return (
          <span className={`badge-status badge-status-callback_requested ${className}`}>
            <PhoneCall size={12} />
            <span>Callback Queued</span>
          </span>
        );
      default:
        return (
          <span className={`badge-status badge-not-configured ${className}`}>
            <span>{value}</span>
          </span>
        );
    }
  }

  // Availability status
  if (type === 'availability') {
    const avail = value as AvailabilityStatus;
    switch (avail) {
      case 'available':
        return (
          <span className={`badge-status badge-avail-available ${className}`}>
            <UserCheck size={12} />
            <span>Available</span>
          </span>
        );
      case 'busy':
      case 'do_not_disturb':
        return (
          <span className={`badge-status badge-avail-busy ${className}`}>
            <XCircle size={12} />
            <span>{avail === 'do_not_disturb' ? 'Do Not Disturb' : 'Busy'}</span>
          </span>
        );
      case 'away':
        return (
          <span className={`badge-status badge-avail-away ${className}`}>
            <Clock size={12} />
            <span>Away</span>
          </span>
        );
      case 'offline':
      default:
        return (
          <span className={`badge-status badge-avail-offline ${className}`}>
            <AlertCircle size={12} />
            <span>Offline</span>
          </span>
        );
    }
  }

  // Dependency status
  if (type === 'dependency') {
    const dep = value as DependencyStatus;
    if (dep === 'connected') {
      return (
        <span className={`badge-healthy ${className}`}>
          <CheckCircle2 size={13} />
          <span>Connected</span>
        </span>
      );
    }
    if (dep === 'not_configured') {
      return (
        <span className={`badge-not-configured ${className}`}>
          <Clock size={13} />
          <span>Not Configured</span>
        </span>
      );
    }
    return (
      <span className={`badge-error ${className}`}>
        <AlertCircle size={13} />
        <span>Error</span>
      </span>
    );
  }

  // Health status
  if (type === 'health') {
    const health = value as HealthStatus;
    if (health === 'healthy') {
      return (
        <span className={`badge-healthy ${className}`}>
          <CheckCircle2 size={13} />
          <span>Healthy</span>
        </span>
      );
    }
    return (
      <span className={`badge-error ${className}`}>
        <AlertCircle size={13} />
        <span>{health}</span>
      </span>
    );
  }

  // User Role
  if (type === 'role') {
    const role = value as UserRole;
    if (role === 'admin') {
      return (
        <span className="badge bg-danger bg-opacity-25 text-danger border border-danger border-opacity-25 px-2 py-1 rounded-pill d-inline-flex align-items-center gap-1">
          <Shield size={12} />
          <span>Admin</span>
        </span>
      );
    }
    if (role === 'operator') {
      return (
        <span className="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-25 px-2 py-1 rounded-pill d-inline-flex align-items-center gap-1">
          <Headphones size={12} />
          <span>Operator</span>
        </span>
      );
    }
    return (
      <span className="badge bg-info bg-opacity-25 text-info border border-info border-opacity-25 px-2 py-1 rounded-pill d-inline-flex align-items-center gap-1">
        <UserCheck size={12} />
        <span>Staff</span>
      </span>
    );
  }

  return <span className="badge bg-secondary">{value}</span>;
};
