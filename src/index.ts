import { factsProvider } from "./providers/facts";
import { onchainProvider } from "./providers/onchain";
import { getTopTokensByVolAction } from "./actions/topvolume";
import { getLatestPairsAction } from "./actions/latestpairs";
import { getTopTokensAction } from "./actions/toptokens";
import { getTokenChartAction } from "./actions/chart";

export const bitqueryPlugin = {
    name: "bitquery",
    description: "Bitquery integration plugin for onchain data and more",
    providers: [factsProvider], // optional add "onchainProvider"
    evaluators: [],
    services: [],
    actions: [
        getTopTokensByVolAction,
        getLatestPairsAction,
        getTokenChartAction
    ], 
};

export default bitqueryPlugin;
