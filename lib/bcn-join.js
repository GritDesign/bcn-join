
var events = require("events");
var util = require("util");

function BcnJoin(iterators) {
    var self = this;
    events.EventEmitter.call(self);

    if (typeof(iterators) !== 'object') {
       throw new Error("Must provide iterators argument, should be a object like {key1: iterator1, key2: iterator2, .. }");
    }

    var keys = Object.keys(iterators);
    if (keys.length < 2) {
       throw new Error("Must join at least 2 iterators");
    }

    var current_key = null;
    this._advancing = false;

    this._event_buffer = [];
    this._iterators = [];

    this._state = {};

    for (var i=0; i<keys.length; i++) {
        var iterator = iterators[keys[i]];
        this._iterators.push({name: keys[i], iterator:iterator});
    }

    var to_advance_count = this._iterators.length;
   
    function check_done_advancing() {
        to_advance_count--;
        if (to_advance_count === 0) {
            didAdvance();
        }
    }
 
    this._iterators.forEach(function(value, index) {
        var name = value.name;
        var iterator = value.iterator;
        var state = {value: null, advancing: false, key: null, finished: false};

        self._state[name] = state;

        iterator.on("data", function(key, value) {
            iterator.pause();

            state.key = key;
            state.value = value;
            state.advancing = false;
            check_done_advancing(); 
        }); 

        iterator.on("end", function() {
            state.key = null;
            state.value = null;
            state.advancing = false;
            state.finished = true;

            check_done_advancing(); 
        });
    });

    function didAdvance() {
        var finished = true;
        var minKey = null;

        for (var state_key in self._state) {
            var state = self._state[state_key];
            if (state.finished || state.key === null) continue;
            finished = false;
            minKey = minKey || state.key;

            if (state.key < minKey) {
                minKey = state.key;
            }
        }

        if (finished) {
            self.emit("end");
        } else {
            // emit all that match minKey, then advance those.
            var out_data = {};
            for (var state_key in self._state) {
                 var state = self._state[state_key];
                 if (state.key === minKey) {
                    to_advance_count++;
                    state.advancing = true;
                    out_data[state_key] = state.value;
                 } else {
                    state.advancing = false;
                    out_data[state_key] = null;
                 }
            }

            self.emit("data", minKey, out_data);

            // resume all iterators that are paused
            if (!self._paused) {
                for (var state_key in self._state) {
                    var state = self._state[state_key];
                    if (state.advancing) {
                        iterators[state_key].resume();
                    } else {
                        iterators[state_key].pause();
                    }
                }
            }
        }
    }
}

util.inherits(BcnJoin, events.EventEmitter);

BcnJoin.prototype.pause = function() {
    var self = this;
    self._paused = true;
    self._iterators.forEach(function(i) {
        i.iterator.pause();
    }); 
}

BcnJoin.prototype.resume = function() {
    var self = this;
    self._paused = false;

    self._iterators.forEach(function(i) {
        if (self._state[i.name].advancing) {
            i.iterator.resume();
        }
    }); 
}

exports.BcnJoin = BcnJoin;
