/*jslint vars: true */
/*global define*/
define(["jquery"], function ($) {
    var exitNode = null;
    var colorspace = [];
    var cinit = {
		false: {
			name: "BTC",
			colorid: false
		}
	};
    var colormap = $.extend({}, cinit);
    var ColorMan = function (exitnode) {
        ColorMan.instance = this; // LOL singleton
        exitNode = exitnode;
    };

    var txdatacache = {};

    function id2name(cid) {
        return colormap[cid].name;
    }

    function getTransaction(txHash, callback) {
		// this should be probably in exitnode.js?
		var data = txdatacache[txHash];
		if (data) {
			callback(data);
		} else {
			exitNode.call("txquery", [txHash], function (err, data) {
				if (err) {
					alert("Error querying "+txHash+": " + err);
					return;
				}
				fixData(data.tx);  
				txdatacache[txHash] = data.tx;
				callback(data.tx);
			});
		}
    }
    // move decimal point 8 places
    function btcToSatoshi(s) {
        if (typeof s != 'string') {
			return s;
		}
        // find decimal point
        var i = s.indexOf('.'),
			satoshis;
        if (i !== -1) {
			// parse string without '.' as an integer
            var x = +(s.substr(0, i) + s.substr(i+1, i+9));
  
            // multiply by power of 10 to make into satoshis
            satoshis = x * Math.pow(10, 9 - s.length + i);
        } else {
            satoshis = +s * 1e8;
        }
		return satoshis;
    }
  
    // convert the input and output values from BTC to Satoshis
    // If not, then floating point rounding errors will propagate
    // and cause the matching algorithm to give wrong results
    function fixData(tx) {
        tx.out.forEach(function(o) {
          o.value = btcToSatoshi(o.value);
        });
        
        tx.in.forEach(function(i) {
          i.value = btcToSatoshi(i.value);
        });
    }
    
    function matchInputs(tx) {
        var inputs = [0];
        var outputs = [];
        var matching = [];
      
        // create prefix sums
        tx.out.reduce(function(prev, curr) {
            prev += curr.value;            
            outputs.push(prev);
            return prev;
        }, 0);
        tx.in.reduce(function(prev, curr) {            
            prev += curr.value;
            inputs.push(prev);
            return prev;
        }, 0);
      
        // matching algorithm
        var inIdx = 0; var outIdx = 0;
        for(var outIdx = 0; 
            outIdx < outputs.length && inIdx < inputs.length-1; 
            ++outIdx) {
            matching[outIdx] = []      
          
            for(; inIdx < inputs.length-1; inIdx++) {
              matching[outIdx].push(inIdx);
              if(inputs[inIdx+1] >= outputs[outIdx]) {                
                  break;
              }
            }
        }
        
        return matching;
    }
  
    function getMatching(txHash, callback) {
        getTransaction(txHash, function(tx) {
          callback(matchInputs(tx));
        });
    }
  
    function getColorByDefinition(txHash, outputIdx) {
        var defs = colorspace;
        // embed some color definitions here for now.
  
        // simply compare the given hash and out index with those in the 'issues'
        // field of each color definition. Return the 'name' field if we get a match.
        for(var i = 0; i < defs.length; ++i) {
          var issues = defs[i].issues[0];
  
          if(issues.txhash === txHash && issues.outindex === outputIdx) {
              return defs[i].colorid;
          }
        }
  
        // if we've got here, then none of the definitions matched
        return null;
    }
  
    function getColor(txHash, outputIdx, callback) {
  
        function Helper(hash, idx, cb) {
          this.color = null;
  
          // put initial transaction output in queue
          this.queue = [{
              txHash: hash,
              index: idx
          }];
  
          this.callback = cb;
  
          this.getColorHelper = function () {
              if (this.queue.length === 0) {
                  // we've visited everything and not found a conflict!
                  this.callback(this.color);
                  return;
              }
  
              var currentOutput = this.queue.pop();
              var currentHash = currentOutput['txHash'];
              var currentOutIdx = currentOutput['index'];
  
              // is the current input colored by definition?
              var color = getColorByDefinition(currentHash, currentOutIdx);
              if (color !== null) {
                  // if we've already got a provisional color
                  if (this.color !== null) {
                      // make sure the new color matches
                      if (this.color !== color) {
                          this.callback(false);
                      } else {
                          // it matches, keep searching
                          this.getColorHelper();
                      }
                  } else {
                      // otherwise, this becomes the provisional color
                      this.color = color;
  
                      // and carry on with next iteration of loop
                      this.getColorHelper();
                  }
              }
  
              // otherwise, get the transaction, and add
              // the matching inputs to the queue
              else {
                  getTransaction(currentHash, function(tx) {
                      // is it coinbase, then we can't go any deeper, so it isn't colored
                      // false marks uncolored btc
                      if(tx.in[0].type === 'coinbase') {
                          this.callback(false);
                      } else {
                          var matching = matchInputs(tx);
  
                          // add the matching inputs to the queue
                          matching[currentOutIdx].reverse().forEach(function(inIdx) {
                              var input = tx.in[inIdx];
  
                              this.queue.push({
                                  txHash: input.prev_out.hash,
                                  index: input.prev_out.n
                              });
                          }.bind(this));
  
                          // next round in 'loop'
                          this.getColorHelper();
                      }
                  }.bind(this));
              }
          };
  
          // start traversing
          this.getColorHelper();
        };
  
  
        var helper = new Helper(txHash, outputIdx, callback);
    }
  
    ColorMan.prototype.getTransaction = function (txHash, callback) {
        txHash = Crypto.util.bytesToHex(
			Crypto.util.base64ToBytes(txHash).reverse());
        return getTransaction(txHash, callback);
    };
    ColorMan.prototype.getColor = function (txHash, outputIdx, callback) {
        txHash = Crypto.util.bytesToHex(
			Crypto.util.base64ToBytes(txHash).reverse());
        return getColor(txHash, outputIdx, callback);
    };
  
    // XXX do in-client issuing
    // we always assume txhash:0, caller must ensure that
    ColorMan.prototype.issue = function(colordefs, name, unit, txhash, cb) {
        var url = colordefs.slice(1).split(" ")[0];
        var data = {
            name: name,
            unit: unit,
            style: 'genesis',
            data: txhash + ':0',
            publickey: '',
        };
        $.post(url, data).done(cb).fail(cb);
    };
  
    ColorMan.prototype.reloadColors = function(colordefs, cb) {
        var self = this;
        var urls = colordefs.slice(1).split(" ");
        var doit;
        var prev = null;
        var clist = [];
        colorspace = [];
        colormap = $.extend({}, cinit);
  
		function fixurl(url) {
			if (url[url.length-1] != '/') {
				url += '/';
			}
			return url;
		};
  
		doit = function (data,status,err) {
            var url = urls.shift();
            if (status) {
                if (status != "success") {
					if (window.addEventListener && err === 'No Transport') {
						alert("Your browser provides no way to connect to the remote server, try a newer version or another brand.");
					}
                alert('Failed to load ' + fixurl(prev));
				} else {
					// XXX better check for duplicates,
					//verify the color data is actually correct etc
					for (var i = 0; i < data.length; i++) {
						var c = data[i];
						if (colormap[c.colorid]) continue; // dupe
						c.server = prev;
						clist.push(c);
						colormap[c.colorid] = c;
					}
				}
			};
			if (!url) {
                colorspace = clist;
				if (cb) {
					cb();
				}
				$(self).trigger('colordefUpdate', [colorspace]);
				return;
			};
			prev = url;
  
			$.ajax(fixurl(url) + 'colorlist', {dataType: 'json' })
				.done(doit).fail(doit);
       };
       doit();
    };
  
    // this must be called whenever utxo set changes, after colors are resolved
    ColorMan.prototype.update = function (wm, cb) {
		this.running = cb;
		var wallet = wm.activeWallet.wallet;
		var left = wallet.unspentOuts.length;
		if (!left) {
			cb();
			return;
		}
		wallet.dirty += 1;
		wallet.unspentOuts.forEach(function (utxo) {
			var hash = Crypto.util.bytesToHex(Crypto.util.base64ToBytes(utxo.tx.hash).reverse());
			getColor(hash, utxo.index, function (utxo_color) {
				utxo.color = utxo_color;
				left = left - 1;
				if (left == 0) {
					wallet.dirty -= 1;
					cb();
				}
			});
		});
    };
  
    ColorMan.prototype.txcolor = function (h, cb) {
        var hash = Crypto.util.bytesToHex(Crypto.util.base64ToBytes(h).reverse());
        getColor(hash, 0, function(c) { cb(colormap[c]); });
    };
  
    ColorMan.prototype.cname = function (cid) {
		return id2name(cid);
    };
  
    ColorMan.prototype.btc2color = function (b,c) {
		return btcToSatoshi(b);
    };
  
    ColorMan.prototype.cmap = function (cid) {
      return colormap[cid];
    }
  
      // convert from satoshi to color units
    ColorMan.prototype.s2c = function (color, balance) {
        if (!color) {
			return balance;
		}
        var units = colormap[color].unit;
        return balance.divide(BigInteger.valueOf(units));
    }
  
    // take value in satoshi (as string) and colorid, return human-readable representation
    ColorMan.prototype.formatValue = function(value, color) {
		if (color) {
			var units = colormap[color].unit;
			return (new BigInteger(value.toString(), 10)).divide(new BigInteger(units.toString(),10))
		}
		return Bitcoin.Util.formatValue((new BigInteger(value.toString(), 10)).toString());
    };

    ColorMan.prototype.formatValueU = function(value, color) {
		color = color?color:false;
		return this.formatValue(value, color) + ' ' + id2name(color);
    };
  
    ColorMan.prototype.is_issue = function(txhash) {
        return getColorByDefinition(txhash,0);
    };

	window.debugColorman = function () {
		console.log(colormap);
	};
  
    return ColorMan;

});
