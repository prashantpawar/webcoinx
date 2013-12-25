define(["jquery"], function ($) {
  return function (cfg, wm, txDb, txMem, txView, exitNode, colorman) {
    txView.setDatabase(txDb);
    txView.setMemPool(txMem);

    $(txDb).bind('update', function() {
    });

    $(cfg).bind('settingChange', function (e) {
      switch (e.key) {
      case 'exitNodeHost':
      case 'exitNodePort':
        exitNode.disconnect();
        exitNode.setSocket(cfg.get('exitNodeHost'),
                           cfg.get('exitNodePort'));
        exitNode.connect();
        break;
/*      case 'colordefServers':
      case 'allowedColors':
        colorman.reloadColors(cfg.get('colordefServers'), function() {
		colorman.update(wm, function() {
			$(wm).trigger('walletUpdate');
		});
        });*/
        break;
      }
    });

    $(wm).bind('walletInit', function (e) {
      txView.setWallet(e.newWallet.wallet);
      // first load colors, then connect the wallet
      colorman.reloadColors(cfg.get('colordefServers'), function() {
      		exitNode.connect(e.newWallet.wallet);
	});
    });

    $(wm).bind('walletDeinit', function (e) {
      txDb.clear();
      txMem.clear();
      if (e.oldWallet) {
        e.oldWallet.wallet.clearTransactions();
      }
      exitNode.disconnect();
    });

    $(exitNode).bind('blockInit blockAdd blockRevoke', function (e) {
      txView.setBlockHeight(e.height);
    });

      $(exitNode).bind(
          'txData',
          function (e) {
              console.log('ev txdata');
              var wallet = null;
              if (wm.activeWallet)
                  wallet = wm.activeWallet.wallet;
              if (wallet) {
                  wallet.dirty += 1;
                  for (var i = 0; i < e.txs.length; i++) {
                      wallet.process(e.txs[i]);
                  }
                  $(wm).trigger('walletUpdate');
                  colorman.update(
                      wm,
                      function() {
                          wallet.dirty -= 1;
                          $(wm).trigger('walletUpdate');
                          var db = e.confirmed ? txDb : txMem;
                          
                          function doit () {
                              var tx = e.txs.shift();
                              if (!tx) {
      		                  $(db).trigger('update');
		                  return;
	                      }
	                      colorman.txcolor(
                                  tx.hash,
                                  function(c) {
                                      tx.color = c;
                                      db.addTransactionNoUpdate(tx);
                                      return doit();
                                  });
                          } 
                          doit();
                      });
              }
          });

    $(exitNode).bind('txAdd', function (e) {
      console.log('ev txAdd', e);
      colorman.txcolor(e.tx.hash, function(c) {
       e.tx.color = c;
       txDb.addTransaction(e.tx);
       txMem.removeTransaction(e.tx.hash); 
      });
    });

    $(exitNode).bind('txNotify', function (e) {
      console.log('ev txNotify', e);
      if (wm.activeWallet) {
        wm.activeWallet.wallet.process(e.tx);
      }
      colorman.update(wm, function() {
          $(wm).trigger('walletUpdate');
      });
      colorman.txcolor(e.tx.hash, function(c) {
       e.tx.color = c;
       txMem.addTransaction(e.tx);
      });
});

  };
});
