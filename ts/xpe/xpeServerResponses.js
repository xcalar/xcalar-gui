var runEntity = (typeof window !== 'undefined' && this === window ?
                                                              window : exports);
var dockerStatusStates = {
    "UP": "UP",
    "DOWN": "DOWN",
    "ERROR": "ERROR"
};
runEntity.dockerStatusStates = dockerStatusStates;
