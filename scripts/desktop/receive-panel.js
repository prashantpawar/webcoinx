/*jslint */
/*global define*/

define([
    "jquery"
], function ($) {

	var api = {},
		render = function () {
			var html = new EJS({url: 'views/receive.ejs'}).render(),
				$dom = $(html);

			api.$el = $dom;
		};

	
	api.render = render;
	api.$el = undefined;

	return {
		makeReceivePanel: function () {
			return api;
		}
	};
});
