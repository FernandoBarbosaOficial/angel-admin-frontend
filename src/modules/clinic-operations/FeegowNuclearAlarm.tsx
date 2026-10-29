import { useCallback, useEffect, useRef, useState } from "react";
import "./FeegowNuclearAlarm.css";

type FeegowHealth = {
  status: "healthy" | "degraded" | "critical" | "unknown";
  reason: string;
  endpoint: string | null;
  httpStatus: number | null;
  lastCheckedAt: string;
  lastHealthyAt: string | null;
  consecutiveErrors: number;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const ADMIN_TOKEN_STORAGE_KEY = "agendai_admin_token";
const REFRESH_MS = 10_000;

function timeLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "horário não informado"
    : date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// Osciladores locais: não fazem upload, não reproduzem músicas nem dependem de arquivos de áudio.
function playCriticalAlarm() {
  try {
    const ctx = new AudioContext();
    for (let index = 0; index < 3; index++) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = index % 2 ? 720 : 950;
      gain.gain.value = 0.038;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      const start = ctx.currentTime + index * 0.24;
      oscillator.start(start);
      oscillator.stop(start + 0.14);
    }
    window.setTimeout(() => void ctx.close().catch(() => {}), 1400);
  } catch {
    // Browsers podem bloquear áudio não iniciado pelo usuário.
  }
}

export default function FeegowNuclearAlarm() {
  const [snapshot, setSnapshot] = useState<FeegowHealth | null>(null);
  const [updated, setUpdated] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const lastSoundAt = useRef(0);

  const loadStatus = useCallback(async () => {
    const token = window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
    if (!token) {
      setSnapshot(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 6500);
    try {
      const response = await fetch(API_BASE_URL + "/api/admin/feegow/health", {
        method: "GET",
        headers: { Authorization: "Bearer " + token, Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });
      if (response.status === 401 || response.status === 403) {
        setSnapshot(null);
        return;
      }
      if (!response.ok) throw new Error("Monitor API sem resposta");
      const json = await response.json();
      if (!json?.data?.status) throw new Error("Resposta do monitor inválida");
      setSnapshot(json.data as FeegowHealth);
      setUpdated(true);
    } catch {
      setSnapshot((prior) => prior?.status === "critical" ? prior : {
        status: "unknown",
        reason: "Não foi possível consultar o monitor Feegow",
        endpoint: null,
        httpStatus: null,
        lastCheckedAt: new Date().toISOString(),
        lastHealthyAt: null,
        consecutiveErrors: 0,
      });
    } finally {
      window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    const interval = window.setInterval(() => void loadStatus(), REFRESH_MS);
    const onFocus = () => void loadStatus();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadStatus]);

  useEffect(() => {
    if (!snapshot) return;
    if (snapshot.status === "critical") {
      document.title = "🚨 FEEGOW - AÇÃO IMEDIATA | Angel";
      if (soundEnabled && Date.now() - lastSoundAt.current > 60_000) {
        lastSoundAt.current = Date.now();
        playCriticalAlarm();
      }
    } else {
      document.title = document.title.replace(/^🚨 FEEGOW - AÇÃO IMEDIATA \| /, "");
      lastSoundAt.current = 0;
    }
    return () => { document.title = document.title.replace(/^🚨 FEEGOW - AÇÃO IMEDIATA \| /, ""); };
  }, [snapshot, soundEnabled]);

  if (!snapshot) return null;

  if (snapshot.status !== "critical") {
    return (
      <div className={"feegowHealthChip " + snapshot.status}
        role="status" aria-label={"Monitor Feegow: " + snapshot.status}
        title={snapshot.reason + " — " + timeLabel(snapshot.lastCheckedAt)}>
        <span aria-hidden="true" className="feegowHealthDot" />
        {snapshot.status === "healthy" ? "FEEGOW ONLINE" :
          snapshot.status === "degraded" ? "FEEGOW INSTÁVEL" : "FEEGOW SEM MONITORAÇÃO"}
        <span className="feegowHealthChecked"> · {timeLabel(snapshot.lastCheckedAt)}</span>
      </div>
    );
  }

  return (
    <div className="feegowNuclearAlarm" role="alert" aria-live="assertive" aria-atomic="true">
      <div className="feegowNuclearAlarmPulse" aria-hidden="true">🚨</div>
      <div className="feegowNuclearAlarmText">
        <strong>ALERTA NUCLEAR — FEEGOW COM FALHA CRÍTICA</strong>
        <span>
          {snapshot.reason}. {snapshot.endpoint ? "Rota: " + snapshot.endpoint + ". " : ""}
          {snapshot.httpStatus ? "HTTP " + snapshot.httpStatus + ". " : ""}
          <b>Agendamentos podem estar bloqueados. Corrija imediatamente o token ou as permissões no Feegow.</b>
        </span>
        <small>Detectado às {timeLabel(snapshot.lastCheckedAt)}. O aviso desaparece somente após recuperação confirmada.</small>
      </div>
      <div className="feegowNuclearAlarmActions">
        <button type="button" onClick={() => { setSoundEnabled(true); playCriticalAlarm(); }}>
          {soundEnabled ? "🔊 Sirene ativa" : "🔊 Ativar sirene"}
        </button>
        <button type="button" onClick={() => void loadStatus()}>
          {updated ? "Atualizar status" : "Verificar"}
        </button>
      </div>
    </div>
  );
}
