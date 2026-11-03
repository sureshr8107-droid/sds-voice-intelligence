import crypto from 'crypto';
import {
  Department,
  StaffExtension,
  StaffAvailability,
  RoutingRule,
  CallRecord,
  CallTranscript,
  CallbackRequest,
  AuditLog,
  UserProfile,
  CallStatus,
  AvailabilityStatus,
  StaffSummary,
} from '@call-screening/shared';
import { hashPassword } from '../utils/security';

export interface UserCredential {
  profile: UserProfile;
  passwordHash: string;
}

class DatabaseStore {
  private profiles = new Map<string, UserProfile>();
  private credentials = new Map<string, UserCredential>(); // Key: email.toLowerCase()
  private departments = new Map<string, Department>();
  private staffExtensions = new Map<string, StaffExtension>();
  private staffAvailability = new Map<string, StaffAvailability>();
  private routingRules = new Map<string, RoutingRule>();
  private calls = new Map<string, CallRecord>();
  private callTranscripts: CallTranscript[] = [];
  private callbacks = new Map<string, CallbackRequest>();
  private auditLogs: AuditLog[] = [];

  // Mutex locks for call state concurrency protection
  private callLocks = new Map<string, boolean>();

  constructor() {
    this.seedInitialData();
  }

  public resetToSeed(): void {
    this.profiles.clear();
    this.credentials.clear();
    this.departments.clear();
    this.staffExtensions.clear();
    this.staffAvailability.clear();
    this.routingRules.clear();
    this.calls.clear();
    this.callTranscripts = [];
    this.callbacks.clear();
    this.auditLogs = [];
    this.callLocks.clear();
    this.seedInitialData();
  }

