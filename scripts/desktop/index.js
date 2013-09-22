/*jslint vars: true, browser: true */
/*global setTimeout, alert, prompt, document, location, console */
/*global define, EJS, ZeroClipboard */
/*global Bitcoin, BigInteger, Crypto, Settings, Message, TransactionDatabase, Option */

// We have a lot of globals, I don't think this is the way to use require.js */
define([
    "jquery",
    "../walletmanager",
    "../exitnode",
    "desktop/transaction-view",
    "../bindings",
    "../colorman",
    "../p2ptrade/gui",
    "desktop/color-selector",
    "desktop/issue-panel",
    "desktop/overview-panel",
    "desktop/receive-panel",
    "desktop/send-panel",
    "desktop/testnet-handler",
    "desktop/transaction-panel",
    "desktop/settings-dialog",
    "desktop/main-page",
    "../wallets/miniwallet"
], function ($,
             WalletManager,
             ExitNode,
             TransactionView,
             setCommonBindings,
             ColorMan,
             P2pgui,
             ColorSelector,
             IssuePanel,
             OverviewPanel,
             ReceivePanel,
             SendPanel,
             TestnetHandler,
             TransactionPanel,
             SettingsDialog,
             MainPage,
             MiniWallet) {
    'use strict';
    var colorSelector,
        issuePanel,
        sendPanel,
        transactionPanel,
        settingsDialog;

    $(function () {
        MainPage.render();

        // Options for autoNumeric to render BTC amounts
        var autoNumericBtc = {
            aSign: "BTC ",
            mDec: 8,
            aPad: 2
        };

        var autoNumericColor = {
            vMin: '0',
            mDec: null
        };

        var cfg = new Settings();
        var wallet;
        var wm = new WalletManager();
        var txDb = new TransactionDatabase(); // Tx chain
        var txMem = new TransactionDatabase(); // Memory pool

        // Once wallet is loaded, we can connect to the exit node
        var allowedColors = cfg.get('allowedColors') || {};
        var exitNodeHost = cfg.get('exitNodeHost');
        var exitNodePort = cfg.get('exitNodePort');
        var exitNodeSecure = cfg.get('exitNodeSecure');
        var txView;
        var exitNode = new ExitNode(exitNodeHost, +exitNodePort, !!exitNodeSecure,
                                    txDb, txMem, txView);
        var colorMan = new ColorMan(exitNode);
        var colordefServers = cfg.get('colordefServers');

        txView = new TransactionView($('#main_tx_list'), colorMan);
        var pgui = null;
        $('#tabs').on('tabsactivate', function (event, ui) {
                          // yikes... .attr('href') doesn't work for some reason
                          if (!pgui && (ui.newPanel.attr('id') == "panel-p2ptrade")) { 
                              pgui = new P2pgui(wm, colorMan, exitNode, cfg);
                              var color = colorSelector.getColor()
                              pgui.setCurrentColor(color !== '' ? color : false, (color !== '') ? colorMan.cmap(color).unit.toString() : "1");
                          }
                      });

        var btcBalance;
        var BTC_COLOR = "";
        var BTC_UNIT = "BTC";

        var app = {
            getSettings: function () {
                return cfg;
            },
            getWallet : function () {
                return wallet;
            },
            getWalletManager: function () {
                return wm;
            },
            getColorMan: function () {
                return colorMan;
            },
            getColorDefServers: function () {
                return colordefServers;
            },
            getExitNode: function () {
                return exitNode;
            },
            getAllowedColors: function () {
                return allowedColors;
            },
            reloadColors: function () {} // implemented below
        };

        window.app = app; //For interactive experiments

        colorSelector = ColorSelector.makeColorSelector(allowedColors);

        var overviewPanel = OverviewPanel.makeOverviewPanel();

        if (!cfg.get('have_wallet')) {
            setTimeout(function () {
                wm.createWallet({
                    'type': 'mini',
                    'name': 'testing'
                });
                cfg.apply({have_wallet: 1});
            }, 300);
        }

        TestnetHandler.initialize(cfg, app, overviewPanel);

        MainPage.setConnectionInfo(exitNodeHost);

        function mangle_addr(addr) {
            var color = colorSelector.getColor(); // '' = BTC
            return color !== '' ? (color + '@' + addr) : addr;
        }

        function updateBalance() {
            var color = colorSelector.getColor(); // '' = BTC
            console.log('@@@@' + color);
            if (pgui)
                pgui.setCurrentColor(color !== '' ? color : false, (color !== '') ? colorMan.cmap(color).unit.toString() : "1");
            if (wallet.dirty > 0) {
                overviewPanel.showUpdatingBalance();
            } else {
                overviewPanel.hideUpdatingBalance();
            }
            var v = Bitcoin.Util.formatValue(colorMan.s2c(color, wallet.getBalance(color)));

            btcBalance = Bitcoin.Util.formatValue(colorMan.s2c(BTC_COLOR, wallet.getBalance(BTC_COLOR)));

            if (color) {
                // btc2color prevents rounding errors
                v = colorMan.btc2color(v, color);
                //                      autoNumericColor.aSign = colorSelector.getColorName() + ' ';
                //                      autoNumericColor.vMax = ''+v;
                console.log(autoNumericColor);
            }

            overviewPanel.setBalance(v, colorSelector.getColorName());
            overviewPanel.setBTCBalance(btcBalance, BTC_UNIT);

            $('.colorind').text(colorSelector.getColorName());

            var addr = wallet.getCurAddress().toString();
            overviewPanel.setAddress(mangle_addr(wallet.getCurAddress().toString()));
        }

        // UGLY UGLY UGLY UGLY
        function reload_colors() {
            colorMan.reloadColors(colordefServers, function () { // triggers colordefUpdate above
                colorMan.update(wm, function () {
                    $(wm).trigger('walletUpdate');
                });
            });
        }
        app.reloadColors = reload_colors;

        setCommonBindings(cfg, wm, txDb, txMem, txView, exitNode, colorMan);

        $(exitNode).bind('connectStatus', function (e) {
            console.log('connect', e);
            MainPage.setConnectionStatus(e.status);
        });

        $(exitNode).bind('txData txAdd txNotify', function (e) {
            updateBalance();
        });

        $(wm).bind('walletProgress', function (e) {
            overviewPanel.setWalletInitInfo("Creating wallet " + e.n + "/" + e.total);
        });

        $(wm).bind('walletInit', function (e) {
            overviewPanel.setWalletActiveState();
            wallet = e.newWallet.wallet;
            var addr = e.newWallet.wallet.getCurAddress().toString();
            overviewPanel.setAddress(addr);
        });

        $(wm).bind('walletDeinit', function (e) {
            overviewPanel.setWalletInitState();
        });

        // Load wallet if there is one
        wm.init();

        // Interface buttons
        $(overviewPanel).bind(overviewPanel.events.NEW_WALLET_CLICK, function (e) {
            if (prompt("WARNING: This action will make the application forget your current wallet. Unless you have the wallet backed up, this is final and means your balance will be lost forever!\n\nIF YOU ARE SURE, TYPE \"YES\".") === "YES") {
                wm.createWallet({
                    'type': 'mini',
                    'name': 'testing'
                });
            }
        });

        $(overviewPanel).bind(overviewPanel.events.NEW_ADDRESS_CLICK, function (e) {
            var addr = mangle_addr(wallet.getNextAddress().toString());
            overviewPanel.setAddress(addr);
            wm.save();
        });

        $(colorSelector).change(function () {
            updateBalance();
        });

        $(wm).bind('walletUpdate', function () {
            updateBalance();
        });

        $(colorMan).bind('colordefUpdate', function (e, d) {
            colorSelector.setColors(d);
        });

        issuePanel = IssuePanel.makeIssuePanel(app, cfg, wm, colorMan,
                                              colordefServers,
                                              allowedColors,
                                              exitNode, reload_colors);

        sendPanel = SendPanel.makeSendPanel(app, cfg, wm, colorMan,
                                            exitNode, colorSelector);

        transactionPanel = TransactionPanel.makeTransactionPanel();

        var receivePanel = ReceivePanel.makeReceivePanel(app);
        receivePanel.render();
        MainPage.attachPanel(receivePanel.$el);

        settingsDialog = SettingsDialog.makeSettingsDialog(allowedColors,
                               colordefServers,
                               cfg,
                               autoNumericBtc,
                               reload_colors);

        $(MainPage).bind(MainPage.events.SETTINGS_CLICK, function () {
            settingsDialog.openDialog();
            return false;
        });

    });
});
