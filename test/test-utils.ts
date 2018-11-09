
/**
 * Promise-based sleep
 */
export const sleep = (durationMillis: number) => new Promise(resolve => {
    setTimeout(resolve, durationMillis);
});
