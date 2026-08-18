import React, { useState, useEffect, useMemo } from "react";
import { Sparkles, Edit2 } from "lucide-react";
import {
  getUserNickname,
  getDynamicGreetingMessage,
  NICKNAME_CHANGE_EVENT,
} from "../../utils/userNickname";

export default function DynamicGreetingWidget({
  claims = [],
  userEmail = "",
  onOpenSettings,
  className = "",
}) {
  const [nickname, setNickname] = useState(() => getUserNickname(userEmail));

  useEffect(() => {
    setNickname(getUserNickname(userEmail));
  }, [userEmail]);

  useEffect(() => {
    const handleNicknameChange = (e) => {
      if (e.detail) {
        setNickname(e.detail);
      } else {
        setNickname(getUserNickname(userEmail));
      }
    };
    window.addEventListener(NICKNAME_CHANGE_EVENT, handleNicknameChange);
    return () => window.removeEventListener(NICKNAME_CHANGE_EVENT, handleNicknameChange);
  }, [userEmail]);

  const claimStats = useMemo(() => {
    const tot = claims.length;
    let piese = 0;
    let rep = 0;
    let accept = 0;
    let prog = 0;

    claims.forEach((c) => {
      if (c.status === "piese_comandate") piese++;
      else if (c.status === "reparatie_in_curs") rep++;
      else if (c.status === "accept_plata" || c.status === "dosar_incheiat") accept++;
      else if (c.status === "programare_efectuata") prog++;
    });

    return { tot, piese, rep, accept, prog };
  }, [claims]);

  const greetingMessage = useMemo(
    () => getDynamicGreetingMessage(nickname, claimStats),
    [nickname, claimStats]
  );

  return (
    <div
      className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--app-surface-2)]/80 border border-[var(--app-border)] text-[12px] font-medium text-[var(--app-text)] shadow-2xs transition-all hover:bg-[var(--app-surface-2)] cursor-pointer group ${className}`}
      onClick={() => onOpenSettings?.()}
      title="Apasă pentru a edita numele/porecla în setări"
    >
      <Sparkles size={13} className="text-amber-500 shrink-0 animate-pulse" />
      <span className="truncate max-w-[260px] xl:max-w-[420px]">{greetingMessage}</span>
      <Edit2 size={10} className="text-[var(--app-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-0.5" />
    </div>
  );
}
