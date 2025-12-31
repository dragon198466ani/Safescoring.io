-- ============================================================
-- UPDATE PRODUCT URLs - URLs officielles pour TOUS les produits
-- ============================================================
-- Exécuter dans Supabase SQL Editor
-- Ce script met à jour la colonne 'url' de la table 'products'
-- ============================================================

-- ============================================================
-- HARDWARE WALLETS - Cold Storage
-- ============================================================

UPDATE products SET url = 'https://www.ledger.com' WHERE slug = 'ledger-nano-x' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.ledger.com' WHERE slug = 'ledger-nano-s' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.ledger.com' WHERE slug = 'ledger-nano-s-plus' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.ledger.com' WHERE slug = 'ledger-stax' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.ledger.com' WHERE slug = 'ledger-flex' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://trezor.io' WHERE slug = 'trezor-model-t' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://trezor.io' WHERE slug = 'trezor-model-one' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://trezor.io' WHERE slug = 'trezor-safe-3' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://trezor.io' WHERE slug = 'trezor-safe-5' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://trezor.io' WHERE slug = 'trezor-keep-solana' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://coldcard.com' WHERE slug = 'coldcard-mk4' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://coldcard.com' WHERE slug = 'coldcard-mk3' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://coldcard.com' WHERE slug = 'coldcard-q' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://shiftcrypto.ch' WHERE slug = 'bitbox02' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://shiftcrypto.ch' WHERE slug = 'bitbox02-btc-only' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://keyst.one' WHERE slug = 'keystone-pro' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://keyst.one' WHERE slug = 'keystone-3-pro' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://keyst.one' WHERE slug = 'keystone-essential' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://foundation.xyz' WHERE slug = 'foundation-passport' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://foundation.xyz' WHERE slug = 'passport' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://gridplus.io' WHERE slug = 'gridplus-lattice1' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://tangem.com' WHERE slug = 'tangem-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://tangem.com' WHERE slug = 'tangem' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://dcentwallet.com' WHERE slug = 'dcent-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://dcentwallet.com' WHERE slug = 'd-cent-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://secuxtech.com' WHERE slug = 'secux-v20' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://secuxtech.com' WHERE slug = 'secux-w20' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://secuxtech.com' WHERE slug = 'secux-w10' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.ellipal.com' WHERE slug = 'ellipal-titan' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.ellipal.com' WHERE slug = 'ellipal-titan-2-0' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.coolwallet.io' WHERE slug = 'coolwallet-pro' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.coolwallet.io' WHERE slug = 'coolwallet-s' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.keepkey.com' WHERE slug = 'keepkey' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.getarculus.com' WHERE slug = 'arculus-card' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://cobo.com' WHERE slug = 'cobo-vault-pro' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://cobo.com' WHERE slug = 'cobo-vault' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://safepal.com' WHERE slug = 'safepal-s1' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://safepal.com' WHERE slug = 'safepal-x1' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://bc-vault.com' WHERE slug = 'bc-vault' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://opendime.com' WHERE slug = 'opendime' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://ngrave.io' WHERE slug = 'ngrave-zero' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://ngrave.io' WHERE slug = 'ngrave' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://airgap.it' WHERE slug = 'airgap-vault' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://airgap.it' WHERE slug = 'airgap-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://seedsigner.com' WHERE slug = 'seedsigner' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://specter.solutions' WHERE slug = 'specter-diy' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.blockstream.com/jade/' WHERE slug = 'blockstream-jade' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.blockstream.com/jade/' WHERE slug = 'jade' AND (url IS NULL OR url = '');

-- ============================================================
-- SOFTWARE WALLETS - Browser Extensions
-- ============================================================

UPDATE products SET url = 'https://metamask.io' WHERE slug = 'metamask' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://rabby.io' WHERE slug = 'rabby-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://rabby.io' WHERE slug = 'rabby' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://phantom.app' WHERE slug = 'phantom-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://phantom.app' WHERE slug = 'phantom' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://rainbow.me' WHERE slug = 'rainbow' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://rainbow.me' WHERE slug = 'rainbow-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.coinbase.com/wallet' WHERE slug = 'coinbase-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://frame.sh' WHERE slug = 'frame' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://frame.sh' WHERE slug = 'frame-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://zerion.io' WHERE slug = 'zerion' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://zerion.io' WHERE slug = 'zerion-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://brave.com/wallet/' WHERE slug = 'brave-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.opera.com/crypto' WHERE slug = 'opera-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.enkrypt.com' WHERE slug = 'enkrypt' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.xdefi.io' WHERE slug = 'xdefi' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.xdefi.io' WHERE slug = 'xdefi-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://taho.xyz' WHERE slug = 'taho' AND (url IS NULL OR url = '');

-- ============================================================
-- SOFTWARE WALLETS - Mobile
-- ============================================================

UPDATE products SET url = 'https://trustwallet.com' WHERE slug = 'trust-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.exodus.com' WHERE slug = 'exodus' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.exodus.com' WHERE slug = 'exodus-mobile' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.argent.xyz' WHERE slug = 'argent' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.argent.xyz' WHERE slug = 'argent-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.argent.xyz' WHERE slug = 'argent-x' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://bluewallet.io' WHERE slug = 'bluewallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://bluewallet.io' WHERE slug = 'blue-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://solflare.com' WHERE slug = 'solflare' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://backpack.app' WHERE slug = 'backpack-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://backpack.app' WHERE slug = 'backpack' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.keplr.app' WHERE slug = 'keplr-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.keplr.app' WHERE slug = 'keplr' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://templewallet.com' WHERE slug = 'temple-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://templewallet.com' WHERE slug = 'temple' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://petra.app' WHERE slug = 'petra-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://petra.app' WHERE slug = 'petra' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://martianwallet.xyz' WHERE slug = 'martian-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://martianwallet.xyz' WHERE slug = 'martian' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.okx.com/web3' WHERE slug = 'okx-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://coin98.com' WHERE slug = 'coin98-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://coin98.com' WHERE slug = 'coin98' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://braavos.app' WHERE slug = 'braavos-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://braavos.app' WHERE slug = 'braavos' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://token.im' WHERE slug = 'imtoken' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.tokenpocket.pro' WHERE slug = 'tokenpocket' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.tokenpocket.pro' WHERE slug = 'token-pocket' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://mathwallet.org' WHERE slug = 'math-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://mathwallet.org' WHERE slug = 'mathwallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://atomicwallet.io' WHERE slug = 'atomic-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.coinomi.com' WHERE slug = 'coinomi' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://guarda.com' WHERE slug = 'guarda-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://guarda.com' WHERE slug = 'guarda' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://edge.app' WHERE slug = 'edge-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://edge.app' WHERE slug = 'edge' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://enjin.io/products/wallet' WHERE slug = 'enjin-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://unstoppable.money' WHERE slug = 'unstoppable-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://pillarproject.io' WHERE slug = 'pillar-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://status.im' WHERE slug = 'status' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://status.im' WHERE slug = 'status-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.samouraiwallet.com' WHERE slug = 'samourai-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.samouraiwallet.com' WHERE slug = 'samourai' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://muun.com' WHERE slug = 'muun' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://muun.com' WHERE slug = 'muun-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://breez.technology' WHERE slug = 'breez' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://phoenix.acinq.co' WHERE slug = 'phoenix' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://phoenix.acinq.co' WHERE slug = 'phoenix-wallet' AND (url IS NULL OR url = '');

