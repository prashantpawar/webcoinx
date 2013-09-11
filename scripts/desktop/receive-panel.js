/*jslint */
/*global define*/
/*global EJS, Bitcoin */
define([
    "jquery",
	"desktop/add-color-dialog"
], function ($,
			 AddColorDialog) {
	"use strict";

	// Color:
    //         colorid
    //          "4a1ae0cf40d33e733a380539dd7375c0acdd0db0"
    //         issues
    //          [Object { outindex=0, txhash="97f497fb1873c3897192570...402fec1ebf17dba25d4faa9"}]
    //          
    //         metahash
    //          "78fcb770ff733537d65e047aa773366c3154ecc4"
    //          
    //         metaprops
    //          ["unit"]
    //          
    //         name
    //          "c18:kryne"
    //          
    //         server
    //          "http://devel.hz.udoidio.info:8080/"
    //          
    //         style
    //          "genesis"
    //          
    //         unit
    //          "10000"
	var	colorAtWallet = function (colorId, walletAddress) {
		var adr = walletAddress;
		if (colorId) {
			adr = (colorId + '@' + walletAddress);
		}
		return adr;
	},
		updateBalanceForColor = function (application, colorObj, $colorInfoRow) {
			var colorMan = application.getColorMan(),
				wallet = application.getWallet(),
				colorId = colorObj.colorid,
				color = colorId,
				v,
				colorAddress = function () {
					var wallet = application.getWallet(),
						walletAddress = wallet.getCurAddress().toString();
					return colorAtWallet(colorId, walletAddress);
				},
				addr = colorAddress();

			if (wallet.dirty > 0) {
				v = '...'; //Progress indicator
			} else {
				v = Bitcoin.Util.formatValue(colorMan.s2c(color, wallet.getBalance(color)));
				if (color) {
					v = colorMan.btc2color(v, color);
				}
			}
			$('.color-table__color-balance', $colorInfoRow).text(v);
			$('.color-table__color-address-field', $colorInfoRow)
				.val(addr)
				.attr('title', addr);
		};

	var api = {},
		application,
		$dom,
		$addColorButton,
		$colorCloneRow,
		refreshColors = function () {
			$dom.find('.color-table__color').each(function () {
				var color = $(this).data('color');
				if (color) {
					updateBalanceForColor(application, color, $(this));
				}
			});
		},
		addColorRow = function (color) {
			var $newRow = $colorCloneRow.clone(),
				colorField = $('.color-table__color-name', $newRow);
			colorField.text(color.name);

			$newRow.show();
			$newRow.data('color', color);
			$colorCloneRow.parent().append($newRow);
			refreshColors();
		},
		addColorCallback = function () {
			var color = AddColorDialog.getColor();
			AddColorDialog.close();
			addColorRow(color);
		},
		addColorClick = function (evt) {
			evt.preventDefault();

			AddColorDialog.init(application).render();

			AddColorDialog.open();
		},
		hideClick = function (evt) {
			evt.preventDefault();
			$(this).closest('.color-table__color').remove();
		},
		initBindings = function () {
			$addColorButton.click(addColorClick);
			api.$el.on('click',
				'.color-table__color-hide-button',
				hideClick);
			$(AddColorDialog).bind(AddColorDialog.COLOR_SELECT_EVENT,
								   addColorCallback);
		},
		initAppBindings = function () {
			var walletManager = application.getWalletManager();
			$(walletManager).bind('walletUpdate', function (e) {
				refreshColors();
			});
		},
		render = function () {
			var html = new EJS({url: 'views/receive.ejs'}).render();

			$dom = $(html);
			$addColorButton = $('.color-table__add-color-button', $dom).button();
			$colorCloneRow = $('.color-table__clone-row', $dom);

			api.$el = $dom;

            $dom.on('focus', 
					'.color-table__color-address-field',
					function (e) {
						this.select();
					})
				.on('mouseup',
					'.color-table__color-address-field',
					function (e) {
						this.select();
						e.preventDefault();
					});

			addColorRow({
				name: "BTC",
				colorid: false
			});

			initBindings();
			initAppBindings();
		};

	api.render = render;
	api.$el = undefined;

	return {
		makeReceivePanel: function (theApp) {
			application = theApp;
			return api;
		}
	};
});
