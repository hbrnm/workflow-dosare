import React, { useEffect, useState, useRef } from "react";
import Notification from "./Notification";

let nextId = 1;

export default function NotificationQueue({ notice, defaultTimeout = 4000 }) {
  const [queue, setQueue] = useState([]);
  const timers = useRef(new Map());

  useEffect(() => {
    if (!notice) return;
    const id = nextId++;
    const item = {
      id,
      message: notice.message,
      type: notice.type || "success",
      timeout: notice.timeout || defaultTimeout,
      actionLabel: notice.actionLabel || null,
      onAction: notice.onAction || null,
    };
    setQueue((q) => [...q, item]);
    const t = setTimeout(() => {
      setQueue((q) => q.filter((i) => i.id !== id));
      timers.current.delete(id);
    }, item.timeout);
    timers.current.set(id, t);
    return () => {};
  }, [notice, defaultTimeout]);

  const remove = (id) => {
    setQueue((q) => q.filter((i) => i.id !== id));
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
  };

  if (!queue.length) return null;

  return (
    <div
      className="fixed z-[100001] left-3 right-3 bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] md:left-auto md:right-4 md:bottom-4 flex flex-col items-stretch md:items-end gap-2 pointer-events-none"
      role="region"
      aria-label="Notificări"
      aria-live="polite"
      aria-relevant="additions text"
      aria-atomic="false"
    >
      {queue.map((n) => (
        <div key={n.id} className="pointer-events-auto md:max-w-sm w-full md:w-auto">
          <Notification
            notice={{
              message: n.message,
              type: n.type,
              actionLabel: n.actionLabel,
              onAction: n.onAction,
            }}
            stacked={true}
            onClose={() => remove(n.id)}
          />
        </div>
      ))}
    </div>
  );
}
