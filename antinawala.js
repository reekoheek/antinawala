var SERVER_HOST = '8.8.8.8',
    SERVER_TYPE = 'udp',
    SERVER_PORT = 53;

var dns = require('native-dns'),
    request = require('request'),
    server = dns.createServer();

var reqHttp = function(q, callback) {
    // console.log(dns.A({
    //         name: request.question[0].name,
    //         address: '127.0.0.1',
    //         ttl: 600,
    //     }));
    var result = [];

    var url = "http://dig.jsondns.org/IN/" + q.name + "/" + dns.consts.qtypeToName(q.type);
    request(url, function (error, response, body) {
        if (!error && (Math.floor(response.statusCode / 100) * 100) == 200) {
            var answer = JSON.parse(body).answer;
            for(var i in answer) {
                var a = answer[i];

                if (a.type == 'A' || a.type == 'AAAA') {
                    result.push(dns[a.type]({
                        name: a.name,
                        address: a.rdata,
                        ttl: a.ttl,
                        type: dns.consts.nameToQtype(a.type)
                    }));
                } else if (a.type == 'TXT' || a.type == 'NS' || a.type == 'PTR' || a.type == 'CNAME') {
                    result.push(dns[a.type]({
                        name: a.name,
                        data: a.rdata,
                        ttl: a.ttl,
                        type: dns.consts.nameToQtype(a.type)
                    }));
                } else if (a.type == 'MX') {
                    result.push(dns[a.type]({
                        name: a.name,
                        priority: a.rdata[0],
                        exchange: a.rdata[1],
                        ttl: a.ttl,
                        type: dns.consts.nameToQtype(a.type)
                    }));
                } else if (a.type == 'SOA') {
                    result.push(dns[a.type]({
                        name: a.name,
                        primary: a.rdata[0],
                        admin: a.rdata[1],
                        serial: a.rdata[2],
                        refresh: a.rdata[3],
                        retry: a.rdata[4],
                        expiration: a.rdata[5],
                        minimum: a.rdata[6],
                        ttl: a.ttl,
                        type: dns.consts.nameToQtype(a.type)
                    }));
                } else {
                    console.error(a.type, 'not implemented yet!');
                    result.push(dns[a.type]({
                        name: a.name,
                        primary: a.rdata[0],
                        admin: a.rdata[1],
                        serial: a.rdata[2],
                        refresh: a.rdata[3],
                        retry: a.rdata[4],
                        expiration: a.rdata[5],
                        minimum: a.rdata[6],
                        ttl: a.ttl,
                        type: dns.consts.nameToQtype(a.type)
                    }));
                }
            }

            return callback(null, result);
        }

        callback(new Error('Not found!'));
    });
};


var req = function(q, callback) {
    var type = dns.consts.qtypeToName(q.type);

    console.log('H', q.name, type);

    var question = dns.Question({
        name: q.name,
        type: type,
    });

    var start = Date.now(),
        result = null;

    var req = dns.Request({
        question: question,
        server: { address: SERVER_HOST, port: SERVER_PORT, type: SERVER_TYPE },
        timeout: 1000,
    });

    req.on('timeout', function () {
        // console.log('Timeout in making request');
    });

    req.on('message', function (err, answer) {
        result = answer.answer;
    });

    req.on('end', function () {
        var delta = (Date.now()) - start;
        // console.log('Finished processing request: ' + delta.toString() + 'ms');

        if (result) {
            // console.log(result);
            for(var i in result) {
                if (typeof(result[i].address) == 'string' && result[i].address.match(/^118\.98\.97/)) {
                    result = null;
                    reqHttp(q, callback);
                    return;
                }
            }
            callback(null, result);
        } else {
            callback(new Error('Not found!'));
        }
    });

    req.send();
};

server.on('request', function (request, response) {
    req(request.question[0], function(err, result) {
        if (err) {
            console.error('Not implemented yet');
            response.cancel();
            return;
        }

        response.answer = result;

        response.send();
    });

});

server.on('error', function (err, buff, req, res) {
    console.log(err.stack);
});

server.serve(53);