-- ============================================================
-- SOFTWARE WALLETS - Desktop
-- ============================================================

UPDATE products SET url = 'https://electrum.org' WHERE slug = 'electrum' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://sparrowwallet.com' WHERE slug = 'sparrow-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://sparrowwallet.com' WHERE slug = 'sparrow' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://bitcoin.org' WHERE slug = 'bitcoin-core' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://wasabiwallet.io' WHERE slug = 'wasabi-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://wasabiwallet.io' WHERE slug = 'wasabi' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.ledger.com/ledger-live' WHERE slug = 'ledger-live' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://trezor.io/trezor-suite' WHERE slug = 'trezor-suite' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://specter.solutions' WHERE slug = 'specter-desktop' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://nunchuk.io' WHERE slug = 'nunchuk' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://electrum.org' WHERE slug = 'electrum-multisig' AND (url IS NULL OR url = '');

-- ============================================================
-- MPC WALLETS
-- ============================================================

UPDATE products SET url = 'https://zengo.com' WHERE slug = 'zengo' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://zengo.com' WHERE slug = 'zengo-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.fireblocks.com' WHERE slug = 'fireblocks' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.fireblocks.com' WHERE slug = 'fireblocks-mpc' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.coinbase.com/cloud/products/waas' WHERE slug = 'coinbase-waas' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.dfns.co' WHERE slug = 'dfns' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.liminalcustody.com' WHERE slug = 'liminal' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.fordefi.com' WHERE slug = 'fordefi' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.qredo.com' WHERE slug = 'qredo' AND (url IS NULL OR url = '');

-- ============================================================
-- MULTISIG WALLETS
-- ============================================================

UPDATE products SET url = 'https://safe.global' WHERE slug = 'safe' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://safe.global' WHERE slug = 'gnosis-safe' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://keys.casa' WHERE slug = 'casa' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://unchained.com' WHERE slug = 'unchained' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://unchained.com' WHERE slug = 'unchained-capital' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://unchained.com/vaults/' WHERE slug = 'caravan' AND (url IS NULL OR url = '');

-- ============================================================
-- SMART WALLETS / ACCOUNT ABSTRACTION
-- ============================================================

UPDATE products SET url = 'https://sequence.xyz' WHERE slug = 'sequence' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://sequence.xyz' WHERE slug = 'sequence-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://privy.io' WHERE slug = 'privy' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.biconomy.io' WHERE slug = 'biconomy' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://zerodev.app' WHERE slug = 'zerodev' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://stackup.sh' WHERE slug = 'stackup' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.alchemy.com/account-kit' WHERE slug = 'alchemy-account-kit' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.pimlico.io' WHERE slug = 'pimlico' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.candide.dev' WHERE slug = 'candide' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://obvious.technology' WHERE slug = 'obvious-wallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://obvious.technology' WHERE slug = 'obvious' AND (url IS NULL OR url = '');

-- ============================================================
-- BACKUP SOLUTIONS - Physical
-- ============================================================

UPDATE products SET url = 'https://cryptosteel.com' WHERE slug = 'cryptosteel-capsule' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://cryptosteel.com' WHERE slug = 'cryptosteel' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://billfodl.com' WHERE slug = 'billfodl' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.blockplate.com' WHERE slug = 'blockplate' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://steelwallet.com' WHERE slug = 'steelwallet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://hodlr.swiss' WHERE slug = 'hodlr-swiss' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://cobo.com/hardware-wallet/cobo-tablet' WHERE slug = 'cobo-tablet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://coldti.com' WHERE slug = 'coldti' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://cryptotag.io' WHERE slug = 'cryptotag-thor' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://cryptotag.io' WHERE slug = 'cryptotag' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://coldbit.com' WHERE slug = 'coldbit-steel' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://simbit.io' WHERE slug = 'simbit' AND (url IS NULL OR url = '');

-- ============================================================
-- BACKUP SOLUTIONS - Digital
-- ============================================================

UPDATE products SET url = 'https://1password.com' WHERE slug = '1password' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://bitwarden.com' WHERE slug = 'bitwarden' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://keepersecurity.com' WHERE slug = 'keeper' AND (url IS NULL OR url = '');

-- ============================================================
-- CENTRALIZED EXCHANGES (CEX)
-- ============================================================

UPDATE products SET url = 'https://www.binance.com' WHERE slug = 'binance' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.coinbase.com' WHERE slug = 'coinbase' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.kraken.com' WHERE slug = 'kraken' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.okx.com' WHERE slug = 'okx' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bybit.com' WHERE slug = 'bybit' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://crypto.com' WHERE slug = 'crypto-com' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://crypto.com' WHERE slug = 'cryptocom' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bitstamp.net' WHERE slug = 'bitstamp' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.gemini.com' WHERE slug = 'gemini' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.gate.io' WHERE slug = 'gate-io' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.gate.io' WHERE slug = 'gateio' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.mexc.com' WHERE slug = 'mexc' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.htx.com' WHERE slug = 'htx' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.htx.com' WHERE slug = 'huobi' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bitfinex.com' WHERE slug = 'bitfinex' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://upbit.com' WHERE slug = 'upbit' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bithumb.com' WHERE slug = 'bithumb' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://robinhood.com' WHERE slug = 'robinhood' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://robinhood.com' WHERE slug = 'robinhood-crypto' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.etoro.com' WHERE slug = 'etoro' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://swissborg.com' WHERE slug = 'swissborg' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.youhodler.com' WHERE slug = 'youhodler' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.kucoin.com' WHERE slug = 'kucoin' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bitget.com' WHERE slug = 'bitget' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.coinex.com' WHERE slug = 'coinex' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.lbank.com' WHERE slug = 'lbank' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://whitebit.com' WHERE slug = 'whitebit' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bitmart.com' WHERE slug = 'bitmart' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://poloniex.com' WHERE slug = 'poloniex' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bitvavo.com' WHERE slug = 'bitvavo' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bitpanda.com' WHERE slug = 'bitpanda' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.phemex.com' WHERE slug = 'phemex' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.deribit.com' WHERE slug = 'deribit' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bingx.com' WHERE slug = 'bingx' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.hashkey.com' WHERE slug = 'hashkey' AND (url IS NULL OR url = '');

