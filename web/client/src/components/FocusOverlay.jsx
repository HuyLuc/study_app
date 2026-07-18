import { useEffect, useRef, useState } from "react";

import CountdownDisplay from "./CountdownDisplay";
import { findAmbientTrack } from "../constants/focusExperience";
import { formatDate } from "../utils/formatDate";

function FocusOverlay({
  isOpen,
  activeSession,
  selectedSkill,
  focusClockStyle,
  focusMusicTrack,
  focusMusicEnabled,
  focusMusicVolume,
  onLogFocusCycle,
  onEndSession,
  onClose,
}) {
  const [now, setNow] = useState(() => Date.now());
  const [musicBlocked, setMusicBlocked] = useState(false);
  const [musicErrorMessage, setMusicErrorMessage] = useState("");
  const audioRef = useRef(null);
  const synthRef = useRef(null);
  const ambientTrack = findAmbientTrack(focusMusicTrack);

  function stopSynthFallback() {
    const synth = synthRef.current;
    if (!synth) {
      return;
    }

    try {
      synth.oscA.stop();
      synth.oscB.stop();
    } catch {
      // Ignore stop errors when oscillators are already stopped.
    }

    synth.gain.disconnect();
    synth.filter.disconnect();
    synth.oscA.disconnect();
    synth.oscB.disconnect();

    if (synth.context.state !== "closed") {
      synth.context.close();
    }

    synthRef.current = null;
  }

  function startSynthFallback() {
    stopSynthFallback();

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return false;
    }

    const context = new AudioCtx();
    const oscA = context.createOscillator();
    const oscB = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();

    oscA.type = "sine";
    oscB.type = "triangle";
    oscA.frequency.value = 196;
    oscB.frequency.value = 293.66;

    filter.type = "lowpass";
    filter.frequency.value = 720;
    filter.Q.value = 0.7;

    gain.gain.value = Math.max(0.01, focusMusicVolume * 0.08);

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    oscA.start();
    oscB.start();

    synthRef.current = {
      context,
      oscA,
      oscB,
      filter,
      gain,
    };
    return true;
  }

  useEffect(() => {
    if (!isOpen || !activeSession) {
      return undefined;
    }

    setNow(Date.now());
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isOpen, activeSession]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.volume = focusMusicVolume;

    if (synthRef.current?.gain) {
      synthRef.current.gain.gain.value = Math.max(0.01, focusMusicVolume * 0.08);
    }
  }, [focusMusicVolume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const shouldPlay =
      isOpen && Boolean(activeSession) && focusMusicEnabled && ambientTrack.id !== "none" && Boolean(ambientTrack.url);

    if (!shouldPlay) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      stopSynthFallback();
      setMusicBlocked(false);
      setMusicErrorMessage("");
      return;
    }

    stopSynthFallback();

    audio.src = ambientTrack.url;
    audio.loop = true;

    const playPromise = audio.play();
    if (playPromise?.then) {
      playPromise
        .then(() => {
          setMusicBlocked(false);
          setMusicErrorMessage("");
        })
        .catch(() => {
          setMusicBlocked(true);
          setMusicErrorMessage("Trình duyệt đang chặn tự phát nhạc. Hãy bấm nút bên dưới để phát thủ công.");
        });
    }
  }, [isOpen, activeSession, focusMusicEnabled, ambientTrack.id, ambientTrack.url]);

  useEffect(() => () => stopSynthFallback(), []);

  if (!isOpen || !activeSession) {
    return null;
  }

  const focusMinutes = Number(activeSession.focus_duration || 50);
  const startedAtMs = new Date(activeSession.started_at).getTime();
  const totalDurationMs = focusMinutes * 60 * 1000;

  const remainingMs = Number.isNaN(startedAtMs) ? 0 : Math.max(0, startedAtMs + totalDurationMs - now);

  async function handleRetryMusic() {
    const audio = audioRef.current;
    if (!audio || ambientTrack.id === "none") {
      return;
    }

    try {
      await audio.play();
      setMusicBlocked(false);
      setMusicErrorMessage("");
    } catch {
      const started = startSynthFallback();
      if (started) {
        setMusicBlocked(false);
        setMusicErrorMessage("Nguồn nhạc online lỗi, đã chuyển sang nhạc nền nội bộ.");
        return;
      }

      setMusicBlocked(true);
      setMusicErrorMessage("Không thể phát nhạc nền. Hãy thử đổi bài nhạc khác hoặc kiểm tra mạng.");
    }
  }

  return (
    <section className="focus-overlay" aria-label="Deep work overlay">
      <audio ref={audioRef} preload="none" />
      <div className="focus-overlay__card">
        <p className="eyebrow">{remainingMs > 0 ? "Đang tập trung" : "Chu kỳ đã hoàn tất"}</p>
        <p className="focus-overlay__skill">{selectedSkill?.name || "Phiên tập trung"}</p>
        <CountdownDisplay
          remainingMs={remainingMs}
          totalDurationMs={totalDurationMs}
          mode={focusClockStyle}
          className="focus-overlay__clock"
        />
        <p className="focus-overlay__meta">
          Bắt đầu lúc {formatDate(activeSession.started_at)} · Pomodoro đã ghi: {activeSession.pomodoros_completed} ·{" "}
          {focusMinutes} phút
        </p>
        <p className="focus-overlay__track">
          Nhạc nền: {focusMusicEnabled ? ambientTrack.label : "Đang tắt"}
          {focusMusicEnabled && ambientTrack.id !== "none" ? ` · Âm lượng ${Math.round(focusMusicVolume * 100)}%` : ""}
        </p>
        {musicErrorMessage ? <p className="muted">{musicErrorMessage}</p> : null}
        {musicBlocked ? (
          <button type="button" className="button" onClick={handleRetryMusic}>
            Bật nhạc thủ công
          </button>
        ) : null}
        <div className="focus-overlay__actions">
          <button type="button" className="button" onClick={onLogFocusCycle}>
            Ghi nhận 25 phút tập trung
          </button>
          <button type="button" className="button button--primary" onClick={onEndSession}>
            Hoàn thành phiên
          </button>
        </div>
        <button type="button" className="button button--ghost" onClick={onClose}>
          Thoát chế độ tập trung
        </button>
      </div>
    </section>
  );
}

export default FocusOverlay;
