/*jslint */
/*global define*/

define([
    "jquery"
], function ($) {

	var api = {},
		$addColorButton,
		$colorCloneRow,
		addColorRow = function () {
			var newRow = $colorCloneRow.clone().show();
			$colorCloneRow.parent().append(newRow);
		},
		addColorClick = function (evt) {
			evt.preventDefault();
			addColorRow();
		},
		hideClick = function (evt) {
			evt.preventDefault();
			$(this).closest('.receive-panel__color').remove();
		},
		initBindings = function () {
			$addColorButton.click(addColorClick);
			api.$el.on('click',
				'.receive-panel__color__hide-button',
				hideClick);
		},
		render = function () {
			var html = new EJS({url: 'views/receive.ejs'}).render(),
				$dom = $(html);

			$addColorButton = $('.receive-panel__add-color-button', $dom).button();
			$colorCloneRow = $('.receive-panel__clone-row', $dom);
			
			api.$el = $dom;

			initBindings();
		};
	
	api.render = render;
	api.$el = undefined;

	return {
		makeReceivePanel: function () {
			return api;
		}
	};
});