-- ============================================================
-- DECENTRALIZED EXCHANGES (DEX)
-- ============================================================

UPDATE products SET url = 'https://uniswap.org' WHERE slug = 'uniswap' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://curve.fi' WHERE slug = 'curve' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://curve.fi' WHERE slug = 'curve-finance' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://pancakeswap.finance' WHERE slug = 'pancakeswap' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.sushi.com' WHERE slug = 'sushiswap' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.sushi.com' WHERE slug = 'sushi' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://dydx.exchange' WHERE slug = 'dydx' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://jup.ag' WHERE slug = 'jupiter' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://raydium.io' WHERE slug = 'raydium' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.orca.so' WHERE slug = 'orca' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://traderjoexyz.com' WHERE slug = 'trader-joe' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://traderjoexyz.com' WHERE slug = 'traderjoe' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://camelot.exchange' WHERE slug = 'camelot' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://camelot.exchange' WHERE slug = 'camelot-dex' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://velodrome.finance' WHERE slug = 'velodrome' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://aerodrome.finance' WHERE slug = 'aerodrome' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://spooky.fi' WHERE slug = 'spookyswap' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://quickswap.exchange' WHERE slug = 'quickswap' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://biswap.org' WHERE slug = 'biswap' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://dodoex.io' WHERE slug = 'dodo' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://kyberswap.com' WHERE slug = 'kyberswap' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://osmosis.zone' WHERE slug = 'osmosis' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://astroport.fi' WHERE slug = 'astroport' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://balancer.fi' WHERE slug = 'balancer' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://maverick.xyz' WHERE slug = 'maverick' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://app.thena.fi' WHERE slug = 'thena' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://mute.io' WHERE slug = 'mute' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://syncswap.xyz' WHERE slug = 'syncswap' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://izumi.finance' WHERE slug = 'izumi' AND (url IS NULL OR url = '');

-- ============================================================
-- DEX AGGREGATORS
-- ============================================================

UPDATE products SET url = 'https://1inch.io' WHERE slug = '1inch' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://paraswap.io' WHERE slug = 'paraswap' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://matcha.xyz' WHERE slug = 'matcha' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://cow.fi' WHERE slug = 'cowswap' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://cow.fi' WHERE slug = 'cow-protocol' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://openocean.finance' WHERE slug = 'openocean' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://kyberswap.com' WHERE slug = 'kyberswap-aggregator' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://odos.xyz' WHERE slug = 'odos' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bebop.xyz' WHERE slug = 'bebop' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://hashflow.com' WHERE slug = 'hashflow' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.firebird.finance' WHERE slug = 'firebird' AND (url IS NULL OR url = '');

-- ============================================================
-- ATOMIC SWAPS / CROSS-CHAIN DEX
-- ============================================================

UPDATE products SET url = 'https://thorchain.org' WHERE slug = 'thorchain' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://komodoplatform.com' WHERE slug = 'komodo' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://atomicdex.io' WHERE slug = 'atomicdex' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.chainflip.io' WHERE slug = 'chainflip' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.mayaprotocol.com' WHERE slug = 'maya-protocol' AND (url IS NULL OR url = '');

-- ============================================================
-- P2P / OTC TRADING
-- ============================================================

UPDATE products SET url = 'https://paxful.com' WHERE slug = 'paxful' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://bisq.network' WHERE slug = 'bisq' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://hodlhodl.com' WHERE slug = 'hodl-hodl' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://hodlhodl.com' WHERE slug = 'hodlhodl' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.binance.com/en/p2p' WHERE slug = 'binance-p2p' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.okx.com/p2p' WHERE slug = 'okx-p2p' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://remitano.com' WHERE slug = 'remitano' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://agoradesk.com' WHERE slug = 'agoradesk' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://noones.com' WHERE slug = 'noones' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://localbitcoins.com' WHERE slug = 'localbitcoins' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://localcoinswap.com' WHERE slug = 'localcoinswap' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://peachbitcoin.com' WHERE slug = 'peach-bitcoin' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://robosats.com' WHERE slug = 'robosats' AND (url IS NULL OR url = '');

-- ============================================================
-- NFT MARKETPLACES
-- ============================================================

UPDATE products SET url = 'https://opensea.io' WHERE slug = 'opensea' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://blur.io' WHERE slug = 'blur' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://magiceden.io' WHERE slug = 'magic-eden' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://magiceden.io' WHERE slug = 'magiceden' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://looksrare.org' WHERE slug = 'looksrare' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://x2y2.io' WHERE slug = 'x2y2' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.tensor.trade' WHERE slug = 'tensor' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://foundation.app' WHERE slug = 'foundation' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://rarible.com' WHERE slug = 'rarible' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://superrare.com' WHERE slug = 'superrare' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://niftygateway.com' WHERE slug = 'nifty-gateway' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.ordinals.com' WHERE slug = 'ordinals' AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - LENDING PROTOCOLS
-- ============================================================

UPDATE products SET url = 'https://aave.com' WHERE slug = 'aave' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://compound.finance' WHERE slug = 'compound' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://makerdao.com' WHERE slug = 'makerdao' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://makerdao.com' WHERE slug = 'maker' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://sparkprotocol.io' WHERE slug = 'spark-protocol' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://sparkprotocol.io' WHERE slug = 'spark' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://venus.io' WHERE slug = 'venus' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://benqi.fi' WHERE slug = 'benqi' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://morpho.org' WHERE slug = 'morpho' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://radiant.capital' WHERE slug = 'radiant' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.silo.finance' WHERE slug = 'silo' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://euler.finance' WHERE slug = 'euler' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://liquity.org' WHERE slug = 'liquity' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.prismafinance.com' WHERE slug = 'prisma' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://notional.finance' WHERE slug = 'notional' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://alchemix.fi' WHERE slug = 'alchemix' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.alpacafinance.org' WHERE slug = 'alpaca-finance' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://abracadabra.money' WHERE slug = 'abracadabra' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.inverse.finance' WHERE slug = 'inverse-finance' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://sommelier.finance' WHERE slug = 'sommelier' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.creamfinance.com' WHERE slug = 'cream' AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - YIELD AGGREGATORS
-- ============================================================

