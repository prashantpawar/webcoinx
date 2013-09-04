/*jslint */
/*global define, window, Bitcoin, BigInteger */
define(
    ["jquery", "p2ptrade/comm", "p2ptrade/agent", "p2ptrade/offer", "p2ptrade/wallet", "p2ptrade/mockwallet"],
    function ($, HTTPExchangeComm, ExchangePeerAgent, ExchangeOffer, EWallet, MockWallet) {
        "use strict";

        function P2pgui(wm, cm, exit, cfg) {
            var self = this, ewallet;
            if (cfg.get('p2ptradeMockWallet', false) === true) {
                ewallet = new MockWallet();
            } else {
                ewallet = new EWallet(wm, cm, exit);
            }
            this.ewallet = ewallet;
            this.cm = cm;

            this.comm = new HTTPExchangeComm('http://p2ptrade.btx.udoidio.info/messages');
            this.epa = new ExchangePeerAgent(ewallet, this.comm);
            
            function refresh() {
                self.comm.update();
                self.updateGUIstate();
            }
            refresh();
            window.setInterval(refresh, 1000);

            $('#buy-button').click(function (event) {
                event.preventDefault();
                self.create_offer(false, "1", $('#buyprice').val(),
                                  self.colorid, self.unit, $('#buyamt').val()
                                 );
            });

            $('#sell-button').click(function (event) {
                event.preventDefault();
                self.create_offer(self.colorid, self.unit, $('#sellamt').val(),
                                  false, "1", $('#sellprice').val(), "1"
                                  );
            });
        }

        // send refers to what we're sending to counterparty, recv what we want in return
        // TBA: should API user (which gui is) ever worry about units?        
        P2pgui.prototype.create_offer = function (sendcolor, sendunit, sendamt, recvcolor, recvunit, recvamt) {
            console.log("create_offer: send " + sendcolor + "," + sendunit + "," + sendamt);
            console.log("create_offer: recv " + recvcolor + "," + recvunit + "," + recvamt);
            function conv(a, b, c) {
                if (c === false) {
                    return Bitcoin.Util.parseValue(a, false).toString();
                }
                return (new BigInteger(a)).multiply(new BigInteger(b)).toString();
            }
            this.epa.registerMyOffer(new ExchangeOffer.MyOffer(null, {
                colorid: sendcolor,
                value: conv(sendamt, sendunit, sendcolor)
            }, {
                colorid: recvcolor,
                value: conv(recvamt, recvunit, recvcolor)
            }, true));
        };


        P2pgui.prototype.updateGUIstate = function () {
            var self = this,
                active = this.epa.hasActiveEP(),
                text = "";

            if (active) {
                text = "Transaction in progress: " + this.epa.active_ep.state;
            }
            $("#p2p_status").text(text);

            self.checkBTCTrade();

            var all_offers = [], asks = [], bids = [], oid;
            for (oid in this.epa.their_offers) {
                if (this.epa.their_offers.hasOwnProperty(oid))
                    all_offers.push(this.epa.their_offers[oid]);
            }
            for (oid in this.epa.my_offers) {
                if (this.epa.my_offers.hasOwnProperty(oid))
                    all_offers.push(this.epa.my_offers[oid]);
            }
           
            for (var i = 0; i < all_offers.length; ++i) {
                var offer_info = this.decodeOfferInfo(all_offers[i], true);
                if (offer_info) {
                    if (offer_info.is_bid)
                        bids.push(offer_info);
                    else
                        asks.push(offer_info);
                }
            }

            asks = asks.sort(function (a, b) { return a.price.compareTo(b.price);});
            bids = bids.sort(function (a, b) { return b.price.compareTo(a.price);});

            function display_offers(table, offer_infos, button) {
                var oid,
                    displayOfferLine = function (offer_info) {
                        var $row,
                            $btn,
                            op;
                        if (offer_info.is_bid) {
                            op = 'sell';
                        } else {
                            op = 'buy';
                        }
                        
                        var self_offer = offer_info.offer.is_mine;
                        
                        if (button) {
                            if(self_offer) {
                                $btn = $('<button>').addClass('btn btn-inverse btn-block')
                                    .text('Cancel')
                                    .click(function () {
                                        console.log('Add code to cancel offer here');
                                    });
                            } else {
                                $btn = $('<button>').addClass('btn btn-primary btn-block')
                                    .text(op)
                                    .click(function () {
                                               var amountField = $('#' + op + "amt"),
                                               priceField = $('#' + op +  'price');
                                               amountField.val(offer_info.quantity_fmt);
                                               priceField.val(offer_info.price_fmt);
                                           });
                            }
                        }
                        $row = $('<tr>')
                            .append($('<td>').text(offer_info.quantity_fmt_u))
                            .append($('<td>').text(offer_info.price_fmt_u));

                        if(self_offer) {
                          $row.addClass('info');
                        }
                        if ($btn) {
                            $row.append($('<td>').append($btn));
                        }
                        table.append($row);
                    };
                table.empty();
                for (var i = 0; i < offer_infos.length; ++i)
                    displayOfferLine(offer_infos[i]);
            }
            display_offers($('#p2p_bids'), bids, true);
            display_offers($('#p2p_asks'), asks, true);

        };

        P2pgui.prototype.setCurrentColor = function (colorid, unit) {
            console.log("setCurrentColor: " + colorid + "," + unit);
            this.colorid = colorid;
            this.unit = unit.toString();
        };

        P2pgui.prototype.checkBTCTrade = function () {
            var msgHub = $('#p2ptrade').find('.messages');
            
            if (this.colorid === false) {
                $('#buy-button').attr('disabled', true);
                $('#sell-button').attr('disabled', true);

                
                if(msgHub[0].innerHTML.length == 0) {
                    var msg = "Please select an asset you want to trade";
                    var msgObj = Message.create(msg, "error");
                    msgObj.appendTo(msgHub);
                }
            } else {
                $('#buy-button').removeAttr('disabled');
                $('#sell-button').removeAttr('disabled');
                      
                msgHub.empty();
            }
        };
        

        P2pgui.prototype.decodeOfferInfo = function (offer, fmt) {
            var is_ask = (offer.A.colorid === this.colorid && offer.B.colorid === false);
            var is_bid = (offer.B.colorid === this.colorid && offer.A.colorid === false);
            if (!is_bid && !is_ask) return null;
            if (is_bid && is_ask) return null;

            var quantity, cost;

            if (is_bid) {
                quantity = offer.B.value;
                cost = offer.A.value;
            } else {
                quantity = offer.A.value;
                cost = offer.B.value;
            }
            quantity = new BigInteger(quantity);
            cost = new BigInteger(cost);

            var info =  {
                is_bid: is_bid,
                quantity: quantity,
                cost: cost,
                // price = cost / (quantity/unit) = cost * unit / quantity
                price: cost.multiply(new BigInteger(this.unit)).divide(quantity),
                offer: offer
            };
            if (fmt) {
                info.quantity_fmt = this.cm.formatValue(quantity, this.colorid);
                info.cost_fmt = this.cm.formatValue(cost, false);
                info.price_fmt = this.cm.formatValue(info.price, false);

                info.quantity_fmt_u = this.cm.formatValueU(quantity, this.colorid);
                info.cost_fmt_u = this.cm.formatValueU(cost, false);
                info.price_fmt_u = this.cm.formatValueU(info.price, false);

            }
            return info;
        };

        P2pgui.prototype.checkOffer = function (offer) {
          if(offer.A.address == this.ewallet.getAddress(offer.A.colorid, false)) {
            return true;
          }
          
          return false;
        };

        return P2pgui;
    }
);
