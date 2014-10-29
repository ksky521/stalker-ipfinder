/**
 * 格式说明
 * 1、文件分为索引区和数据区两部分
 * 2、首4个字节是索引区最后的offset，即数据区开始的offset
 * 3、索引区分超级索引和普通索引，超级索引是：前1024个字符，每四个代表一个ip大段[0~255]
 * 4、普通索引区每8个字节代表一个索引，前四个是ip端，5~7是对应的ip数据所在数据区的offset，最后是数据长度
 * txt数据格式：只取到county
 * Fields:
 * ipstart|ipend|country|isp|province|city|county|country confidence|isp confidence|province confidence|city confidence|county  * confidence\n
 */

var fs = require('fs');
var Path = require('path');
var autobuffer = require('autobuffer');
var isIp = require('./helper').isIp;

function convert2Dat(dbPath, output) {

    dbPath = dbPath || './colombo_iplib.txt';

    var data = loadBinaryData(dbPath);
    //按行拆分
    data = data.toString('utf-8').split('\n');

    data = data.filter(function(v) {
        //按照|分割
        v = v.split('|');
        if (isIp(v[0]) && isIp(v[1])) {

            return true;
        }
        return false;
    });


    //前四个字节：4+256*4+data.length*8
    var headBuffer = new autobuffer({
        bigEndian: true
    }).int32(4 + 1024 + data.length * 8).pack();

    //获取超级索引区
    var superIndexs = [];
    //数据区chunk
    var dataChunks = [];
    //索引区chunk
    var indexChunks = [];
    //数据区索引开始
    var dataOffset = 0;
    // var superOffset = 0;
    for (var i = 0, len = data.length; i < len; i++) {
        var v = data[i];
        v = v.split('|');
        var ips = v[1].split('.');
        if (!superIndexs[ips[0]]) {
            // console.log(ips[0], i);
            superIndexs[ips[0]] = i;
        }

        //数据区buffer
        //只取isp，省市县
        var dbuffer = new Buffer(v.splice(3, 4).join('|'));
        dataChunks.push(dbuffer);

        //索引区数据，前四个是ip-end的数组型buffer
        var indexBuffer0 = new Buffer(ips);


        //4~6是数据区buffer的offset
        var tint = dataOffset;
        var tBuffer = new autobuffer({
            bigEndian: true
        }).int32(tint).pack();

        var indexBuffer1 = tBuffer.slice(1);
        //7是数据区长度
        var tlen = dbuffer.length;
        var indexBuffer2 = new autobuffer().int8(tlen).pack();
        // console.log(indexBuffer2);

        indexChunks.push(Buffer.concat([indexBuffer0, indexBuffer1, indexBuffer2]));
        // if (ips[0] == 220 && indexBuffer0.readInt32BE(0) > -592107920) {
        //     console.log(dataOffset, indexBuffer0.readInt32BE(0), i, data[i], Buffer.concat([indexBuffer0, indexBuffer1, indexBuffer2]));
        //     break;
        // }

        dataOffset += tlen;
    }
    //索引buffer
    var indexBuffer = Buffer.concat(indexChunks);

    // console.log(indexBuffer.length, data.length);

    //数据区buffer
    var dataBuffer = Buffer.concat(dataChunks);

    var superChunks = [];
    var zeroBuffer = new autobuffer({
        littleEndian: true
    }).int32(-1).pack();


    for (var i = 0, len = superIndexs.length; i < len; i++) {
        var v = superIndexs[i];
        if (v) {
            superChunks.push(new autobuffer({
                littleEndian: true
            }).int32(v).pack());
        } else {
            superChunks.push(zeroBuffer);
        }
    }


    //超级索引区buffer
    var superIndexBuffer = Buffer.concat(superChunks);


    var fileBuffer = Buffer.concat([headBuffer, superIndexBuffer, indexBuffer, dataBuffer]);

    if (!output) {
        output = Path.basename(dbPath, '.txt') + '.dat';
    }
    // console.log(output);
    fs.writeFile(output || './ip.dat', fileBuffer, function(err) {
        if (err) throw err;
        console.log('It\'s saved!');
    });

}



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

exports.convert2Dat = convert2Dat;