UPDATE products SET url = 'https://yearn.fi' WHERE slug = 'yearn' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://yearn.fi' WHERE slug = 'yearn-finance' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://beefy.com' WHERE slug = 'beefy' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://beefy.com' WHERE slug = 'beefy-finance' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.convexfinance.com' WHERE slug = 'convex' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.convexfinance.com' WHERE slug = 'convex-finance' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://harvest.finance' WHERE slug = 'harvest' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://harvest.finance' WHERE slug = 'harvest-finance' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://concentrator.aladdin.club' WHERE slug = 'concentrator' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://aura.finance' WHERE slug = 'aura' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://aura.finance' WHERE slug = 'aura-finance' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.stakedao.org' WHERE slug = 'stakedao' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://badger.com' WHERE slug = 'badger' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.pendle.finance' WHERE slug = 'pendle' AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - LIQUID STAKING
-- ============================================================

UPDATE products SET url = 'https://lido.fi' WHERE slug = 'lido' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://lido.fi' WHERE slug = 'lido-finance' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://rocketpool.net' WHERE slug = 'rocket-pool' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://rocketpool.net' WHERE slug = 'rocketpool' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.coinbase.com/cbeth' WHERE slug = 'cbeth' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.frax.finance' WHERE slug = 'frax-eth' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.ankr.com' WHERE slug = 'ankr' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://swellnetwork.io' WHERE slug = 'swell' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://swellnetwork.io' WHERE slug = 'swell-network' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://staderlabs.com' WHERE slug = 'stader' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://staderlabs.com' WHERE slug = 'stader-labs' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.stakewise.io' WHERE slug = 'stakewise' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://mantle.xyz/meth' WHERE slug = 'mantle-lsd' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.originstory.xyz' WHERE slug = 'origin-ether' AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - RESTAKING
-- ============================================================

UPDATE products SET url = 'https://www.eigenlayer.xyz' WHERE slug = 'eigenlayer' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://symbiotic.fi' WHERE slug = 'symbiotic' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://karak.network' WHERE slug = 'karak' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://ether.fi' WHERE slug = 'etherfi' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://ether.fi' WHERE slug = 'ether-fi' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.renzoprotocol.com' WHERE slug = 'renzo' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.renzoprotocol.com' WHERE slug = 'renzo-protocol' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.puffer.fi' WHERE slug = 'puffer' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.puffer.fi' WHERE slug = 'puffer-finance' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://kelpdao.xyz' WHERE slug = 'kelp-dao' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://kelpdao.xyz' WHERE slug = 'kelp' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://bedrock.rockx.com' WHERE slug = 'bedrock' AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - PERPETUALS / DERIVATIVES
-- ============================================================

UPDATE products SET url = 'https://gmx.io' WHERE slug = 'gmx' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://gains.trade' WHERE slug = 'gains-network' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://gains.trade' WHERE slug = 'gtrade' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://synthetix.io' WHERE slug = 'synthetix' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.kwenta.io' WHERE slug = 'kwenta' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://perp.com' WHERE slug = 'perpetual-protocol' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.vertex.fi' WHERE slug = 'vertex' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://hyperliquid.xyz' WHERE slug = 'hyperliquid' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.drift.trade' WHERE slug = 'drift' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://mux.network' WHERE slug = 'mux-protocol' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.hlp.finance' WHERE slug = 'hlp' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://app.level.finance' WHERE slug = 'level-finance' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://apollox.finance' WHERE slug = 'apollox' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://rabbitx.io' WHERE slug = 'rabbitx' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.aevo.xyz' WHERE slug = 'aevo' AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - OPTIONS
-- ============================================================

UPDATE products SET url = 'https://www.dopex.io' WHERE slug = 'dopex' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.lyra.finance' WHERE slug = 'lyra' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.opyn.co' WHERE slug = 'opyn' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.hegic.co' WHERE slug = 'hegic' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.premia.finance' WHERE slug = 'premia' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.ribbon.finance' WHERE slug = 'ribbon' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.thetanuts.finance' WHERE slug = 'thetanuts' AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - BRIDGES
-- ============================================================

UPDATE products SET url = 'https://layerzero.network' WHERE slug = 'layerzero' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://wormhole.com' WHERE slug = 'wormhole' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://stargate.finance' WHERE slug = 'stargate' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://across.to' WHERE slug = 'across' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://across.to' WHERE slug = 'across-protocol' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://hop.exchange' WHERE slug = 'hop' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://hop.exchange' WHERE slug = 'hop-protocol' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://synapseprotocol.com' WHERE slug = 'synapse' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://axelar.network' WHERE slug = 'axelar' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://cbridge.celer.network' WHERE slug = 'celer' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://cbridge.celer.network' WHERE slug = 'cbridge' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.connext.network' WHERE slug = 'connext' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://socket.tech' WHERE slug = 'socket' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://li.fi' WHERE slug = 'lifi' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://li.fi' WHERE slug = 'li-fi' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://debridge.finance' WHERE slug = 'debridge' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.orbiter.finance' WHERE slug = 'orbiter' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.orbiter.finance' WHERE slug = 'orbiter-finance' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://multichain.org' WHERE slug = 'multichain' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://portal.wormhole.com' WHERE slug = 'portal' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://app.hyperlane.xyz' WHERE slug = 'hyperlane' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.chainlink.com/ccip' WHERE slug = 'chainlink-ccip' AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - CROSS-CHAIN AGGREGATORS
-- ============================================================

UPDATE products SET url = 'https://li.fi' WHERE slug = 'li-fi-aggregator' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://socket.tech' WHERE slug = 'socket-aggregator' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.squidrouter.com' WHERE slug = 'squid' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.squidrouter.com' WHERE slug = 'squid-router' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://bungee.exchange' WHERE slug = 'bungee' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://rango.exchange' WHERE slug = 'rango' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://rango.exchange' WHERE slug = 'rango-exchange' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://xy.finance' WHERE slug = 'xy-finance' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://via.exchange' WHERE slug = 'via-protocol' AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - INSURANCE
-- ============================================================

UPDATE products SET url = 'https://nexusmutual.io' WHERE slug = 'nexus-mutual' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://insurace.io' WHERE slug = 'insurace' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://unslashed.finance' WHERE slug = 'unslashed' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.riskharbor.com' WHERE slug = 'risk-harbor' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://neptunemutual.com' WHERE slug = 'neptune-mutual' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://ease.org' WHERE slug = 'ease' AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - PREDICTION MARKETS
-- ============================================================

