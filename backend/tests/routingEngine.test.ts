import { describe, it, expect, beforeEach } from 'vitest';
import { RoutingEngine } from '../src/services/routingEngine';
import { dbStore } from '../src/database/store';

describe('Intelligent Call Routing Engine (Phase 5)', () => {
  beforeEach(() => {
    dbStore.resetToSeed();
  });

  it('routes call to Admissions department staff when intent is "admissions"', async () => {
    const call = dbStore.createCall({
      callerNumber: '+15551234',
      callerName: 'Prospective Student',
      detectedIntent: 'admissions',
    });

    const decision = await RoutingEngine.evaluateAndRoute({
      callId: call.id,
      detectedIntent: 'admissions',
      callerNumber: call.callerNumber,
      ignoreScheduleBounds: true,
    });

    expect(decision.success).toBe(true);
    expect(decision.isFallback).toBe(false);
    expect(decision.department?.code).toBe('ADM');
    expect(decision.assignedStaff?.extension).toBe('102'); // Prof. Robert Miller (priority 1)

    // Check call record updated in database
    const updated = dbStore.getCallById(call.id);
    expect(updated?.departmentId).toBe(decision.department?.id);
    expect(updated?.assignedStaffId).toBe(decision.assignedStaff?.id);

    // Verify audit log
    const logs = dbStore.getAuditLogs(5);
    const routingLog = logs.find((l) => l.action === 'CALL_ROUTING_DECISION');
    expect(routingLog).toBeDefined();
    expect(routingLog?.details?.departmentName).toBe('Admissions & Enrollment');
  });

  it('routes call to Examination department staff when intent is "hall ticket"', async () => {
    const call = dbStore.createCall({
      callerNumber: '+15555678',
      callerName: 'Student Hall Ticket Inquiry',
    });

    // In seed, Clara Oswald (ext 103) is set to 'busy'.
    // Let's set her availability to 'available' to verify happy path
    dbStore.updateStaffAvailability('33333333-3333-3333-3333-333333333003', 'available');

    const decision = await RoutingEngine.evaluateAndRoute({
      callId: call.id,
      detectedIntent: 'hall ticket',
      callerNumber: call.callerNumber,
      ignoreScheduleBounds: true,
    });

    expect(decision.success).toBe(true);
    expect(decision.isFallback).toBe(false);
    expect(decision.department?.code).toBe('EXM');
    expect(decision.assignedStaff?.extension).toBe('103');
  });

  it('triggers fallback to voicemail and queues callback when no staff is available', async () => {
    const call = dbStore.createCall({
      callerNumber: '+15559999',
      callerName: 'Unassisted Caller',
    });

    // Set all staff in Admissions (102 and 105) to 'busy' or 'offline'
    dbStore.updateStaffAvailability('33333333-3333-3333-3333-333333333002', 'busy');
    dbStore.updateStaffAvailability('33333333-3333-3333-3333-333333333005', 'offline');

    const decision = await RoutingEngine.evaluateAndRoute({
      callId: call.id,
      detectedIntent: 'admissions',
      callerNumber: call.callerNumber,
      ignoreScheduleBounds: true,
    });

    expect(decision.success).toBe(true);
    expect(decision.isFallback).toBe(true);
    expect(decision.fallbackType).toBe('voicemail');
    expect(decision.callbackCreated).toBeDefined();
    expect(decision.callbackCreated?.callerNumber).toBe('+15559999');
    expect(decision.callbackCreated?.status).toBe('pending');

    // Call status updated to callback_requested
    const updated = dbStore.getCallById(call.id);
    expect(updated?.status).toBe('callback_requested');
  });

  it('triggers fallback to operator when routing rule specifies operator destination', async () => {
    const call = dbStore.createCall({
      callerNumber: '+15558888',
      callerName: 'Exam Inquirer',
    });

    // In seed, rule for 'examination' has fallback_destination_type = 'operator', fallback value = '105'
    // Staff in Examination (Clara Oswald 103) is busy by default in seed
    const decision = await RoutingEngine.evaluateAndRoute({
      callId: call.id,
      detectedIntent: 'examination',
      callerNumber: call.callerNumber,
      ignoreScheduleBounds: true,
    });

    expect(decision.success).toBe(true);
    expect(decision.isFallback).toBe(true);
    expect(decision.fallbackType).toBe('operator');
    expect(decision.assignedStaff?.extension).toBe('105'); // Operator Sarah Connor
  });

  it('evaluates shift schedule correctly based on workDays and workingHours', () => {
    const avail = dbStore.getStaffAvailability('33333333-3333-3333-3333-333333333001')!;

    // Tuesday (day 2) at 11:00 AM -> inside working hours
    const onShiftDate = new Date('2026-11-03T11:00:00'); // Tuesday
    expect(RoutingEngine.isStaffOnShift(avail, onShiftDate)).toBe(true);

    // Tuesday at 23:00 PM -> outside working hours
    const offShiftDate = new Date('2026-11-03T23:00:00');
    expect(RoutingEngine.isStaffOnShift(avail, offShiftDate)).toBe(false);

    // Sunday (day 7) -> not in workDays [1,2,3,4,5]
    const sundayDate = new Date('2026-11-08T11:00:00'); // Sunday
    expect(RoutingEngine.isStaffOnShift(avail, sundayDate)).toBe(false);
  });
});
