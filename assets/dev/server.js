var path = require('path'),
    express = require('express'),
    app = express(),
    server = require('http').createServer(app);
app.use('/', express.static(path.join(__dirname, "../../xcalar-gui")));
var port = 8888;
server.listen(port);
console.log('server started on port: ' + port);

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, '../../xcalar-gui/index.html'));
});
