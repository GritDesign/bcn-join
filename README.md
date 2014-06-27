# bcn-join 

Provides a way to join multiple iterators by key.

Note that this does full join of included iterators.

## Installation

```
npm install bcn-join
```

## Usage
```javascript
var BcnJoin = require("bcn-join").BcnJoin;

var join = new BcnJoin({
	name1: iterator1,
	name2: iterator2,
	name3: iterator3
});

join.pause();
join.resume();

join.on("data", function(key, item) {
	//item.name1
	//item.name2
	//item.name3
	//item.name4
});

join.on("end", function() {
	// done
});

```


