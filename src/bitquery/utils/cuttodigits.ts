export function cutToDigits(number: number | string, digitsAfterDot: number) {
    const str = `${number}`;

    return str.slice(0, str.indexOf(".") + digitsAfterDot + 1);
}
