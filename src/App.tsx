import { motion } from "motion/react";
import {
  Activity,
  ArrowUpRight,
  Clock3,
  FileWarning,
  Github,
  HeartPulse,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { WalletEntry } from "./components/WalletEntry";
import { kinVaultProof, shortAddress } from "./lib/proof";
import { mezoLinks } from "./lib/mezo";

type ScenarioState = "active" | "ready" | "released";

const statusCopy: Record<ScenarioState, { eyebrow: string; title: string; body: string }> = {
  active: {
    eyebrow: "Heartbeat active",
    title: "Beneficiary release is blocked",
    body: "The owner is still alive in protocol terms. Release attempts revert until the heartbeat window expires.",
  },
  ready: {
    eyebrow: "Heartbeat missed",
    title: "Beneficiary release is now allowed",
    body: "The compressed demo timeout has passed. The beneficiary can release the MUSD reserve.",
  },
  released: {
    eyebrow: "Reserve released",
    title: "Beneficiary received emergency MUSD",
    body: "The vault is empty, the release flag is locked, and the receipt can be attached to the submission packet.",
  },
};

const formatTimer = (seconds: number) => {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)
    .toString()
    .padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
};

type AppProps = {
  passportEnabled: boolean;
};

export function App({ passportEnabled }: AppProps) {
  const [scenario, setScenario] = useState<ScenarioState>("active");
  const [deadline, setDeadline] = useState(() => Date.now() + kinVaultProof.heartbeatIntervalSeconds * 1000);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);

  const secondsRemaining = useMemo(() => {
    if (scenario !== "active") return 0;
    return Math.max(0, Math.ceil((deadline - now) / 1000));
  }, [deadline, now, scenario]);

  useEffect(() => {
    if (scenario === "active" && secondsRemaining === 0) setScenario("ready");
  }, [scenario, secondsRemaining]);

  const progress = scenario === "active" ? 1 - secondsRemaining / kinVaultProof.heartbeatIntervalSeconds : 1;
  const releaseEnabled = scenario === "ready";
  const copy = statusCopy[scenario];

  const resetHeartbeat = () => {
    setScenario("active");
    setDeadline(Date.now() + kinVaultProof.heartbeatIntervalSeconds * 1000);
  };

  const eventRows = kinVaultProof.events.map((event) => {
    if (event.label === "BeneficiaryReleased" && scenario !== "released") {
      return { ...event, status: releaseEnabled ? "pending" : "blocked" } as const;
    }
    if (event.label === "MezoDeployment") return event;
    return event;
  });

  return (
    <main className="appShell">
      <video
        className="ambientVideo"
        autoPlay
        muted
        loop
        playsInline
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_063509_7d167302-4fd4-480b-8260-18ab572333d4.mp4"
      />
      <div className="videoScrim" />
      <div className="noiseLayer" />

      <div className="workspace">
        <header className="topbar" aria-label="KinVault workspace">
          <a className="brandLockup" href="/" aria-label="KinVault home">
            <span className="brandMark">
              <LockKeyhole size={18} strokeWidth={1.8} />
            </span>
            <span>
              <strong>KinVault</strong>
              <small>Mezo beneficiary release</small>
            </span>
          </a>

          <nav className="navLinks" aria-label="Project links">
            <a href={mezoLinks.docs} target="_blank" rel="noreferrer">
              Mezo docs
            </a>
            <a href={mezoLinks.explorer} target="_blank" rel="noreferrer">
              Testnet explorer
            </a>
            <a href="./outputs/proofs/latest.json" target="_blank" rel="noreferrer">
              Proof JSON
            </a>
          </nav>

          <div className="walletSlot">
            <WalletEntry passportEnabled={passportEnabled} />
          </div>
        </header>

        <section className="heroGrid" aria-label="KinVault release cockpit">
          <motion.div
            className="narrativePanel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="proofPill">
              <ShieldCheck size={16} />
              {kinVaultProof.proofSource}
            </div>
            <h1>Beneficiary release for Bitcoin-backed money.</h1>
            <p>
              A holder funds a MUSD emergency reserve, keeps it locked with heartbeat checks, and lets a beneficiary
              release it only after the heartbeat expires. It is custody planning infrastructure, not a legal will.
            </p>

            <div className="actionRow">
              <button className="primaryAction" type="button" onClick={() => setScenario("ready")}>
                <TimerReset size={18} />
                Simulate missed heartbeat
              </button>
              <a className="secondaryAction" href={mezoLinks.hackathon} target="_blank" rel="noreferrer">
                Sponsor brief
                <ArrowUpRight size={16} />
              </a>
            </div>

            <div className="legalNote" role="note">
              <FileWarning size={18} />
              <span>Not a probate product, not financial advice, and not a seed-phrase custody substitute.</span>
            </div>
          </motion.div>

          <motion.div
            className={`cockpitPanel ${scenario}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.1, ease: "easeOut" }}
          >
            <div className="stateHeader">
              <span>{copy.eyebrow}</span>
              <strong>{copy.title}</strong>
            </div>

            <div className="timerModule" aria-label="Heartbeat countdown">
              <svg className="timerRing" viewBox="0 0 240 240" role="img" aria-label="Heartbeat release timer">
                <circle className="ringTrack" cx="120" cy="120" r="94" />
                <circle
                  className="ringProgress"
                  cx="120"
                  cy="120"
                  r="94"
                  pathLength="1"
                  style={{ strokeDashoffset: 1 - progress }}
                />
              </svg>
              <div className="timerCore">
                <HeartPulse size={28} />
                <strong>{scenario === "released" ? "released" : formatTimer(secondsRemaining)}</strong>
                <span>{scenario === "active" ? "until release gate opens" : "gate condition met"}</span>
              </div>
            </div>

            <p className="stateBody">{copy.body}</p>

            <div className="controlRail">
              <button className="controlButton" type="button" onClick={resetHeartbeat}>
                <RotateCcw size={18} />
                Record heartbeat
              </button>
              <button
                className="controlButton release"
                type="button"
                disabled={!releaseEnabled}
                onClick={() => setScenario("released")}
              >
                <Activity size={18} />
                Release reserve
              </button>
            </div>
          </motion.div>

          <motion.aside
            className="proofRail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.18, ease: "easeOut" }}
          >
            <div className="proofHeader">
              <span>Receipt rail</span>
              <strong>{kinVaultProof.amount}</strong>
            </div>

            <dl className="addressList">
              <div>
                <dt>Owner</dt>
                <dd>{shortAddress(kinVaultProof.owner)}</dd>
              </div>
              <div>
                <dt>Beneficiary</dt>
                <dd>{shortAddress(kinVaultProof.beneficiary)}</dd>
              </div>
              <div>
                <dt>MUSD target</dt>
                <dd>{shortAddress(kinVaultProof.mezoTarget.musd)}</dd>
              </div>
              <div>
                <dt>Chain</dt>
                <dd>Mezo Testnet {kinVaultProof.mezoTarget.chainId}</dd>
              </div>
            </dl>

            <ol className="eventList" aria-label="Contract events">
              {eventRows.map((event) => (
                <li key={event.label} className={event.status}>
                  <span className="eventDot" />
                  <div>
                    <strong>{event.label}</strong>
                    <p>{event.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </motion.aside>
        </section>

        <section className="systemsStrip" aria-label="Integration status">
          <div>
            <Clock3 size={18} />
            <span>60-second demo heartbeat</span>
          </div>
          <div>
            <ShieldCheck size={18} />
            <span>Early release reverts in contract tests</span>
          </div>
          <div>
            <Github size={18} />
            <span>Repo creation blocked until submitter is selected</span>
          </div>
        </section>
      </div>
    </main>
  );
}
