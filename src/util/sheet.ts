/**
 * Given a sheetId of the format `[provider]/w[id]`,
 * return the unpacked parts
 */
export function unpackSheetId(sheetId: string) {
    const sep = sheetId.indexOf("/");
    const provider = sheetId.substring(0, sep);
    const id = sheetId.substring(sep + 2); // id is prefixed by `w`
    return {
        id,
        provider,
    };
}
