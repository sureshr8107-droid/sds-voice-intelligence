import { ServiceHealth, DependencyStatus } from '@call-screening/shared';
import { env } from '../config/env';

const startTime = Date.now();

export class HealthService {
  /**
   * Basic liveness check
   */
  public static getLiveness(): { status: 'healthy'; timestamp: string } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Detailed system diagnostic check
   */
  public static getDetailedDiagnostics(requestId?: string): ServiceHealth {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

    // Dependency health evaluations (Phase 2: purely inspecting configuration presence)
    const dbStatus: DependencyStatus = env.SUPABASE_URL ? 'connected' : 'not_configured';
    const dbMessage = env.SUPABASE_URL
      ? 'Configured (Awaiting Phase 3 Database Setup)'
      : 'Not configured - Phase 2 Foundation Mode';

    const aiStatus: DependencyStatus = env.OLLAMA_BASE_URL ? 'connected' : 'not_configured';
    const aiMessage = env.OLLAMA_BASE_URL
      ? 'Configured (Awaiting Phase 6 Local AI Setup)'
      : 'Not configured - Local AI Pipeline planned for Phase 6';

    const telephonyStatus: DependencyStatus = env.ASTERISK_ARI_URL ? 'connected' : 'not_configured';
    const telephonyMessage = env.ASTERISK_ARI_URL
      ? 'Configured (Awaiting Phase 7 Asterisk PBX Setup)'
      : 'Not configured - Asterisk ARI planned for Phase 7';

    return {
      status: 'healthy',
      service: 'ai-call-screening-backend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requestId,
      uptimeSeconds,
      environment: env.NODE_ENV,
      dependencies: {
        database: {
          provider: 'Supabase PostgreSQL',
          status: dbStatus,
          message: dbMessage,
        },
        aiEngine: {
          sttProvider: 'Whisper (faster-whisper)',
          llmProvider: 'Ollama (Llama 3.2 / Mistral)',
          ttsProvider: 'Piper TTS',
          status: aiStatus,
          message: aiMessage,
        },
        telephony: {
          provider: 'Asterisk PBX (ARI / PJSIP)',
          status: telephonyStatus,
          message: telephonyMessage,
        },
      },
    };
  }
}
