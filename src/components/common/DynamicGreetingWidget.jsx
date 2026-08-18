import React, { useState, useEffect, useMemo } from "react";
import {
  getUserNickname,
  getDynamicGreetingObject,
  NICKNAME_CHANGE_EVENT,
} from "../../utils/userNickname";

export default function DynamicGreetingWidget({
  claims = [],
  userEmail = "",
  onOpenSettings,
  className = "",
}) {
  const [nickname, setNickname] = useState(() => getUserNickname(userEmail));
  const [activeStageFilter, setActiveStageFilter] = useState(null);
  const [cycleIndex, setCycleIndex] = useState(0);

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
    const handleSelectStage = (e) => {
      setActiveStageFilter(e.detail || null);
    };
    window.addEventListener(NICKNAME_CHANGE_EVENT, handleNicknameChange);
    window.addEventListener("app:select_stage_filter", handleSelectStage);
    return () => {
      window.removeEventListener(NICKNAME_CHANGE_EVENT, handleNicknameChange);
      window.removeEventListener("app:select_stage_filter", handleSelectStage);
    };
  }, [userEmail]);

  // Actualizare periodică la fiecare minut pentru sinteză orară
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const claimStats = useMemo(() => {
    const tot = claims.length;
    let piese = 0;
    let rep = 0;
    let accept = 0;
    let prog = 0;
    let acord = 0;

    claims.forEach((c) => {
      if (c.status === "piese_comandate") piese++;
      else if (c.status === "reparatie_in_curs") rep++;
      else if (c.status === "accept_plata" || c.status === "dosar_incheiat") accept++;
      else if (c.status === "programare_efectuata") prog++;
      else if (c.status === "constatare_efectuata") acord++;
    });

    return { tot, piese, rep, accept, prog, acord };
  }, [claims]);

  const greetingObj = useMemo(
    () => getDynamicGreetingObject(nickname, claimStats, cycleIndex),
    [nickname, claimStats, cycleIndex]
  );

  const isFilterActive = activeStageFilter === greetingObj.targetStage && greetingObj.targetStage != null;

  const handleClick = () => {
    if (greetingObj.targetStage) {
      if (isFilterActive) {
        window.dispatchEvent(new CustomEvent("app:select_stage_filter", { detail: null }));
        setCycleIndex((c) => c + 1);
      } else {
        window.dispatchEvent(new CustomEvent("app:select_stage_filter", { detail: greetingObj.targetStage }));
      }
    } else {
      onOpenSettings?.();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium transition-all cursor-pointer group ${
        isFilterActive
          ? "bg-[var(--app-accent)] text-white shadow-xs font-semibold"
          : "bg-[var(--app-surface-2)]/80 hover:bg-[var(--app-surface-2)] border border-[var(--app-border)] text-[var(--app-text)]"
      } ${className}`}
      title={
        greetingObj.targetStage
          ? isFilterActive
            ? "Apasă pentru a reseta filtrul de etapă"
            : `Apasă pentru a filtra dosarele pe etapa: ${greetingObj.stageLabel}`
          : "Apasă pentru a edita numele/porecla în setări"
      }
    >
      <span className="truncate max-w-[320px] xl:max-w-[520px]">{greetingObj.text}</span>
    </div>
  );
}