UPDATE products SET url = 'https://polymarket.com' WHERE slug = 'polymarket' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://augur.net' WHERE slug = 'augur' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://gnosis.io' WHERE slug = 'gnosis' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://azuro.org' WHERE slug = 'azuro' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://overtimemarkets.xyz' WHERE slug = 'overtime' AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - STREAMING PAYMENTS
-- ============================================================

UPDATE products SET url = 'https://www.superfluid.finance' WHERE slug = 'superfluid' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://sablier.com' WHERE slug = 'sablier' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://llamapay.io' WHERE slug = 'llamapay' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.drips.network' WHERE slug = 'drips' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://zebec.io' WHERE slug = 'zebec' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://streamflow.finance' WHERE slug = 'streamflow' AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - INTENT PROTOCOLS
-- ============================================================

UPDATE products SET url = 'https://cow.fi' WHERE slug = 'cow-protocol' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://uniswap.org' WHERE slug = 'uniswapx' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://1inch.io/fusion/' WHERE slug = '1inch-fusion' AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - LIQUIDITY LOCKERS
-- ============================================================

UPDATE products SET url = 'https://uncx.network' WHERE slug = 'unicrypt' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.team.finance' WHERE slug = 'team-finance' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.pinksale.finance' WHERE slug = 'pinklock' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://mudra.website' WHERE slug = 'mudra' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://trustswap.com' WHERE slug = 'trustswap' AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - TOKEN VESTING
-- ============================================================

UPDATE products SET url = 'https://hedgey.finance' WHERE slug = 'hedgey' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.magna.so' WHERE slug = 'magna' AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - LAUNCHPADS
-- ============================================================

UPDATE products SET url = 'https://www.binance.com/en/launchpad' WHERE slug = 'binance-launchpad' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://coinlist.co' WHERE slug = 'coinlist' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://daomaker.com' WHERE slug = 'dao-maker' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://polkastarter.com' WHERE slug = 'polkastarter' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://seedify.fund' WHERE slug = 'seedify' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.fjordfoundry.com' WHERE slug = 'fjord-foundry' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://impossible.finance' WHERE slug = 'impossible-finance' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.pinksale.finance' WHERE slug = 'pinksale' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://sale.zora.co' WHERE slug = 'zora-drops' AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI TOOLS & ANALYTICS
-- ============================================================

UPDATE products SET url = 'https://debank.com' WHERE slug = 'debank' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://zapper.xyz' WHERE slug = 'zapper' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://zerion.io' WHERE slug = 'zerion-dashboard' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.nansen.ai' WHERE slug = 'nansen' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://dune.com' WHERE slug = 'dune' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://dune.com' WHERE slug = 'dune-analytics' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://defillama.com' WHERE slug = 'defillama' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.arkhamintelligence.com' WHERE slug = 'arkham' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://tokenterminal.com' WHERE slug = 'token-terminal' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.coingecko.com' WHERE slug = 'coingecko' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://coinmarketcap.com' WHERE slug = 'coinmarketcap' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://messari.io' WHERE slug = 'messari' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bubblemaps.io' WHERE slug = 'bubblemaps' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://revoke.cash' WHERE slug = 'revoke-cash' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://app.unrekt.net' WHERE slug = 'unrekt' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://etherscan.io/tokenapprovalchecker' WHERE slug = 'etherscan-approval-checker' AND (url IS NULL OR url = '');

-- ============================================================
-- STABLECOINS
-- ============================================================

UPDATE products SET url = 'https://www.circle.com/usdc' WHERE slug = 'usdc' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://tether.to' WHERE slug = 'usdt' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://makerdao.com' WHERE slug = 'dai' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.frax.finance' WHERE slug = 'frax' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.paypal.com/pyusd' WHERE slug = 'pyusd' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://liquity.org' WHERE slug = 'lusd' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://aave.com' WHERE slug = 'gho' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://curve.fi' WHERE slug = 'crvusd' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://paxos.com/usdp/' WHERE slug = 'usdp' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.tusd.io' WHERE slug = 'tusd' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://firstdigitallabs.com' WHERE slug = 'fdusd' AND (url IS NULL OR url = '');

-- ============================================================
-- RWA (REAL WORLD ASSETS)
-- ============================================================

UPDATE products SET url = 'https://ondo.finance' WHERE slug = 'ondo' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://ondo.finance' WHERE slug = 'ondo-finance' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://maple.finance' WHERE slug = 'maple' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://maple.finance' WHERE slug = 'maple-finance' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://centrifuge.io' WHERE slug = 'centrifuge' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://goldfinch.finance' WHERE slug = 'goldfinch' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://truefi.io' WHERE slug = 'truefi' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://backedfi.com' WHERE slug = 'backed-finance' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://realt.co' WHERE slug = 'realt' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://swarm.com' WHERE slug = 'swarm' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.matrixdock.com' WHERE slug = 'matrixdock' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.mountainprotocol.com' WHERE slug = 'mountain-protocol' AND (url IS NULL OR url = '');

-- ============================================================
-- WRAPPED ASSETS
-- ============================================================

UPDATE products SET url = 'https://wbtc.network' WHERE slug = 'wbtc' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://lido.fi' WHERE slug = 'wsteth' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://threshold.network/earn/btc' WHERE slug = 'tbtc' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.coinbase.com/cbbtc' WHERE slug = 'cbbtc' AND (url IS NULL OR url = '');

-- ============================================================
-- FINANCIAL - CRYPTO CARDS
-- ============================================================

UPDATE products SET url = 'https://crypto.com/cards' WHERE slug = 'crypto-com-card' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.binance.com/en/cards' WHERE slug = 'binance-card' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.coinbase.com/card' WHERE slug = 'coinbase-card' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://nexo.com/nexo-card' WHERE slug = 'nexo-card' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://wirex.com' WHERE slug = 'wirex-card' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bitpanda.com/en/card' WHERE slug = 'bitpanda-card' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://gnosis-pay.com' WHERE slug = 'gnosis-pay' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.holyheld.com' WHERE slug = 'holyheld' AND (url IS NULL OR url = '');

-- ============================================================
-- FINANCIAL - CRYPTO BANKS
-- ============================================================

UPDATE products SET url = 'https://www.seba.swiss' WHERE slug = 'seba-bank' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.seba.swiss' WHERE slug = 'seba' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.sygnum.com' WHERE slug = 'sygnum' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.anchorage.com' WHERE slug = 'anchorage' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.anchorage.com' WHERE slug = 'anchorage-digital' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.revolut.com' WHERE slug = 'revolut' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://n26.com' WHERE slug = 'n26' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://wirex.com' WHERE slug = 'wirex' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://juno.finance' WHERE slug = 'juno' AND (url IS NULL OR url = '');

