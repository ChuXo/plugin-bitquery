export * from "./types";

import type { Plugin } from "@elizaos/core";
;
import { factsProvider } from "./providers/facts";
import { onchainProvider } from "./providers/onchain";
import { getTopTokensByVolAction } from "./actions/topvolume";
import { getLatestPairsAction } from "./actions/latestpairs";
import { getTopTokensAction } from "./actions/toptokens";
import { getTokenChartAction } from "./actions/chart";

export const bitqueryPlugin: Plugin = {
    name: "bitquery",
    description: "Bitquery integration plugin for onchain data and more",
    providers: [factsProvider], // onchainProvider, factsProvider, toptokenProvider
    evaluators: [],
    services: [],
    actions: [
        getTopTokensByVolAction,
        getLatestPairsAction,
        getTokenChartAction
    ], // getTopTokensAction, transferAction, bridgeAction, swapAction
};

export default bitqueryPlugin;
