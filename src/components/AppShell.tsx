import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Compass,
  LockKeyhole,
  PlusCircle,
  Shield,
  LogOut,
  Gift,
} from "lucide-react";
import { useAccount, useDisconnect } from "wagmi";
import { WalletEntry } from "./WalletEntry";
import { ExplorerPage } from "./pages/ExplorerPage";
import { MyVaultsPage } from "./pages/MyVaultsPage";
import { BeneficiaryPage } from "./pages/BeneficiaryPage";
import { OnboardingModal } from "./OnboardingModal";
import { useKinVaultState, useBeneficiaries } from "../hooks/useKinVault";

type Page = "explorer" | "my-vaults" | "beneficiary";

const navItems: { id: Page; label: string; icon: typeof Compass }[] = [
  { id: "explorer", label: "Explorer", icon: Compass },
  { id: "my-vaults", label: "My Vaults", icon: LockKeyhole },
  { id: "beneficiary", label: "Beneficiary", icon: Gift },
];

export function AppShell({ passportEnabled }: { passportEnabled: boolean }) {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const vault = useKinVaultState();
  const benCount = vault.beneficiaryCount ? Number(vault.beneficiaryCount) : 0;
  const { beneficiaries } = useBeneficiaries(benCount);

  const isOwner =
    address &&
    vault.owner &&
    address.toLowerCase() === vault.owner.toLowerCase();
  const isBeneficiary =
    address &&
    beneficiaries.some((b) => b.addr.toLowerCase() === address!.toLowerCase());

  const [page, setPage] = useState<Page>("explorer");
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (vault.isLoading) return;
    if (!isOwner && !isBeneficiary) {
      setShowOnboarding(true);
    }
  }, [isOwner, isBeneficiary, vault.isLoading]);

  const handleOnboardingChoice = (
    choice: "create" | "explore" | "beneficiary",
  ) => {
    setShowOnboarding(false);
    if (choice === "create") setPage("my-vaults");
    else if (choice === "beneficiary") setPage("beneficiary");
    else setPage("explorer");
  };

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="sidebarTop">
          <div className="sidebarBrand">
            <img
              className="brandLogo"
              src="/logo.png"
              alt="KinVault"
              width={28}
              height={28}
            />
            <strong>KinVault</strong>
          </div>

          <nav className="sidebarNav">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`navItem ${page === item.id ? "active" : ""}`}
                type="button"
                onClick={() => setPage(item.id)}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebarBottom">
          <div className="sidebarWallet">
            <WalletEntry passportEnabled={passportEnabled} />
          </div>
          <button
            className="navItem disconnect"
            type="button"
            onClick={() => disconnect()}
          >
            <LogOut size={16} />
            <span>Disconnect</span>
          </button>
        </div>
      </aside>

      <main className="mainContent">
        <AnimatePresence mode="wait">
          {page === "explorer" && (
            <motion.div
              key="explorer"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
            >
              <ExplorerPage />
            </motion.div>
          )}
          {page === "my-vaults" && (
            <motion.div
              key="my-vaults"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
            >
              <MyVaultsPage passportEnabled={passportEnabled} />
            </motion.div>
          )}
          {page === "beneficiary" && (
            <motion.div
              key="beneficiary"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
            >
              <BeneficiaryPage />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {showOnboarding && (
        <OnboardingModal
          isBeneficiary={Boolean(isBeneficiary)}
          onChoice={handleOnboardingChoice}
        />
      )}
    </div>
  );
}
