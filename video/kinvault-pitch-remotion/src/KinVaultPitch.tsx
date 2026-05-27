import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Audio, Video } from "@remotion/media";
import { scenes, type Scene } from "./storyboard";
import {
  Atmosphere,
  CloseCore,
  LiquidityFlow,
  ProblemPrism,
  ProofEngine,
  ValueConstellation,
} from "./VisualSystems";
import {
  aiBadge,
  aiVideo,
  architectureShell,
  arrow,
  bigNumber,
  bodyStyle,
  brand,
  caption,
  cinematicBody,
  cinematicCopy,
  cinematicKicker,
  cinematicShade,
  cinematicTitle,
  cinematicVideo,
  closeShell,
  demoFilename,
  demoGrid,
  demoLabel,
  demoMockScreen,
  demoOverlay,
  fontStack,
  fullBleed,
  gridBg,
  kicker,
  lineItem,
  layout,
  logoMark,
  metric,
  miniMark,
  modernSlide,
  palette,
  progressFill,
  progressShell,
  quietPill,
  quietProof,
  proofRail,
  fullscreenDemo,
  slidePanel,
  step,
  stepNumber,
  titleStyle,
  topBar,
  topMeta,
} from "./styles";

type Props = {
  mode: "full" | "stinger" | "thumbnail";
};

const fullDuration = 180;

const aiAssets = {
  hook: "ai/ai-hook-family-risk.mp4",
  transition: "ai/ai-transition-btc-liquidity.mp4",
  stakes: "ai/ai-multishot-kinvault-stakes.mp4",
  proofTexture: "ai/ai-proof-texture.mp4",
};

const voiceoverAsset = "audio/kinvault-pitch-audio.mp3";
const voiceoverPlaybackRate = 1;

// Demo recording window — spans demo-explorer (66s) through demo-proof (170s)
const DEMO_START = 66;
const DEMO_DURATION = 104;

const getScene = (id: string) => {
  const scene = scenes.find((item) => item.id === id);
  if (!scene) throw new Error(`Missing scene: ${id}`);
  return scene;
};

export const KinVaultPitch: React.FC<Props> = ({ mode }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (mode === "thumbnail") {
    return <SceneView scene={scenes[0]} localFrame={45} totalFrames={120} />;
  }

  if (mode === "stinger") {
    return <Stinger frame={frame} fps={fps} />;
  }

  return (
    <AbsoluteFill
      style={{
        background: palette.ink,
        color: palette.text,
        fontFamily: fontStack,
      }}
    >
      <PersistentFrame />
      {/* Continuous demo recording across the demo window (66s–170s) */}
      <Sequence from={DEMO_START * fps} durationInFrames={DEMO_DURATION * fps}>
        <AbsoluteFill style={{ background: palette.ink }}>
          <Video
            src={staticFile("recordings/demo-full.mp4")}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(8,9,11,0.45) 0%, transparent 22%, transparent 62%, rgba(8,9,11,0.85) 100%)",
            }}
          />
        </AbsoluteFill>
      </Sequence>
      {scenes.map((scene) => (
        <Sequence
          key={scene.id}
          from={scene.start * fps}
          durationInFrames={(scene.end - scene.start) * fps}
          premountFor={fps}
        >
          <SceneView
            scene={scene}
            localFrame={frame - scene.start * fps}
            totalFrames={(scene.end - scene.start) * fps}
          />
        </Sequence>
      ))}
      <Audio
        src={staticFile(voiceoverAsset)}
        playbackRate={voiceoverPlaybackRate}
        volume={(audioFrame) =>
          interpolate(audioFrame, [0, 8, 6276, 6300], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
      <Progress current={frame / fps} duration={fullDuration} />
    </AbsoluteFill>
  );
};

const Stinger: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const current = frame / fps;
  const stingerScene: Scene =
    current < 2.5
      ? getScene("hook")
      : current < 5.5
        ? {
            ...getScene("problem"),
            title: "Bitcoin inheritance should not force a Bitcoin sale.",
            body: "A heartbeat release path for families, built on Mezo.",
          }
        : current < 10.5
          ? { ...getScene("owner-demo"), end: 10.5, start: 5.5 }
          : current < 13
            ? {
                ...getScene("solution"),
                id: "stinger-stakes",
                visual: "stakes",
                kicker: "KinVault",
                title: "A release path families can rehearse.",
                body: "BTC stays collateral while emergency liquidity reaches beneficiaries.",
                caption:
                  "The full walkthrough replaces this mood footage with the product flow.",
                end: 13,
                start: 10.5,
              }
            : getScene("close");

  return (
    <AbsoluteFill
      style={{
        background: palette.ink,
        color: palette.text,
        fontFamily: fontStack,
      }}
    >
      <PersistentFrame compact />
      <SceneView
        scene={stingerScene}
        localFrame={Math.floor((current - Math.floor(current)) * fps)}
        totalFrames={90}
      />
      <Progress current={current} duration={15} />
    </AbsoluteFill>
  );
};

