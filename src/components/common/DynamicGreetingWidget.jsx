import React, { useState, useEffect, useMemo } from "react";
import { Filter, Edit2 } from "lucide-react";
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
    () => getDynamicGreetingObject(nickname, claimStats),
    [nickname, claimStats]
  );

  const isFilterActive = activeStageFilter === greetingObj.targetStage && greetingObj.targetStage != null;

  const handleClick = () => {
    if (greetingObj.targetStage) {
      const nextStage = isFilterActive ? null : greetingObj.targetStage;
      window.dispatchEvent(new CustomEvent("app:select_stage_filter", { detail: nextStage }));
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
      <span className="truncate max-w-[280px] xl:max-w-[440px]">{greetingObj.text}</span>
      {greetingObj.targetStage ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider opacity-80 group-hover:opacity-100 shrink-0 ml-1">
          <Filter size={11} className={isFilterActive ? "text-white" : "text-[var(--app-accent)]"} />
          <span>{isFilterActive ? "Filtrat" : "Filtrează"}</span>
        </span>
      ) : (
        <Edit2 size={10} className="text-[var(--app-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-0.5" />
      )}
    </div>
  );
}
