import React from 'react';
import { Link } from 'react-router-dom';
import {
  PhoneCall,
  Bot,
  Route,
  CheckCircle2,
  ArrowRight,
  Layers,
  Radio,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  return (
    <div className="container">
      {/* Hero Header */}
      <div className="row justify-content-center text-center mb-5">
        <div className="col-lg-10">
          <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-primary bg-opacity-10 border border-primary border-opacity-25 text-primary small mb-3">
            <span className="badge rounded-pill bg-primary">Phase 2</span>
            <span>Technical Foundation & Workspace Ready</span>
          </div>
          <h1 className="display-4 fw-bold text-white mb-3">
            AI-Powered Smart Call Screening & Routing System
          </h1>
          <p className="lead text-secondary mb-4 mx-auto" style={{ maxWidth: '780px' }}>
            An intelligent virtual receptionist engineered for colleges, universities, corporate offices,
            and healthcare institutions. Autonomously screens incoming callers, classifies intent,
            notifies staff via a real-time console, and bridges calls seamlessly.
          </p>
          <div className="d-flex flex-wrap justify-content-center gap-3">
            <Link to="/dashboard" className="btn btn-info text-dark fw-bold px-4 py-2 d-flex align-items-center gap-2 shadow-sm">
              <span>Enter SDS Voice Intelligence</span>
              <ArrowRight size={18} />
            </Link>
            <Link to="/status" className="btn btn-outline-light px-4 py-2 d-flex align-items-center gap-2 shadow-sm">
              <span>View System Health & Diagnostics</span>
              <ArrowRight size={18} />
            </Link>
            <a
              href="#architecture"
              className="btn btn-outline-secondary px-4 py-2 d-flex align-items-center gap-2"
            >
              <span>Explore Architecture</span>
            </a>
          </div>
        </div>
      </div>

      {/* Development Status Banner */}
      <div className="glass-panel p-4 mb-5">
        <div className="row align-items-center">
          <div className="col-md-8">
            <div className="d-flex align-items-center gap-3 mb-2">
              <span className="badge-healthy">
                <CheckCircle2 size={15} />
                <span>Phase 2 Foundation Active</span>
              </span>
              <span className="text-secondary small">Windows Development Mode</span>
            </div>
            <h5 className="text-white mb-1">Architecture and Workspace Foundation Operational</h5>
            <p className="text-secondary small mb-0">
              Frontend, backend, shared TypeScript contracts, centralized error handling, and health
              diagnostics are running. Telephony, database schemas, and AI models remain intentionally
              unconfigured until their scheduled implementation phases.
            </p>
          </div>
          <div className="col-md-4 text-md-end mt-3 mt-md-0">
            <Link to="/status" className="btn btn-sm btn-outline-primary">
              Verify Live Connectivity
            </Link>
          </div>
        </div>
      </div>

      {/* Architecture Highlights Grid */}
      <div id="architecture" className="row g-4 mb-5">
        <div className="col-md-6 col-lg-3">
          <div className="feature-box">
            <div className="icon-wrapper icon-blue">
              <PhoneCall size={24} />
            </div>
            <h5 className="text-white">Smart Receptionist</h5>
            <p className="text-secondary small mb-0">
              Answers callers with natural audio greetings, collects purpose statements, and manages
              on-hold caller queues.
            </p>
          </div>
        </div>

        <div className="col-md-6 col-lg-3">
          <div className="feature-box">
            <div className="icon-wrapper icon-purple">
              <Bot size={24} />
            </div>
            <h5 className="text-white">Local AI Pipeline</h5>
            <p className="text-secondary small mb-0">
              Whisper STT converts caller audio to text; local Ollama LLMs extract intent, department, and
              urgency without recurring API costs.
            </p>
          </div>
        </div>

        <div className="col-md-6 col-lg-3">
          <div className="feature-box">
            <div className="icon-wrapper icon-emerald">
              <Route size={24} />
            </div>
            <h5 className="text-white">Rule-Based Routing</h5>
            <p className="text-secondary small mb-0">
              Evaluates staff availability, departmental priorities, and working hours before routing to
              extensions or voicemail.
            </p>
          </div>
        </div>

        <div className="col-md-6 col-lg-3">
          <div className="feature-box">
            <div className="icon-wrapper icon-amber">
              <Radio size={24} />
            </div>
            <h5 className="text-white">Telephony Bridging</h5>
            <p className="text-secondary small mb-0">
              Asterisk ARI controls SIP channels, bridges accepted calls to staff softphones, and triggers
              failover workflows.
            </p>
          </div>
        </div>
      </div>

      {/* Planned Phases Overview */}
      <div className="glass-panel p-4 mb-4">
        <h4 className="text-white mb-3 d-flex align-items-center gap-2">
          <Layers size={20} className="text-primary" />
          <span>Engineering Roadmap & Phase Progression</span>
        </h4>
        <div className="row g-3">
          <div className="col-md-4">
            <div className="p-3 rounded bg-dark border border-secondary border-opacity-25 h-100">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="badge bg-success bg-opacity-25 text-success">Completed</span>
                <span className="text-muted small">Phase 1 & 2</span>
              </div>
              <h6 className="text-white mb-1">Architecture & Workspace Foundation</h6>
              <p className="text-secondary small mb-0">
                Environment audit, Windows compatibility, Express TypeScript backend, React Vite frontend,
                and shared data contracts.
              </p>
            </div>
          </div>

          <div className="col-md-4">
            <div className="p-3 rounded bg-dark border border-secondary border-opacity-25 h-100">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="badge bg-primary bg-opacity-25 text-primary">Upcoming</span>
                <span className="text-muted small">Phase 3</span>
              </div>
              <h6 className="text-white mb-1">Database & Authentication</h6>
              <p className="text-secondary small mb-0">
                Supabase PostgreSQL migrations for profiles, departments, extensions, routing rules, calls,
                and Row Level Security (RLS).
              </p>
            </div>
          </div>

          <div className="col-md-4">
            <div className="p-3 rounded bg-dark border border-secondary border-opacity-25 h-100">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="badge bg-secondary bg-opacity-25 text-secondary">Upcoming</span>
                <span className="text-muted small">Phases 4 - 8</span>
              </div>
              <h6 className="text-white mb-1">AI, Telephony & Real-Time Bridging</h6>
              <p className="text-secondary small mb-0">
                Staff dashboard consoles, local Whisper/Ollama interfaces, Asterisk ARI channel control, and
                softphone verification.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
