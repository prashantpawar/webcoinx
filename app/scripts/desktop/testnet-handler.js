/*jslint vars:true*/
/*global define, alert, ZeroClipboard */

define([
    "jquery"
], function ($) {
    "use strict";
	var initialize = function (cfg, app, overviewPanel) {
        if (cfg.get('addrType') === 0x6f) { // testnet
            $('#faucet').click(
                function (e) {
					var wallet = app.getWallet();
                    e.preventDefault();
                    if (!wallet) {
                        return;
                    }
                    $.ajax(
                        "http://devel.hz.udoidio.info/faucet",
                        {
                            type: 'POST',
                            data: { address: wallet.getCurAddress().toString() }
                        }
                    )
                        .done(function (data) {
							overviewPanel.hideTestnetWalletInfo();
                            alert('You got 1 testnet Bitcoin, transaction id: ' + data);
                        })
                        .fail(function (e) {
                            alert('Sorry, faucet failure:' + e.toString());
                        });
                }
            );
            overviewPanel.showTestnetWalletInfo();
        }
	};
	return {
		initialize: initialize
	};
});