  private seedInitialData(): void {
    const now = new Date().toISOString();

    // 1. Departments from seed.sql
    const depts: Department[] = [
      {
        id: '11111111-1111-1111-1111-111111111001',
        name: 'Admissions & Enrollment',
        code: 'ADM',
        description: 'Student applications, entrance queries, and course eligibility.',
        primaryExtension: '102',
        routingTimeoutSeconds: 20,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '11111111-1111-1111-1111-111111111002',
        name: 'Examination Section',
        code: 'EXM',
        description: 'Exam schedules, hall tickets, grades, and marksheet verification.',
        primaryExtension: '103',
        routingTimeoutSeconds: 20,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '11111111-1111-1111-1111-111111111003',
        name: 'Accounts & Finance',
        code: 'ACC',
        description: 'Tuition fees, payment receipts, refunds, and payroll queries.',
        primaryExtension: '104',
        routingTimeoutSeconds: 20,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '11111111-1111-1111-1111-111111111004',
        name: 'Technical Support & IT',
        code: 'SUP',
        description: 'Student portal access, campus Wi-Fi, and software troubleshooting.',
        primaryExtension: '105',
        routingTimeoutSeconds: 15,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '11111111-1111-1111-1111-111111111005',
        name: 'Principal & Management Office',
        code: 'EXE',
        description: 'Executive appointments, institutional partnerships, and complaints.',
        primaryExtension: '101',
        routingTimeoutSeconds: 25,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
    for (const d of depts) this.departments.set(d.id, d);

    // 2. Profiles and Credentials
    const rawUsers = [
      {
        id: '22222222-2222-2222-2222-222222222001',
        email: 'admin@institution.local',
        fullName: 'Dr. Alice Sharma',
        role: 'admin' as const,
        phoneNumber: '+15550101',
        password: 'Admin@123',
      },
      {
        id: '22222222-2222-2222-2222-222222222002',
        email: 'staff@institution.local',
        fullName: 'Prof. Robert Miller',
        role: 'staff' as const,
        phoneNumber: '+15550102',
        password: 'Staff@123',
      },
      {
        id: '22222222-2222-2222-2222-222222222003',
        email: 'clara.oswald@institution.local',
        fullName: 'Clara Oswald',
        role: 'staff' as const,
        phoneNumber: '+15550103',
        password: 'Staff@123',
      },
      {
        id: '22222222-2222-2222-2222-222222222004',
        email: 'david.zhang@institution.local',
        fullName: 'David Zhang',
        role: 'staff' as const,
        phoneNumber: '+15550104',
        password: 'Staff@123',
      },
      {
        id: '22222222-2222-2222-2222-222222222005',
        email: 'operator@institution.local',
        fullName: 'Sarah Connor',
        role: 'operator' as const,
        phoneNumber: '+15550105',
        password: 'Operator@123',
      },
      {
        id: '22222222-2222-2222-2222-222222222006',
        email: 'robert.miller@institution.local',
        fullName: 'Prof. Robert Miller',
        role: 'staff' as const,
        phoneNumber: '+15550102',
        password: 'Staff@123',
      },
    ];

    for (const u of rawUsers) {
      const profile: UserProfile = {
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        phoneNumber: u.phoneNumber,
        createdAt: now,
        updatedAt: now,
      };
      this.profiles.set(profile.id, profile);
      this.credentials.set(u.email.toLowerCase(), {
        profile,
        passwordHash: hashPassword(u.password),
      });
    }

    // 3. Staff Extensions from seed.sql
    const staffExtList: StaffExtension[] = [
      {
        id: '33333333-3333-3333-3333-333333333001',
        profileId: '22222222-2222-2222-2222-222222222001',
        departmentId: '11111111-1111-1111-1111-111111111005',
        extension: '101',
        sipUsername: 'staff_101',
        priorityOrder: 1,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '33333333-3333-3333-3333-333333333002',
        profileId: '22222222-2222-2222-2222-222222222002',
        departmentId: '11111111-1111-1111-1111-111111111001',
        extension: '102',
        sipUsername: 'staff_102',
        priorityOrder: 1,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '33333333-3333-3333-3333-333333333003',
        profileId: '22222222-2222-2222-2222-222222222003',
        departmentId: '11111111-1111-1111-1111-111111111002',
        extension: '103',
        sipUsername: 'staff_103',
        priorityOrder: 1,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '33333333-3333-3333-3333-333333333004',
        profileId: '22222222-2222-2222-2222-222222222004',
        departmentId: '11111111-1111-1111-1111-111111111004',
        extension: '104',
        sipUsername: 'staff_104',
        priorityOrder: 1,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '33333333-3333-3333-3333-333333333005',
        profileId: '22222222-2222-2222-2222-222222222005',
        departmentId: '11111111-1111-1111-1111-111111111001',
        extension: '105',
        sipUsername: 'staff_105',
        priorityOrder: 2,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
    for (const ext of staffExtList) this.staffExtensions.set(ext.id, ext);

    // 4. Staff Availability from seed.sql
    const availList: StaffAvailability[] = [
      {
        id: '44444444-4444-4444-4444-444444444001',
        staffExtensionId: '33333333-3333-3333-3333-333333333001',
        status: 'available',
        customStatusMessage: 'In office - Executive meetings after 2 PM',
        workingHoursStart: '09:00:00',
        workingHoursEnd: '17:00:00',
        workDays: [1, 2, 3, 4, 5],
        lastStatusChange: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '44444444-4444-4444-4444-444444444002',
        staffExtensionId: '33333333-3333-3333-3333-333333333002',
        status: 'available',
        customStatusMessage: 'Reviewing prospective admission applications',
        workingHoursStart: '08:30:00',
        workingHoursEnd: '16:30:00',
        workDays: [1, 2, 3, 4, 5],
        lastStatusChange: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '44444444-4444-4444-4444-444444444003',
        staffExtensionId: '33333333-3333-3333-3333-333333333003',
        status: 'busy',
        customStatusMessage: 'Evaluating exam transcripts',
        workingHoursStart: '09:00:00',
        workingHoursEnd: '17:00:00',
        workDays: [1, 2, 3, 4, 5],
        lastStatusChange: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '44444444-4444-4444-4444-444444444004',
        staffExtensionId: '33333333-3333-3333-3333-333333333004',
        status: 'available',
        customStatusMessage: 'Ready to assist with IT tickets and logins',
        workingHoursStart: '09:00:00',
        workingHoursEnd: '18:00:00',
        workDays: [1, 2, 3, 4, 5, 6],
        lastStatusChange: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '44444444-4444-4444-4444-444444444005',
        staffExtensionId: '33333333-3333-3333-3333-333333333005',
        status: 'available',
        customStatusMessage: 'Operator line open',
        workingHoursStart: '08:00:00',
        workingHoursEnd: '20:00:00',
        workDays: [1, 2, 3, 4, 5, 6, 7],
        lastStatusChange: now,
        createdAt: now,
        updatedAt: now,
      },
    ];
    for (const a of availList) this.staffAvailability.set(a.staffExtensionId, a);

    // 5. Routing Rules from seed.sql
    const rules: RoutingRule[] = [
      {
        id: '66666666-6666-6666-6666-666666666001',
        departmentId: '11111111-1111-1111-1111-111111111001',
        intentKeyword: 'admissions',
        priority: 10,
        fallbackDestinationType: 'voicemail',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '66666666-6666-6666-6666-666666666002',
        departmentId: '11111111-1111-1111-1111-111111111001',
        intentKeyword: 'enrollment',
        priority: 10,
        fallbackDestinationType: 'voicemail',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '66666666-6666-6666-6666-666666666003',
        departmentId: '11111111-1111-1111-1111-111111111001',
        intentKeyword: 'application',
        priority: 9,
        fallbackDestinationType: 'voicemail',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '66666666-6666-6666-6666-666666666004',
        departmentId: '11111111-1111-1111-1111-111111111002',
        intentKeyword: 'examination',
        priority: 10,
        fallbackDestinationType: 'operator',
        fallbackDestinationValue: '105',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '66666666-6666-6666-6666-666666666005',
        departmentId: '11111111-1111-1111-1111-111111111002',
        intentKeyword: 'results',
        priority: 10,
        fallbackDestinationType: 'voicemail',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '66666666-6666-6666-6666-666666666006',
        departmentId: '11111111-1111-1111-1111-111111111002',
        intentKeyword: 'hall ticket',
        priority: 8,
        fallbackDestinationType: 'voicemail',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '66666666-6666-6666-6666-666666666007',
        departmentId: '11111111-1111-1111-1111-111111111003',
        intentKeyword: 'fee payment',
        priority: 10,
        fallbackDestinationType: 'voicemail',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '66666666-6666-6666-6666-666666666008',
        departmentId: '11111111-1111-1111-1111-111111111003',
        intentKeyword: 'refund',
        priority: 9,
        fallbackDestinationType: 'voicemail',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '66666666-6666-6666-6666-666666666009',
        departmentId: '11111111-1111-1111-1111-111111111004',
        intentKeyword: 'technical support',
        priority: 10,
        fallbackDestinationType: 'extension',
        fallbackDestinationValue: '104',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '66666666-6666-6666-6666-666666666010',
        departmentId: '11111111-1111-1111-1111-111111111004',
        intentKeyword: 'password reset',
        priority: 10,
        fallbackDestinationType: 'voicemail',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '66666666-6666-6666-6666-666666666011',
        departmentId: '11111111-1111-1111-1111-111111111005',
        intentKeyword: 'principal',
        priority: 10,
        fallbackDestinationType: 'extension',
        fallbackDestinationValue: '101',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '66666666-6666-6666-6666-666666666012',
        departmentId: '11111111-1111-1111-1111-111111111005',
        intentKeyword: 'appointment',
        priority: 9,
        fallbackDestinationType: 'voicemail',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
    for (const r of rules) this.routingRules.set(r.id, r);

    // 6. Seed Calls
    const sampleCalls: CallRecord[] = [
      {
        id: '55555555-5555-5555-5555-555555555001',
        telephonyCallId: 'SIP/test-call-001',
        callerNumber: '+15550199',
        callerName: 'John Doe',
        detectedIntent: 'admissions',
        departmentId: '11111111-1111-1111-1111-111111111001',
        assignedStaffId: '33333333-3333-3333-3333-333333333002',
        status: 'completed',
        confidenceScore: 0.95,
        reason: 'Query regarding B.Tech Computer Science admission criteria',
        aiSummary: 'Caller inquired about 2026 application deadlines and cutoff scores for undergraduate engineering.',
        durationSeconds: 145,
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        endedAt: new Date(Date.now() - 3600000 + 145000).toISOString(),
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 + 145000).toISOString(),
      },
      {
        id: '55555555-5555-5555-5555-555555555002',
        telephonyCallId: 'SIP/test-call-002',
        callerNumber: '+15550244',
        callerName: 'Jane Smith',
        detectedIntent: 'examination',
        departmentId: '11111111-1111-1111-1111-111111111002',
        assignedStaffId: '33333333-3333-3333-3333-333333333003',
        status: 'awaiting_staff',
        confidenceScore: 0.88,
        reason: 'Semester 4 marksheet verification request',
        aiSummary: 'Caller requesting duplicate grade sheet copy for higher studies application.',
        durationSeconds: 22,
        startedAt: new Date(Date.now() - 120000).toISOString(),
        createdAt: new Date(Date.now() - 120000).toISOString(),
        updatedAt: new Date(Date.now() - 120000).toISOString(),
      },
      {
        id: '55555555-5555-5555-5555-555555555003',
        telephonyCallId: 'SIP/test-call-003',
        callerNumber: '+15550388',
        callerName: 'Michael Brown',
        detectedIntent: 'fee payment',
        departmentId: '11111111-1111-1111-1111-111111111003',
        status: 'callback_requested',
        confidenceScore: 0.92,
        reason: 'Fee receipt duplicate download issue',
        aiSummary: 'Caller paid tuition fees online but transaction receipt was not generated on portal.',
        durationSeconds: 45,
        startedAt: new Date(Date.now() - 7200000).toISOString(),
        endedAt: new Date(Date.now() - 7200000 + 45000).toISOString(),
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date(Date.now() - 7200000 + 45000).toISOString(),
      },
      {
        id: '55555555-5555-5555-5555-555555555004',
        telephonyCallId: 'SIP/test-call-004',
        callerNumber: '+15550477',
        callerName: 'Priya Patel',
        detectedIntent: 'technical support',
        departmentId: '11111111-1111-1111-1111-111111111004',
        assignedStaffId: '33333333-3333-3333-3333-333333333004',
        status: 'bridged',
        confidenceScore: 0.94,
        reason: 'Student portal password reset lockout',
        aiSummary: 'Account locked out after 3 failed password attempts. Verified student roll number.',
        durationSeconds: 65,
        startedAt: new Date(Date.now() - 60000).toISOString(),
        createdAt: new Date(Date.now() - 60000).toISOString(),
        updatedAt: new Date(Date.now() - 60000).toISOString(),
      },
    ];
    for (const c of sampleCalls) this.calls.set(c.id, c);

    // 7. Seed Transcripts
    this.callTranscripts = [
      {
        id: crypto.randomUUID(),
        callId: '55555555-5555-5555-5555-555555555001',
        speaker: 'ai',
        transcriptText: 'Hello, thank you for calling. I am the virtual assistant. How may I help you today?',
        confidence: 1.0,
        audioTimestampOffsetMs: 0,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        callId: '55555555-5555-5555-5555-555555555001',
        speaker: 'caller',
        transcriptText: 'Hi, I would like to ask about the admissions process for Computer Science engineering.',
        confidence: 0.96,
        audioTimestampOffsetMs: 4200,
        createdAt: new Date(Date.now() - 3595000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        callId: '55555555-5555-5555-5555-555555555001',
        speaker: 'ai',
        transcriptText: 'Certainly. Connecting you to Professor Robert Miller in the Admissions department.',
        confidence: 1.0,
        audioTimestampOffsetMs: 9500,
        createdAt: new Date(Date.now() - 3590000).toISOString(),
      },
    ];

    // 8. Seed Callbacks
    const sampleCallbacks: CallbackRequest[] = [
      {
        id: '77777777-7777-7777-7777-777777777001',
        callId: '55555555-5555-5555-5555-555555555003',
        callerNumber: '+15550388',
        callerName: 'Michael Brown',
        requestedDepartmentId: '11111111-1111-1111-1111-111111111003',
        preferredCallbackTime: new Date(Date.now() + 86400000).toISOString(),
        transcriptSummary: 'Paid tuition fees online but transaction receipt was not generated on portal.',
        status: 'pending',
        notes: 'Needs finance clerk to verify bank transaction ID and issue duplicate PDF receipt.',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: '77777777-7777-7777-7777-777777777002',
        callerNumber: '+15550999',
        callerName: 'Emily Watson',
        requestedDepartmentId: '11111111-1111-1111-1111-111111111001',
        preferredCallbackTime: new Date(Date.now() + 172800000).toISOString(),
        transcriptSummary: 'Inquiry regarding NRI admissions quota and scholarship options.',
        status: 'in_progress',
        assignedProfileId: '22222222-2222-2222-2222-222222222002',
        notes: 'Prof. Miller scheduled call back for tomorrow morning.',
        createdAt: new Date(Date.now() - 14400000).toISOString(),
        updatedAt: new Date(Date.now() - 14400000).toISOString(),
      },
    ];
    for (const cb of sampleCallbacks) this.callbacks.set(cb.id, cb);
  }

  // ---------------------------------------------------------------------------
  // User & Credential Operations
  // ---------------------------------------------------------------------------
  public getCredentialByEmail(email: string): UserCredential | undefined {
    return this.credentials.get(email.toLowerCase().trim());
  }

  public getProfileById(id: string): UserProfile | undefined {
    return this.profiles.get(id);
  }

  public getAllProfiles(): UserProfile[] {
    return Array.from(this.profiles.values());
  }

  // ---------------------------------------------------------------------------
  // Department Operations
  // ---------------------------------------------------------------------------
  public getDepartments(onlyActive = false): Department[] {
    const list = Array.from(this.departments.values());
    return onlyActive ? list.filter((d) => d.isActive) : list;
  }

  public getDepartmentById(id: string): Department | undefined {
    return this.departments.get(id);
  }

  public getDepartmentByCode(code: string): Department | undefined {
    return Array.from(this.departments.values()).find(
      (d) => d.code.toUpperCase() === code.toUpperCase()
    );
  }

  public createDepartment(data: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>): Department {
    const now = new Date().toISOString();
    const dept: Department = {
      id: crypto.randomUUID(),
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      description: data.description?.trim(),
      primaryExtension: data.primaryExtension?.trim(),
      routingTimeoutSeconds: data.routingTimeoutSeconds || 20,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.departments.set(dept.id, dept);
    return dept;
  }

  public updateDepartment(id: string, updates: Partial<Department>): Department | undefined {
    const dept = this.departments.get(id);
    if (!dept) return undefined;

    const updated: Department = {
      ...dept,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.departments.set(id, updated);
    return updated;
  }

  // ---------------------------------------------------------------------------
  // Staff & Extensions Operations
  // ---------------------------------------------------------------------------
  public getStaffMembers(): StaffSummary[] {
    const summaries: StaffSummary[] = [];

    for (const ext of this.staffExtensions.values()) {
      if (!ext.isActive) continue;
      const profile = this.profiles.get(ext.profileId);
      const dept = this.departments.get(ext.departmentId);
      const avail = this.staffAvailability.get(ext.id);

      if (profile && dept) {
        summaries.push({
          id: ext.id,
          profileId: profile.id,
          fullName: profile.fullName,
          email: profile.email,
          departmentId: dept.id,
          departmentName: dept.name,
          extension: ext.extension,
          isAvailable: avail?.status === 'available',
          priorityOrder: ext.priorityOrder,
        });
      }
    }

    return summaries.sort((a, b) => a.priorityOrder - b.priorityOrder);
  }

  public getStaffExtensionById(id: string): StaffExtension | undefined {
    return this.staffExtensions.get(id);
  }

  public getStaffExtensionByProfileId(profileId: string): StaffExtension | undefined {
    return Array.from(this.staffExtensions.values()).find((e) => e.profileId === profileId);
  }

  public getStaffExtensionsByDepartment(departmentId: string): StaffExtension[] {
    return Array.from(this.staffExtensions.values()).filter(
      (e) => e.departmentId === departmentId && e.isActive
    );
  }

  public getAllStaffExtensions(): StaffExtension[] {
    return Array.from(this.staffExtensions.values());
  }

  public getStaffAvailability(staffExtensionId: string): StaffAvailability | undefined {
    return this.staffAvailability.get(staffExtensionId);
  }

  public updateStaffAvailability(
    staffExtensionId: string,
    status: AvailabilityStatus,
    customMessage?: string
  ): StaffAvailability | undefined {
    let avail = this.staffAvailability.get(staffExtensionId);
    const now = new Date().toISOString();

    if (!avail) {
      avail = {
        id: crypto.randomUUID(),
        staffExtensionId,
        status,
        customStatusMessage: customMessage,
        workingHoursStart: '09:00:00',
        workingHoursEnd: '17:00:00',
        workDays: [1, 2, 3, 4, 5],
        lastStatusChange: now,
        createdAt: now,
        updatedAt: now,
      };
    } else {
      avail = {
        ...avail,
        status,
        customStatusMessage: customMessage !== undefined ? customMessage : avail.customStatusMessage,
        lastStatusChange: now,
        updatedAt: now,
      };
    }

    this.staffAvailability.set(staffExtensionId, avail);
    return avail;
  }

  // ---------------------------------------------------------------------------
  // Routing Rules Operations
  // ---------------------------------------------------------------------------
  public getRoutingRules(onlyActive = false): RoutingRule[] {
    const list = Array.from(this.routingRules.values());
    const filtered = onlyActive ? list.filter((r) => r.isActive) : list;
    return filtered.sort((a, b) => b.priority - a.priority);
  }

  public getRoutingRuleById(id: string): RoutingRule | undefined {
    return this.routingRules.get(id);
  }

  public createRoutingRule(data: Omit<RoutingRule, 'id' | 'createdAt' | 'updatedAt'>): RoutingRule {
    const now = new Date().toISOString();
    const rule: RoutingRule = {
      id: crypto.randomUUID(),
      departmentId: data.departmentId,
      intentKeyword: data.intentKeyword.trim().toLowerCase(),
      priority: data.priority ?? 10,
      fallbackDestinationType: data.fallbackDestinationType,
      fallbackDestinationValue: data.fallbackDestinationValue,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.routingRules.set(rule.id, rule);
    return rule;
  }

  public updateRoutingRule(id: string, updates: Partial<RoutingRule>): RoutingRule | undefined {
    const rule = this.routingRules.get(id);
    if (!rule) return undefined;

    const updated: RoutingRule = {
      ...rule,
      ...updates,
      intentKeyword: updates.intentKeyword ? updates.intentKeyword.trim().toLowerCase() : rule.intentKeyword,
      updatedAt: new Date().toISOString(),
    };
    this.routingRules.set(id, updated);
    return updated;
  }

  public deleteRoutingRule(id: string): boolean {
    return this.routingRules.delete(id);
  }

  // ---------------------------------------------------------------------------
  // Call Operations
  // ---------------------------------------------------------------------------
  public getCalls(params: {
    page?: number;
    limit?: number;
    status?: CallStatus;
    departmentId?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    userDepartmentId?: string; // For staff role data scoping
    assignedStaffId?: string;
  }): { calls: CallRecord[]; total: number; page: number; limit: number; totalPages: number } {
    let list = Array.from(this.calls.values());

    // Role-based data scoping if user is staff (and not admin/operator)
    if (params.userDepartmentId) {
      list = list.filter(
        (c) => c.departmentId === params.userDepartmentId || (params.assignedStaffId && c.assignedStaffId === params.assignedStaffId)
      );
    }

    if (params.status) {
      list = list.filter((c) => c.status === params.status);
    }

    if (params.departmentId) {
      list = list.filter((c) => c.departmentId === params.departmentId);
    }

    if (params.search) {
      const q = params.search.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.callerNumber.toLowerCase().includes(q) ||
          (c.callerName && c.callerName.toLowerCase().includes(q)) ||
          (c.detectedIntent && c.detectedIntent.toLowerCase().includes(q)) ||
          (c.reason && c.reason.toLowerCase().includes(q))
      );
    }

    // Sort: default to createdAt desc
    const sortField = params.sortBy || 'createdAt';
    const isAsc = params.sortOrder === 'asc';
    list.sort((a: any, b: any) => {
      const valA = a[sortField] || '';
      const valB = b[sortField] || '';
      if (valA < valB) return isAsc ? -1 : 1;
      if (valA > valB) return isAsc ? 1 : -1;
      return 0;
    });

    const total = list.length;
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 10));
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedCalls = list.slice(startIndex, startIndex + limit);

    return {
      calls: paginatedCalls,
      total,
      page,
      limit,
      totalPages,
    };
  }

  public getCallById(id: string): CallRecord | undefined {
    return this.calls.get(id);
  }

  public createCall(data: Partial<CallRecord> & { callerNumber: string }): CallRecord {
    const now = new Date().toISOString();
    const call: CallRecord = {
      id: data.id || crypto.randomUUID(),
      telephonyCallId: data.telephonyCallId || `SIP/${crypto.randomUUID()}`,
      callerNumber: data.callerNumber,
      callerName: data.callerName,
      detectedIntent: data.detectedIntent,
      departmentId: data.departmentId,
      assignedStaffId: data.assignedStaffId,
      status: data.status || 'initiated',
      confidenceScore: data.confidenceScore,
      reason: data.reason,
      aiSummary: data.aiSummary,
      durationSeconds: data.durationSeconds || 0,
      startedAt: data.startedAt || now,
      endedAt: data.endedAt,
      createdAt: now,
      updatedAt: now,
    };
    this.calls.set(call.id, call);
    return call;
  }

  public updateCall(id: string, updates: Partial<CallRecord>): CallRecord | undefined {
    const call = this.calls.get(id);
    if (!call) return undefined;

    const updated: CallRecord = {
      ...call,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.calls.set(id, updated);
    return updated;
  }

  public getCallTranscripts(callId: string): CallTranscript[] {
    return this.callTranscripts
      .filter((t) => t.callId === callId)
      .sort((a, b) => a.audioTimestampOffsetMs - b.audioTimestampOffsetMs);
  }

  public addCallTranscript(transcript: Omit<CallTranscript, 'id' | 'createdAt'>): CallTranscript {
    const item: CallTranscript = {
      id: crypto.randomUUID(),
      ...transcript,
      createdAt: new Date().toISOString(),
    };
    this.callTranscripts.push(item);
    return item;
  }

  public getCallStats(): {
    totalCalls: number;
    inProgressCalls: number;
    completedCalls: number;
    missedCalls: number;
    pendingCallbacks: number;
    avgDurationSeconds: number;
  } {
    const allCalls = Array.from(this.calls.values());
    const totalCalls = allCalls.length;

    const inProgressStatuses: CallStatus[] = [
      'initiated',
      'ringing',
      'answered_by_ai',
      'processing',
      'awaiting_staff',
      'connecting',
      'bridged',
    ];
    const inProgressCalls = allCalls.filter((c) => inProgressStatuses.includes(c.status)).length;
    const completedCalls = allCalls.filter((c) => c.status === 'completed').length;
    const missedCalls = allCalls.filter((c) =>
      ['rejected', 'timed_out', 'failed', 'callback_requested'].includes(c.status)
    ).length;

    const pendingCallbacks = Array.from(this.callbacks.values()).filter(
      (cb) => cb.status === 'pending' || cb.status === 'assigned'
    ).length;

    let totalDuration = 0;
    let countedCalls = 0;
    for (const c of allCalls) {
      if (c.durationSeconds && c.durationSeconds > 0) {
        totalDuration += c.durationSeconds;
        countedCalls++;
      }
    }
    const avgDurationSeconds = countedCalls > 0 ? Math.round(totalDuration / countedCalls) : 0;

    return {
      totalCalls,
      inProgressCalls,
      completedCalls,
      missedCalls,
      pendingCallbacks,
      avgDurationSeconds,
    };
  }

  // ---------------------------------------------------------------------------
  // Concurrency Locking for Call State Machine
  // ---------------------------------------------------------------------------
  public acquireCallLock(callId: string): boolean {
    if (this.callLocks.get(callId)) {
      return false; // Locked by another concurrent operation
    }
    this.callLocks.set(callId, true);
    return true;
  }

  public releaseCallLock(callId: string): void {
    this.callLocks.delete(callId);
  }

  // ---------------------------------------------------------------------------
  // Callback Operations
  // ---------------------------------------------------------------------------
  public getCallbacks(params: {
    status?: string;
    departmentId?: string;
    page?: number;
    limit?: number;
  }): { callbacks: CallbackRequest[]; total: number; page: number; limit: number } {
    let list = Array.from(this.callbacks.values());

    if (params.status) {
      list = list.filter((cb) => cb.status === params.status);
    }

    if (params.departmentId) {
      list = list.filter((cb) => cb.requestedDepartmentId === params.departmentId);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = list.length;
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 10));
    const startIndex = (page - 1) * limit;

    return {
      callbacks: list.slice(startIndex, startIndex + limit),
      total,
      page,
      limit,
    };
  }

  public getCallbackById(id: string): CallbackRequest | undefined {
    return this.callbacks.get(id);
  }

  public createCallback(data: Omit<CallbackRequest, 'id' | 'createdAt' | 'updatedAt'>): CallbackRequest {
    const now = new Date().toISOString();
    const cb: CallbackRequest = {
      id: crypto.randomUUID(),
      callId: data.callId,
      callerNumber: data.callerNumber,
      callerName: data.callerName,
      requestedDepartmentId: data.requestedDepartmentId,
      preferredCallbackTime: data.preferredCallbackTime,
      transcriptSummary: data.transcriptSummary,
      audioRecordingUrl: data.audioRecordingUrl,
      status: data.status || 'pending',
      assignedProfileId: data.assignedProfileId,
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    };
    this.callbacks.set(cb.id, cb);
    return cb;
  }

  public updateCallback(id: string, updates: Partial<CallbackRequest>): CallbackRequest | undefined {
    const cb = this.callbacks.get(id);
    if (!cb) return undefined;

    const updated: CallbackRequest = {
      ...cb,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.callbacks.set(id, updated);
    return updated;
  }

  // ---------------------------------------------------------------------------
  // Audit Log Operations
  // ---------------------------------------------------------------------------
  public addAuditLog(entry: {
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
  }): AuditLog {
    const log: AuditLog = {
      id: crypto.randomUUID(),
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      details: entry.details,
      ipAddress: entry.ipAddress,
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.unshift(log); // Prepend so most recent is first
    return log;
  }

  public getAuditLogs(limit = 50): AuditLog[] {
    return this.auditLogs.slice(0, limit);
  }
}

export const dbStore = new DatabaseStore();
