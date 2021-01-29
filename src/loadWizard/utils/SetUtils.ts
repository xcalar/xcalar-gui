function diff<T>(setA: Iterable<T>, setB: Iterable<T>) {
    const _difference = new Set(setA);
    for (const elem of setB) {
        _difference.delete(elem)
    }
    return _difference;
}

function union<T>(setA: Iterable<T>, setB: Iterable<T>) {
    const _union = new Set(setA)
    for (const elem of setB) {
        _union.add(elem)
    }
    return _union;
}

function intersection<T>(setA: Set<T>, setB: Set<T>) {
    let _intersection = new Set<T>()
    for (let elem of setB) {
        if (setA.has(elem)) {
            _intersection.add(elem)
        }
    }
    return _intersection
}
export { diff, union, intersection };