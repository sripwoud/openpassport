import { create } from 'zustand'
import { IsZkeyDownloading, ShowWarningModalProps } from '../utils/zkeyDownload';
import { useToastController } from '@tamagui/toast';
import { AppType } from '../../../common/src/utils/appType';

interface NavigationState {
  isZkeyDownloading: IsZkeyDownloading
  showWarningModal: ShowWarningModalProps
  hideData: boolean
  toast: ReturnType<typeof useToastController>
  selectedTab: string
  setSelectedTab: (tab: string) => void
  selectedApp: AppType | null
  setSelectedApp: (app: AppType | null) => void
  showRegistrationErrorSheet: boolean
  registrationErrorMessage: string
  setToast: (toast: ReturnType<typeof useToastController>) => void;
  update: (patch: any) => void
  nfcSheetIsOpen: boolean
  setNfcSheetIsOpen: (isOpen: boolean) => void
  zkeyDownloadedPercentage: number
  setZkeyDownloadedPercentage: (percentage: number) => void
}

const useNavigationStore = create<NavigationState>((set, get) => ({
  zkeyDownloadedPercentage: 100,
  setZkeyDownloadedPercentage: (percentage: number) => set({ zkeyDownloadedPercentage: percentage }),
  isZkeyDownloading: {
    prove_rsa_65537_sha1: false,
    prove_rsa_65537_sha256: false,
    prove_rsapss_65537_sha256: false,
    disclose: false,
  },
  showWarningModal: {
    show: false,
    circuit: "",
    size: 0,
  },
  hideData: false,

  showRegistrationErrorSheet: false,
  registrationErrorMessage: "",

  toast: null as unknown as ReturnType<typeof useToastController>,

  selectedTab: "scan",
  selectedApp: null,

  setToast: (toast) => set({ toast }),
  setSelectedApp: (app) => set({ selectedApp: app }),

  setSelectedTab: (tab) => set({ selectedTab: tab }),

  update: (patch) => {
    set({
      ...get(),
      ...patch,
    });
  },
  nfcSheetIsOpen: false,
  setNfcSheetIsOpen: (isOpen) => set({ nfcSheetIsOpen: isOpen }),
}))

export default useNavigationStore