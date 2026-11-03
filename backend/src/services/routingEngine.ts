import {
  Department,
  RoutingRule,
  StaffExtension,
  StaffAvailability,
  CallRecord,
  CallbackRequest,
} from '@call-screening/shared';
import { dbStore } from '../database/store';
import { logger } from '../utils/logger';
import { emitCallRoutingUpdated, emitCallbackCreated } from '../socket';

export interface RoutingEvaluationRequest {
  callId: string;
  detectedIntent?: string;
  targetDepartmentId?: string;
  callerNumber: string;
  callerName?: string;
  referenceTime?: Date;
  ignoreScheduleBounds?: boolean; // For testing deterministic routing regardless of wall clock
}

export interface RoutingDecision {
  success: boolean;
  department?: Department;
  matchedRule?: RoutingRule;
  assignedStaff?: StaffExtension;
  isFallback: boolean;
  fallbackType?: 'operator' | 'voicemail' | 'extension' | 'external_number';
  fallbackDestination?: string;
  callbackCreated?: CallbackRequest;
  reason: string;
}

export class RoutingEngine {
  /**
   * Check whether a staff member is currently within their scheduled working hours and days
   */
  public static isStaffOnShift(
    avail: StaffAvailability,
    referenceTime: Date = new Date()
  ): boolean {
    const jsDay = referenceTime.getDay();
    const dayNumber = jsDay === 0 ? 7 : jsDay; // 1=Mon .. 7=Sun

    if (avail.workDays && avail.workDays.length > 0) {
      if (!avail.workDays.includes(dayNumber)) {
        return false;
      }
    }

    if (avail.workingHoursStart && avail.workingHoursEnd) {
      const pad = (n: number) => String(n).padStart(2, '0');
      const currentHms = `${pad(referenceTime.getHours())}:${pad(referenceTime.getMinutes())}:${pad(
        referenceTime.getSeconds()
      )}`;
      if (currentHms < avail.workingHoursStart || currentHms > avail.workingHoursEnd) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate inbound call parameters and route to eligible staff or appropriate fallback destination
   */
  public static async evaluateAndRoute(
    request: RoutingEvaluationRequest
  ): Promise<RoutingDecision> {
    const {
      callId,
      detectedIntent,
      targetDepartmentId,
      callerNumber,
      callerName,
      referenceTime = new Date(),
      ignoreScheduleBounds = false,
    } = request;

    logger.info({ callId, detectedIntent, targetDepartmentId }, 'Starting intelligent call routing evaluation');

    let targetDept: Department | undefined;
    let matchedRule: RoutingRule | undefined;

    // 1. Direct Department Assignment or Keyword Evaluation
    if (targetDepartmentId) {
      targetDept = dbStore.getDepartmentById(targetDepartmentId);
    }

    if (!targetDept && detectedIntent) {
      const activeRules = dbStore.getRoutingRules(true);
      const cleanIntent = detectedIntent.toLowerCase().trim();

      // Find highest priority matching rule
      for (const rule of activeRules) {
        const keyword = rule.intentKeyword.toLowerCase().trim();
        if (cleanIntent.includes(keyword) || keyword.includes(cleanIntent)) {
          matchedRule = rule;
          targetDept = dbStore.getDepartmentById(rule.departmentId);
          break;
        }
      }
    }

    // If still no department found, fallback to default Admissions department or first active
    if (!targetDept) {
      const allDepts = dbStore.getDepartments(true);
      targetDept = allDepts[0];
    }

    if (!targetDept) {
      const failureDecision: RoutingDecision = {
        success: false,
        isFallback: true,
        fallbackType: 'voicemail',
        reason: 'No active departments configured in the system.',
      };
      return failureDecision;
    }

    // 2. Fetch staff extensions assigned to target department
    const candidateExtensions = dbStore.getStaffExtensionsByDepartment(targetDept.id);

    // 3. Filter candidates by real-time presence and schedule availability
    const eligibleStaff: { extension: StaffExtension; availability: StaffAvailability }[] = [];

    for (const ext of candidateExtensions) {
      const avail = dbStore.getStaffAvailability(ext.id);
      if (!avail) continue;

      if (avail.status === 'available') {
        const onShift = ignoreScheduleBounds || this.isStaffOnShift(avail, referenceTime);
        if (onShift) {
          eligibleStaff.push({ extension: ext, availability: avail });
        }
      }
    }

    // 4. Eligible Staff Selection: Sort by priorityOrder (1 = primary)
    eligibleStaff.sort((a, b) => a.extension.priorityOrder - b.extension.priorityOrder);

    // 5. Successful Staff Assignment
    if (eligibleStaff.length > 0) {
      const selected = eligibleStaff[0].extension;

      // Update call record
      dbStore.updateCall(callId, {
        departmentId: targetDept.id,
        assignedStaffId: selected.id,
        detectedIntent: detectedIntent || matchedRule?.intentKeyword,
      });

      // Audit log decision
      dbStore.addAuditLog({
        action: 'CALL_ROUTING_DECISION',
        entityType: 'call',
        entityId: callId,
        details: {
          departmentId: targetDept.id,
          departmentName: targetDept.name,
          assignedStaffId: selected.id,
          extension: selected.extension,
          matchedKeyword: matchedRule?.intentKeyword,
          candidateCount: candidateExtensions.length,
          eligibleCount: eligibleStaff.length,
          fallbackTriggered: false,
        },
      });

      const decision: RoutingDecision = {
        success: true,
        department: targetDept,
        matchedRule,
        assignedStaff: selected,
        isFallback: false,
        reason: `Routed to staff extension ${selected.extension} (${targetDept.name})`,
      };

      try {
        emitCallRoutingUpdated(callId, {
          departmentId: targetDept.id,
          assignedStaffId: selected.id,
          ruleId: matchedRule?.id,
          intent: detectedIntent,
          fallback: false,
        });
      } catch (err) {
        logger.error({ err, callId }, 'Failed to emit socket routing update');
      }

      return decision;
    }

    // 6. Fallback Routing (No available staff in target department)
    logger.warn(
      { callId, department: targetDept.name },
      'No available staff on shift for target department. Executing fallback routing strategy.'
    );

    const fallbackType = matchedRule?.fallbackDestinationType || 'voicemail';
    const fallbackVal = matchedRule?.fallbackDestinationValue;

    let callbackCreated: CallbackRequest | undefined;
    let fallbackStaff: StaffExtension | undefined;

    if (fallbackType === 'operator') {
      // 1. If explicit operator extension configured in rule (e.g. '105'), use that
      if (fallbackVal) {
        fallbackStaff = Array.from(dbStore.getAllStaffExtensions()).find(
          (e) => e.extension === fallbackVal && e.isActive
        );
      }

      // 2. Otherwise search for an available staff member with 'operator' role
      if (!fallbackStaff) {
        const allExtensions = dbStore.getAllStaffExtensions();
        for (const s of allExtensions) {
          if (!s.isActive) continue;
          const profile = dbStore.getProfileById(s.profileId);
          if (profile?.role === 'operator') {
            const avail = dbStore.getStaffAvailability(s.id);
            if (avail && avail.status === 'available') {
              fallbackStaff = s;
              break;
            }
          }
        }
      }
    } else if (fallbackType === 'extension' && fallbackVal) {
      fallbackStaff = Array.from(dbStore.getAllStaffExtensions()).find(
        (e) => e.extension === fallbackVal && e.isActive
      );
    } else {
      // Default to voicemail / callback queue
      callbackCreated = dbStore.createCallback({
        callId,
        callerNumber,
        callerName,
        requestedDepartmentId: targetDept.id,
        transcriptSummary: `Automated fallback queue: Caller reached ${targetDept.name}, but all staff members are currently unavailable.`,
        notes: `Detected intent: ${detectedIntent || 'Unspecified'}. Rule: ${matchedRule?.intentKeyword || 'Default fallback'}.`,
        status: 'pending',
      });

      try {
        emitCallbackCreated(callbackCreated);
      } catch (err) {
        logger.error({ err }, 'Failed to emit socket callback created event');
      }
    }

    // Update call record
    dbStore.updateCall(callId, {
      departmentId: targetDept.id,
      assignedStaffId: fallbackStaff?.id,
      detectedIntent: detectedIntent || matchedRule?.intentKeyword,
      status: callbackCreated ? 'callback_requested' : 'awaiting_staff',
    });

    // Audit log fallback decision
    dbStore.addAuditLog({
      action: 'CALL_ROUTING_DECISION',
      entityType: 'call',
      entityId: callId,
      details: {
        departmentId: targetDept.id,
        departmentName: targetDept.name,
        fallbackTriggered: true,
        fallbackType,
        fallbackDestination: fallbackVal || (callbackCreated ? 'callback_queue' : undefined),
        assignedStaffId: fallbackStaff?.id,
        callbackId: callbackCreated?.id,
      },
    });

    const fallbackDecision: RoutingDecision = {
      success: true,
      department: targetDept,
      matchedRule,
      assignedStaff: fallbackStaff,
      isFallback: true,
      fallbackType,
      fallbackDestination: fallbackVal,
      callbackCreated,
      reason: callbackCreated
        ? `No staff available. Queued caller to ${targetDept.name} voicemail/callback queue.`
        : `Routed to fallback destination: ${fallbackType} (${fallbackVal || fallbackStaff?.extension})`,
    };

    try {
      emitCallRoutingUpdated(callId, {
        departmentId: targetDept.id,
        assignedStaffId: fallbackStaff?.id,
        ruleId: matchedRule?.id,
        intent: detectedIntent,
        fallback: true,
      });
    } catch (err) {
      logger.error({ err, callId }, 'Failed to emit socket routing fallback update');
    }

    return fallbackDecision;
  }
}
