var fs = require('fs');
var dns = require('dns');
var Path = require('path');
var autoBuffer = require('autobuffer');
var $ = require('./helper');
/**
 * thanks to http://tool.17mon.cn/ipdb.html
 */

var dataBuffer;
var curPath = process.cwd();

if (process && process.argv[3]) {
    var DbPath = process.argv[3];
} else {
    var DbPath = Path.join(curPath, './ip.dat');
}

if (fs.existsSync(DbPath)) {
    var dataBuffer = loadBinaryData(DbPath);
} else {
    var dataBuffer = new Buffer('');
}

// console.log(dataBuffer, DbPath);

function loadBinaryData(filepath) {
    var fd = fs.openSync(filepath, 'r');
    var indexLengthBuffer = new Buffer(4);
    var chunkSize = 102400,
        chunkBuffer,
        chunks = [];

    var readLength = 0,
        bufferLength = 0;

    while (true) {
        chunkBuffer = new Buffer(chunkSize);
        readLength = fs.readSync(fd, chunkBuffer, 0, chunkSize, bufferLength);
        bufferLength += readLength;
        chunks.push(chunkBuffer);
        if (readLength < chunkSize) break;
    }
    fs.closeSync(fd);

    return Buffer.concat(chunks);
};


function IpFind(ip) {
    ip = String(ip);
    ip = ip.trim();
    if (!$.isIp(ip)) {
        return ['', '', '', ''];
    }
    var ipArray = ip.split('.'),
        ip2long = function(ip) {
            return new Buffer(ip.split('.')).readInt32BE(0)
        },
        ipInt = ip2long(ip);

    var offset = dataBuffer.readInt32BE(0);

    var indexBuffer = dataBuffer.slice(4, offset);
    var tmp_offset = ipArray[0] * 4,
        end_offset = tmp_offset + 4,
        index_offset = -1,
        index_length = -1,
        start = indexBuffer.slice(tmp_offset, tmp_offset + 4).readInt32LE(0);

    var m = start * 8 + 1024;
    if (indexBuffer.slice(m, m + 4).readInt32BE(0) >= ipInt) {
        var find = start * 8 + 1024;
    } else {

        if (end_offset >= 1024) {
            end = offset;
        } else {
            end = indexBuffer.slice(end_offset, end_offset + 4).readInt32LE(0);
            if (end === -1) {
                end = Math.ceil((offset - 1024) / 8);
            }
        }

        // console.log(start, end, tmp_offset, end_offset, indexBuffer.slice(end_offset, end_offset + 4).readInt32LE(0));

        for (;
            (end - start) / 2 >= 1;) {
            var tmp = Math.ceil((end - start) / 2);
            var m = (tmp + start) * 8 + 1024;
            // console.log(m);
            if (indexBuffer.slice(m, m + 4).readInt32BE(0) >= ipInt) {
                end = tmp + start;
            } else {
                start = tmp + start;
            }
        }
        find = end * 8 + 1024;
    }

    index_offset = ((indexBuffer[find + 4] << 16) + (indexBuffer[find + 5] << 8) + indexBuffer[find + 6]);
    index_length = indexBuffer[find + 7];
    if (index_offset == -1 || index_length == -1) {
        return [];
    } else {
        return dataBuffer.slice(offset + index_offset, offset + index_offset + index_length).toString('utf-8').split('|');
    }
};

exports.loadData = function(file) {
    dataBuffer = null;
    dataBuffer = loadBinaryData(file);
};

exports.find = function(name, callback) {
    dns.resolve4(name, function(err, addresses) {
        if (err) {
            callback(IpFind(name));
        } else {
            callback(IpFind(addresses.shift()));
        }
    });
};
exports.findSync = IpFind;
// console.log(IpFind('220.181.38.112'));
// console.log(IpFind('|220.181.27.254'));
