import { CallRecord, CallStatus } from '@call-screening/shared';
import { dbStore } from '../database/store';
import { logger } from '../utils/logger';
import { emitCallStatusChanged, emitCallUpdated } from '../socket';

/**
 * Custom error for invalid call state transitions
 */
export class InvalidStateTransitionError extends Error {
  public readonly code = 'INVALID_STATE_TRANSITION';
  public readonly statusCode = 400;
  public readonly currentStatus: CallStatus;
  public readonly targetStatus: CallStatus;
  public readonly permittedTransitions: CallStatus[];

  constructor(currentStatus: CallStatus, targetStatus: CallStatus, permitted: CallStatus[]) {
    super(
      `Invalid call state transition from '${currentStatus}' to '${targetStatus}'. Permitted transitions from '${currentStatus}': [${permitted.join(', ')}].`
    );
    this.name = 'InvalidStateTransitionError';
    this.currentStatus = currentStatus;
    this.targetStatus = targetStatus;
    this.permittedTransitions = permitted;
  }
}

/**
 * Custom error for concurrent call state transition conflicts
 */
export class CallStateConcurrencyError extends Error {
  public readonly code = 'CALL_STATE_CONCURRENCY_CONFLICT';
  public readonly statusCode = 409;

  constructor(callId: string) {
    super(`State transition for call '${callId}' is locked by a concurrent operation. Please retry.`);
    this.name = 'CallStateConcurrencyError';
  }
}

/**
 * Permitted transitions finite state mapping
 * Reconciled between required Phase 5 core states and existing PostgreSQL database schema constraints
 */
export const PERMITTED_TRANSITIONS: Record<CallStatus, readonly CallStatus[]> = {
  initiated: ['ringing', 'answered_by_ai', 'failed'],
  ringing: ['answered_by_ai', 'rejected', 'failed', 'completed'],
  answered_by_ai: ['processing', 'failed', 'completed'],
  processing: ['awaiting_staff', 'callback_requested', 'completed', 'failed'],
  awaiting_staff: ['connecting', 'bridged', 'rejected', 'timed_out', 'callback_requested', 'failed'],
  connecting: ['bridged', 'failed', 'completed'],
  bridged: ['completed', 'failed'],
  rejected: ['callback_requested', 'completed'],
  timed_out: ['callback_requested', 'completed'],
  callback_requested: ['completed'],
  failed: [],
  completed: [],
} as const;

export interface StateTransitionOptions {
  reason?: string;
  assignedStaffId?: string;
  durationSeconds?: number;
  aiSummary?: string;
  userId?: string;
  ipAddress?: string;
}

export class CallStateMachine {
  /**
   * Check if a transition is valid according to the finite state machine
   */
  public static canTransition(current: CallStatus, target: CallStatus): boolean {
    const permitted = PERMITTED_TRANSITIONS[current] || [];
    return permitted.includes(target);
  }

  /**
   * Get permitted target states for a given call status
   */
  public static getPermittedTransitions(current: CallStatus): readonly CallStatus[] {
    return PERMITTED_TRANSITIONS[current] || [];
  }

  /**
   * Execute a state transition on a call record with full concurrency protection,
   * duplicate protection, database persistence, audit logging, and real-time event emission.
   */
  public static async transition(
    callId: string,
    targetStatus: CallStatus,
    options: StateTransitionOptions = {}
  ): Promise<CallRecord> {
    // 1. Acquire mutex lock for concurrency protection
    const acquired = dbStore.acquireCallLock(callId);
    if (!acquired) {
      logger.warn({ callId, targetStatus }, 'Concurrent state transition conflict detected');
      throw new CallStateConcurrencyError(callId);
    }

    try {
      // 2. Fetch current call record
      const call = dbStore.getCallById(callId);
      if (!call) {
        const notFoundErr = new Error(`Call record '${callId}' not found.`);
        (notFoundErr as any).code = 'CALL_NOT_FOUND';
        (notFoundErr as any).statusCode = 404;
        throw notFoundErr;
      }

      const previousStatus = call.status;

      // 3. Duplicate transition protection (Idempotency)
      if (previousStatus === targetStatus) {
        logger.info(
          { callId, status: targetStatus },
          'Duplicate state transition requested; returning current call record idempotently'
        );
        return call;
      }

      // 4. Validate transition against permitted state table
      const permitted = this.getPermittedTransitions(previousStatus);
      if (!this.canTransition(previousStatus, targetStatus)) {
        logger.warn(
          { callId, previousStatus, targetStatus, permitted },
          'Rejected invalid call state transition'
        );
        throw new InvalidStateTransitionError(previousStatus, targetStatus, [...permitted]);
      }

      // 5. Prepare state updates and timestamps
      const now = new Date().toISOString();
      const updates: Partial<CallRecord> = {
        status: targetStatus,
        updatedAt: now,
      };

      if (options.reason) updates.reason = options.reason;
      if (options.assignedStaffId) updates.assignedStaffId = options.assignedStaffId;
      if (options.aiSummary) updates.aiSummary = options.aiSummary;

      // Terminal or call-ending states: finalize duration and ended_at
      const terminalStatuses: CallStatus[] = ['completed', 'failed', 'rejected', 'timed_out'];
      if (terminalStatuses.includes(targetStatus) && !call.endedAt) {
        updates.endedAt = now;
        if (options.durationSeconds !== undefined) {
          updates.durationSeconds = options.durationSeconds;
        } else {
          const startedMs = new Date(call.startedAt).getTime();
          const duration = Math.max(0, Math.round((Date.now() - startedMs) / 1000));
          updates.durationSeconds = duration;
        }
      }

      // 6. Persist state changes in database
      const updatedCall = dbStore.updateCall(callId, updates);
      if (!updatedCall) {
        throw new Error(`Failed to update call record '${callId}' in database.`);
      }

      // 7. Audit log transition
      dbStore.addAuditLog({
        userId: options.userId,
        action: 'CALL_STATE_TRANSITION',
        entityType: 'call',
        entityId: callId,
        details: {
          previousStatus,
          targetStatus,
          reason: options.reason || updates.reason,
          assignedStaffId: updates.assignedStaffId,
          durationSeconds: updatedCall.durationSeconds,
          timestamp: now,
        },
        ipAddress: options.ipAddress,
      });

      logger.info(
        { callId, previousStatus, targetStatus, durationSeconds: updatedCall.durationSeconds },
        `Call state successfully transitioned: ${previousStatus} -> ${targetStatus}`
      );

      // 8. Real-time event notifications via Socket.IO
      try {
        emitCallStatusChanged(callId, previousStatus, targetStatus, options.reason);
        emitCallUpdated(updatedCall);
      } catch (err) {
        logger.error({ err, callId }, 'Failed to emit socket notification for call state transition');
      }

      return updatedCall;
    } finally {
      // 9. Release lock
      dbStore.releaseCallLock(callId);
    }
  }
}
