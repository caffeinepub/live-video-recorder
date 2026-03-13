import { useEffect, useRef } from "react";

interface AudioLevelMeterProps {
  stream: MediaStream | null;
  isRecording: boolean;
}

const BAR_COUNT = 12;
const BARS = Array.from({ length: BAR_COUNT }, (_, i) => i);

export function AudioLevelMeter({ stream, isRecording }: AudioLevelMeterProps) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream || !isRecording) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      for (const b of barsRef.current) {
        if (b) b.style.transform = "scaleY(0.08)";
      }
      return;
    }

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    function draw() {
      analyser.getByteFrequencyData(data);
      for (let i = 0; i < BAR_COUNT; i++) {
        const bar = barsRef.current[i];
        if (!bar) continue;
        const idx = Math.floor((i / BAR_COUNT) * data.length);
        const val = data[idx] / 255;
        const scale = Math.max(0.08, val);
        bar.style.transform = `scaleY(${scale})`;
        const intensity = Math.floor(val * 100);
        bar.style.opacity = `${0.4 + val * 0.6}`;
        bar.style.background = `oklch(${0.5 + val * 0.3} ${0.15 + val * 0.1} ${183 - intensity})`;
      }
      animFrameRef.current = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      ctx.close();
    };
  }, [stream, isRecording]);

  return (
    <div className="flex items-end gap-[3px] h-8">
      {BARS.map((i) => (
        <div
          key={i}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          className="w-1.5 rounded-full transition-none"
          style={{
            height: "100%",
            transform: "scaleY(0.08)",
            transformOrigin: "bottom",
            background: "oklch(0.76 0.19 183)",
            opacity: 0.4,
          }}
        />
      ))}
    </div>
  );
}
