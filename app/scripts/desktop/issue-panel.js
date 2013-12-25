/*jslint vars:true*/
/*global define*/
/*global Bitcoin, BigInteger, Message, Crypto */
/*global alert*/
define([
    "jquery"
], function ($) {
    "use strict";
    var makeIssuePanel = function (wallet, cfg, wm, colorMan, colordefServers, allowedColors, exitNode, reload_colors) {

/*
        var issueDialog = $('#dialog_issue_money').dialog({
            autoOpen: false,
            minWidth: 550,
            resizable: false
        });
*/
        var issueDialog = $('#dialog_issue_money'),
            reset = function () {
                issueDialog.find('.entry').show();
                issueDialog.find('.confirm, .loading').hide();
                issueDialog.find('.dialog_issue_name').focus();
                issueDialog.find('#dialog_issue_name').val('');
                issueDialog.find('#dialog_issue_amount').val('');
                issueDialog.find('#dialog_issue_unit').val('10000');
                issueDialog.find('.messages').empty();
            },
            update_issue_cost = function () {
				var wallet = app.getWallet();
                function set(s) {
                    if (!s) {
                        s = "amount X unit";
                    }
                    $('#issue_cost').html(s);
                }
                var amount_s = String($.fn.autoNumeric.Strip("dialog_issue_amount"));
                if (!amount_s) {
                    return set();
                }
                var amount = Bitcoin.Util.parseValue(amount_s, 1);
                if (amount.compareTo(BigInteger.ZERO) <= 0) {
                    return set();
                }
                var unit_s = String($.fn.autoNumeric.Strip("dialog_issue_unit"));
                if (!unit_s) {
                    return set();
                }
                var unit = Bitcoin.Util.parseValue(unit_s, 1);
                if (unit.compareTo(BigInteger.ZERO) <= 0) {
                    return set();
                }
                var cost = amount.multiply(unit);
                var cost_s = Bitcoin.Util.formatValue(cost);
                if (cost.compareTo(wallet.getBalance()) > 0) {
                    cost_s = "<span style='color:red'>" + cost_s + "</span>";
                }
                return set(cost_s);
            },
            initIssueEventHandlers = function () {
                issueDialog.find('.cancel').click(function (e) {
                    e.preventDefault();
                    //issueDialog.dialog('close');
                    reset();
                });
                issueDialog.find('.cancel_confirm').click(function (e) {
                    e.preventDefault();
                    issueDialog.find('.entry').show();
                    issueDialog.find('.confirm, .loading').hide();
                });
                issueDialog.find('#dialog_issue_amount').change(update_issue_cost);
                issueDialog.find('#dialog_issue_amount').keyup(update_issue_cost);
                issueDialog.find('#dialog_issue_unit').change(update_issue_cost);
                issueDialog.find('#dialog_issue_unit').keyup(update_issue_cost);
            },
            doIssue = function () {
				var wallet = app.getWallet();

                var msgHub = issueDialog.find('.messages');
                msgHub.empty();

                function validateError(msg) {
                    var msgObj = Message.create(msg, "error");
                    msgObj.appendTo(msgHub);
                }

                var name = issueDialog.find('#dialog_issue_name').val();
                name = name.replace(/^\s+/, "").replace(/\s+$/, "");

                if (!name.length) {
                    validateError("Please enter name of issued asset.");
                    return;
                }

                // Safe conversion from double to BigInteger
                var amount_s = String($.fn.autoNumeric.Strip("dialog_issue_amount"));
                if (!amount_s) {
                    validateError("Please enter an amount.");
                    return;
                }

                var amount = Bitcoin.Util.parseValue(amount_s, 1);

                if (amount.compareTo(BigInteger.ZERO) <= 0) {
                    validateError("Please enter a positive amount of " + name);
                    return;
                }

                var unit_s = String($.fn.autoNumeric.Strip("dialog_issue_unit"));
                if (!unit_s) {
                    validateError("Please enter an unit size in satoshi.");
                    return;
                }

                var unit = Bitcoin.Util.parseValue(unit_s, 1);

                if (unit.compareTo(BigInteger.ZERO) <= 0) {
                    validateError("Please enter a positive amount of satoshi per unit");
                    return;
                }

                var cost = amount.multiply(unit);
                if (cost.compareTo(wallet.getBalance()) > 0) {
                    validateError("You have insufficient BTC for this issue.");
                    return;
                }

                var cost_s = Bitcoin.Util.formatValue(cost);
                issueDialog.find('.confirm_issue_amount').text(amount_s);
                issueDialog.find('.confirm_issue_name').text(name);
                issueDialog.find('.confirm_issue_cost').text(cost_s);

                issueDialog.find('.confirm').show();
                issueDialog.find('.entry, .loading').hide();

                var confirmButton = issueDialog.find('.confirm_issue');
                confirmButton.unbind('click');
                confirmButton.click(function () {
                    var tx;
                    try {
                        tx = wallet.createSend(wallet.getCurAddress(), cost, Bitcoin.Util.parseValue(String(cfg.get('fee'))), false);
                    } catch (e) {
                        alert(e.message);
                        return;
                    }
                    wm.save(); // dont forget change addresses
                    var txBase64 = Crypto.util.bytesToBase64(tx.serialize());

                    issueDialog.find('.loading').show();
                    issueDialog.find('.entry, .confirm').hide();

                    issueDialog.find('.loading p').text("Issuing coins...");

                    // issue color, send transaction
                    colorMan.issue(colordefServers, name, unit_s, Crypto.util.bytesToHex(tx.getHash().reverse()), function (colorid, stat, xhr) {
                        if (!colorid || colorid.length !== 40) {
                            validateError("Remote error while processing issuing transaction, cancelled");
                            return;
                        }

                        allowedColors[colorid] = true;
                        cfg.apply({allowedColors: allowedColors});
                        var txHash = Crypto.util.bytesToBase64(tx.getHash());
                        $(exitNode).bind('txNotify', function callback(e) {
                            if (e.tx.hash === txHash) {
                                $(exitNode).unbind('txNotify', callback);
                                // Our transaction
                                //issueDialog.dialog('close');
                                setTimeout(function () {
                                    reset();
                                    reload_colors();
                                }, 1000);
                            }
                        });

                        exitNode.call("txSend", {tx: txBase64}, function (err) {
                            if (err) {
                                validateError("Error while processing issuing transaction. ");

                                //                            validateError("Error while processing issuing transaction: " +
                                //                                                data.error.message);
                                return;
                            }
                            issueDialog.find('.loading p').text("Awaiting reply...");
                        });
                    });
                });
            };

        issueDialog.find('.issue').click(function (e) {
            e.preventDefault();
            doIssue();
        });
        reset();
        initIssueEventHandlers();
    };
    return {
        makeIssuePanel: makeIssuePanel
    };
});
