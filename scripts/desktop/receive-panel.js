/*jslint */
/*global define*/

define([
    "jquery",
	"desktop/add-color-dialog"
], function ($, 
			 AddColorDialog) {

    var updateBalanceForColor = function (application, colorObj, $colorInfoRow) {
		var colorMan = application.getColorMan(),
			wallet = application.getWallet(),
			colorId = colorObj.colorid,
			color = colorId,
			v;
        if (wallet.dirty > 0) {
            v = '...'; //Progress indicator
        } else {
            v = Bitcoin.Util.formatValue(colorMan.s2c(color, wallet.getBalance(color)));
            if (color) {
                v = colorMan.btc2color(v, color);
            }
        }
        $('.color-table__color-balance', $colorInfoRow).text(v);
    };

	var api = {},
		application,
		$dom,
		$addColorButton,
		$colorCloneRow,
		refreshColors = function () {
			$dom.find('.color-table__color').each(function () {
				color = $(this).data('color');
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

			bitcoinColor = {
				name: "BTC",
				colorid: false
			};
			addColorRow(bitcoinColor);

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
