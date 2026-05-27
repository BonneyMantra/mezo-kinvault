import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  HeartPulse,
  Lock,
  Send,
  Shield,
  Users,
} from "lucide-react";
import { mezoLinks } from "../lib/mezo";
import { useBtcPrice } from "../hooks/useBtcPrice";
import { useKinVaultState } from "../hooks/useKinVault";
import { formatEther } from "viem";

const ease = [0.22, 1, 0.36, 1] as const;

const steps = [
  {
    icon: Lock,
    num: "01",
    title: "Deposit BTC",
    body: "Lock Bitcoin as collateral in a KinVault smart contract on Mezo. Your BTC stays whole — it's never sold.",
  },
  {
    icon: Users,
    num: "02",
    title: "Set beneficiaries",
    body: "Add Passport-verified wallet addresses with percentage splits. Each heir knows exactly what they'll receive.",
  },
  {
    icon: HeartPulse,
    num: "03",
    title: "Keep a check-in alive",
    body: "Confirm you're active on a schedule you choose. The demo uses 60 seconds; a real vault would use monthly or quarterly reminders with a grace period.",
  },
];

interface LandingProps {
  onConnect: () => void;
  connecting: boolean;
}

export function Landing({ onConnect, connecting }: LandingProps) {
  const { price: btcPrice } = useBtcPrice();
  const vault = useKinVaultState();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fmtBtc = vault.vaultBalance
    ? Number(formatEther(vault.vaultBalance)).toFixed(4)
    : "—";
  const fmtPrice = btcPrice
    ? `$${Number(formatEther(btcPrice)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : "—";

  return (
    <div className="landing">
      <nav className={`landingNav ${scrolled ? "navScrolled" : ""}`}>
        <a className="brandLockup" href="/" aria-label="KinVault home">
          <img
            className="brandLogo"
            src="/logo.png"
            alt="KinVault"
            width={34}
            height={34}
          />
          <span>
            <strong>KinVault</strong>
          </span>
        </a>
        <div className="landingNavLinks">
          <a href={mezoLinks.docs} target="_blank" rel="noreferrer">
            Docs
          </a>
          <a
            href="https://github.com/BonneyMantra/mezo-kinvault"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <button
            className="landingConnectBtn"
            type="button"
            onClick={onConnect}
          >
            {connecting ? "Connecting…" : "Launch App"}
            <ArrowRight size={16} />
          </button>
        </div>
      </nav>

      <section className="heroSection">
        <video
          className="heroVideo"
          autoPlay
          muted
          loop
          playsInline
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4"
        />
        <div className="heroOverlayTop" />
        <div className="heroOverlayVignette" />
        <div className="heroOverlayBottom" />
        <div className="heroGrain" />

        <motion.div
          className="heroContent"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease }}
        >
          <motion.div
            className="heroBadge"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
          >
            <span className="badgeDot">
              <span className="badgeDotPing" />
              <span className="badgeDotCore" />
            </span>
            Built on Mezo · Powered by Bitcoin
          </motion.div>

          <motion.h1
            className="heroTitle"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease }}
          >
            Inherit Bitcoin
            <br />
            without selling it.
          </motion.h1>

          <motion.p
            className="heroSub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4, ease }}
          >
            KinVault prepares MUSD liquidity against your BTC collateral and
            releases it to verified beneficiaries only after you miss the
            scheduled check-ins. Bitcoin stays whole. Heirs get usable money.
          </motion.p>

          <motion.div
            className="heroCtas"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55, ease }}
          >
            <motion.button
              className="ctaPrimary"
              type="button"
              onClick={onConnect}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Send size={18} />
              {connecting ? "Connecting…" : "Connect Wallet"}
            </motion.button>
            <a
              className="ctaSecondary"
              href={mezoLinks.hackathon}
              target="_blank"
              rel="noreferrer"
            >
              Learn more
              <ArrowRight size={16} />
            </a>
          </motion.div>
        </motion.div>
      </section>

      <section className="stepsSection">
        <motion.h2
          className="sectionTitle"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
        >
          How it works
        </motion.h2>
        <div className="stepsGrid">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              className="stepCard"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.12, ease }}
            >
              <div className="stepIcon">
                <s.icon size={22} />
              </div>
              <span className="stepNum">{s.num}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="statsStrip">
        <motion.div
          className="statItem"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
        >
          <span className="statValue">{fmtBtc}</span>
          <span className="statLabel">BTC locked</span>
        </motion.div>
        <motion.div
          className="statItem"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1, ease }}
        >
          <span className="statValue">{fmtPrice}</span>
          <span className="statLabel">BTC price</span>
        </motion.div>
        <motion.div
          className="statItem"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2, ease }}
        >
          <span className="statValue">0.1%</span>
          <span className="statLabel">Borrow rate</span>
        </motion.div>
        <motion.div
          className="statItem"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3, ease }}
        >
          <span className="statValue">110%</span>
          <span className="statLabel">Min collateral</span>
        </motion.div>
      </section>

      <footer className="landingFooter">
        <div className="footerBrand">
          <img
            className="brandLogo"
            src="/logo.png"
            alt="KinVault"
            width={20}
            height={20}
          />
          <span>KinVault</span>
        </div>
        <p>
          Custody-planning infrastructure on Mezo. Not a legal will, not
          financial advice.
        </p>
        <div className="footerLinks">
          <a href={mezoLinks.docs} target="_blank" rel="noreferrer">
            Mezo Docs
          </a>
          <a href={mezoLinks.explorer} target="_blank" rel="noreferrer">
            Explorer
          </a>
          <a
            href="https://github.com/BonneyMantra/mezo-kinvault"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
