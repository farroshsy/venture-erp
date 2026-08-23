import { trpc } from "@/lib/trpc";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Venture = {
  id: number;
  slug: string;
  name: string;
  legalName: string | null;
  status: "active" | "archived";
  baseCurrency: string;
  timezone: string;
  role: "portfolio_admin" | "venture_lead" | "finance_lead" | "operator" | "viewer";
};

type VentureContextValue = {
  ventures: Venture[];
  activeVenture?: Venture;
  activeVentureId?: number;
  setActiveVentureId: (id: number) => void;
  isLoading: boolean;
};

const VentureContext = createContext<VentureContextValue | undefined>(undefined);

export function VentureProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = trpc.platform.myVentures.useQuery(undefined, { retry: false });
  const ventures = (data ?? []) as Venture[];
  const [activeVentureId, setActiveVentureIdState] = useState<number | undefined>(() => {
    const saved = window.localStorage.getItem("venture-erp.active-venture");
    return saved ? Number(saved) : undefined;
  });

  useEffect(() => {
    if (ventures.length === 0) return;
    if (!activeVentureId || !ventures.some(venture => venture.id === activeVentureId)) {
      setActiveVentureIdState(ventures[0].id);
    }
  }, [activeVentureId, ventures]);

  const value = useMemo<VentureContextValue>(() => ({
    ventures,
    activeVenture: ventures.find(venture => venture.id === activeVentureId),
    activeVentureId,
    setActiveVentureId: id => {
      window.localStorage.setItem("venture-erp.active-venture", String(id));
      setActiveVentureIdState(id);
    },
    isLoading,
  }), [activeVentureId, isLoading, ventures]);

  return <VentureContext.Provider value={value}>{children}</VentureContext.Provider>;
}

export function useVenture() {
  const context = useContext(VentureContext);
  if (!context) throw new Error("useVenture must be used within VentureProvider");
  return context;
}
