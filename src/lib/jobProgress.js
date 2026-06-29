/**
 * jobProgress.js – Egységes háttérfeladat progress state machine.
 *
 * Tiszta JS modul, nincs React dependency.
 * Bárhonnan importálható: service-ekből, page-ekből, util-okból.
 *
 * API: startJob / updateJob / finishJob / failJob / dismissJob / subscribeJobs / getJobs
 */

let _jobs = [];
let _listeners = [];
let _seq = 0;

function _notify() {
  const snap = [..._jobs];
  _listeners.forEach(fn => { try { fn(snap); } catch {} });
}

/**
 * Feliratkozás a jobs listára. Azonnal meghívódik az aktuális állapottal.
 * @param {(jobs: object[]) => void} fn
 * @returns {() => void} leiratkozó függvény
 */
export function subscribeJobs(fn) {
  _listeners = [..._listeners, fn];
  fn([..._jobs]);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

export function getJobs() { return [..._jobs]; }

/**
 * Új job indítása.
 * @param {string} label  Megjelenített feladat megnevezés
 * @param {object} [opts]
 * @param {number|null} [opts.totalSteps]  Összes lépés száma (ha ismert)
 * @param {string[]}    [opts.steps]       Lépés nevek – pending-ként jelennek meg
 * @returns {string} jobId – átadandó updateJob / finishJob / failJob hívásoknak
 */
export function startJob(label, opts = {}) {
  const id = `job_${++_seq}_${crypto.randomUUID()}`;
  const steps = opts.steps || [];
  const totalSteps = opts.totalSteps ?? (steps.length > 0 ? steps.length : null);

  _jobs = [..._jobs, {
    id,
    label,
    status:      "running",
    totalSteps,
    currentStep: 0,
    stepLabel:   null,
    progress:    null,
    steps:       steps.map(s => ({ label: s, status: "pending" })),
    errors:      [],
    summary:     null,
    startedAt:   Date.now(),
    endedAt:     null,
  }];
  _notify();
  return id;
}

/**
 * Job állapotának frissítése egy-egy lépés közben.
 * @param {string} id
 * @param {object} patch
 * @param {number} [patch.currentStep]   Hányadik lépésnél tartunk (0-tól indexelt)
 * @param {string} [patch.stepLabel]     Aktuálisan futó lépés neve (UI fejléc alatt)
 * @param {number} [patch.progress]      Közvetlen százalék 0-100 (totalSteps nélkül)
 * @param {number} [patch.totalSteps]    Futás közbeni lépésszám-frissítés
 * @param {object} [patch.stepResult]    { label, status:"ok"|"error"|"running", error? }
 */
export function updateJob(id, patch) {
  _jobs = _jobs.map(j => {
    if (j.id !== id) return j;
    const upd = { ...j };

    if (patch.currentStep !== undefined) upd.currentStep = patch.currentStep;
    if (patch.stepLabel   !== undefined) upd.stepLabel   = patch.stepLabel;
    if (patch.progress    !== undefined) upd.progress    = patch.progress;
    if (patch.totalSteps  !== undefined) upd.totalSteps  = patch.totalSteps;

    if (patch.stepResult) {
      const { label, status, error } = patch.stepResult;
      const idx = upd.steps.findIndex(s => s.label === label);
      if (idx >= 0) {
        upd.steps = upd.steps.map((s, i) =>
          i === idx ? { ...s, status, error: error || null } : s
        );
      } else {
        upd.steps = [...upd.steps, { label, status, error: error || null }];
      }
      if (status === "error") {
        upd.errors = [...upd.errors, error ? `${label}: ${error}` : label];
      }
    }

    return upd;
  });
  _notify();
}

/**
 * Job sikeres befejezése. 3,5 mp után automatikusan eltűnik a modalból.
 * @param {string} id
 * @param {object} [opts]
 * @param {string} [opts.summary]  Összefoglaló szöveg (pl. "16/16 mentve")
 */
export function finishJob(id, opts = {}) {
  _jobs = _jobs.map(j => j.id !== id ? j : {
    ...j,
    status:      "done",
    progress:    100,
    currentStep: j.totalSteps ?? j.currentStep,
    endedAt:     Date.now(),
    summary:     opts.summary || null,
  });
  _notify();
  setTimeout(() => dismissJob(id), 3500);
}

/**
 * Job hibával való lezárása. NEM tűnik el automatikusan – felhasználónak kell bezárni.
 * @param {string} id
 * @param {object} [opts]
 * @param {string} [opts.error]  Fő hibaüzenet (hozzáadódik az errors tömbhöz)
 */
export function failJob(id, opts = {}) {
  _jobs = _jobs.map(j => j.id !== id ? j : {
    ...j,
    status:  "error",
    endedAt: Date.now(),
    errors:  [...j.errors, ...(opts.error ? [opts.error] : [])],
  });
  _notify();
}

/** Job kézzel eltávolítása a listáról (X gomb, vagy auto-dismiss). */
export function dismissJob(id) {
  _jobs = _jobs.filter(j => j.id !== id);
  _notify();
}