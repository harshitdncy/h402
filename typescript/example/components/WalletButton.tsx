import Image, { StaticImageData } from "next/image";
import { WalletType } from "../hooks/useWallet";

interface WalletButtonProps {
  id: WalletType;
  icon: StaticImageData;
  label: string;
  onClick: (walletType: WalletType) => void | Promise<void>;
}

const WalletButton: React.FC<WalletButtonProps> = ({
  id,
  icon,
  label,
  onClick,
}) => {
  return (
    <button
      onClick={() => onClick(id)}
      className="w-full px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition-colors duration-200 font-medium flex items-center justify-center cursor-pointer"
    >
      <Image src={icon} alt={label} width={20} height={20} className="mr-2" />
      <span>{label}</span>
    </button>
  );
};

export default WalletButton;
