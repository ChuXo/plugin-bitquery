import { camelCase } from "lodash";

export const camelizeKeys = (
    obj: Record<string, unknown>
): Record<string, unknown> | Record<string, unknown>[] => {
    if (Array.isArray(obj)) {
        return obj.map(
            (v: Record<string, unknown>) =>
                camelizeKeys(v) as Record<string, unknown>
        );
    } else if (obj != null && obj.constructor === Object) {
        return Object.keys(obj).reduce(
            (result, key) => ({
                ...result,
                [camelCase(key)]: camelizeKeys(
                    obj[key] as Record<string, unknown>
                ),
            }),
            {}
        );
    }
    return obj;
};
