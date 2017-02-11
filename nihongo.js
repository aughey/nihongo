const MongoClient = require("mongodb").MongoClient;
const wanakana = require('wanakana');
const Q = require('q');

const mongo_url = 'mongodb://localhost:27017/nihongo';

function uncomma(c) {
    if (!c) {
        return [];
    }

    return c.toString().split(',').map((subc) => {
        return subc.trim();
    });
}

function reformatItem(item,n5) {
    if (Array.isArray(item.parts)) {
    	return Q(true);
    }

    var kana = item.kana.split(',')[0].trim(); //.search(/[^ ]+/);
    kana = kana.split("/")[0].trim();

    var parts = [];
    for (var i = 0; i < kana.length; ++i) {
        var k = kana[i];
        parts.push(wanakana.toRomaji(k));
    }
    item.parts = parts;

    if (wanakana.isHiragana(kana)) {
        item.kind = 'h';
    } else if (wanakana.isKatakana(kana)) {
        item.kind = 'k';
    }

    item['primary'] = uncomma(item['Primary defn']);
    item['secondary'] = uncomma(item['secondary defn']);

    console.log(item);

    return Q.ninvoke(n5,"update",{_id: item._id},item);

}

function start() {
    var g_db = null;
    var g_n5 = null;
    Q.ninvoke(MongoClient, "connect", mongo_url).then(function(db) {
        g_db = db;
        console.log("Connected to mongo");
        var n5 = db.collection('n5');
        g_n5 = n5;
        return Q.ninvoke(n5, "find", {});
    }).then((cursor) => {
        var deferred = Q.defer();

        function processNext() {
            cursor.nextObject(function(err, item) {
                if (err || !item) {
                    console.log("Done Processing items");
                    deferred.resolve(true);
                    return;
                }

                reformatItem(item,g_n5).then(processNext).done();
            })
        }

        processNext();
        return deferred.promise;
    }).finally(() => {
        console.log("Closing DB")
        g_db.close();
    }).done();
}

start();