const SceneView: React.FC<{
  scene: Scene;
  localFrame: number;
  totalFrames: number;
}> = ({ scene, localFrame, totalFrames }) => {
  if (scene.visual === "slot") {
    return (
      <FullscreenDemoScene
        scene={scene}
        localFrame={localFrame}
        totalFrames={totalFrames}
      />
    );
  }

  if (scene.visual === "stakes" || scene.visual === "hook") {
    return (
      <CinematicScene
        scene={scene}
        localFrame={localFrame}
        totalFrames={totalFrames}
      />
    );
  }

  const enter = spring({
    frame: localFrame,
    fps: 30,
    config: { damping: 24, stiffness: 120 },
  });
  const out = interpolate(
    localFrame,
    [Math.max(0, totalFrames - 20), totalFrames],
    [1, 0.92],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        opacity: out,
        fontFamily: fontStack,
        transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px)`,
      }}
    >
      <Atmosphere frame={localFrame} />
      <div style={modernSlide}>
        <main>
          <Kicker>{scene.kicker}</Kicker>
          <h1 style={titleStyle}>{scene.title}</h1>
          <p style={bodyStyle}>{scene.body}</p>
          <Caption text={scene.caption} />
        </main>
        <aside>
          <Visual scene={scene} frame={localFrame} />
        </aside>
      </div>
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ scene: Scene; frame: number }> = ({
  scene,
  frame,
}) => {
  if (scene.visual === "slot") return null;
  if (scene.visual === "problem") return <ProblemVisual frame={frame} />;
  if (scene.visual === "architecture")
    return <ArchitectureVisual frame={frame} />;
  if (scene.visual === "stakes") return <StakesVisual />;
  if (scene.visual === "proof") return <ProofVisual frame={frame} />;
  if (scene.visual === "value") return <ValueVisual frame={frame} />;
  if (scene.visual === "close") return <CloseVisual frame={frame} />;
  return <HookVisual />;
};

const FullscreenDemoScene: React.FC<{
  scene: Scene;
  localFrame: number;
  totalFrames: number;
}> = ({ scene, localFrame, totalFrames }) => {
  // Caption overlay only — the actual recording plays in the continuous
  // Video sequence underneath. Fade the lower-third in and out.
  const enter = interpolate(localFrame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit = interpolate(
    localFrame,
    [Math.max(0, totalFrames - 16), totalFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const opacity = Math.min(enter, exit);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Top-left scene chip */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 64,
          opacity,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 22px",
          borderRadius: 999,
          background: "rgba(8,9,11,0.72)",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: palette.musd,
          }}
        />
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: palette.text,
          }}
        >
          {scene.kicker}
        </span>
      </div>

      {/* Bottom lower-third caption */}
      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          bottom: 72,
          opacity,
        }}
      >
        <div
          style={{
            fontSize: 52,
            fontWeight: 900,
            lineHeight: 1.04,
            letterSpacing: "-0.02em",
            color: "#fff",
            textShadow: "0 2px 24px rgba(0,0,0,0.7)",
          }}
        >
          {scene.title}
        </div>
        <div
          style={{
            fontSize: 26,
            lineHeight: 1.35,
            marginTop: 12,
            maxWidth: 1100,
            color: "rgba(255,255,255,0.82)",
            textShadow: "0 2px 16px rgba(0,0,0,0.8)",
          }}
        >
          {scene.caption}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const AiVideoLayer = ({ asset }: { asset: string }) => (
  <Video src={staticFile(asset)} muted loop objectFit="cover" style={aiVideo} />
);

const CinematicScene: React.FC<{
  scene: Scene;
  localFrame: number;
  totalFrames: number;
}> = ({ scene, localFrame, totalFrames }) => {
  const titleIn = interpolate(localFrame, [115, 165], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(titleIn, [0, 1], [28, 0]);
  const proofIn = interpolate(localFrame, [230, 280], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const out = interpolate(
    localFrame,
    [Math.max(0, totalFrames - 28), totalFrames],
    [1, 0.82],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return (
    <AbsoluteFill style={{ ...fullBleed, opacity: out }}>
      <Video
        src={staticFile(aiAssets.stakes)}
        muted
        loop
        objectFit="cover"
        style={cinematicVideo}
      />
      <div style={cinematicShade} />
      <div
        style={{
          ...cinematicCopy,
          opacity: titleIn,
          transform: `translateY(${titleY}px)`,
        }}
      >
        <div style={cinematicKicker}>{scene.kicker}</div>
        <div style={cinematicTitle}>{scene.title}</div>
        <div style={cinematicBody}>{scene.body}</div>
      </div>
      <div style={{ ...quietProof, opacity: proofIn }}>
        <span style={quietPill}>Mezo Testnet</span>
        <span style={quietPill}>0.045 BTC collateral</span>
        <span style={quietPill}>MUSD release</span>
        <span style={quietPill}>70 / 30 split</span>
      </div>
    </AbsoluteFill>
  );
};

const HookVisual = () => (
  <div style={slidePanel}>
    <AiVideoLayer asset={aiAssets.hook} />
    <div style={cinematicShade} />
  </div>
);

const ProofVisual: React.FC<{ frame: number }> = ({ frame }) => (
  <ProofEngine frame={frame} />
);

const ProblemVisual: React.FC<{ frame: number }> = ({ frame }) => (
  <ProblemPrism frame={frame} />
);

const ArchitectureVisual: React.FC<{ frame: number }> = ({ frame }) => {
  return <LiquidityFlow frame={frame} />;
};

const StakesVisual = () => (
  <div style={slidePanel}>
    <AiVideoLayer asset={aiAssets.stakes} />
    <div style={cinematicShade} />
  </div>
);

const ValueVisual: React.FC<{ frame: number }> = ({ frame }) => (
  <ValueConstellation frame={frame} />
);

const CloseVisual: React.FC<{ frame: number }> = ({ frame }) => (
  <CloseCore frame={frame} />
);

const PersistentFrame: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <div style={gridBg} />
    <div style={{ ...topBar, height: compact ? 54 : 64 }}>
      <div style={brand}>
        <div style={miniMark}>K</div>
        <span>KinVault Pitch Cut</span>
      </div>
      <div style={topMeta}>Mezo Testnet proof cut</div>
    </div>
  </AbsoluteFill>
);

const ProofRail = () => (
  <div style={proofRail}>
    <span>Chain 31611</span>
    <span>Contract 0x15ad...9ef9</span>
    <span>MUSD 0x1189...503</span>
  </div>
);

const Metric = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) => (
  <div style={metric}>
    <div style={{ color: palette.muted, fontSize: 22 }}>{label}</div>
    <div style={{ color: accent, fontSize: 34, fontWeight: 750 }}>{value}</div>
  </div>
);

const Step = ({
  n,
  title,
  body,
  danger,
}: {
  n: string;
  title: string;
  body: string;
  danger?: boolean;
}) => (
  <div
    style={{ ...step, borderColor: danger ? palette.warning : palette.line }}
  >
    <div style={stepNumber}>{n}</div>
    <div>
      <div style={{ fontSize: 30, fontWeight: 750 }}>{title}</div>
      <div style={{ color: palette.muted, fontSize: 23, marginTop: 8 }}>
        {body}
      </div>
    </div>
  </div>
);

const Kicker: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div style={kicker}>{children}</div>
);

const Caption = ({ text }: { text: string }) => (
  <div style={caption}>{text}</div>
);

const Progress = ({
  current,
  duration,
}: {
  current: number;
  duration: number;
}) => (
  <div style={progressShell}>
    <div
      style={{
        ...progressFill,
        width: `${Math.min(100, (current / duration) * 100)}%`,
      }}
    />
  </div>
);

const demoClarifier: React.CSSProperties = {
  position: "absolute",
  right: 96,
  top: 94,
  width: 520,
  padding: "18px 20px",
  borderRadius: 8,
  border: "1px solid rgba(51,227,159,0.32)",
  background: "rgba(7,10,13,0.78)",
  color: palette.text,
  fontSize: 22,
  lineHeight: 1.3,
};
