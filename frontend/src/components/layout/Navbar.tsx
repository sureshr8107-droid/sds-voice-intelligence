import React from 'react';
import { NavLink } from 'react-router-dom';
import { PhoneCall, Activity, BookOpen, ShieldCheck } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark custom-navbar sticky-top py-3">
      <div className="container">
        <NavLink to="/" className="navbar-brand d-flex align-items-center gap-2">
          <div className="p-2 rounded-3 bg-primary bg-opacity-25 text-primary border border-primary border-opacity-25">
            <PhoneCall size={20} className="text-white" />
          </div>
          <div>
            <span className="fw-bold fs-5 text-white">SmartCall</span>
            <span className="text-primary fw-semibold ms-1">AI</span>
          </div>
        </NavLink>

        <button
          className="navbar-toggler border-secondary"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarContent"
          aria-controls="navbarContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarContent">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-4 gap-1">
            <li className="nav-item">
              <NavLink
                to="/"
                className={({ isActive }) => `nav-link px-3 rounded-2 ${isActive ? 'active bg-white bg-opacity-10' : ''}`}
                end
              >
                Overview
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink
                to="/status"
                className={({ isActive }) =>
                  `nav-link px-3 rounded-2 d-flex align-items-center gap-2 ${
                    isActive ? 'active bg-white bg-opacity-10' : ''
                  }`
                }
              >
                <Activity size={16} />
                <span>System Status</span>
              </NavLink>
            </li>
          </ul>

          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-dark border border-secondary text-secondary small">
              <ShieldCheck size={14} className="text-success" />
              <span>Phase 2 Foundation</span>
            </div>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
            >
              <BookOpen size={15} />
              <span>Docs</span>
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};
