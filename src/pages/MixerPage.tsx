import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import Icon from "@/components/ui/icon";

interface Track {
  id: number;
  name: string;
  color: string;
  volume: number;
  pan: number;
  muted: boolean;
  soloed: boolean;
  file: File | null;
  audioBuffer: AudioBuffer | null;
  source: AudioBufferSourceNode | null;
  gainNode: GainNode | null;
  panNode: StereoPannerNode | null;
  isPlaying: boolean;
}

const TRACK_COLORS = ["#a855f7", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#ec4899"];

let audioCtx: AudioContext | null = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export default function MixerPage() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<Track[]>([
    createTrack(1, "Трек 1"),
    createTrack(2, "Трек 2"),
    createTrack(3, "Трек 3"),
    createTrack(4, "Трек 4"),
  ]);
  const [masterVolume, setMasterVolume] = useState(80);
  const masterGainRef = useRef<GainNode | null>(null);
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  function createTrack(id: number, name: string): Track {
    return {
      id,
      name,
      color: TRACK_COLORS[(id - 1) % TRACK_COLORS.length],
      volume: 75,
      pan: 0,
      muted: false,
      soloed: false,
      file: null,
      audioBuffer: null,
      source: null,
      gainNode: null,
      panNode: null,
      isPlaying: false,
    };
  }

  useEffect(() => {
    if (!loading && (!user || !user.has_access)) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const ctx = getAudioCtx();
    const master = ctx.createGain();
    master.gain.value = masterVolume / 100;
    master.connect(ctx.destination);
    masterGainRef.current = master;
  }, []);

  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = masterVolume / 100;
    }
  }, [masterVolume]);

  async function loadFile(trackId: number, file: File) {
    const ctx = getAudioCtx();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, file, audioBuffer, name: file.name.replace(/\.[^.]+$/, "") } : t))
    );
  }

  function playTrack(track: Track) {
    if (!track.audioBuffer) return;
    stopTrack(track);
    const ctx = getAudioCtx();
    const source = ctx.createBufferSource();
    source.buffer = track.audioBuffer;

    const gain = ctx.createGain();
    gain.gain.value = track.muted ? 0 : track.volume / 100;

    const pan = ctx.createStereoPanner();
    pan.pan.value = track.pan / 100;

    source.connect(gain);
    gain.connect(pan);
    pan.connect(masterGainRef.current || ctx.destination);
    source.start();

    source.onended = () => {
      setTracks((prev) => prev.map((t) => (t.id === track.id ? { ...t, isPlaying: false, source: null } : t)));
    };

    setTracks((prev) =>
      prev.map((t) => (t.id === track.id ? { ...t, isPlaying: true, source, gainNode: gain, panNode: pan } : t))
    );
  }

  function stopTrack(track: Track) {
    if (track.source) {
      try { track.source.stop(); } catch (_e) { /* already stopped */ }
    }
    setTracks((prev) => prev.map((t) => (t.id === track.id ? { ...t, isPlaying: false, source: null } : t)));
  }

  function updateVolume(trackId: number, value: number) {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        if (t.gainNode) t.gainNode.gain.value = t.muted ? 0 : value / 100;
        return { ...t, volume: value };
      })
    );
  }

  function updatePan(trackId: number, value: number) {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        if (t.panNode) t.panNode.pan.value = value / 100;
        return { ...t, pan: value };
      })
    );
  }

  function toggleMute(trackId: number) {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        const muted = !t.muted;
        if (t.gainNode) t.gainNode.gain.value = muted ? 0 : t.volume / 100;
        return { ...t, muted };
      })
    );
  }

  function addTrack() {
    const id = Math.max(...tracks.map((t) => t.id)) + 1;
    setTracks((prev) => [...prev, createTrack(id, `Трек ${id}`)]);
  }

  function removeTrack(trackId: number) {
    const t = tracks.find((tr) => tr.id === trackId);
    if (t) stopTrack(t);
    setTracks((prev) => prev.filter((tr) => tr.id !== trackId));
  }

  function stopAll() {
    tracks.forEach(stopTrack);
  }

  function playAll() {
    tracks.filter((t) => t.audioBuffer).forEach(playTrack);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  const trialEnds = user?.trial_ends_at ? new Date(user.trial_ends_at) : null;
  const daysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / 86400000)) : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/60 backdrop-blur px-6 py-3 flex items-center justify-between">
        <a href="/" className="text-xl font-bold tracking-tighter text-white">SoundForge</a>
        <div className="flex items-center gap-4">
          {daysLeft !== null && (
            <span className="text-xs bg-purple-600/30 border border-purple-500/30 text-purple-300 px-3 py-1 rounded-full">
              Пробный период: {daysLeft} {daysLeft === 1 ? "день" : daysLeft < 5 ? "дня" : "дней"}
            </span>
          )}
          {user?.plan === "trial" && (
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs">
              Купить Pro — 299 ₽/мес
            </Button>
          )}
          <span className="text-zinc-500 text-sm">{user?.email}</span>
          <button onClick={logout} className="text-zinc-500 hover:text-white text-sm transition-colors">
            Выйти
          </button>
        </div>
      </header>

      {/* Transport */}
      <div className="border-b border-white/10 bg-zinc-900/50 px-6 py-3 flex items-center gap-4">
        <Button onClick={playAll} size="sm" className="bg-green-600 hover:bg-green-700 gap-1">
          <Icon name="Play" size={14} />
          Воспроизвести все
        </Button>
        <Button onClick={stopAll} size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10 gap-1">
          <Icon name="Square" size={14} />
          Стоп
        </Button>
        <div className="flex items-center gap-2 ml-4">
          <Icon name="Volume2" size={16} className="text-zinc-400" />
          <span className="text-zinc-400 text-xs w-12">Мастер</span>
          <div className="w-32">
            <Slider
              value={[masterVolume]}
              onValueChange={([v]) => setMasterVolume(v)}
              min={0}
              max={100}
              className="cursor-pointer"
            />
          </div>
          <span className="text-zinc-500 text-xs w-8">{masterVolume}%</span>
        </div>
        <Button onClick={addTrack} size="sm" variant="ghost" className="ml-auto text-zinc-400 hover:text-white gap-1">
          <Icon name="Plus" size={14} />
          Добавить трек
        </Button>
      </div>

      {/* Tracks */}
      <div className="flex-1 p-6 space-y-3 overflow-y-auto">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="bg-zinc-900 border border-white/10 rounded-xl p-4 flex items-center gap-4"
          >
            {/* Color bar */}
            <div className="w-1 h-14 rounded-full flex-shrink-0" style={{ backgroundColor: track.color }} />

            {/* Track name + file */}
            <div className="w-40 flex-shrink-0">
              <p className="text-sm font-medium text-white truncate">{track.name}</p>
              <button
                className="text-xs text-zinc-500 hover:text-purple-400 transition-colors mt-1"
                onClick={() => fileInputRefs.current[track.id]?.click()}
              >
                {track.file ? "Заменить файл" : "+ Загрузить аудио"}
              </button>
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                ref={(el) => { fileInputRefs.current[track.id] = el; }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) loadFile(track.id, file);
                }}
              />
            </div>

            {/* Play/Stop */}
            <button
              onClick={() => track.isPlaying ? stopTrack(track) : playTrack(track)}
              disabled={!track.audioBuffer}
              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${track.audioBuffer ? "bg-white/10 hover:bg-white/20" : "bg-white/5 opacity-40 cursor-not-allowed"}`}
            >
              <Icon name={track.isPlaying ? "Square" : "Play"} size={14} />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Icon name="Volume2" size={14} className="text-zinc-500 flex-shrink-0" />
              <Slider
                value={[track.volume]}
                onValueChange={([v]) => updateVolume(track.id, v)}
                min={0}
                max={100}
                className="flex-1 cursor-pointer"
              />
              <span className="text-zinc-500 text-xs w-8 flex-shrink-0">{track.volume}%</span>
            </div>

            {/* Pan */}
            <div className="flex items-center gap-2 w-36 flex-shrink-0">
              <span className="text-zinc-600 text-xs">L</span>
              <Slider
                value={[track.pan + 100]}
                onValueChange={([v]) => updatePan(track.id, v - 100)}
                min={0}
                max={200}
                className="flex-1 cursor-pointer"
              />
              <span className="text-zinc-600 text-xs">R</span>
            </div>

            {/* Mute */}
            <button
              onClick={() => toggleMute(track.id)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors flex-shrink-0 ${track.muted ? "bg-yellow-500/30 text-yellow-400 border border-yellow-500/40" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}
            >
              M
            </button>

            {/* Remove */}
            <button
              onClick={() => removeTrack(track.id)}
              className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0"
            >
              <Icon name="X" size={16} />
            </button>
          </div>
        ))}

        {tracks.length === 0 && (
          <div className="text-center py-20 text-zinc-600">
            <Icon name="Music" size={48} className="mx-auto mb-4 opacity-30" />
            <p>Нет треков. Нажмите «Добавить трек»</p>
          </div>
        )}
      </div>
    </div>
  );
}