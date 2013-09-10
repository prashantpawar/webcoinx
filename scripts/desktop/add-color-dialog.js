/*jslint */
/*global define*/
define([
    "jquery"
], function ($) {
 
    var api = {},
		COLOR_SELECT_EVENT = 'color-select',
		colorNames,
		colorByName,
        $dom,
        //$colorList,
        $searchField,
		$addButton,
        application,
		validate = function () {
			//Returns name true if OK, or false
			name = $searchField.val();
			return colorByName.hasOwnProperty(name) && name;
		},
		getColor = function () {
			var name = validate();
			return (name && colorByName[name]);
		},
		addButtonClick = function (evt) {
			if (validate()) {
				$(api).trigger(COLOR_SELECT_EVENT, getColor());
			}
		},
        renderShowAllButton = function () {
            $showAllButton
                .attr( "tabIndex", -1 )
                .attr( "title", "Show All Items" )
                .tooltip()
                .button({
                    icons: {
                        primary: "ui-icon-triangle-1-s"
                    },
                    text: false
                })
                .removeClass( "ui-corner-all" )
                .addClass( "custom-combobox-toggle ui-corner-right" )
                .mousedown(function() {
                    wasOpen = $searchField.autocomplete( "widget" ).is( ":visible" );
                })
                .click(function() {
                    $searchField.focus();
                    
                    // Close if already visible
                    if ( wasOpen ) {
                        return;
                    }
                    // Pass empty string as value to search for, displaying all results
                    $searchField.autocomplete( "search", "" );
                });
        },
        render = function () {
			if ($dom) {
				return api;
			}
            var html = new EJS({url: 'views/add-color.ejs'}).render();
            $dom = $(html);

            //$colorList= $dom.find('.add-color-dialog__color-list');
            $searchField= $dom.find('.add-color-dialog__search-field');
            $showAllButton = $dom.find('.add-color-dialog__show-all-button');
            $addButton = $dom.find('.add-color-dialog__add-button');
			$addButton.button();
			$addButton.click(addButtonClick);
            renderShowAllButton();
            api.$el = $dom;
            $dom.hide().appendTo('body');
            return api;
        },
        setColors = function (colorDefsList) {
            //console.log("Set Colors", colorDefsList);
			//window.colors = colorDefsList; //TEMP TEMP 

            colorNames = [];
			colorByName = {};
            $.each(colorDefsList, function (idx, el) {
                // $('<option>')
                //  .html(el.name)
                //  .appendTo($colorList);
                colorNames.push(el.name);
				colorByName[el.name] = el;
            });
            $searchField.autocomplete({
                source:colorNames,
                delay: 0,
                minLength: 0
            });
        },
		colorDefCallback = function (e, d) {
            setColors(d);
        },
        startGetColors = function () {
            var colorMan = application.getColorMan(),
                servers = application.getColorDefServers(),
                callback = function () {};
            $(colorMan).bind('colordefUpdate', colorDefCallback);
            colorMan.reloadColors(servers, callback);
        },
        init = function (app) {
            application = app;
            startGetColors();
            return api;
        },
        open = function () {
            setTimeout(function () {
                $dom.dialog();
            }, 10);
        },
		close = function () {
			$dom.dialog('close');
		};

	api.COLOR_SELECT_EVENT = COLOR_SELECT_EVENT;
	api.getColor = getColor;
    api.render = render;
    api.open = open;
	api.close = close;
    api.init = init;
    api.$el = undefined;
    return api;
});
