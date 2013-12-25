/*jslint */
/*global define*/
/*global TransactionDatabase, TransactionView */ //TODO: add as rqeuire.js dependency
define([
    "jquery"
], function ($) {
    "use strict";

    var makeTransactionPanel = function () {
        // Transaction Viewer Dialog
        var al = $('#address_load').dialog({ autoOpen: false, minWidth: 500 });
        $('#address_load_open, #address_load_reset').click(function () {
            al.find('.progress, .result').hide();
            al.find('.query').show();
            $('#address_load').dialog('open');
        });

        $('#address_load_start').click(function () {
            al.find('.query, .result').hide();
            al.find('.progress').show().text('Loading transactions...');
            var addresses = $('#addresses').val().split("\n").join(",");
            $.get('/pubkeys/register', {keys: addresses}, function (data) {
                if (data.error) {
                    // TODO: handle
                    return;
                }
                $.get('/pubkeys/gettxs', {handle: data.handle}, function (data) {
                    if (data.error) {
                        // TODO: handle
                        return;
                    }
                    var hashes = [], i, transactionDb, transactionView;
                    for (i = 0; i < data.txs.length; i = i + 1) {
                        hashes.push(data.txs[i].hash);
                    }
                    al.find('.query, .progress').hide();
                    transactionDb = new TransactionDatabase();
                    transactionView = new TransactionView(al.find('.result').show().find('.txs'));
                    transactionView.setDatabase(transactionDb);
                    transactionDb.loadTransactions(data.txs);
                }, 'json');
            });
        });

    };

    return {
        makeTransactionPanel: makeTransactionPanel
    };
});
