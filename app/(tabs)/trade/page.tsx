import { TradePage } from "@/features/trade/trade-page";
import { getTradePageSnapshot } from "@/features/trade/api/server";

export const preferredRegion = "hnd1";

export default async function Page() {
  const initialSnapshot = await getTradePageSnapshot();

  return <TradePage initialSnapshot={initialSnapshot} />;
}
