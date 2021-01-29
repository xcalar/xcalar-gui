import threading
import urllib2
import time
import requests
import json
import numpy as np
import matplotlib.pyplot as plt

factors = [1, 10, 50, 100, 300]
query = 'with t3 as (with t1 as (with frequent_ss_items as (select substr(i_item_desc,1,30) itemdesc,i_item_sk item_sk,d_date solddate,count(*) cnt from store_sales ,date_dim ,item where ss_sold_date_sk = d_date_sk and ss_item_sk = i_item_sk and d_year in (2000,2000+1,2000+2,2000+3) group by substr(i_item_desc,1,30),i_item_sk,d_date having count(*) >4), max_store_sales as (select max(csales) tpcds_cmax from (select c_customer_sk,sum(ss_quantity*ss_sales_price) csales from store_sales ,customer ,date_dim where ss_customer_sk = c_customer_sk and ss_sold_date_sk = d_date_sk and d_year in (2000,2000+1,2000+2,2000+3) group by c_customer_sk)), best_ss_customer as (select c_customer_sk,sum(ss_quantity*ss_sales_price) ssales from store_sales ,customer where ss_customer_sk = c_customer_sk group by c_customer_sk having sum(ss_quantity*ss_sales_price) > (50/100.0) * (select * from max_store_sales)) select sum(sales) from (select cs_quantity*cs_list_price sales from catalog_sales ,date_dim where d_year = 2000 and d_moy = 2 and cs_sold_date_sk = d_date_sk and cs_item_sk in (select item_sk from frequent_ss_items) and cs_bill_customer_sk in (select c_customer_sk from best_ss_customer) union all select ws_quantity*ws_list_price sales from web_sales ,date_dim where d_year = 2000 and d_moy = 2 and ws_sold_date_sk = d_date_sk and ws_item_sk in (select item_sk from frequent_ss_items) and ws_bill_customer_sk in (select c_customer_sk from best_ss_customer)) limit 100), t2 as (with frequent_ss_items as (select substr(i_item_desc,1,30) itemdesc,i_item_sk item_sk,d_date solddate,count(*) cnt from store_sales ,date_dim ,item where ss_sold_date_sk = d_date_sk and ss_item_sk = i_item_sk and d_year in (2000,2000+1,2000+2,2000+3) group by substr(i_item_desc,1,30),i_item_sk,d_date having count(*) >4), max_store_sales as (select max(csales) tpcds_cmax from (select c_customer_sk,sum(ss_quantity*ss_sales_price) csales from store_sales ,customer ,date_dim where ss_customer_sk = c_customer_sk and ss_sold_date_sk = d_date_sk and d_year in (2000,2000+1,2000+2,2000+3) group by c_customer_sk)), best_ss_customer as (select c_customer_sk,sum(ss_quantity*ss_sales_price) ssales from store_sales ,customer where ss_customer_sk = c_customer_sk group by c_customer_sk having sum(ss_quantity*ss_sales_price) > (50/100.0) * (select * from max_store_sales)) select sum(sales) from (select cs_quantity*cs_list_price sales from catalog_sales ,date_dim where d_year = 2000 and d_moy = 2 and cs_sold_date_sk = d_date_sk and cs_item_sk in (select item_sk from frequent_ss_items) and cs_bill_customer_sk in (select c_customer_sk from best_ss_customer) union all select ws_quantity*ws_list_price sales from web_sales ,date_dim where d_year = 2000 and d_moy = 2 and ws_sold_date_sk = d_date_sk and ws_item_sk in (select item_sk from frequent_ss_items) and ws_bill_customer_sk in (select c_customer_sk from best_ss_customer)) limit 100) select * from t1,t2), t4 as (with t1 as (with frequent_ss_items as (select substr(i_item_desc,1,30) itemdesc,i_item_sk item_sk,d_date solddate,count(*) cnt from store_sales ,date_dim ,item where ss_sold_date_sk = d_date_sk and ss_item_sk = i_item_sk and d_year in (2000,2000+1,2000+2,2000+3) group by substr(i_item_desc,1,30),i_item_sk,d_date having count(*) >4), max_store_sales as (select max(csales) tpcds_cmax from (select c_customer_sk,sum(ss_quantity*ss_sales_price) csales from store_sales ,customer ,date_dim where ss_customer_sk = c_customer_sk and ss_sold_date_sk = d_date_sk and d_year in (2000,2000+1,2000+2,2000+3) group by c_customer_sk)), best_ss_customer as (select c_customer_sk,sum(ss_quantity*ss_sales_price) ssales from store_sales ,customer where ss_customer_sk = c_customer_sk group by c_customer_sk having sum(ss_quantity*ss_sales_price) > (50/100.0) * (select * from max_store_sales)) select sum(sales) from (select cs_quantity*cs_list_price sales from catalog_sales ,date_dim where d_year = 2000 and d_moy = 2 and cs_sold_date_sk = d_date_sk and cs_item_sk in (select item_sk from frequent_ss_items) and cs_bill_customer_sk in (select c_customer_sk from best_ss_customer) union all select ws_quantity*ws_list_price sales from web_sales ,date_dim where d_year = 2000 and d_moy = 2 and ws_sold_date_sk = d_date_sk and ws_item_sk in (select item_sk from frequent_ss_items) and ws_bill_customer_sk in (select c_customer_sk from best_ss_customer)) limit 100), t2 as (with frequent_ss_items as (select substr(i_item_desc,1,30) itemdesc,i_item_sk item_sk,d_date solddate,count(*) cnt from store_sales ,date_dim ,item where ss_sold_date_sk = d_date_sk and ss_item_sk = i_item_sk and d_year in (2000,2000+1,2000+2,2000+3) group by substr(i_item_desc,1,30),i_item_sk,d_date having count(*) >4), max_store_sales as (select max(csales) tpcds_cmax from (select c_customer_sk,sum(ss_quantity*ss_sales_price) csales from store_sales ,customer ,date_dim where ss_customer_sk = c_customer_sk and ss_sold_date_sk = d_date_sk and d_year in (2000,2000+1,2000+2,2000+3) group by c_customer_sk)), best_ss_customer as (select c_customer_sk,sum(ss_quantity*ss_sales_price) ssales from store_sales ,customer where ss_customer_sk = c_customer_sk group by c_customer_sk having sum(ss_quantity*ss_sales_price) > (50/100.0) * (select * from max_store_sales)) select sum(sales) from (select cs_quantity*cs_list_price sales from catalog_sales ,date_dim where d_year = 2000 and d_moy = 2 and cs_sold_date_sk = d_date_sk and cs_item_sk in (select item_sk from frequent_ss_items) and cs_bill_customer_sk in (select c_customer_sk from best_ss_customer) union all select ws_quantity*ws_list_price sales from web_sales ,date_dim where d_year = 2000 and d_moy = 2 and ws_sold_date_sk = d_date_sk and ws_item_sk in (select item_sk from frequent_ss_items) and ws_bill_customer_sk in (select c_customer_sk from best_ss_customer)) limit 100) select * from t1,t2) select * from t3, t4'
urls = ["http://dave.int.xcalar.com:12124/xcsql/workerTest",
        "http://dave.int.xcalar.com:12124/xcsql/queryWithPublishedTables"]
headers = {u'content-type': u'application/json'}
def run_sql(x, url):
    payload = {
        "queryString": query,
        "execid": x,
        "sessionId": "sqlapitest" + `x`,
        "checkTime": "25",
        "queryName": "sqltest" + `x`,
        "usePaging": "false"
    }
    r = requests.post(url, headers=headers, data=json.dumps(payload))


def get_points(url):
    points = []
    for x in factors:
        start = time.time()
        threads = [threading.Thread(target=run_sql, args=(x, url)) for x in range(x)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        points.append(time.time() - start)
        time.sleep(5)
    return points

n_groups = len(factors)

data1 = get_points(urls[0])
data2 = get_points(urls[1])

fig, ax = plt.subplots()

index = np.arange(n_groups)
bar_width = 0.35
opacity = 0.4

rects1 = ax.bar(index, data1, bar_width,
                alpha=opacity, color='b',
                label='w/ workers')

rects2 = ax.bar(index + bar_width, data2, bar_width,
                alpha=opacity, color='r',
                label='w/o workers')

ax.set_xlabel('Num of requests made concurrently')
ax.set_ylabel('Elapsed time')
ax.set_xticks(index + bar_width / 2)
ax.set_xticklabels(factors)
ax.legend(loc='upper left')

plt.show()