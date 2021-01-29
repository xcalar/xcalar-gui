
const testConfig = {
    user: "sqltest1",
    queries: [
        {
            path: "/netstore/datasets/tpch_sf1_notrail/",
            files: ["customer.tbl", "orders.tbl"],
            sql: "select cntrycode, count(*) as numcust, sum(c_acctbal) as totacctbal from ( select substring(c_phone, 1, 2) as cntrycode, c_acctbal from customer where substring(c_phone, 1, 2) in ('13', '31', '23', '29', '30', '18', '17') and c_acctbal > ( select avg(c_acctbal) from customer where c_acctbal > 0.00 and substring(c_phone, 1, 2) in ('13', '31', '23', '29', '30', '18', '17') ) and not exists ( select * from orders where o_custkey = c_custkey ) ) as custsale group by cntrycode order by cntrycode",
            runWithSqlFunc: {
                // XXX Right now we can only test this one case because some codes
                // in runSqlFunctions.js are hard coded. When we are able to
                // auto-convert table nodes into SQLFuncInput, we can scale up.
                sql: "select * from fn1(customer, orders)",
                tables: {
                    "customer": [{"name":"C_CUSTKEY","type":"integer"},
                                 {"name":"C_NAME","type":"string"},
                                 {"name":"C_ADDRESS","type":"string"},
                                 {"name":"C_NATIONKEY","type":"integer"},
                                 {"name":"C_PHONE","type":"string"},
                                 {"name":"C_ACCTBAL","type":"float"},
                                 {"name":"C_MKTSEGMENT","type":"string"},
                                 {"name":"C_COMMENT","type":"string"}],
                    "orders": [{"name":"O_ORDERKEY","type":"integer"},
                               {"name":"O_CUSTKEY","type":"integer"},
                               {"name":"O_ORDERSTATUS","type":"string"},
                               {"name":"O_TOTALPRICE","type":"float"},
                               {"name":"O_ORDERDATE","type":"timestamp"},
                               {"name":"O_ORDERPRIORITY","type":"string"},
                               {"name":"O_CLERK","type":"string"},
                               {"name":"O_SHIPPRIORITY","type":"integer"},
                               {"name":"O_COMMENT","type":"string"}]
                }
            },
            result: {"row0": [13, 888, 6737713.99],
                     "row4": [29, 948, 7158866.63],
                     "numOfRows": "7"}
        },
        {
            path: "/netstore/datasets/DRC2/",
            files: ["g_inouttbl.csv", "g_inouttbl_zmd.csv", "g_iodetail.csv",
                    "g_iodetail_zmd.csv", "g_lastkc.csv", "g_lastkcqc.csv",
                    "g_spdm.csv", "g_spdmprice.csv", "r_xilie.csv",
                    "s_company.csv", "s_company_hier.csv", "s_shopid.csv"],
            schemas: {
                    "g_inouttbl.csv": "g_inouttbl.csv.schema.json.xd",
                    "g_inouttbl_zmd.csv": "g_inouttbl_zmd.csv.schema.json.xd",
                    "g_iodetail.csv": "g_iodetail.csv.schema.json.xd",
                    "g_iodetail_zmd.csv": "g_iodetail_zmd.csv.schema.json.xd",
                    "g_lastkc.csv": "g_lastkc.csv.schema.json.xd",
                    "g_lastkcqc.csv": "g_lastkcqc.csv.schema.json.xd",
                    "g_spdm.csv": "g_spdm.csv.schema.json.xd",
                    "g_spdmprice.csv": "g_spdmprice.csv.schema.json.xd",
                    "r_xilie.csv": "r_xilie.csv.schema.json.xd",
                    "s_company.csv": "s_company.csv.schema.json.xd",
                    "s_company_hier.csv": "s_company_hier.csv.schema.json.xd",
                    "s_shopid.csv": "s_shopid.csv.schema.json.xd"
                },
            sql: "with t_data as( with a AS( with t_jh AS ( SELECT m.gto AS shopid, m.ioflag, m.iotype, d.code, d.colorid, sum(d.amount) AS amount, sum(d.sale) AS sale FROM g_inouttbl m, g_iodetail d WHERE m.scripno=d.scripno AND m.ioflag=1 AND m.gto IN ('45010207') AND m.iodate>='20170101' AND m.iodate<='20170324'  AND coalesce(m.c_zuangtm,'')<>'CD' AND coalesce(m.c_zuangtm,'')<>'BC' GROUP BY m.gto, m.ioflag, m.iotype, d.code, d.colorid ), t_ck AS ( SELECT m.gfrom AS shopid, m.ioflag, m.iotype, d.code, d.colorid, sum(d.amount) AS amount, sum(d.sale) AS sale FROM g_inouttbl m, g_iodetail d WHERE m.scripno=d.scripno AND m.ioflag=2 AND m.gfrom IN ('45010207') AND m.iodate>='20170101' AND m.iodate<='20170324'  AND coalesce(m.c_zuangtm,'')<>'CD' AND coalesce(m.c_zuangtm,'')<>'BC' GROUP BY m.gfrom, m.ioflag, m.iotype, d.code, d.colorid ), t_pd AS ( SELECT m.gfrom AS shopid, m.ioflag, m.iotype, d.code, d.colorid, sum(d.amount) AS amount, 0 AS sale FROM g_inouttbl m, g_iodetail d WHERE m.scripno=d.scripno AND m.ioflag IN (10) AND m.gfrom IN ('45010207') AND m.iodate>='20170101' AND m.iodate<='20170324'  AND coalesce(m.c_zuangtm,'')<>'CD' AND coalesce(m.c_zuangtm,'')<>'BC' GROUP BY m.gfrom, m.ioflag, m.iotype, d.code, d.colorid ), t_xs AS ( SELECT m.gfrom AS shopid, m.ioflag, m.iotype, d.code, d.colorid, sum(d.amount) AS amount, sum(d.sale) AS sale FROM g_inouttbl_zmd m, g_iodetail_zmd d WHERE m.scripno = d.scripno AND m.ioflag = 6 AND m.gto IN ('45010207') AND m.iodate >= '20170101' AND m.iodate <= '20170324' AND coalesce(m.c_zuangtm, '')<> 'CD' AND coalesce(m.c_zuangtm, '')<> 'BC' GROUP BY m.gfrom, m.ioflag, m.iotype, d.code, d.colorid ), t_monthflag AS ( select coalesce(monthflag1, monthflag2) monthflag from (select max(monthflag) AS monthflag1 FROM g_lastkcqc WHERE shopid IN ('45010207') AND (monthflag ||'31')<'20170101') join (SELECT max(monthflag) AS monthflag2 FROM g_lastkc WHERE shopid IN ('45010207') AND (monthflag ||'31')<'20170101') ), t_jh2 as ( SELECT a.shopid, 101 AS ioflag, 101 AS iotype, a.code, a.colorid, sum(CASE WHEN ioflag=1 OR (ioflag=10 AND iotype=1) THEN amount ELSE -1*amount END) AS amount , 0 AS sale FROM ( SELECT * FROM t_jh WHERE iotype IN (3, 7) UNION ALL SELECT * FROM t_ck WHERE iotype IN (5, 7) UNION ALL SELECT * FROM t_pd ) a GROUP BY shopid, code, colorid ), t_qc as ( SELECT shopid, 0 AS ioflag, 0 AS iotype, code, colorid, sum( CASE WHEN ioflag = 1 OR ( ioflag = 10 AND iotype = 1 ) THEN amount ELSE -1 * amount END ) AS amount, 0 AS sale FROM ( SELECT shopid, ioflag, iotype, code, colorid, amount FROM ( SELECT coalesce(q.shopid, k.shopid) AS shopid, 1 AS ioflag, 1 AS iotype, coalesce(q.code, k.code) AS code, coalesce(q.colorid, k.colorid) AS colorid, coalesce(q.n_qcsjkcsl, k.n_qcsjkcsl) AS amount FROM ( SELECT shopid, code, colorid, sum(n_qmsjkcsl) AS n_qcsjkcsl FROM g_lastkc WHERE shopid IN ('45010207') AND monthflag = ( SELECT monthflag FROM t_monthflag ) GROUP BY shopid, code, colorid ) k FULL JOIN ( SELECT shopid, code, colorid, sum(n_qmsjkcsl) AS n_qcsjkcsl FROM g_lastkcqc WHERE shopid IN ('45010207') AND monthflag = ( SELECT monthflag FROM t_monthflag ) GROUP BY shopid, code, colorid ) q ON k.shopid = q.shopid AND k.code = q.code AND k.colorid = q.colorid ) a UNION ALL SELECT m.gto AS shopid, m.ioflag, m.iotype, d.code, d.colorid, sum(d.amount) AS amount FROM g_inouttbl m, g_iodetail d WHERE m.scripno = d.scripno AND m.ioflag = 1 AND m.gto IN ('45010207') AND m.iodate > ( SELECT monthflag || '31' FROM t_monthflag ) AND m.iodate < '20170101' AND coalesce(m.c_zuangtm, '')<> 'CD' AND coalesce(m.c_zuangtm, '')<> 'BC' GROUP BY m.gto, m.ioflag, m.iotype, d.code, d.colorid UNION ALL SELECT m.gfrom AS shopid, m.ioflag, m.iotype, d.code, d.colorid, sum(d.amount) AS amount FROM g_inouttbl m, g_iodetail d WHERE m.scripno = d.scripno AND m.ioflag IN (2, 10) AND m.gfrom IN ('45010207') AND m.iodate > ( SELECT monthflag || '31' FROM t_monthflag ) AND m.iodate < '20170101' AND coalesce(m.c_zuangtm, '')<> 'CD' AND coalesce(m.c_zuangtm, '')<> 'BC' GROUP BY m.gfrom, m.ioflag, m.iotype, d.code, d.colorid UNION ALL SELECT m.gfrom AS shopid, m.ioflag, m.iotype, d.code, d.colorid, sum(d.amount) AS amount FROM g_inouttbl_zmd m, g_iodetail_zmd d WHERE m.scripno = d.scripno AND m.ioflag = 6 AND m.gto IN ('45010207') AND m.iodate > ( SELECT monthflag || '31' FROM t_monthflag ) AND m.iodate < '20170101' AND coalesce(m.c_zuangtm, '')<> 'CD' AND coalesce(m.c_zuangtm, '')<> 'BC' GROUP BY m.gfrom, m.ioflag, m.iotype, d.code, d.colorid ) q GROUP BY shopid, code, colorid ), t_kc as ( SELECT a.shopid, 111 AS ioflag, 111 AS iotype, a.code, a.colorid, sum(CASE WHEN ioflag=0 OR ioflag=1 OR (ioflag=10 AND iotype=1) THEN amount ELSE -1*amount END) AS amount , 0 AS sale FROM ( SELECT * FROM t_qc UNION ALL SELECT * FROM t_xs UNION ALL SELECT * FROM t_jh UNION ALL SELECT * FROM t_ck UNION ALL SELECT * FROM t_pd) a GROUP BY shopid, code, colorid ) SELECT shopid, ioflag, iotype, code, colorid, amount, sale FROM t_qc UNION ALL SELECT a.shopid, 100 AS ioflag, 100 AS iotype, a.code, a.colorid, CASE WHEN coalesce(a.amount,0)>coalesce(b.amount,0) THEN b.amount ELSE a.amount END AS amount , CASE WHEN coalesce(a.amount,0)>coalesce(b.amount,0) THEN CASE WHEN coalesce(a.amount,0)<>0 THEN (a.sale /a.amount) * b.amount ELSE NULL END ELSE a.sale END AS sale FROM t_xs a JOIN t_qc b ON a.shopid=b.shopid AND a.code=b.code AND a.colorid=b.colorid  UNION ALL SELECT shopid, ioflag, iotype, code, colorid, amount, sale FROM t_jh2 UNION ALL SELECT a.shopid, 102 AS ioflag, 102 AS iotype, a.code, a.colorid, CASE WHEN coalesce(a.amount, 0) > coalesce(c.amount, 0) THEN a.amount-c.amount ELSE NULL END AS amount, 0 AS sale FROM t_xs a JOIN t_jh2 b ON a.shopid=b.shopid AND a.code=b.code AND a.colorid=b.colorid LEFT JOIN t_qc c ON a.shopid=c.shopid AND a.code=c.code AND a.colorid=c.colorid UNION ALL SELECT shopid, ioflag, iotype, code, colorid, amount, sale FROM t_xs UNION ALL SELECT shopid, ioflag, iotype, code, colorid, amount, sale FROM t_kc UNION ALL SELECT a.shopid, 112 AS ioflag, 112 AS iotype, a.code, a.colorid, a.amount, a.sale FROM t_kc a JOIN t_xs b ON a.shopid=b.shopid AND a.code=b.code AND a.colorid=b.colorid ) SELECT c.companyname , a.shopid , s.shopname , sp.c_xilbh, xl.c_xilmc , count(distinct(CASE WHEN a.ioflag=0 AND a.iotype=0 AND coalesce(a.amount, 0)>0 THEN a.code||a.colorid ELSE NULL END)) AS qcsku , sum(CASE WHEN a.ioflag=0 AND a.iotype=0 THEN a.amount ELSE NULL END) AS qc , sum(CASE WHEN a.ioflag=0 AND a.iotype=0 THEN a.amount*sp.sale ELSE NULL END) AS qcje , count(distinct(CASE WHEN a.ioflag=100 AND a.iotype=100 AND coalesce(a.amount, 0)>0 THEN a.code||a.colorid ELSE NULL END)) AS qcxssku, sum(CASE WHEN a.ioflag=100 AND a.iotype=100 THEN a.amount ELSE NULL END) AS qcxs , sum(CASE WHEN a.ioflag=100 AND a.iotype=100 THEN a.sale ELSE NULL END) AS qcxsje , sum(CASE WHEN a.ioflag=100 AND a.iotype=100 THEN a.amount*sp.sale ELSE NULL END) AS qcxsdpje , count(distinct(CASE WHEN a.ioflag=101 AND a.iotype=101 AND coalesce(a.amount, 0)>0 THEN a.code||a.colorid ELSE NULL END)) AS jhsku , sum(CASE WHEN a.ioflag=101 AND a.iotype=101 THEN a.amount ELSE NULL END) AS jh , sum(CASE WHEN a.ioflag=101 AND a.iotype=101 THEN a.amount*p.m_jiagf ELSE NULL END) AS jhje , count(distinct(CASE WHEN a.ioflag=102 AND a.iotype=102 AND coalesce(a.amount, 0)>0 THEN a.code||a.colorid ELSE NULL END)) AS jhdxsku , sum(CASE WHEN a.ioflag=102 AND a.iotype=102 THEN a.amount ELSE NULL END) AS jhdx , sum(CASE WHEN a.ioflag=102 AND a.iotype=102 THEN a.amount*sp.sale ELSE NULL END) AS jhdxje , count(distinct(CASE WHEN a.ioflag=6 AND a.iotype=1 AND coalesce(a.amount, 0)>0 THEN a.code||a.colorid ELSE NULL END)) AS xssku, sum(CASE WHEN a.ioflag=6 AND a.iotype=1 THEN a.amount ELSE NULL END) AS xs , sum(CASE WHEN a.ioflag=6 AND a.iotype=1 THEN a.sale ELSE NULL END) AS xsje , sum(CASE WHEN a.ioflag=6 AND a.iotype=1 THEN a.amount*sp.sale ELSE NULL END) AS xsdpje , count(distinct(CASE WHEN a.ioflag=111 AND a.iotype=111 AND coalesce(a.amount, 0)>0 THEN a.code||a.colorid ELSE NULL END)) AS kcsku, sum(CASE WHEN a.ioflag=111 AND a.iotype=111 THEN a.amount ELSE NULL END) AS kc , sum(CASE WHEN a.ioflag=111 AND a.iotype=111 THEN a.amount*sp.sale ELSE NULL END) AS kcdpje , count(distinct(CASE WHEN a.ioflag=112 AND a.iotype=112 AND coalesce(a.amount, 0)>0 THEN a.code||a.colorid ELSE NULL END)) AS dxsku, sum(CASE WHEN a.ioflag=112 AND a.iotype=112 THEN a.amount ELSE NULL END) AS dx , sum(CASE WHEN a.ioflag=112 AND a.iotype=112 THEN a.amount*sp.sale ELSE NULL END) AS dxje FROM a LEFT JOIN g_spdm sp ON a.code=sp.code LEFT JOIN r_xilie xl ON sp.c_xilbh=xl.c_xilbh LEFT JOIN s_shopid s ON a.shopid=s.shopid LEFT JOIN s_company c ON s.companyid=c.companyid LEFT JOIN s_company_hier h ON s.companyid=h.companyid LEFT JOIN g_spdmprice p ON h.parentid=p.companyid AND a.code=p.code GROUP BY c.companyname, a.shopid, s.shopname, sp.c_xilbh, xl.c_xilmc, xl.n_id ORDER BY companyname, shopid, xl.n_id ) SELECT 1 AS idx, * FROM t_data WHERE shopid IN ( SELECT shopid FROM ( SELECT shopid, sum(qcsku) AS qcsku, sum(qc) AS qc, sum(qcje) AS qcje, sum(qcxssku) AS qcxssku, sum(qcxs) AS qcxs, sum(qcxsje) AS qcxsje, sum(qcxsdpje) AS qcxsdpje, sum(jhsku) AS jhsku, sum(jh) AS jh, sum(jhje) AS jhje, sum(jhdxsku) AS jhdxsku, sum(jhdx) AS jhdx, sum(jhdxje) AS jhdxje, sum(xssku) AS xssku, sum(xs) AS xs, sum(xsje) AS xsje, sum(xsdpje) AS xsdpje, sum(kcsku) AS kcsku, sum(kc) AS kc, sum(kcdpje) AS kcdpje, sum(dxsku) AS dxsku, sum(dx) AS dx, sum(dxje) AS dxje FROM t_data GROUP BY shopid) t WHERE coalesce(qcsku,0)<>0 OR coalesce(qc,0)<>0 OR coalesce(qcje,0)<>0 OR coalesce(qcxssku,0)<>0 OR coalesce(qcxs,0)<>0 OR coalesce(qcxsje,0)<>0 OR coalesce(qcxsdpje,0)<>0 OR coalesce(jhsku,0)<>0 OR coalesce(jh,0)<>0 OR coalesce(jhje,0)<>0 OR coalesce(jhdxsku,0)<>0 OR coalesce(jhdx,0)<>0 OR coalesce(jhdxje,0)<>0 OR coalesce(xssku,0)<>0 OR coalesce(xs,0)<>0 OR coalesce(xsje,0)<>0 OR coalesce(xsdpje,0)<>0 OR coalesce(kcsku,0)<>0 OR coalesce(kc,0)<>0 OR coalesce(kcdpje,0)<>0 OR coalesce(dxsku,0)<>0 OR coalesce(dx,0)<>0 OR coalesce(dxje,1)<>0 )",
            result: {"numOfRows": "11"}
        }
    ]
};
const fs = require('fs');
const dcrSchemas = {};
const testTables = [];
module.exports = {
    '@tags': ["SQL Mode Test"],

    after: function(browser) {
        browser
            .deleteWorkbook(browser.globals.gTestWorkbookName, testConfig.user)
            .executeAsync(function(testTables, done) {
                const promiseArray = [];
                testTables.forEach((table) => {
                    promiseArray.push(XcalarUnpublishTable(table));
                });
                PromiseHelper.when.apply(this, promiseArray)
                .then(() => {
                    done(true);
                })
                .fail(() => {
                    done();
                });
            }, [testTables]);
    },

    'open browser': function(browser) {
        let user = testConfig.user;
        browser.globals['gTestUserName'] = user;
        browser.globals['gTestExportDirectory'] = "/home/jenkins/export_test/";
        let url = browser.globals.launchUrl + "testSuite.html" +
        "?test=n&noPopup=y&animation=y&cleanup=y&close=y&user=" + user + "&id=0"
        // open browser
        browser
            .url(url)
            .waitForElementVisible('#container', 10000)
            .waitForElementVisible('#container.noWorkbook', 10000);
    },

    'create new workbook and enter': function(browser) {
        browser.cancelTooltipWalkthrough()
            .waitForElementNotVisible("#initialLoadScreen", 2 * 60 * 1000)
            .waitForElementNotVisible("#modalBackground", 10 * 1000)
            .createAndEnterWorkbook();

    },

    "remove intropopover": function(browser) {
        browser.waitForElementNotVisible("#initialLoadScreen", 100000);
        // close intro popup if visible

        browser.isPresent("#intro-popover", (isPresent) => {
            if (isPresent) {
                browser.click("#intro-popover .cancel");
                browser.pause(1000);
            }
        });
    },

    'create tables': function(browser) {
        throw "the test is broken"
        browser.click("#dataStoresTab");
        testConfig.queries.forEach((query) => {
            query.files.forEach((fileName) => {
                let schema;
                if (query.schemas && query.schemas.fileName) {
                    schema = fs.readFileSync(query.path + query.schemas.fileName);
                }
                browser
                    .click(".import.createTable")
                    .clearValue("#filePath")
                    .setValue("#filePath", query.path + fileName)
                    .click("#dsForm-source .more") // in case it's a cloud version, go to the dsForm card
                    .click("#dsForm-path .confirm")
                    .waitForElementVisible("#dsForm-tblSchema .xc-textArea", 100000)
                    .execute(() => {
                        if (schema) {
                            document.getElementById("#dsForm-tblSchema")
                                    .getElementsByClassName(".xc-textArea")[0]
                                    .value = schema;
                        }
                    })
                    .click("#importDataForm .createTable")
                    .waitForElementVisible(".xc-tableArea", 100000)
                    .perform(() => {
                        testTables.push(fileName.substring(0, fileName.lastIndexOf("\.")).toUpperCase());
                    });
            })
        });
    },

    'run sql': function(browser) {
        testConfig.queries.forEach((query) => {
            browser
                .runSql(query.sql, query.result);
            if (query.runWithSqlFunc) {
                browser
                    .runSqlFunction({
                        sql: query.sql,
                        sqlFuncInfo: query.runWithSqlFunc
                    })
                    .runSql(query.runWithSqlFunc.sql, query.result, true);
            }
        });
    }
}