/**
 * To run the test in dev machine w/o backend:
 * export NODE_TLS_REJECT_UNAUTHORIZED=0
 * export NODE_APIEP="https://skywalker:8443/app/service/xce"
 */
const Xcrpc = require('xcalarsdk');

// XXX TODO: Source Tree Merge
// As many of the services haven't been implemented in XCE 2.0,
// we have to comment out the corresponding tests.

//import the test suit for each services
// const KVstoreServiceTest = require('./KVStoreServiceSpec');
const LicenseServiceTest = require('./LicenseServiceSpec');
// const PublishedTableServiceTest = require('./PublishedTableServiceSpec');
// const QueryServiceTest = require('./QueryServiceSpec');
// const OperatorServiceTest = require('./OperatorServiceSpec');
// const UDFServiceTest = require('./UDFServiceSpec');
const TableServiceTest = require('./TableServiceSpec');
// const DataflowServiceTest = require('./DataflowServiceSpec');
// const GetQueryServiceTest = require('./GetQueryServiceSpec');
// const TargetServiceTest = require('./TargetServiceSpec');
// const XDFServiceTest = require('./XDFServiceSpec');
const VersionServiceTest = require('./VersionServiceSpec');
// const SessionServiceTest = require('./SessionServiceSpec');
// const DagNodeServiceTest = require('./DagNodeServiceSpec');
// const DatasetServiceTest = require('./DatasetServiceSpec');
// const ResultSetServiceTest = require('./ResultSetServiceSpec');
const SqlServiceTest = require('./SqlServiceSpec');

//creat xcrpc client
const hostname = "localhost:12124"
const url = process.env.NODE_APIEP || "http://" + hostname + "/service/xce";
Xcrpc.createClient(Xcrpc.DEFAULT_CLIENT_NAME, url);

//get services
let client = Xcrpc.getClient(Xcrpc.DEFAULT_CLIENT_NAME);
// let KVstoreService = client.getKVStoreService();
let LicenseService = client.getLicenseService();
// let PublishedTableService = client.getPublishedTableService();
// let QueryService = client.getQueryService();
// let OperatorService = client.getOperatorService();
// let UDFService = client.getUDFService();
let TableService = client.getTableService();
// let GetQueryService = client.getGetQueryService();
// const dataflowService = client.getDataflowService();
// let TargetService = client.getTargetService();
let VersionService = client.getVersionService();
let STATUS = Xcrpc.Error.status;
// const XDFService = client.getXDFService();
let SessionService = client.getSessionService();
// let DagNodeService = client.getDagNodeService();
// let DatasetService = client.getDatasetService();
// let ResultSetService = client.getResultSetService();
const sqlService = client.getSqlService();


describe("xcrpc integration test: ", function () {
    this.timeout(10000);
    // run the testSuit for each services
    // KVstoreServiceTest.testSuite(KVstoreService, Xcrpc.KVStore.KVSCOPE, STATUS, SessionService, Xcrpc.Session.SCOPE);
    LicenseServiceTest.testSuite(LicenseService);
    // QueryServiceTest.testSuite(QueryService, SessionService, DatasetService);
    // PublishedTableServiceTest.testSuite(PublishedTableService, Xcrpc.PublishedTable.SCOPE, STATUS);
    // OperatorServiceTest.testSuite(OperatorService);
    // UDFServiceTest.testSuite(UDFService);
    TableServiceTest.testSuite(TableService);
    // DataflowServiceTest.testSuite(dataflowService);
    // GetQueryServiceTest.testSuite(GetQueryService);
    // TargetServiceTest.testSuite(TargetService, SessionService);
    // XDFServiceTest.testSuite(XDFService);
    VersionServiceTest.testSuite(VersionService, Xcrpc.EnumMap.XcRpcApiVersionToInt.ProtoAPIVersionSignature);
    // SessionServiceTest.testSuite(SessionService);
    // DagNodeServiceTest.testSuite(DagNodeService, Xcrpc.DagNode.DAGSCOPE);
    // DatasetServiceTest.testSuite(DatasetService);
    // ResultSetServiceTest.testSuite(ResultSetService, SessionService, DatasetService, QueryService, OperatorService);
    SqlServiceTest.testSuite(sqlService);
});
