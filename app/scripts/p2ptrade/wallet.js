// impl notes:
//
// color representation everywhere:
// "c010...." - colorid
// false - btc
// undefined/null - we're not sure (waiting for colorman)
//
// amount representation is crazy:
// "01234": satoshi amount as string, if that were everywhere things would be
// awesome
//
// BigInt: that works esp for math
//
// Some weird bytearray: (but not bitcoin tx packed int!)
// bitcoinjs insists on it (the endianness madness wrt addOutput below)
//
// We used to have js float on top of that, meh.
// 
// We try to have them represented as string in api public api, internally
// used only as string in ETX.tx.outs[n].value which gets exported by getData(),
// otherwise bigint everywhere and bytearray (Bitcoin.Util.valueToBigInt) where
// bitcoinjs-lib insists on it. Talk about consistent!


define(
    ["jquery", "colorman"], 
    function($, ColorMan)  {

        function log_event(ekind, msg) {
            console.log("Event: " + ekind + " Msg:" + msg);
        }
        
        function outpointString(outpoint) {
            return outpoint.hash + ":" + outpoint.index.toString();
        }

        function ExchangeTransaction(wallet, data) {
            this.wallet = wallet;
            this.tx = data.tx;
            this.my = data.my;
            this.inp_colors = data.inp_colors || {};
            this.realtx = null;
        }

        ExchangeTransaction.prototype.withInputColors = function(next) {
            var self = this;

            var todo = 1;
            
            function process (inp, txdata, color) {

                self.inp_colors[outpointString(inp.outpoint)] = {
                    color: color,
                    value: new BigInteger(txdata.out[inp.outpoint.index].value.toString(), 10)
                };
                todo -= 1;
                if (todo == 0) next();
            }
            
            this.tx.ins.forEach(
                function (inp) {
                    if (!self.inp_colors[outpointString(inp.outpoint)]) {
                        todo += 1;
                        ColorMan.instance.getTransaction(
                            inp.outpoint.hash, 
                            function (txdata) {
                                ColorMan.instance.getColor(
                                    inp.outpoint.hash,
                                    inp.outpoint.index,
                                    function (color) {
                                        process(inp, txdata, color);
                                    });
                            });
                    }
                });

            todo -= 1;
            if (todo == 0) next();
        };


        ExchangeTransaction.prototype.computeOutputColors = function () {
            // initialize state
            var cur_value = BigInteger.valueOf(0);
            var cur_color = false;
            var i = 0; //input index
            var couts = [];
            
            for (var o = 0; o < this.tx.outs.length; ++o) {
                var vv = this.tx.outs[o].value;
                var want_value = new BigInteger(vv, 10);
                                
                while ((cur_value.compareTo(want_value) < 0) && (i < this.tx.ins.length)) {
                    var inp = this.tx.ins[i];
                    var inpc = this.inp_colors[outpointString(inp.outpoint)];

                    if (!inpc)
                        throw "input color not known";
 
                    if (cur_value.compareTo(BigInteger.ZERO) == 0) {
                        cur_color = inpc.color;
                    }
                    else if (cur_color != inpc.color) {
                        cur_color = false;
                    }
                    cur_value = cur_value.add(inpc.value);
                    ++i;
                }
                
                var wtf;
                if ((wtf=cur_value.compareTo(want_value)) < 0) {
                    console.log("wtf="+wtf+"have:"+(cur_value.toString())+" need:"+(want_value.toString()));
                    console.log(this.tx);
                    throw "tx wtf: "+wtf;
                }
                // color the output
                couts.push({color: cur_color,
                            to: this.tx.outs[o].to,
                            orig: this.tx.outs[o],
                            value: want_value});
                cur_value = cur_value.subtract(want_value);
            }
            
            return couts;
        };


        // expects 'value' as string
        ExchangeTransaction.prototype.checkOutputsToMe = function(myaddress, color, value) {
//            return true; // this seems to be just broken :(
            var couts = this.computeOutputColors();

            var total = BigInteger.valueOf(0);

            couts.forEach(function(cout) {
                              if (cout.to == myaddress && cout.color == color)
                                  total = total.add(cout.value);
                          });
            return (total.compareTo(new BigInteger(value, 10)) >= 0);
        };


        // reconstruct tx so bitcoinjs-lib understands it
        ExchangeTransaction.prototype.getRealTx = function() {
            // cache
            if (this.realtx) return this.realtx;

            var realtx = new Bitcoin.Transaction();

            // inputs
            this.tx.ins.forEach(
                function(inp) {
                    realtx.ins.push(new Bitcoin.TransactionIn({
                                                          outpoint: inp.outpoint,
                                                          script: new Bitcoin.Script(),
                                                          sequence: 4294967295
                                                      }));
                });
            
            // outputs
            this.tx.outs.forEach(function(out) {
                                     realtx.addOutput(new Bitcoin.Address(out.to),
                                                      new BigInteger(out.value, 10));
                                     // there is a problem with endianness in bitcoinjs-lib :(
                                     //  realtx.outs.push(new Bitcoin.TransactionOut({
                                     //   value: out.value,
                                     //   script: Bitcoin.Script.createOutputScript(
                                     // 
                                     //)
                                 });

            this.realtx = realtx;

            return realtx;
        };


        ExchangeTransaction.prototype.signMyInputs = function(reftx) {
            var my = reftx ? reftx.my : this.my;
            var self = this;

            var real = this.getRealTx();

            // create signautures for my inputs
            for (var j = 0; j < my.length; j++) {
                var found = false;
                var utxo = my[j];
                for (var i = 0; i < this.tx.ins.length; i++) {
                    var inp = this.tx.ins[i];
                    if (inp.outpoint.hash == utxo.tx.hash && inp.outpoint.index == utxo.index) {
                        var hash = real.hashTransactionForSignature(utxo.out.script, i, 1); // SIGHASH_ALL
                        var pkhash = utxo.out.script.simpleOutPubKeyHash();
                        var sig = this.wallet.signWithKey(pkhash, hash);
                        sig.push(1); // SIGHASH_ALL
                        var pk = this.wallet.getPubKeyFromHash(pkhash);
                        
                        inp.sig = {
                            sig: sig,
                            pk: pk
                        };    
                        found = true;
                        break;
                    }
                }
                if (!found) throw "my input isn't present in transaction";
            }

            // now create signatures in real tx
            for (var i = 0; i < this.tx.ins.length; i++) {
                var inp = this.tx.ins[i];
                if (inp.sig)
                    real.ins[i].script = Bitcoin.Script.createInputScript(inp.sig.sig, inp.sig.pk);
            }

            return true;
        };
        ExchangeTransaction.prototype.broadcast = function(cb) {
            log_event("ExchangeTransaction.broadcast");
            if (!this.hasEnoughSignatures())
                throw "trying to broadcast tx without enough signatures";
            this.wallet.sendTx(this.getRealTx(), cb);
            return true;
        };
        ExchangeTransaction.prototype.hasEnoughSignatures = function() {
            var ok = true;
            this.tx.ins.forEach(function(inp) {
                    if (!inp.sig)
                        ok = false;
                });
            return ok;
        };
        ExchangeTransaction.prototype.appendTx = function(etx) {
            // TODO: handle colors?
            this.tx.ins = this.tx.ins.concat(etx.tx.ins);
            this.tx.outs = this.tx.outs.concat(etx.tx.outs);
            this.my = this.my.concat(etx.my);
            // invalidate realtx cache
            this.realtx = null;
        };
        ExchangeTransaction.prototype.getData = function() {
            return this.tx;
        };

        function EWallet(wm,cm,exit) {
            var self = this;
            self.wallet = wm.activeWallet.wallet;
            if (!self.wallet) {
                $(wm).bind('walletInit', function(e) {
                               self.wallet = e.newWallet.wallet;
                           });
            }
            this.exit = exit;
            this.wm = wm;
            this.cm = cm;
        }


        EWallet.prototype.sendTx = function (tx, cb) {
            if (!tx) {
                console.log("wtf? sendTx null");
            }
            var bytes = tx.serialize();
            console.log(Crypto.util.bytesToHex(bytes));
            var txBase64 = Crypto.util.bytesToBase64(bytes);
            return this.exit.call("txSend", {tx:txBase64}, cb || function(){});
        };


        EWallet.prototype.getAddress = function(colorid, is_change) {
            return this.wallet.getCurAddress().toString();
        };
        EWallet.prototype.signWithKey = function (pkhash, hash) {
            return this.wallet.signWithKey(pkhash, hash);
        };
        EWallet.prototype.getPubKeyFromHash = function (pkhash) {
            return this.wallet.getPubKeyFromHash(pkhash);
        };

        // expects 'amount' as string
        EWallet.prototype.createPayment = function(color, amount, to_address) {
            amount = new BigInteger(amount, 10);
            var fee = (color === false) ? BigInteger.valueOf(50000) : BigInteger.ZERO;
            var amountWithFee = amount.add(fee);

            var payment = this.wallet.selectCoins(amountWithFee, color);
            if (payment) {
                var ins = payment.outs.map(function (out) {
                                              return {
                                                  outpoint: {
                                                      hash: out.tx.hash,
                                                      index: out.index
                                                  },
                                                  sig: false
                                                  // not signed by us/counterparty yet
                                                  // note that we do not transfer scripts over the wire, just the signature
                                                  // and pk itself. this saves us the trouble of verifying the counterparty
                                                  // sent us proper script, since we recreate it by ourselves should we
                                                  // worry about that in the future.
                                              };
                                           });
                var outs = [{to: to_address,
                             value: amount.toString()
                            }];
                if (payment.value.compareTo(amountWithFee)>0) {
                    outs.push({
                                  to: this.getAddress(color, true),
                                  value: payment.value.subtract(amountWithFee).toString()
                             });
                }
                var inp_colors = {};
                payment.outs.forEach(
                    function (out) {
                        inp_colors[outpointString({hash: out.tx.hash, index: out.index})] = {
                            color:  out.color,
                            value:  Bitcoin.Util.valueToBigInt(out.out.value)
                        };
                    });
                return new ExchangeTransaction(this, 
                                                   {
                                                       // beware everything in tx: must be wire serializable
                                                       tx: {outs: outs, ins: ins },
                                                       my: payment.outs,
                                                       inp_colors: inp_colors
                                                   });
            } else 
                throw "not enough coins";
        };
        EWallet.prototype.importTx = function(tx_data) {
            return new ExchangeTransaction(this, {
                tx: tx_data,
                my: []
            });
        };

        return EWallet;
});
