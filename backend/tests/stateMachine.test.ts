import { describe, it, expect, beforeEach } from 'vitest';
import { CallStateMachine, InvalidStateTransitionError, CallStateConcurrencyError } from '../src/services/callStateMachine';
import { dbStore } from '../src/database/store';

describe('Call State Machine (Phase 5 Foundation)', () => {
  beforeEach(() => {
    dbStore.resetToSeed();
  });

  it('completes the full happy path state lifecycle: initiated -> answered_by_ai -> processing -> awaiting_staff -> bridged -> completed', async () => {
    // 1. Create fresh call in 'initiated' state
    const call = dbStore.createCall({
      callerNumber: '+15551234',
      callerName: 'Alice Tester',
      detectedIntent: 'admissions',
    });
    expect(call.status).toBe('initiated');

    // 2. Transition: initiated -> answered_by_ai
    const s1 = await CallStateMachine.transition(call.id, 'answered_by_ai', {
      reason: 'AI engine connected to SIP channel',
    });
    expect(s1.status).toBe('answered_by_ai');

    // 3. Transition: answered_by_ai -> processing
    const s2 = await CallStateMachine.transition(call.id, 'processing', {
      aiSummary: 'Caller requesting application deadline information',
    });
    expect(s2.status).toBe('processing');

    // 4. Transition: processing -> awaiting_staff
    const s3 = await CallStateMachine.transition(call.id, 'awaiting_staff', {
      assignedStaffId: '33333333-3333-3333-3333-333333333002',
    });
    expect(s3.status).toBe('awaiting_staff');

    // 5. Transition: awaiting_staff -> bridged
    const s4 = await CallStateMachine.transition(call.id, 'bridged', {
      reason: 'Staff extension 102 accepted call',
    });
    expect(s4.status).toBe('bridged');

    // 6. Transition: bridged -> completed
    const s5 = await CallStateMachine.transition(call.id, 'completed', {
      durationSeconds: 120,
    });
    expect(s5.status).toBe('completed');
    expect(s5.endedAt).toBeDefined();
    expect(s5.durationSeconds).toBe(120);

    // Verify audit logs were created
    const logs = dbStore.getAuditLogs(10);
    const transitionLogs = logs.filter((l) => l.action === 'CALL_STATE_TRANSITION');
    expect(transitionLogs.length).toBeGreaterThanOrEqual(5);
  });

  it('handles alternative branch: processing -> callback_requested -> completed', async () => {
    const call = dbStore.createCall({
      callerNumber: '+15559876',
      status: 'initiated',
    });

    await CallStateMachine.transition(call.id, 'answered_by_ai');
    await CallStateMachine.transition(call.id, 'processing');
    const s3 = await CallStateMachine.transition(call.id, 'callback_requested', {
      reason: 'Caller opted for callback during AI screening',
    });
    expect(s3.status).toBe('callback_requested');

    const s4 = await CallStateMachine.transition(call.id, 'completed');
    expect(s4.status).toBe('completed');
  });

  it('handles alternative branch: awaiting_staff -> rejected', async () => {
    const call = dbStore.createCall({
      callerNumber: '+15554321',
      status: 'initiated',
    });

    await CallStateMachine.transition(call.id, 'answered_by_ai');
    await CallStateMachine.transition(call.id, 'processing');
    await CallStateMachine.transition(call.id, 'awaiting_staff');

    const s4 = await CallStateMachine.transition(call.id, 'rejected', {
      reason: 'Staff rejected incoming screening notification',
    });
    expect(s4.status).toBe('rejected');
    expect(s4.endedAt).toBeDefined();
  });

  it('handles alternative branch: awaiting_staff -> timed_out', async () => {
    const call = dbStore.createCall({
      callerNumber: '+15554321',
      status: 'initiated',
    });

    await CallStateMachine.transition(call.id, 'answered_by_ai');
    await CallStateMachine.transition(call.id, 'processing');
    await CallStateMachine.transition(call.id, 'awaiting_staff');

    const s4 = await CallStateMachine.transition(call.id, 'timed_out', {
      reason: 'No staff answered within 20s routing timeout',
    });
    expect(s4.status).toBe('timed_out');
    expect(s4.endedAt).toBeDefined();
  });

  it('rejects invalid state transition (initiated -> bridged) with InvalidStateTransitionError', async () => {
    const call = dbStore.createCall({
      callerNumber: '+15551111',
      status: 'initiated',
    });

    await expect(CallStateMachine.transition(call.id, 'bridged')).rejects.toThrow(
      InvalidStateTransitionError
    );

    const callAfter = dbStore.getCallById(call.id);
    expect(callAfter?.status).toBe('initiated');
  });

  it('rejects invalid state transition from terminal state (completed -> processing)', async () => {
    const call = dbStore.createCall({
      callerNumber: '+15552222',
      status: 'completed',
    });

    await expect(CallStateMachine.transition(call.id, 'processing')).rejects.toThrow(
      InvalidStateTransitionError
    );
  });

  it('protects against duplicate state transition (idempotency)', async () => {
    const call = dbStore.createCall({
      callerNumber: '+15553333',
      status: 'initiated',
    });

    // Requesting transition to current state 'initiated'
    const result = await CallStateMachine.transition(call.id, 'initiated');
    expect(result.status).toBe('initiated');
  });

  it('protects against concurrent transitions using mutex locks', async () => {
    const call = dbStore.createCall({
      callerNumber: '+15554444',
      status: 'initiated',
    });

    // Acquire lock manually to simulate concurrent worker in progress
    dbStore.acquireCallLock(call.id);

    // Attempting state transition while locked must fail with CallStateConcurrencyError
    await expect(CallStateMachine.transition(call.id, 'answered_by_ai')).rejects.toThrow(
      CallStateConcurrencyError
    );

    // Release manual lock and verify transition now succeeds
    dbStore.releaseCallLock(call.id);
    const success = await CallStateMachine.transition(call.id, 'answered_by_ai');
    expect(success.status).toBe('answered_by_ai');
  });
});
