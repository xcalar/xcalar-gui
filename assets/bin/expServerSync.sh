scp ~/xcalar-gui/services/expServer/expServer.js boya@dijkstra:~/xcalar-gui/services/expServer
scp ~/xcalar-gui/services/expServer/expServer.js boya@bellman:~/xcalar-gui/services/expServer

ssh boya@dijkstra '
set +e
set -x
PID=`ps aux | grep -v bash | grep -v grep | grep expServer | tr -s " " | cut -d " " -f 2`
sudo kill -9 ${PID}
cd ~/xcalar-gui/services/expServer
nodejs expServer.js' &

ssh boya@bellman '
set +e
set -x
PID=`ps aux | grep -v bash | grep -v grep | grep expServer | tr -s " " | cut -d " " -f 2`
sudo kill -9 ${PID}
cd ~/xcalar-gui/services/expServer
nodejs expServer.js' &

