function xcAssert(
    statement: boolean,
    error: string = 'Assert failed',
    logOnly: boolean = false
): void {
    if (!statement) {
        xcConsole.log(error);

        if (!logOnly) {
            throw error;
        }
    }
}
