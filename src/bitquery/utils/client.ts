// import { pRateLimit } from 'p-ratelimit'

import { IAgentRuntime } from "@elizaos/core";

// export const bitqueryLimiter = pRateLimit({
//   interval: 1000 * 60,
//   rate: 500,
//   concurrency: 500,
//   maxDelay: 1000 * 60 * 3,
// })

export enum BitqueryAPIVersion {
    v1 = "https://graphql.bitquery.io",
    v2 = "https://streaming.bitquery.io/graphql",
    eap = "https://streaming.bitquery.io/eap",
}

// localStorage not working like that in server side components
// var localStorageKey = "bitqueryAccessToken";
//var accessToken = localStorage.getItem(localStorageKey) || ''
var accessToken = "";

export async function getBitqueryToken(_runtime: IAgentRuntime): Promise<void> {
    if (accessToken && accessToken !== "") return;

    const bitQueryClientId =
        _runtime.character.settings?.secrets?.BITQUERY_CLIENT_ID ||
        process.env.BITQUERY_CLIENT_ID;
    const bitQueryClientSecret =
        _runtime.character.settings?.secrets?.BITQUERY_CLIENT_SECRET ||
        process.env.BITQUERY_CLIENT_SECRET;

    const url = "https://oauth2.bitquery.io/oauth2/token";
    const payload = `grant_type=client_credentials&client_id=${bitQueryClientId}&client_secret=${bitQueryClientSecret}&scope=api`;
    const headers: Headers = new Headers({
        "Content-Type": "application/x-www-form-urlencoded",
    });

    const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: payload,
    });

    const resp = await response.json();
    const token = resp?.access_token;
    // localStorage.setItem(localStorageKey, token)
    accessToken = token;
}

export async function fetchBitquery(
    _runtime: IAgentRuntime,
    apiVersion: BitqueryAPIVersion,
    payload: string | undefined,
    fetchingWhat?: string
) {
    try {
        if (!payload) return {};

        if (fetchingWhat) {
            // console.log(`[Bitquery] Fetching ${fetchingWhat} `)
        }

        // Getting access token
        await getBitqueryToken(_runtime);
        // console.log('ACCESS TOKEN: ', accessToken)

        const requestHeaders: HeadersInit = new Headers({
            "Content-Type": "application/json",
        });

        switch (apiVersion) {
            case BitqueryAPIVersion.v1:
                requestHeaders.set(
                    "X-API-KEY",
                    _runtime.character.settings?.secrets?.BITQUERY_KEY ||
                        process.env.BITQUERY_KEY
                );
                break;
            case BitqueryAPIVersion.v2:
                requestHeaders.set("Authorization", `Bearer ${accessToken}`);
                break;
        }

        // const response = await bitqueryLimiter(
        //   async () =>
        const data = await fetch(apiVersion, {
            method: "POST",
            headers: requestHeaders,
            body: payload,
            cache: "no-store",
        }).then((r) => r.json());
        // )
        // Error handling
        if (data && data.errors) {
            if (fetchingWhat) {
                // Error
                const errors: [{ message: string; locations: any[] }] =
                    data.errors;
                errors.forEach((err) => {
                    console.log(
                        `[Bitquery Error] Function: ${fetchingWhat} Message: ${
                            err.message
                        } location: ${JSON.stringify(err.locations)}`
                    );
                });
            }
        }
        return data;
    } catch (error: unknown) {
        console.log(error);
        return {};
    }
}
