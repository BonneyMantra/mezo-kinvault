import { motion } from "motion/react";
import { Gift, LockKeyhole, Compass } from "lucide-react";

type Props = {
  isBeneficiary: boolean;
  onChoice: (choice: "create" | "explore" | "beneficiary") => void;
};

export function OnboardingModal({ isBeneficiary, onChoice }: Props) {
  return (
    <div className="onboardingOverlay">
      <motion.div
        className="onboardingCard"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="onboardingHeader">
          <img
            src="/logo.png"
            alt="KinVault"
            width={36}
            height={36}
            className="brandLogo"
          />
          <h2>Welcome to KinVault</h2>
          <p>
            Custody-planning infrastructure for Bitcoin holders on Mezo. What
            would you like to do?
          </p>
        </div>

        <div className="onboardingOptions">
          <button
            className="onboardingOption"
            type="button"
            onClick={() => onChoice("create")}
          >
            <div className="optionIcon create">
              <LockKeyhole size={22} />
            </div>
            <div>
              <strong>Create a vault</strong>
              <p>
                Deposit BTC, set beneficiaries, and configure your check-in
                schedule.
              </p>
            </div>
          </button>

          {isBeneficiary && (
            <button
              className="onboardingOption highlight"
              type="button"
              onClick={() => onChoice("beneficiary")}
            >
              <div className="optionIcon beneficiary">
                <Gift size={22} />
              </div>
              <div>
                <strong>You&rsquo;re a beneficiary</strong>
                <p>
                  You&rsquo;ve been added to a vault. View your allocation and
                  claim status.
                </p>
              </div>
            </button>
          )}

          <button
            className="onboardingOption subtle"
            type="button"
            onClick={() => onChoice("explore")}
          >
            <div className="optionIcon explore">
              <Compass size={22} />
            </div>
            <div>
              <strong>Explore vaults</strong>
              <p>Browse live vault data on Mezo Testnet.</p>
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
