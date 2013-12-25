/*jslint */
/*global define */
/*global location */
define(["jquery"],
    function ($) {
    // Settings Dialog
        'use strict';
        var makeSettingsDialog = function (allowedColors, colordefServers, cfg, autoNumericBtc, reload_colors) {
            var cfgd = $('#dialog_settings'), i;
            $('#color_multiselect').multiselect().on('multiselectChange', function (evt, ui) {
                for (i = 0; i < ui.optionElements.length; i = i + 1) {
                    var c = ui.optionElements[i];
                    allowedColors[c.value] = ui.selected;
                    $('#colorUrl').val(c.parentElement.label);
                }
            });
            cfgd.bind('dialogopen', function (e) {
                // Populate fee field
                var fee = $.fn.autoNumeric.Format('dialog_settings_fee', cfg.get('fee'), autoNumericBtc);
                cfgd.find('#dialog_settings_fee').val(fee);

                // Populate exit node fields
                cfgd.find('#dialog_settings_exitNodeHost').val(cfg.get('exitNodeHost'));

                //        reload_colors();
                //              cfgd.find('#dialog_settings_colordefServers').val(cfg.get('colordefServers'));
            });


            cfgd.find('#addColorUrl').click(function (e) {
                var url = cfgd.find('#colorUrl').val();
                if (colordefServers.indexOf(url) !== -1) {
                    return;
                }
                colordefServers = colordefServers + ' ' + url;
                cfgd.find('#colorUrl').val('');
                reload_colors();
                return false;
            });

            cfgd.find('#delColorUrl').click(function (e) {
                colordefServers = colordefServers.replace(' ' + cfgd.find('#colorUrl').val(), '');
                cfgd.find('#colorUrl').val('');
                reload_colors();
                return false;
            });

            cfgd.find('.controls .save').click(function (e) {
                cfgd.dialog('close');

                var newSettings = {};

                newSettings.fee = +$.fn.autoNumeric.Strip("dialog_settings_fee");
                newSettings.exitNodeHost = cfgd.find('#dialog_settings_exitNodeHost').val();
                newSettings.allowedColors = allowedColors;
                newSettings.colordefServers = colordefServers;

                cfg.apply(newSettings);
                location.reload();
                return false;
            });
            cfgd.find('.controls .cancel').click(function (e) {
                cfgd.dialog('close');
                return false;
            });
            cfgd.dialog({
                dialogClass: "block withsidebar",
                autoOpen: false,
                minWidth: 600,
                minHeight: 488,
                resizable: false
            });

			$(".sidebar_content").hide();
			$("ul.sidemenu li:first-child").addClass("active").show();
			$(".block .sidebar_content:first").show();
			$("ul.sidemenu li").click(function () {
				var activeTab = $(this).find("a").attr("href");
				$(this).parent().find('li').removeClass("active");
				$(this).addClass("active");
				$(this).parents('.block').find(".sidebar_content").hide();
				$(activeTab).show();
				return false;
			});

            return {
                openDialog: function () {
                    cfgd.dialog('open');
                }
            };
        };
        return {
            makeSettingsDialog: makeSettingsDialog
        };
	});
