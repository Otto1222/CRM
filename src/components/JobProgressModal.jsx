import { useState, useEffect } from "react";
import { FONT } from "../lib/constants";
import { subscribeJobs, dismissJob } from "../lib/jobProgress";

// ─── Segédek ─────────────────────────────────────────────────────

function calcPct(job) {
  if (job.progress !== null) return Math.round(job.progress);
  if (job.status === "done") return 100;
  if (job.totalSteps !== null && job.totalSteps > 0) {
    return Math.min(Math.round((job.currentStep / job.totalSteps) * 100), 99);
  }
  return null;
}

function fmtMs(ms) {
  if (!ms || ms < 1500) return null;
  if (ms < 60000) return `~${Math.ceil(ms / 1000)} mp`;
  return `~${Math.ceil(ms / 60000)} perc`;
}

function fmtElapsed(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ─── Egy job kártyája ─────────────────────────────────────────────

function JobCard({ job }) {
  const {
    id, label, steps, status,
    startedAt, endedAt, errors,
    summary, stepLabel,
    totalSteps, currentStep,
  } = job;

  const pct       = calcPct(job);
  const elapsed   = (endedAt || Date.now()) - startedAt;
  const isRunning = status === "running";
  const isDone    = status === "done";
  const isError   = status === "error";

  let etaText = null;
  if (isRunning && pct !== null && pct > 8) {
    const perPct      = elapsed / pct;
    const remaining   = perPct * (100 - pct);
    etaText = fmtMs(remaining);
  }

  const okSteps      = steps.filter(s => s.status === "ok").length;
  const errorSteps   = steps.filter(s => s.status === "error").length;
  const pendingSteps = steps.filter(s => s.status === "pending").length;

  const SZIN = {
    done:    { bg: "#F0FDF4", border: "#86EFAC", bar: "#22C55E", fejlec: "#166534" },
    error:   { bg: "#FEF2F2", border: "#FECACA", bar: "#DC2626", fejlec: "#991B1B" },
    running: { bg: "#EFF6FF", border: "#BFDBFE", bar: "#2563EB", fejlec: "#1E40AF" },
  };
  const sz   = SZIN[status] || SZIN.running;
  const ikon = isDone ? "✅" : isError ? "❌" : "⏳";

  return (
    <div style={{
      background: sz.bg,
      border: `1.5px solid ${sz.border}`,
      borderRadius: 12,
      padding: "12px 14px",
      marginBottom: 8,
      boxShadow: "0 4px 20px rgba(0,0,0,0.13)",
    }}>

      {/* Fejléc */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: sz.fejlec, flex: 1 }}>
          {ikon} {label}
        </span>
        {!isRunning && (
          <button
            onClick={() => dismissJob(id)}
            style={{
              border: "none", background: "transparent",
              cursor: "pointer", fontSize: 15, color: "#94A3B8",
              lineHeight: 1, padding: "0 2px", marginLeft: 8,
            }}
          >✕</button>
        )}
      </div>

      {/* Progress bar */}
      {pct !== null && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ height: 6, background: "#E2E8F0", borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
            <div style={{
              width: `${pct}%`, height: "100%", background: sz.bar,
              borderRadius: 3, transition: "width 0.4s ease",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748B" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>
              {isRunning
                ? (stepLabel || "Feldolgozás…")
                : (summary || (isDone ? "Kész" : "Hiba"))}
            </span>
            <span style={{ fontWeight: 700, flexShrink: 0 }}>{pct}%</span>
          </div>
        </div>
      )}

      {/* Statisztika sor */}
      <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#64748B", flexWrap: "wrap", lineHeight: 1.6 }}>
        {totalSteps !== null && (
          <span>{currentStep}/{totalSteps} lépés</span>
        )}
        {okSteps > 0 && (
          <span style={{ color: "#166534" }}>✓ {okSteps} sikeres</span>
        )}
        {errorSteps > 0 && (
          <span style={{ color: "#DC2626" }}>✗ {errorSteps} hibás</span>
        )}
        {isRunning && pendingSteps > 0 && (
          <span>○ {pendingSteps} vár</span>
        )}
        {etaText && (
          <span>hátralévő: {etaText}</span>
        )}
        {endedAt && (
          <span style={{ color: "#94A3B8" }}>{fmtElapsed(elapsed)}</span>
        )}
      </div>

      {/* Lépés lista (max 110px, scrollable) */}
      {steps.length > 0 && (
        <div style={{ marginTop: 8, maxHeight: 110, overflowY: "auto", fontSize: 11 }}>
          {steps.map((s, i) => {
            const col = s.status === "ok"      ? "#166534"
                      : s.status === "error"   ? "#DC2626"
                      : s.status === "running" ? "#1D4ED8"
                      : "#94A3B8";
            const ic  = s.status === "ok"      ? "✓"
                      : s.status === "error"   ? "✗"
                      : s.status === "running" ? "↻"
                      : "○";
            return (
              <div key={i} style={{ display: "flex", gap: 5, alignItems: "flex-start", padding: "1px 0", color: col }}>
                <span style={{ flexShrink: 0, fontWeight: 700 }}>{ic}</span>
                <span style={{ wordBreak: "break-word" }}>
                  {s.label}
                  {s.error && <span style={{ color: "#DC2626" }}> ({s.error})</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Hiba összefoglaló */}
      {isError && errors.length > 0 && (
        <div style={{
          marginTop: 8, padding: "5px 8px",
          background: "#FEE2E2", borderRadius: 6,
          fontSize: 11, color: "#991B1B",
        }}>
          {errors.slice(0, 3).join(" · ")}
          {errors.length > 3 && ` · …és ${errors.length - 3} további`}
        </div>
      )}
    </div>
  );
}

// ─── Fő modal konténer ────────────────────────────────────────────

export default function JobProgressModal() {
  const [jobs, setJobs] = useState([]);

  useEffect(() => subscribeJobs(setJobs), []);

  if (jobs.length === 0) return null;

  return (
    <div style={{
      position:     "fixed",
      bottom:       20,
      right:        20,
      width:        340,
      zIndex:       8900,
      fontFamily:   FONT,
      maxHeight:    "80vh",
      overflowY:    "auto",
      pointerEvents: "all",
    }}>
      {jobs.map(job => <JobCard key={job.id} job={job} />)}
    </div>
  );
}