-- ============================================================
-- FINANCIAL - CUSTODY
-- ============================================================

UPDATE products SET url = 'https://www.fireblocks.com' WHERE slug = 'fireblocks-custody' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bitgo.com' WHERE slug = 'bitgo' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://copper.co' WHERE slug = 'copper' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.coinbase.com/custody' WHERE slug = 'coinbase-custody' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://custody.fidelity.com' WHERE slug = 'fidelity-digital-assets' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.gemini.com/custody' WHERE slug = 'gemini-custody' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://custody.cobo.com' WHERE slug = 'cobo-custody' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://hextrust.com' WHERE slug = 'hex-trust' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.liminalcustody.com' WHERE slug = 'liminal-custody' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.propine.com' WHERE slug = 'propine' AND (url IS NULL OR url = '');

-- ============================================================
-- FINANCIAL - CEFI LENDING
-- ============================================================

UPDATE products SET url = 'https://nexo.com' WHERE slug = 'nexo' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://ledn.io' WHERE slug = 'ledn' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.youhodler.com' WHERE slug = 'youhodler-earn' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.coinloan.io' WHERE slug = 'coinloan' AND (url IS NULL OR url = '');

-- ============================================================
-- FINANCIAL - PRIME BROKERAGE
-- ============================================================

UPDATE products SET url = 'https://falconx.io' WHERE slug = 'falconx' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://hiddenroad.com' WHERE slug = 'hidden-road' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.galaxy.com' WHERE slug = 'galaxy-digital' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://b2c2.com' WHERE slug = 'b2c2' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.wintermute.com' WHERE slug = 'wintermute' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.gsr.io' WHERE slug = 'gsr' AND (url IS NULL OR url = '');

-- ============================================================
-- FINANCIAL - TREASURY MANAGEMENT
-- ============================================================

UPDATE products SET url = 'https://safe.global' WHERE slug = 'safe-treasury' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://parcel.money' WHERE slug = 'parcel' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://coinshift.xyz' WHERE slug = 'coinshift' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://request.network' WHERE slug = 'request-finance' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://llama.xyz' WHERE slug = 'llama' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.onchainden.com' WHERE slug = 'den' AND (url IS NULL OR url = '');

-- ============================================================
-- FINANCIAL - PAYMENT PROCESSORS
-- ============================================================

UPDATE products SET url = 'https://bitpay.com' WHERE slug = 'bitpay' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://btcpayserver.org' WHERE slug = 'btcpay' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://btcpayserver.org' WHERE slug = 'btcpay-server' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://commerce.coinbase.com' WHERE slug = 'coinbase-commerce' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://coingate.com' WHERE slug = 'coingate' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://nowpayments.io' WHERE slug = 'nowpayments' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://flexa.network' WHERE slug = 'flexa' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://strike.me' WHERE slug = 'strike' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.opennode.com' WHERE slug = 'opennode' AND (url IS NULL OR url = '');

-- ============================================================
-- FINANCIAL - FIAT GATEWAYS
-- ============================================================

UPDATE products SET url = 'https://www.moonpay.com' WHERE slug = 'moonpay' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://transak.com' WHERE slug = 'transak' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://ramp.network' WHERE slug = 'ramp-network' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://ramp.network' WHERE slug = 'ramp' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://banxa.com' WHERE slug = 'banxa' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.sardine.ai' WHERE slug = 'sardine' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.simplex.com' WHERE slug = 'simplex' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://alchemypay.org' WHERE slug = 'alchemy-pay' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.mtpelerin.com' WHERE slug = 'mt-pelerin' AND (url IS NULL OR url = '');

-- ============================================================
-- FINANCIAL - TAX SOFTWARE
-- ============================================================

UPDATE products SET url = 'https://koinly.io' WHERE slug = 'koinly' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.cointracker.io' WHERE slug = 'cointracker' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://tokentax.co' WHERE slug = 'tokentax' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://coinledger.io' WHERE slug = 'coinledger' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.accointing.com' WHERE slug = 'accointing' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://zenledger.io' WHERE slug = 'zenledger' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://taxbit.com' WHERE slug = 'taxbit' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://recap.io' WHERE slug = 'recap' AND (url IS NULL OR url = '');

-- ============================================================
-- INFRASTRUCTURE - ORACLES
-- ============================================================

UPDATE products SET url = 'https://chain.link' WHERE slug = 'chainlink' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://pyth.network' WHERE slug = 'pyth' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://pyth.network' WHERE slug = 'pyth-network' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bandprotocol.com' WHERE slug = 'band-protocol' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.api3.org' WHERE slug = 'api3' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://redstone.finance' WHERE slug = 'redstone' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.diadata.org' WHERE slug = 'dia' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://uma.xyz' WHERE slug = 'uma' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://chroniclelabs.org' WHERE slug = 'chronicle' AND (url IS NULL OR url = '');

-- ============================================================
-- INFRASTRUCTURE - LAYER 2
-- ============================================================

UPDATE products SET url = 'https://arbitrum.io' WHERE slug = 'arbitrum' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.optimism.io' WHERE slug = 'optimism' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://zksync.io' WHERE slug = 'zksync' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://polygon.technology/polygon-zkevm' WHERE slug = 'polygon-zkevm' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.base.org' WHERE slug = 'base' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://linea.build' WHERE slug = 'linea' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://scroll.io' WHERE slug = 'scroll' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.starknet.io' WHERE slug = 'starknet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://mantle.xyz' WHERE slug = 'mantle' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://polygon.technology' WHERE slug = 'polygon' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.metis.io' WHERE slug = 'metis' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://manta.network' WHERE slug = 'manta' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://mode.network' WHERE slug = 'mode' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://blast.io' WHERE slug = 'blast' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.taiko.xyz' WHERE slug = 'taiko' AND (url IS NULL OR url = '');

-- ============================================================
-- INFRASTRUCTURE - NODE / RPC PROVIDERS
-- ============================================================

UPDATE products SET url = 'https://www.infura.io' WHERE slug = 'infura' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.alchemy.com' WHERE slug = 'alchemy' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.quicknode.com' WHERE slug = 'quicknode' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.ankr.com' WHERE slug = 'ankr-rpc' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://getblock.io' WHERE slug = 'getblock' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.chainstack.com' WHERE slug = 'chainstack' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://drpc.org' WHERE slug = 'drpc' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://blastapi.io' WHERE slug = 'blast-api' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://nodereal.io' WHERE slug = 'nodereal' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.allnodes.com' WHERE slug = 'allnodes' AND (url IS NULL OR url = '');

