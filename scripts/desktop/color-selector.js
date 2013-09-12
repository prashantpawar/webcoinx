/*jslint */
/*global define*/
/*global document, Option */
/*
   ColorSelector handles the dropdown gui element for selecting bitcoin color
*/
define([
    "jquery"
], function ($) {
    "use strict";
    var makeColorSelector = function (allowedColors) {
        var api,
            CHANGE_EVENT = "change",
            color = '',
            colorName = 'BTC',
            getColor = function () {
                return color;
                //return $('#color_selector option:selected').val();
            },
            getColorName = function () {
                return colorName;
                //return $('#color_selector option:selected').text();
            },
            syncColorSelectors = function (colorId) {
                $('.color-selector').val(colorId);
            },
            init = function () {
                $('.color-selector').change(function () {
                    var $option = $("option:selected", $(this));
                    color = $option.val();
                    colorName = $option.text();
                    syncColorSelectors(color);
                    $(api).trigger(CHANGE_EVENT);
                });
            },
            setColors = function (d) {
                var sel = $('.color-selector');
                sel.empty();
                sel.append('<option value="">BTC</option>');
                var first = $.isEmptyObject(allowedColors);

                //first = true; // always reset

                function isgood(c) {
                    if (!first) {
                        if (allowedColors[c] !== true) {
                            return false;
                        }
                    } else {
                        allowedColors[c] = true;
                    }
                    return true;
                }

                var cms = $('#color_multiselect');
                cms.empty();

                var g = null;
                $(d).each(function () {
                    // flush optgroup
                    if (g && g.label !== this.server) {
                        g = null;
                    }

                    // new optgroup
                    if (!g) {
                        g = document.createElement('optgroup');
                        g.label = this.server;
                        cms.append(g);
                    }

                    // append option to current optgroup
                    g.appendChild(new Option(this.name, this.colorid,
                                             false, isgood(this.colorid)));

                    // dont proceed unless selected
                    if (!isgood(this.colorid)) {
                        return;
                    }

                    sel.append($('<option></option>')
                               .attr('value', this.colorid)
                               .text(this.name));
                });
                cms.multiselect('refresh');
            };
        init();
        api = {
            getColor: getColor,
            getColorName: getColorName,
            setColors: setColors
        };

        return api;
    };

    return {
        makeColorSelector: makeColorSelector
    };
});
