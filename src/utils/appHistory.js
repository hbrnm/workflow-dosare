/**
 * In-app back stack for mobile / PWA.
 *
 * Rules:
 * - Back exits the app ONLY on Brief with no overlay (stack length 1).
 * - Anywhere else, Back returns to the previous frame.
 *
 * History API mirrors the in-memory stack so Android / iOS system Back
 * fires popstate. We never push a "trap" on Brief — that would block exit.
 */

export function createBackStack() {
  /** @type {Array<Record<string, unknown>>} */
  let frames = [{ t: "home" }];
  let ignorePop = 0;

  const top = () => frames[frames.length - 1] || { t: "home" };

  const urlFor = (frame) => {
    if (frame.t === "home") return "#m-brief";
    if (frame.t === "tab") return `#m-${frame.tab}`;
    if (frame.t === "overlay") {
      if (frame.name === "alerte") return `#alerte-${frame.tab || "all"}`;
      if (frame.name === "field") return `#field-${frame.id || ""}`;
      if (frame.name === "claim") return `#claim-${frame.id || "nou"}`;
      if (frame.name === "quickCreate") return `#${frame.name}`;
      if (frame.name === "inbox") return `#inbox-${frame.id || ""}`;
      if (frame.name === "receptie") return `#receptie-${frame.id || ""}`;
      return `#${frame.name}`;
    }
    return "#m-brief";
  };

  const syncHistoryPush = (frame) => {
    try {
      window.history.pushState(
        { appBack: true, i: frames.length - 1, ...frame },
        "",
        urlFor(frame)
      );
    } catch {
      /* ignore */
    }
  };

  const syncHistoryReplace = (frame) => {
    try {
      window.history.replaceState(
        { appBack: true, i: frames.length - 1, ...frame },
        "",
        urlFor(frame)
      );
    } catch {
      /* ignore */
    }
  };

  return {
    top,
    depth: () => frames.length,
    /** Reset to Brief home (call when entering mobile shell). */
    resetHome() {
      frames = [{ t: "home" }];
      ignorePop = 0;
      syncHistoryReplace(frames[0]);
    },
    /**
     * Push a frame if it isn't already on top.
     * @param {Record<string, unknown>} frame
     */
    push(frame) {
      const cur = top();
      if (
        cur.t === frame.t &&
        cur.tab === frame.tab &&
        cur.name === frame.name &&
        cur.id === frame.id
      ) {
        return false;
      }
      frames.push(frame);
      syncHistoryPush(frame);
      return true;
    },
    /**
     * Replace the top frame (e.g. Alerte → field sheet).
     * @param {Record<string, unknown>} frame
     */
    replaceTop(frame) {
      if (frames.length <= 1) {
        frames.push(frame);
        syncHistoryPush(frame);
        return;
      }
      frames[frames.length - 1] = frame;
      syncHistoryReplace(frame);
    },
    /**
     * UI dismiss (X): pop stack + history.back(). Returns false if nothing to pop.
     * @param {(frame: Record<string, unknown>) => boolean} [match]
     */
    dismiss(match) {
      if (frames.length <= 1) return false;
      const cur = top();
      if (match && !match(cur)) return false;
      frames.pop();
      ignorePop += 1;
      try {
        window.history.back();
      } catch {
        ignorePop = Math.max(0, ignorePop - 1);
      }
      return true;
    },
    /**
     * Browser / gesture Back. Returns the frame to apply, or null to allow exit.
     * @returns {Record<string, unknown> | null}
     */
    handlePopState() {
      if (ignorePop > 0) {
        ignorePop -= 1;
        return top(); // already dismissed via UI; just re-apply current
      }
      if (frames.length <= 1) {
        // On Brief home — allow the app to close
        return null;
      }
      frames.pop();
      return top();
    },
    /** Test helper */
    _frames: () => frames.slice(),
  };
}

export function frameEquals(a, b) {
  if (!a || !b) return false;
  return a.t === b.t && a.tab === b.tab && a.name === b.name && a.id === b.id;
}
