scp ~/gui/services/expServer/route/sqlRestApi.js jyang@cantor:~/xcalar-gui/xcalar-gui/services/expServer/route/

ssh jyang@cantor '
set +e
set -x
PID=`ps aux | grep -v bash | grep -v grep | grep expServer | tr -s " " | cut -d " " -f 2`
kill -9 ${PID}
cd /var/www/xcalar-gui/services/expServer
nodejs expServer.js'
