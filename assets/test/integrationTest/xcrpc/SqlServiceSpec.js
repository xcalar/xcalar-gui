const expect = require('chai').expect;

exports.testSuite = function(sqlService) {
    describe('SqlService Test', function () {
        it('Check service availability', async () => {
            let error = null;
            const invalidSql = 'MyInvalidSql';
            try {
                await sqlService.executeSql({
                    sqlQuery: invalidSql,
                    queryName: 'Whatever query name',
                    userName: 'Whatever user name',
                    userId: 12345678,
                    sessionName: 'Whatever session name'
                });
            } catch(e) {
                error = e;
            }
            // Expect api error, but not js error
            expect(error != null, 'Service call should fail').to.be.true;
            expect(error.error.indexOf(invalidSql), 'Service should be available').to.be.gt(-1);
        });
    });
};