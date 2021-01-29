export const Status = {
    "Error": -1,
    "Unknown": 0,
    "Ok": 1,
    "Done": 2,
    "Running": 3,
    "Incomplete": 4
};

export function getStatus(num: number): string {
    var key = Object.keys(Status)[num + 1];
    return key;
}