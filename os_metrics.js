/**
 * Example demonstrating streaming OS Metrics via Server Sent Events.
 */
var os = require('os');
var osutils = require('os-utils');
var diskspace = require('diskspace');

var cors = require('cors');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var EventEmitter = require("events").EventEmitter;
var emitter = new EventEmitter();

var port = process.env.PORT || 8090;
var router = express.Router();

//emit 'update' event every 5 seconds
var interval = setInterval(function() {
    console.log('emitting event');
    emitter.emit("update", undefined);
}, 5000);

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(cors());

app.listen(port);
console.log('Listening on port ' + port);

//client connects to stream on http://ip:8090/events 
app.use('/events', router);
router.get('/', function(request, response) {
    var sendMetrics = startEventSource(response);
    emitter.on("update", retrieveMetrics);

    function retrieveMetrics(event) {
        var os_metrics = {};
        os_metrics.freeMem = os.freemem();
        os_metrics.totalMem =  os.totalmem();
        os_metrics.cpus = os.cpus();
        os_metrics.loadAvg = os.loadavg();
        os_metrics.networkInterfaces = os.networkInterfaces();
        sendMetrics('os_metrics', os_metrics);

        osutils.cpuUsage(function(value) {
            sendMetrics('os_metrics.cpuUsage', value);
        });

        osutils.cpuFree(function(value) {
            sendMetrics('os_metrics.cpuFree', value);
        });

        var freedisk = diskspace.check('/', function(err, total, free, status) {
            var disk = {};
            disk.free = free;
            disk.total = total;
            disk.status = status;
            sendMetrics('os_metrics.diskspace', disk);
        });
        
    }
});


function startEventSource(response) {
    response.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    response.write("\n");

    return function sendEvent(name, data, id) {
        var jsonData = JSON.stringify(data);
        console.log('%s - %s', name, jsonData);
        response.write("event: " + name + "\n");
        if (id) response.write("id: " + id + "\n");
        response.write("data: " + jsonData + "\n\n");
    }
}
