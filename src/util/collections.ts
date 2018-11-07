
export function selectRandomIndex(choices: any[]): number {
    return Math.floor(Math.random() * choices.length);
}

/**
 * Take a subset of the given Set as an Array.
 * @return Array of length [count], or `set.size`,
 *  whichever is smaller.
 */
export function slice<T>(set: Set<T>, count: number): T[] {
    // NOTE: some brief benchmarks suggested that
    // Array.from is quite slow, so we always iterate,
    // even if we're taking the whole array
    const result: T[] = [];
    const len = set.size;
    const end = Math.min(len, count);

    let i = 0;
    for (const member of set) {
        result.push(member);
        if (++i >= end) break;
    }

    return result;
}
