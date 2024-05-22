export function isURL(str: string) {
    return /^(https?):\/\//.test(str);
}