-- ============================================================
-- INFRASTRUCTURE - DATA INDEXERS
-- ============================================================

UPDATE products SET url = 'https://thegraph.com' WHERE slug = 'the-graph' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.covalenthq.com' WHERE slug = 'covalent' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://goldsky.com' WHERE slug = 'goldsky' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://subsquid.io' WHERE slug = 'subsquid' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://envio.dev' WHERE slug = 'envio' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://moralis.io' WHERE slug = 'moralis' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://bitquery.io' WHERE slug = 'bitquery' AND (url IS NULL OR url = '');

-- ============================================================
-- INFRASTRUCTURE - BLOCK EXPLORERS
-- ============================================================

UPDATE products SET url = 'https://etherscan.io' WHERE slug = 'etherscan' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://solscan.io' WHERE slug = 'solscan' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.blockscout.com' WHERE slug = 'blockscout' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://polygonscan.com' WHERE slug = 'polygonscan' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://arbiscan.io' WHERE slug = 'arbiscan' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://bscscan.com' WHERE slug = 'bscscan' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.blockchain.com/explorer' WHERE slug = 'blockchain-com-explorer' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://mempool.space' WHERE slug = 'mempool' AND (url IS NULL OR url = '');

-- ============================================================
-- INFRASTRUCTURE - DEVELOPER TOOLS
-- ============================================================

UPDATE products SET url = 'https://hardhat.org' WHERE slug = 'hardhat' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://getfoundry.sh' WHERE slug = 'foundry' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://remix.ethereum.org' WHERE slug = 'remix' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://thirdweb.com' WHERE slug = 'thirdweb' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.trufflesuite.com' WHERE slug = 'truffle' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://eth-brownie.readthedocs.io' WHERE slug = 'brownie' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.anchor-lang.com' WHERE slug = 'anchor' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://tenderly.co' WHERE slug = 'tenderly' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.openzeppelin.com' WHERE slug = 'openzeppelin' AND (url IS NULL OR url = '');

-- ============================================================
-- INFRASTRUCTURE - VALIDATORS
-- ============================================================

UPDATE products SET url = 'https://figment.io' WHERE slug = 'figment' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://staked.us' WHERE slug = 'staked' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.kiln.fi' WHERE slug = 'kiln' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://p2p.org' WHERE slug = 'p2p-validator' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://chorus.one' WHERE slug = 'chorus-one' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.blockdaemon.com' WHERE slug = 'blockdaemon' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://everstake.one' WHERE slug = 'everstake' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.allnodes.com' WHERE slug = 'allnodes-validator' AND (url IS NULL OR url = '');

-- ============================================================
-- INFRASTRUCTURE - IDENTITY
-- ============================================================

UPDATE products SET url = 'https://ens.domains' WHERE slug = 'ens' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://worldcoin.org' WHERE slug = 'worldcoin' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://polygon.technology/polygon-id' WHERE slug = 'polygon-id' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.civic.com' WHERE slug = 'civic' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.gitcoin.co/passport' WHERE slug = 'gitcoin-passport' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.brightid.org' WHERE slug = 'brightid' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://unstoppabledomains.com' WHERE slug = 'unstoppable-domains' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.spruceid.com' WHERE slug = 'spruce' AND (url IS NULL OR url = '');

-- ============================================================
-- INFRASTRUCTURE - ATTESTATION
-- ============================================================

UPDATE products SET url = 'https://attest.sh' WHERE slug = 'eas' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://sign.global' WHERE slug = 'sign-protocol' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://verax.dev' WHERE slug = 'verax' AND (url IS NULL OR url = '');

-- ============================================================
-- PRIVACY
-- ============================================================

UPDATE products SET url = 'https://www.railgun.org' WHERE slug = 'railgun' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://aztec.network' WHERE slug = 'aztec' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://z.cash' WHERE slug = 'zcash' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.getmonero.org' WHERE slug = 'monero' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://scrt.network' WHERE slug = 'secret-network' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.panther.exchange' WHERE slug = 'panther-protocol' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://penumbra.zone' WHERE slug = 'penumbra' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://shadeprotocol.io' WHERE slug = 'shade-protocol' AND (url IS NULL OR url = '');

-- ============================================================
-- GOVERNANCE / DAO TOOLS
-- ============================================================

UPDATE products SET url = 'https://snapshot.org' WHERE slug = 'snapshot' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.tally.xyz' WHERE slug = 'tally' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://aragon.org' WHERE slug = 'aragon' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://daostack.io' WHERE slug = 'daostack' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://colony.io' WHERE slug = 'colony' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.boardroom.io' WHERE slug = 'boardroom' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://gnosis-guild.org/zodiac' WHERE slug = 'zodiac' AND (url IS NULL OR url = '');

-- ============================================================
-- CONSUMER - GAMEFI
-- ============================================================

UPDATE products SET url = 'https://axieinfinity.com' WHERE slug = 'axie-infinity' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.immutable.com' WHERE slug = 'immutable-x' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://games.gala.com' WHERE slug = 'gala-games' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.illuvium.io' WHERE slug = 'illuvium' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://godsunchained.com' WHERE slug = 'gods-unchained' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://staratlas.com' WHERE slug = 'star-atlas' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://bigtime.gg' WHERE slug = 'big-time' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.pixels.xyz' WHERE slug = 'pixels' AND (url IS NULL OR url = '');

-- ============================================================
-- CONSUMER - METAVERSE
-- ============================================================

UPDATE products SET url = 'https://decentraland.org' WHERE slug = 'decentraland' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.sandbox.game' WHERE slug = 'the-sandbox' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://otherside.xyz' WHERE slug = 'otherside' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://somniumspace.com' WHERE slug = 'somnium-space' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.spatial.io' WHERE slug = 'spatial' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.voxels.com' WHERE slug = 'voxels' AND (url IS NULL OR url = '');

-- ============================================================
-- CONSUMER - SOCIALFI
-- ============================================================

UPDATE products SET url = 'https://www.lens.xyz' WHERE slug = 'lens' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.lens.xyz' WHERE slug = 'lens-protocol' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.farcaster.xyz' WHERE slug = 'farcaster' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.friend.tech' WHERE slug = 'friend-tech' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.deso.org' WHERE slug = 'deso' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://cyberconnect.me' WHERE slug = 'cyberconnect' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.minds.com' WHERE slug = 'minds' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://mirror.xyz' WHERE slug = 'mirror' AND (url IS NULL OR url = '');

