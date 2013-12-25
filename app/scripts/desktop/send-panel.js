/*jslint vars:true*/
/*global define*/
/*global Message, Bitcoin, BigInteger, Crypto*/
/*global alert*/
define([
    "jquery"
], function ($) {
    "use strict";
    var makeSendPanel = function (app, cfg, wm, colorMan, exitNode, colorSelector) {
        // Send Money Dialog
        //        var sendDialog = $('#dialog_send_money').dialog({
        //            autoOpen: false,
        //            minWidth: 550,
        //            resizable: false
        //        });


        //        $('#nav_issue_money').click(function (e) {
        //            e.preventDefault();
        //            activateIssueDialog();
        //        });

        var sendDialog = $('#dialog_send_money'),
            reset = function () {
//                sendDialog.dialog('open');
                sendDialog.find('.entry').show();
                sendDialog.find('.confirm, .loading').hide();
                sendDialog.find('.amount').val('').focus();
                sendDialog.find('.address').val('');
                sendDialog.find('.messages').empty();
            };

//        $('#nav_send_money').click(function (e) {
//            e.preventDefault();
//            //var an = getColor()?autoNumericColor:autoNumericBtc;
//            //sendDialog.find('.amount').autoNumeric(an);
//            reset();
//        });
        sendDialog.find('.cancel').click(function (e) {
            e.preventDefault();
            //sendDialog.dialog('close');
            reset();
        });
        sendDialog.find('.cancel_confirm').click(function (e) {
            e.preventDefault();
            sendDialog.find('.entry').show();
            sendDialog.find('.confirm, .loading').hide();
        });
        sendDialog.find('.send').click(function (e) {
			var wallet = app.getWallet();
            e.preventDefault();
            var msgHub = sendDialog.find('.messages');
            msgHub.empty();

            function validateError(msg) {
                var msgObj = Message.create(msg, "error");
                msgObj.appendTo(msgHub);
            }

            // Safe conversion from double to BigInteger
            var valueString = String($.fn.autoNumeric.Strip("dialog_send_money_amount"));
            if (!valueString) {
                validateError("Please enter an amount.");
                return;
            }

            var value = Bitcoin.Util.parseValue(valueString, colorSelector.getColor());

            if (value.compareTo(BigInteger.ZERO) <= 0) {
                validateError("Please enter a positive amount of " + (colorSelector.getColorName()));
                return;
            }

            var rcpt = sendDialog.find('.address').val();

            // Trim address
            rcpt = rcpt.replace(/^\s+/, "").replace(/\s+$/, "");
            if (!rcpt) {
                validateError("Enter address");
                return;
            }
            var cid = colorSelector.getColor();
            if (cid) {
                if (rcpt.indexOf(cid + '@') !== 0) {
                    validateError("Please use correct color address to prevent accidents");
                    return;
                }
                // sha256 + @
                rcpt = rcpt.slice(41);
                cid = colorMan.cmap(cid);
                console.log('@@CID2');
                console.log(cid);
                value = value.multiply(Bitcoin.Util.parseValue(cid.unit, 1));
            }

            if (value.compareTo(wallet.getBalance(colorSelector.getColor())) > 0) {
                validateError("You have insufficient funds for this transaction.");
                return;
            }

            if (!rcpt.length) {
                validateError("Please enter the Bitcoin address of the recipient.");
                return;
            }

            try {
                var pubKeyHash = Bitcoin.Address.decodeString(rcpt);
            } catch (err) {
                validateError("Bitcoin address invalid, please double-check.");
                return;
            }

            sendDialog.find('.confirm_amount').text(valueString + ' ' + colorSelector.getColorName());
            sendDialog.find('.confirm_address').text(rcpt);

            sendDialog.find('.confirm').show();
            sendDialog.find('.entry, .loading').hide();

            var confirmButton = sendDialog.find('.confirm_send');
            confirmButton.unbind('click');
            confirmButton.click(function () {
				var wallet = app.getWallet();
                var tx;
                try {
                    tx = wallet.createSend(new Bitcoin.Address(rcpt), value, Bitcoin.Util.parseValue(String(cfg.get('fee'))), colorSelector.getColor());
                } catch (e) {
                    alert(e.message);
                    return;
                }
                wm.save(); // dont forget change addresses
                var txBase64 = Crypto.util.bytesToBase64(tx.serialize());

                sendDialog.find('.loading').show();
                sendDialog.find('.entry, .confirm').hide();

                sendDialog.find('.loading p').text("Sending coins...");

                var txHash = Crypto.util.bytesToBase64(tx.getHash());
                $(exitNode).bind('txNotify', function callback(e) {
                    if (e.tx.hash === txHash) {
                        $(exitNode).unbind('txNotify', callback);
                        // Our transaction
                        //sendDialog.dialog('close');
                        reset();
                        $('#tab-transactions').click();
                    }
                });

                exitNode.call("txSend", {tx: txBase64}, function (err) {
                    if (err) {
                        validateError("Error sending transaction: ");
                        //                        validateError("Error sending transaction: " +
                        //                                      data.error.message);
                        return;
                    }
                    sendDialog.find('.loading p').text("Awaiting reply...");
                });
            });
        });

        reset();
        return {
        };
    };
    return {
        makeSendPanel: makeSendPanel
    };

});
