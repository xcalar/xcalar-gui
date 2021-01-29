const setting = {
    isPublishTables: true,
    isStoreQuery: false
}

function set(name, value) {
    setting[name] = value;
}

function get(name, defaultValue = null) {
    return setting[name] == null ? defaultValue : setting[name];
}

function list() {
    return { ...setting };
}

export { set, get, list };