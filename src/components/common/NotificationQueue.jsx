import React, { useEffect, useState, useRef } from "react";
import Notification from "./Notification";

let nextId = 1;

export default function NotificationQueue({ notice, defaultTimeout = 4000 }) {
  const [queue, setQueue] = useState([]);
  const timers = useRef(new Map());

  useEffect(() => {
    if (!notice) return;
    const id = nextId++;
    const item = { id, message: notice.message, type: notice.type || "success", timeout: notice.timeout || defaultTimeout };
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
    <div className="fixed z-[100001] right-4 bottom-4 flex flex-col items-end gap-3">
      {queue.map((n) => (
        <Notification key={n.id} notice={{ message: n.message, type: n.type }} stacked={true} onClose={() => remove(n.id)} />
      ))}
    </div>
  );
}
