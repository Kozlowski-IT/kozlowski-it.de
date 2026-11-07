// Warteschlange für ALLE verändernden Builder-Operationen eines workDir (preview, publish,
// rollback): genau ein Job gleichzeitig — der Builder-Kern hat kein eigenes Lock
// (cleanStaging löscht jedes .staging-*, content-<mode>/ und preview/ sind geteilt).
//
// Reihenfolge:
//   - publish und rollback werden NIE verworfen und laufen FIFO untereinander;
//   - sie haben Vorrang vor einer wartenden preview;
//   - es wartet höchstens EINE preview: eine neue ersetzt die wartende (letzter Stand gewinnt —
//     der Export liest die Inhalte erst beim Start des Jobs). Alle ersetzten Aufrufer bekommen
//     das Ergebnis des Laufs, der sie ersetzt hat.
//   - ein laufender Job wird nie abgebrochen (eine Publish-Anfrage wartet ihn ab).
//
// execute(kind, data) → Promise<result>; wirft execute, wird daraus { ok:false, reason }.

/** @param {(kind: string, data: any) => Promise<any>} execute */
export function createQueue(execute) {
  const urgent = []; // publish/rollback, FIFO
  let preview = null; // höchstens eine wartende preview
  let running = null;
  let idleWaiters = [];

  function next() {
    if (running) return;
    const job = urgent.shift() ?? preview;
    if (job === preview) preview = null;
    if (!job) {
      const w = idleWaiters;
      idleWaiters = [];
      for (const r of w) r();
      return;
    }
    running = job;
    (async () => {
      let result;
      try {
        result = await execute(job.kind, job.data);
      } catch (err) {
        result = { ok: false, reason: `${job.kind} fehlgeschlagen: ${err?.message ?? err}` };
      }
      // running erst freigeben, wenn execute vollständig zurück ist (inkl. seiner finally-Blöcke)
      running = null;
      for (const resolve of job.waiters) resolve(result);
      next();
    })();
  }

  return {
    /** Job einreihen; das Versprechen erfüllt sich mit dem Ergebnis (bei preview evtl. eines späteren Laufs). */
    enqueue(kind, data) {
      return new Promise((resolve) => {
        if (kind === "preview") {
          if (preview) {
            preview.data = data;
            preview.waiters.push(resolve);
          } else {
            preview = { kind, data, waiters: [resolve] };
          }
        } else {
          urgent.push({ kind, data, waiters: [resolve] });
        }
        next();
      });
    },
    /** { running: kind|null, pending: kind[] } in Ausführungsreihenfolge */
    state() {
      return {
        running: running?.kind ?? null,
        pending: [...urgent.map((j) => j.kind), ...(preview ? ["preview"] : [])],
      };
    },
    /** erfüllt sich, sobald nichts mehr läuft oder wartet */
    idle() {
      if (!running && !urgent.length && !preview) return Promise.resolve();
      return new Promise((r) => idleWaiters.push(r));
    },
  };
}
