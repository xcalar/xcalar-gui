var runEntity = (typeof window !== 'undefined' && this === window ?
                                                              window : exports);

var httpStatus = {
    "OK": 200,
    "NoContent": 204,
    "BadRequest": 400,
    "Unauthorized": 401,
    "Forbidden": 403,
    "NotFound": 404,
    "InternalServerError": 500,
    "RequestTimeout": 504
};

runEntity.httpStatus = httpStatus;
