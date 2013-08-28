/*jslint */
/*global define*/

define([
    "jquery",
	"desktop/add-color-dialog"
], function ($, 
			 AddColorDialog) {

	var api = {},
		application,
		$addColorButton,
		$colorCloneRow,
		addColorRow = function (color) {
			var newRow = $colorCloneRow.clone(),
				colorField = $('.receive-panel__color__name', newRow);
			colorField.text(color.name);
			newRow.show();
			$colorCloneRow.parent().append(newRow);
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
			// $(AddColorDialog).bind(AddColorDialog.COLOR_SELECT_EVENT,
			// addColorCallback);

			//addColorRow();
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
			$(AddColorDialog).bind(AddColorDialog.COLOR_SELECT_EVENT,
								   addColorCallback);

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
		makeReceivePanel: function (theApp) {
			application = theApp;
			return api;
		}
	};
});