-- ============================================================
-- CONSUMER - MESSAGING
-- ============================================================

UPDATE products SET url = 'https://xmtp.org' WHERE slug = 'xmtp' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://status.im' WHERE slug = 'status-messenger' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://waku.org' WHERE slug = 'waku' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://push.org' WHERE slug = 'push-protocol' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.dialect.to' WHERE slug = 'dialect' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://notifi.network' WHERE slug = 'notifi' AND (url IS NULL OR url = '');

-- ============================================================
-- CONSUMER - QUEST / AIRDROP PLATFORMS
-- ============================================================

UPDATE products SET url = 'https://galxe.com' WHERE slug = 'galxe' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://layer3.xyz' WHERE slug = 'layer3' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://rabbithole.gg' WHERE slug = 'rabbithole' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://zealy.io' WHERE slug = 'zealy' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://questn.com' WHERE slug = 'questn' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://intract.io' WHERE slug = 'intract' AND (url IS NULL OR url = '');

-- ============================================================
-- CONSUMER - NFT CREATION TOOLS
-- ============================================================

UPDATE products SET url = 'https://manifold.xyz' WHERE slug = 'manifold' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://zora.co' WHERE slug = 'zora' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://highlight.xyz' WHERE slug = 'highlight' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://decent.xyz' WHERE slug = 'decent' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://bueno.art' WHERE slug = 'bueno' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://niftykit.com' WHERE slug = 'niftykit' AND (url IS NULL OR url = '');

-- ============================================================
-- CONSUMER - FAN TOKENS
-- ============================================================

UPDATE products SET url = 'https://www.chiliz.com' WHERE slug = 'chiliz' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.socios.com' WHERE slug = 'socios' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://rally.io' WHERE slug = 'rally' AND (url IS NULL OR url = '');

-- ============================================================
-- DEPIN - STORAGE
-- ============================================================

UPDATE products SET url = 'https://filecoin.io' WHERE slug = 'filecoin' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.arweave.org' WHERE slug = 'arweave' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://ipfs.tech' WHERE slug = 'ipfs' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.storj.io' WHERE slug = 'storj' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://sia.tech' WHERE slug = 'sia' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://ceramic.network' WHERE slug = 'ceramic' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://web3.storage' WHERE slug = 'web3-storage' AND (url IS NULL OR url = '');

-- ============================================================
-- DEPIN - COMPUTE
-- ============================================================

UPDATE products SET url = 'https://rendernetwork.com' WHERE slug = 'render' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://rendernetwork.com' WHERE slug = 'render-network' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://akash.network' WHERE slug = 'akash' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://golem.network' WHERE slug = 'golem' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://io.net' WHERE slug = 'io-net' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.gensyn.ai' WHERE slug = 'gensyn' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.together.ai' WHERE slug = 'together-ai' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://runonflux.io' WHERE slug = 'flux' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://iex.ec' WHERE slug = 'iexec' AND (url IS NULL OR url = '');

-- ============================================================
-- DEPIN - VPN
-- ============================================================

UPDATE products SET url = 'https://orchid.com' WHERE slug = 'orchid' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://mysterium.network' WHERE slug = 'mysterium' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.sentinel.co' WHERE slug = 'sentinel' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.deeper.network' WHERE slug = 'deeper-network' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://nymtech.net' WHERE slug = 'nym' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://hoprnet.org' WHERE slug = 'hopr' AND (url IS NULL OR url = '');

-- ============================================================
-- DEPIN - MINING POOLS
-- ============================================================

UPDATE products SET url = 'https://foundrydigital.com' WHERE slug = 'foundry-usa' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.f2pool.com' WHERE slug = 'f2pool' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.antpool.com' WHERE slug = 'antpool' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://braiins.com/pool' WHERE slug = 'braiins-pool' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.viabtc.com' WHERE slug = 'viabtc' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.poolin.com' WHERE slug = 'poolin' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://luxor.tech' WHERE slug = 'luxor' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://ocean.xyz' WHERE slug = 'ocean-mining' AND (url IS NULL OR url = '');

-- ============================================================
-- AI AGENTS
-- ============================================================

UPDATE products SET url = 'https://fetch.ai' WHERE slug = 'fetch-ai' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://olas.network' WHERE slug = 'autonolas' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://singularitynet.io' WHERE slug = 'singularitynet' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://bittensor.com' WHERE slug = 'bittensor' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://virtuals.io' WHERE slug = 'virtuals-protocol' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://spectral.finance' WHERE slug = 'spectral' AND (url IS NULL OR url = '');

-- ============================================================
-- SECURITY - AUDIT & BUG BOUNTY
-- ============================================================

UPDATE products SET url = 'https://www.certik.com' WHERE slug = 'certik' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.trailofbits.com' WHERE slug = 'trail-of-bits' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.openzeppelin.com' WHERE slug = 'openzeppelin-audits' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://immunefi.com' WHERE slug = 'immunefi' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://code4rena.com' WHERE slug = 'code4rena' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.sherlock.xyz' WHERE slug = 'sherlock' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://spearbit.com' WHERE slug = 'spearbit' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://consensys.io/diligence' WHERE slug = 'consensys-diligence' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://hackenproof.com' WHERE slug = 'hackenproof' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.peckshield.com' WHERE slug = 'peckshield' AND (url IS NULL OR url = '');

-- ============================================================
-- SECURITY - MEV PROTECTION
-- ============================================================

UPDATE products SET url = 'https://protect.flashbots.net' WHERE slug = 'flashbots-protect' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://mevblocker.io' WHERE slug = 'mev-blocker' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://bloxroute.com' WHERE slug = 'bloxroute' AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.blocknative.com' WHERE slug = 'blocknative' AND (url IS NULL OR url = '');

-- ============================================================
-- VERIFICATION QUERY - Check results
-- ============================================================

-- Run this query to see how many products now have URLs:
-- SELECT
--     COUNT(*) as total_products,
--     COUNT(CASE WHEN url IS NOT NULL AND url != '' THEN 1 END) as with_url,
--     COUNT(CASE WHEN url IS NULL OR url = '' THEN 1 END) as without_url,
--     ROUND(
--         COUNT(CASE WHEN url IS NOT NULL AND url != '' THEN 1 END)::numeric / COUNT(*)::numeric * 100,
--         1
--     ) as percentage_complete
-- FROM products;

-- List products still missing URLs:
-- SELECT id, slug, name FROM products WHERE url IS NULL OR url = '' ORDER BY name;

SELECT 'Product URLs update complete!' as status;
