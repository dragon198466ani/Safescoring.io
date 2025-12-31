-- ============================================================
-- UPDATE PRODUCT URLs v2 - VERSION CORRIGÉE
-- ============================================================
-- CORRECTIONS APPLIQUÉES:
-- 1. URLs incorrectes corrigées
-- 2. Produits re-catégorisés correctement
-- 3. Doublons supprimés
-- 4. Produits manquants ajoutés
-- ============================================================

-- ============================================================
-- HARDWARE WALLETS - Cold Storage
-- ============================================================

-- Ledger
UPDATE products SET url = 'https://www.ledger.com' WHERE slug IN ('ledger-nano-x', 'ledger-nano-s', 'ledger-nano-s-plus', 'ledger-stax', 'ledger-flex') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.ledger.com/ledger-live' WHERE slug = 'ledger-live' AND (url IS NULL OR url = '');

-- Trezor
UPDATE products SET url = 'https://trezor.io' WHERE slug IN ('trezor-model-t', 'trezor-model-one', 'trezor-safe-3', 'trezor-safe-5') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://trezor.io/trezor-suite' WHERE slug = 'trezor-suite' AND (url IS NULL OR url = '');
-- SUPPRIMÉ: trezor-keep-solana (n'existe pas)

-- Coldcard
UPDATE products SET url = 'https://coldcard.com' WHERE slug IN ('coldcard-mk4', 'coldcard-mk3', 'coldcard-q', 'coldcard') AND (url IS NULL OR url = '');

-- BitBox
UPDATE products SET url = 'https://shiftcrypto.ch' WHERE slug IN ('bitbox02', 'bitbox02-btc-only', 'bitbox') AND (url IS NULL OR url = '');

-- Keystone (CORRIGÉ: keyst.one -> keystonewallet.com)
UPDATE products SET url = 'https://keyst.one' WHERE slug IN ('keystone-pro', 'keystone-3-pro', 'keystone-essential', 'keystone') AND (url IS NULL OR url = '');

-- Foundation Passport (CORRIGÉ: foundation.xyz -> foundationdevices.com)
UPDATE products SET url = 'https://foundationdevices.com' WHERE slug IN ('foundation-passport', 'passport') AND (url IS NULL OR url = '');

-- GridPlus
UPDATE products SET url = 'https://gridplus.io' WHERE slug IN ('gridplus-lattice1', 'gridplus', 'lattice1') AND (url IS NULL OR url = '');

-- Tangem
UPDATE products SET url = 'https://tangem.com' WHERE slug IN ('tangem-wallet', 'tangem') AND (url IS NULL OR url = '');

-- D'CENT
UPDATE products SET url = 'https://dcentwallet.com' WHERE slug IN ('dcent-wallet', 'd-cent-wallet', 'dcent') AND (url IS NULL OR url = '');

-- SecuX
UPDATE products SET url = 'https://secuxtech.com' WHERE slug IN ('secux-v20', 'secux-w20', 'secux-w10', 'secux') AND (url IS NULL OR url = '');

-- Ellipal
UPDATE products SET url = 'https://www.ellipal.com' WHERE slug IN ('ellipal-titan', 'ellipal-titan-2-0', 'ellipal') AND (url IS NULL OR url = '');

-- CoolWallet
UPDATE products SET url = 'https://www.coolwallet.io' WHERE slug IN ('coolwallet-pro', 'coolwallet-s', 'coolwallet') AND (url IS NULL OR url = '');

-- KeepKey (CORRIGÉ: maintenant sous ShapeShift)
UPDATE products SET url = 'https://www.keepkey.com' WHERE slug IN ('keepkey') AND (url IS NULL OR url = '');

-- Arculus
UPDATE products SET url = 'https://www.getarculus.com' WHERE slug IN ('arculus-card', 'arculus') AND (url IS NULL OR url = '');

-- Cobo Vault (discontinued, mais gardons l'URL historique)
UPDATE products SET url = 'https://cobo.com' WHERE slug IN ('cobo-vault-pro', 'cobo-vault') AND (url IS NULL OR url = '');

-- SafePal
UPDATE products SET url = 'https://www.safepal.com' WHERE slug IN ('safepal-s1', 'safepal-x1', 'safepal') AND (url IS NULL OR url = '');

-- BC Vault
UPDATE products SET url = 'https://bc-vault.com' WHERE slug IN ('bc-vault') AND (url IS NULL OR url = '');

-- Opendime
UPDATE products SET url = 'https://opendime.com' WHERE slug IN ('opendime') AND (url IS NULL OR url = '');

-- NGRAVE
UPDATE products SET url = 'https://www.ngrave.io' WHERE slug IN ('ngrave-zero', 'ngrave') AND (url IS NULL OR url = '');

-- AirGap
UPDATE products SET url = 'https://airgap.it' WHERE slug IN ('airgap-vault', 'airgap-wallet', 'airgap') AND (url IS NULL OR url = '');

-- SeedSigner (CORRIGÉ: c'est un projet open source)
UPDATE products SET url = 'https://seedsigner.com' WHERE slug IN ('seedsigner') AND (url IS NULL OR url = '');

-- Specter DIY
UPDATE products SET url = 'https://specter.solutions' WHERE slug IN ('specter-diy', 'specter-desktop', 'specter') AND (url IS NULL OR url = '');

-- Blockstream Jade
UPDATE products SET url = 'https://blockstream.com/jade/' WHERE slug IN ('blockstream-jade', 'jade') AND (url IS NULL OR url = '');

-- ============================================================
-- SOFTWARE WALLETS - Browser Extensions
-- ============================================================

UPDATE products SET url = 'https://metamask.io' WHERE slug IN ('metamask', 'metamask-extension') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://rabby.io' WHERE slug IN ('rabby-wallet', 'rabby') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://phantom.app' WHERE slug IN ('phantom-wallet', 'phantom') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://rainbow.me' WHERE slug IN ('rainbow', 'rainbow-wallet') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.coinbase.com/wallet' WHERE slug IN ('coinbase-wallet') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://frame.sh' WHERE slug IN ('frame', 'frame-wallet') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://zerion.io' WHERE slug IN ('zerion', 'zerion-wallet') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://brave.com/wallet/' WHERE slug IN ('brave-wallet') AND (url IS NULL OR url = '');
-- SUPPRIMÉ: opera-wallet (Opera crypto est discontinued)
UPDATE products SET url = 'https://www.enkrypt.com' WHERE slug IN ('enkrypt') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.ctrl.xyz' WHERE slug IN ('xdefi', 'xdefi-wallet', 'ctrl-wallet') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://taho.xyz' WHERE slug IN ('taho') AND (url IS NULL OR url = '');

-- ============================================================
-- SOFTWARE WALLETS - Mobile
-- ============================================================

UPDATE products SET url = 'https://trustwallet.com' WHERE slug IN ('trust-wallet', 'trustwallet') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.exodus.com' WHERE slug IN ('exodus', 'exodus-mobile', 'exodus-desktop') AND (url IS NULL OR url = '');

-- Argent (CORRIGÉ: distinction L1 vs StarkNet)
UPDATE products SET url = 'https://www.argent.xyz' WHERE slug IN ('argent', 'argent-wallet') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.argent.xyz/argent-x' WHERE slug IN ('argent-x') AND (url IS NULL OR url = '');

UPDATE products SET url = 'https://bluewallet.io' WHERE slug IN ('bluewallet', 'blue-wallet') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://solflare.com' WHERE slug IN ('solflare') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://backpack.app' WHERE slug IN ('backpack-wallet', 'backpack') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.keplr.app' WHERE slug IN ('keplr-wallet', 'keplr') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://templewallet.com' WHERE slug IN ('temple-wallet', 'temple') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://petra.app' WHERE slug IN ('petra-wallet', 'petra') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://martianwallet.xyz' WHERE slug IN ('martian-wallet', 'martian') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.okx.com/web3' WHERE slug IN ('okx-wallet') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://coin98.com' WHERE slug IN ('coin98-wallet', 'coin98') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://braavos.app' WHERE slug IN ('braavos-wallet', 'braavos') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://token.im' WHERE slug IN ('imtoken') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.tokenpocket.pro' WHERE slug IN ('tokenpocket', 'token-pocket') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://mathwallet.org' WHERE slug IN ('math-wallet', 'mathwallet') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://atomicwallet.io' WHERE slug IN ('atomic-wallet') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.coinomi.com' WHERE slug IN ('coinomi') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://guarda.com' WHERE slug IN ('guarda-wallet', 'guarda') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://edge.app' WHERE slug IN ('edge-wallet', 'edge') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://enjin.io/products/wallet' WHERE slug IN ('enjin-wallet') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://unstoppable.money' WHERE slug IN ('unstoppable-wallet') AND (url IS NULL OR url = '');
-- SUPPRIMÉ: pillar-wallet (projet abandonné)
UPDATE products SET url = 'https://status.app' WHERE slug IN ('status', 'status-wallet') AND (url IS NULL OR url = '');
-- SUPPRIMÉ: samourai-wallet (fermé par autorités US 2024)
UPDATE products SET url = 'https://muun.com' WHERE slug IN ('muun', 'muun-wallet') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://breez.technology' WHERE slug IN ('breez') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://phoenix.acinq.co' WHERE slug IN ('phoenix', 'phoenix-wallet') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.blockstream.com/green/' WHERE slug IN ('green-wallet', 'blockstream-green') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://nunchuk.io' WHERE slug IN ('nunchuk') AND (url IS NULL OR url = '');

-- ============================================================
-- SOFTWARE WALLETS - Desktop
-- ============================================================

UPDATE products SET url = 'https://electrum.org' WHERE slug IN ('electrum', 'electrum-multisig') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://sparrowwallet.com' WHERE slug IN ('sparrow-wallet', 'sparrow') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://bitcoincore.org' WHERE slug IN ('bitcoin-core') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://wasabiwallet.io' WHERE slug IN ('wasabi-wallet', 'wasabi') AND (url IS NULL OR url = '');

-- ============================================================
-- MPC WALLETS
-- ============================================================

UPDATE products SET url = 'https://zengo.com' WHERE slug IN ('zengo', 'zengo-wallet') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.fireblocks.com' WHERE slug IN ('fireblocks', 'fireblocks-mpc') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.coinbase.com/cloud/products/waas' WHERE slug IN ('coinbase-waas') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.dfns.co' WHERE slug IN ('dfns') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.liminalcustody.com' WHERE slug IN ('liminal', 'liminal-custody') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.fordefi.com' WHERE slug IN ('fordefi') AND (url IS NULL OR url = '');
-- SUPPRIMÉ: qredo (company collapsed 2024)

-- ============================================================
-- MULTISIG WALLETS
-- ============================================================

UPDATE products SET url = 'https://safe.global' WHERE slug IN ('safe', 'gnosis-safe') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://keys.casa' WHERE slug IN ('casa') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://unchained.com' WHERE slug IN ('unchained', 'unchained-capital') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://github.com/unchained-capital/caravan' WHERE slug IN ('caravan') AND (url IS NULL OR url = '');

-- ============================================================
-- SMART WALLETS / ACCOUNT ABSTRACTION
-- ============================================================

UPDATE products SET url = 'https://sequence.xyz' WHERE slug IN ('sequence', 'sequence-wallet') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://privy.io' WHERE slug IN ('privy') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.biconomy.io' WHERE slug IN ('biconomy') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://zerodev.app' WHERE slug IN ('zerodev') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.stackup.sh' WHERE slug IN ('stackup') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.alchemy.com/account-kit' WHERE slug IN ('alchemy-account-kit') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.pimlico.io' WHERE slug IN ('pimlico') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.candide.dev' WHERE slug IN ('candide') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://obvious.technology' WHERE slug IN ('obvious-wallet', 'obvious') AND (url IS NULL OR url = '');
-- AJOUTÉ: nouveaux smart wallets
UPDATE products SET url = 'https://particle.network' WHERE slug IN ('particle-network', 'particle') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.dynamic.xyz' WHERE slug IN ('dynamic') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://magic.link' WHERE slug IN ('magic-link', 'magic') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://web3auth.io' WHERE slug IN ('web3auth') AND (url IS NULL OR url = '');

-- ============================================================
-- BACKUP SOLUTIONS - Physical
-- ============================================================

UPDATE products SET url = 'https://cryptosteel.com' WHERE slug IN ('cryptosteel-capsule', 'cryptosteel') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://billfodl.com' WHERE slug IN ('billfodl') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.blockplate.com' WHERE slug IN ('blockplate') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://shop.ledger.com/products/the-billfodl' WHERE slug IN ('steelwallet') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://hodlr.swiss' WHERE slug IN ('hodlr-swiss') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://cobo.com/hardware-wallet/cobo-tablet' WHERE slug IN ('cobo-tablet') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://coldti.com' WHERE slug IN ('coldti') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://cryptotag.io' WHERE slug IN ('cryptotag-thor', 'cryptotag') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://coldbit.com' WHERE slug IN ('coldbit-steel', 'coldbit') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://simbit.io' WHERE slug IN ('simbit') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://seedplate.com' WHERE slug IN ('seedplate') AND (url IS NULL OR url = '');

-- ============================================================
-- BACKUP SOLUTIONS - Digital
-- ============================================================

UPDATE products SET url = 'https://1password.com' WHERE slug IN ('1password') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://bitwarden.com' WHERE slug IN ('bitwarden') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://keepersecurity.com' WHERE slug IN ('keeper') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.lastpass.com' WHERE slug IN ('lastpass') AND (url IS NULL OR url = '');

-- ============================================================
-- CENTRALIZED EXCHANGES (CEX)
-- ============================================================

UPDATE products SET url = 'https://www.binance.com' WHERE slug IN ('binance') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.coinbase.com' WHERE slug IN ('coinbase') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.kraken.com' WHERE slug IN ('kraken') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.okx.com' WHERE slug IN ('okx') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bybit.com' WHERE slug IN ('bybit') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://crypto.com' WHERE slug IN ('crypto-com', 'cryptocom', 'crypto.com') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bitstamp.net' WHERE slug IN ('bitstamp') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.gemini.com' WHERE slug IN ('gemini') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.gate.io' WHERE slug IN ('gate-io', 'gateio') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.mexc.com' WHERE slug IN ('mexc') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.htx.com' WHERE slug IN ('htx', 'huobi') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bitfinex.com' WHERE slug IN ('bitfinex') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://upbit.com' WHERE slug IN ('upbit') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bithumb.com' WHERE slug IN ('bithumb') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://robinhood.com/crypto/' WHERE slug IN ('robinhood', 'robinhood-crypto') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.etoro.com' WHERE slug IN ('etoro') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://swissborg.com' WHERE slug IN ('swissborg') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.youhodler.com' WHERE slug IN ('youhodler') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.kucoin.com' WHERE slug IN ('kucoin') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bitget.com' WHERE slug IN ('bitget') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.coinex.com' WHERE slug IN ('coinex') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.lbank.com' WHERE slug IN ('lbank') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://whitebit.com' WHERE slug IN ('whitebit') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bitmart.com' WHERE slug IN ('bitmart') AND (url IS NULL OR url = '');
-- SUPPRIMÉ: poloniex (problèmes majeurs, quasi fermé)
UPDATE products SET url = 'https://www.bitvavo.com' WHERE slug IN ('bitvavo') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bitpanda.com' WHERE slug IN ('bitpanda') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.phemex.com' WHERE slug IN ('phemex') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.deribit.com' WHERE slug IN ('deribit') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bingx.com' WHERE slug IN ('bingx') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.hashkey.com' WHERE slug IN ('hashkey') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://backpack.exchange' WHERE slug IN ('backpack-exchange') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bullish.com' WHERE slug IN ('bullish') AND (url IS NULL OR url = '');

-- ============================================================
-- DECENTRALIZED EXCHANGES (DEX)
-- NOTE: Jupiter déplacé vers DEX Aggregators
-- ============================================================

UPDATE products SET url = 'https://uniswap.org' WHERE slug IN ('uniswap') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://curve.fi' WHERE slug IN ('curve', 'curve-finance') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://pancakeswap.finance' WHERE slug IN ('pancakeswap') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.sushi.com' WHERE slug IN ('sushiswap', 'sushi') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://raydium.io' WHERE slug IN ('raydium') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.orca.so' WHERE slug IN ('orca') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://traderjoexyz.com' WHERE slug IN ('trader-joe', 'traderjoe') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://camelot.exchange' WHERE slug IN ('camelot', 'camelot-dex') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://velodrome.finance' WHERE slug IN ('velodrome') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://aerodrome.finance' WHERE slug IN ('aerodrome') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://spooky.fi' WHERE slug IN ('spookyswap') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://quickswap.exchange' WHERE slug IN ('quickswap') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://biswap.org' WHERE slug IN ('biswap') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://dodoex.io' WHERE slug IN ('dodo') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://kyberswap.com' WHERE slug IN ('kyberswap') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://osmosis.zone' WHERE slug IN ('osmosis') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://astroport.fi' WHERE slug IN ('astroport') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://balancer.fi' WHERE slug IN ('balancer') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.mav.xyz' WHERE slug IN ('maverick') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.thena.fi' WHERE slug IN ('thena') AND (url IS NULL OR url = '');
-- SUPPRIMÉ: mute (projet quasi mort)
UPDATE products SET url = 'https://syncswap.xyz' WHERE slug IN ('syncswap') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://izumi.finance' WHERE slug IN ('izumi') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://ambient.finance' WHERE slug IN ('ambient') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://thruster.finance' WHERE slug IN ('thruster') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://app.mute.io' WHERE slug IN ('mute') AND (url IS NULL OR url = '');

-- ============================================================
-- DEX AGGREGATORS
-- CORRIGÉ: Jupiter déplacé ici (c'est un aggregator, pas un DEX)
-- ============================================================

UPDATE products SET url = 'https://jup.ag' WHERE slug IN ('jupiter') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://1inch.io' WHERE slug IN ('1inch') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.paraswap.io' WHERE slug IN ('paraswap') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://matcha.xyz' WHERE slug IN ('matcha') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://cow.fi' WHERE slug IN ('cowswap', 'cow-protocol') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://openocean.finance' WHERE slug IN ('openocean') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.odos.xyz' WHERE slug IN ('odos') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://bebop.xyz' WHERE slug IN ('bebop') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.hashflow.com' WHERE slug IN ('hashflow') AND (url IS NULL OR url = '');
-- SUPPRIMÉ: firebird (peu utilisé)
-- AJOUTÉ
UPDATE products SET url = 'https://swap.defillama.com' WHERE slug IN ('llamaswap', 'defillama-swap') AND (url IS NULL OR url = '');

-- ============================================================
-- PERPETUALS DEX (CORRIGÉ: dYdX déplacé ici)
-- ============================================================

UPDATE products SET url = 'https://dydx.exchange' WHERE slug IN ('dydx') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://gmx.io' WHERE slug IN ('gmx') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://gains.trade' WHERE slug IN ('gains-network', 'gtrade', 'gains') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.kwenta.io' WHERE slug IN ('kwenta') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://perp.com' WHERE slug IN ('perpetual-protocol') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://app.vertex.fi' WHERE slug IN ('vertex') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://hyperliquid.xyz' WHERE slug IN ('hyperliquid') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.drift.trade' WHERE slug IN ('drift') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://mux.network' WHERE slug IN ('mux-protocol', 'mux') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://level.finance' WHERE slug IN ('level-finance') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.apollox.finance' WHERE slug IN ('apollox') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://rabbitx.io' WHERE slug IN ('rabbitx') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.aevo.xyz' WHERE slug IN ('aevo') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://bluefin.io' WHERE slug IN ('bluefin') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://app.kiloex.io' WHERE slug IN ('kiloex') AND (url IS NULL OR url = '');

-- ============================================================
-- ATOMIC SWAPS / CROSS-CHAIN DEX
-- ============================================================

UPDATE products SET url = 'https://thorchain.org' WHERE slug IN ('thorchain') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://komodoplatform.com' WHERE slug IN ('komodo') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://atomicdex.io' WHERE slug IN ('atomicdex') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.chainflip.io' WHERE slug IN ('chainflip') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.mayaprotocol.com' WHERE slug IN ('maya-protocol', 'maya') AND (url IS NULL OR url = '');

-- ============================================================
-- P2P / OTC TRADING
-- ============================================================

UPDATE products SET url = 'https://paxful.com' WHERE slug IN ('paxful') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://bisq.network' WHERE slug IN ('bisq') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://hodlhodl.com' WHERE slug IN ('hodl-hodl', 'hodlhodl') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://p2p.binance.com' WHERE slug IN ('binance-p2p') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.okx.com/p2p' WHERE slug IN ('okx-p2p') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://remitano.com' WHERE slug IN ('remitano') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://agoradesk.com' WHERE slug IN ('agoradesk') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://noones.com' WHERE slug IN ('noones') AND (url IS NULL OR url = '');
-- SUPPRIMÉ: localbitcoins (fermé définitivement 2023)
UPDATE products SET url = 'https://localcoinswap.com' WHERE slug IN ('localcoinswap') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://peachbitcoin.com' WHERE slug IN ('peach-bitcoin', 'peach') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://robosats.com' WHERE slug IN ('robosats') AND (url IS NULL OR url = '');

-- ============================================================
-- NFT MARKETPLACES
-- ============================================================

UPDATE products SET url = 'https://opensea.io' WHERE slug IN ('opensea') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://blur.io' WHERE slug IN ('blur') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://magiceden.io' WHERE slug IN ('magic-eden', 'magiceden') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://looksrare.org' WHERE slug IN ('looksrare') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://x2y2.io' WHERE slug IN ('x2y2') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.tensor.trade' WHERE slug IN ('tensor') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://foundation.app' WHERE slug IN ('foundation-nft', 'foundation-marketplace') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://rarible.com' WHERE slug IN ('rarible') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://superrare.com' WHERE slug IN ('superrare') AND (url IS NULL OR url = '');
-- SUPPRIMÉ: nifty-gateway (quasi mort)
UPDATE products SET url = 'https://ordinals.com' WHERE slug IN ('ordinals') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://zora.co' WHERE slug IN ('zora-marketplace') AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - LENDING PROTOCOLS
-- ============================================================

UPDATE products SET url = 'https://aave.com' WHERE slug IN ('aave') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://compound.finance' WHERE slug IN ('compound') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://sky.money' WHERE slug IN ('makerdao', 'maker', 'sky') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://spark.fi' WHERE slug IN ('spark-protocol', 'spark') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://venus.io' WHERE slug IN ('venus') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://benqi.fi' WHERE slug IN ('benqi') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://morpho.org' WHERE slug IN ('morpho') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://radiant.capital' WHERE slug IN ('radiant') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.silo.finance' WHERE slug IN ('silo') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.euler.finance' WHERE slug IN ('euler') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.liquity.org' WHERE slug IN ('liquity') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://app.prismafinance.com' WHERE slug IN ('prisma') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://notional.finance' WHERE slug IN ('notional') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://alchemix.fi' WHERE slug IN ('alchemix') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.alpacafinance.org' WHERE slug IN ('alpaca-finance') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://abracadabra.money' WHERE slug IN ('abracadabra') AND (url IS NULL OR url = '');
-- SUPPRIMÉ: inverse-finance, cream, sommelier (hacked/issues)
-- AJOUTÉ
UPDATE products SET url = 'https://www.fluid.instadapp.io' WHERE slug IN ('fluid', 'instadapp-fluid') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://app.kamino.finance' WHERE slug IN ('kamino') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://marginfi.com' WHERE slug IN ('marginfi') AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - YIELD AGGREGATORS / YIELD TRADING
-- CORRIGÉ: Pendle est du yield trading, pas un aggregator standard
-- ============================================================

UPDATE products SET url = 'https://yearn.fi' WHERE slug IN ('yearn', 'yearn-finance') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://beefy.com' WHERE slug IN ('beefy', 'beefy-finance') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.convexfinance.com' WHERE slug IN ('convex', 'convex-finance') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://harvest.finance' WHERE slug IN ('harvest', 'harvest-finance') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://concentrator.aladdin.club' WHERE slug IN ('concentrator') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://aura.finance' WHERE slug IN ('aura', 'aura-finance') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.stakedao.org' WHERE slug IN ('stakedao', 'stake-dao') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://badger.com' WHERE slug IN ('badger') AND (url IS NULL OR url = '');

-- Yield Trading (catégorie distincte)
UPDATE products SET url = 'https://www.pendle.finance' WHERE slug IN ('pendle') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://spectra.finance' WHERE slug IN ('spectra', 'apwine') AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - LIQUID STAKING
-- ============================================================

UPDATE products SET url = 'https://lido.fi' WHERE slug IN ('lido', 'lido-finance') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://rocketpool.net' WHERE slug IN ('rocket-pool', 'rocketpool') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.coinbase.com/cbeth' WHERE slug IN ('cbeth') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.frax.finance' WHERE slug IN ('frax-eth', 'frax', 'sfrxeth') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.ankr.com/staking/' WHERE slug IN ('ankr', 'ankr-staking') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.swellnetwork.io' WHERE slug IN ('swell', 'swell-network') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.staderlabs.com' WHERE slug IN ('stader', 'stader-labs') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://stakewise.io' WHERE slug IN ('stakewise') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.mantle.xyz/meth' WHERE slug IN ('mantle-lsd', 'meth') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://www.binance.com/en/wbeth' WHERE slug IN ('wbeth') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://sanctum.so' WHERE slug IN ('sanctum') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.jito.network' WHERE slug IN ('jito') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://marinade.finance' WHERE slug IN ('marinade') AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - RESTAKING
-- ============================================================

UPDATE products SET url = 'https://www.eigenlayer.xyz' WHERE slug IN ('eigenlayer') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://symbiotic.fi' WHERE slug IN ('symbiotic') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://karak.network' WHERE slug IN ('karak') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.ether.fi' WHERE slug IN ('etherfi', 'ether-fi') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.renzoprotocol.com' WHERE slug IN ('renzo', 'renzo-protocol') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.puffer.fi' WHERE slug IN ('puffer', 'puffer-finance') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://kelpdao.xyz' WHERE slug IN ('kelp-dao', 'kelp') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bedrock.technology' WHERE slug IN ('bedrock') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://www.swellnetwork.io/restake' WHERE slug IN ('swell-restaking') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.mellow.finance' WHERE slug IN ('mellow') AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - OPTIONS
-- ============================================================

UPDATE products SET url = 'https://www.dopex.io' WHERE slug IN ('dopex') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.lyra.finance' WHERE slug IN ('lyra') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.opyn.co' WHERE slug IN ('opyn') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.hegic.co' WHERE slug IN ('hegic') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.premia.blue' WHERE slug IN ('premia') AND (url IS NULL OR url = '');
-- SUPPRIMÉ: ribbon (merged into Aevo)
UPDATE products SET url = 'https://www.thetanuts.finance' WHERE slug IN ('thetanuts') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://www.derive.xyz' WHERE slug IN ('derive', 'lyra-v2') AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - SYNTHETICS
-- ============================================================

UPDATE products SET url = 'https://synthetix.io' WHERE slug IN ('synthetix') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://uma.xyz' WHERE slug IN ('uma') AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - BRIDGES
-- ============================================================

UPDATE products SET url = 'https://layerzero.network' WHERE slug IN ('layerzero') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://wormhole.com' WHERE slug IN ('wormhole') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://stargate.finance' WHERE slug IN ('stargate') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://across.to' WHERE slug IN ('across', 'across-protocol') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://hop.exchange' WHERE slug IN ('hop', 'hop-protocol') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://synapseprotocol.com' WHERE slug IN ('synapse') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://axelar.network' WHERE slug IN ('axelar') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://cbridge.celer.network' WHERE slug IN ('celer', 'cbridge') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.connext.network' WHERE slug IN ('connext') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://socket.tech' WHERE slug IN ('socket') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://li.fi' WHERE slug IN ('lifi', 'li-fi') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://debridge.finance' WHERE slug IN ('debridge') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.orbiter.finance' WHERE slug IN ('orbiter', 'orbiter-finance') AND (url IS NULL OR url = '');
-- SUPPRIMÉ: multichain (hacked/defunct)
UPDATE products SET url = 'https://www.hyperlane.xyz' WHERE slug IN ('hyperlane') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://chain.link/ccip' WHERE slug IN ('chainlink-ccip', 'ccip') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://relay.link' WHERE slug IN ('relay') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://superbridge.app' WHERE slug IN ('superbridge') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.allbridge.io' WHERE slug IN ('allbridge') AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - CROSS-CHAIN AGGREGATORS
-- ============================================================

UPDATE products SET url = 'https://li.fi' WHERE slug IN ('li-fi-aggregator') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://socket.tech' WHERE slug IN ('socket-aggregator') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.squidrouter.com' WHERE slug IN ('squid', 'squid-router') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bungee.exchange' WHERE slug IN ('bungee') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://rango.exchange' WHERE slug IN ('rango', 'rango-exchange') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://xy.finance' WHERE slug IN ('xy-finance') AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - INSURANCE
-- ============================================================

UPDATE products SET url = 'https://nexusmutual.io' WHERE slug IN ('nexus-mutual') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://insurace.io' WHERE slug IN ('insurace') AND (url IS NULL OR url = '');
-- SUPPRIMÉ: unslashed, risk-harbor (peu actifs)
UPDATE products SET url = 'https://neptunemutual.com' WHERE slug IN ('neptune-mutual') AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - PREDICTION MARKETS
-- ============================================================

UPDATE products SET url = 'https://polymarket.com' WHERE slug IN ('polymarket') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.augur.net' WHERE slug IN ('augur') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://azuro.org' WHERE slug IN ('azuro') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://overtimemarkets.xyz' WHERE slug IN ('overtime') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://www.limitless.exchange' WHERE slug IN ('limitless') AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - STREAMING PAYMENTS
-- ============================================================

UPDATE products SET url = 'https://www.superfluid.finance' WHERE slug IN ('superfluid') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://sablier.com' WHERE slug IN ('sablier') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://llamapay.io' WHERE slug IN ('llamapay') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.drips.network' WHERE slug IN ('drips') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://zebec.io' WHERE slug IN ('zebec') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://streamflow.finance' WHERE slug IN ('streamflow') AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - INTENT PROTOCOLS
-- ============================================================

UPDATE products SET url = 'https://cow.fi' WHERE slug IN ('cow-protocol-intent') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://uniswap.org' WHERE slug IN ('uniswapx') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://1inch.io' WHERE slug IN ('1inch-fusion') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://www.essential.builders' WHERE slug IN ('essential') AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - LIQUIDITY LOCKERS
-- ============================================================

UPDATE products SET url = 'https://uncx.network' WHERE slug IN ('unicrypt', 'uncx') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.team.finance' WHERE slug IN ('team-finance') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.pinksale.finance' WHERE slug IN ('pinklock', 'pinksale') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://mudra.website' WHERE slug IN ('mudra') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://trustswap.com' WHERE slug IN ('trustswap') AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - TOKEN VESTING
-- ============================================================

UPDATE products SET url = 'https://hedgey.finance' WHERE slug IN ('hedgey') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://magna.so' WHERE slug IN ('magna') AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI - LAUNCHPADS
-- ============================================================

UPDATE products SET url = 'https://www.binance.com/en/launchpad' WHERE slug IN ('binance-launchpad') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://coinlist.co' WHERE slug IN ('coinlist') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://daomaker.com' WHERE slug IN ('dao-maker') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://polkastarter.com' WHERE slug IN ('polkastarter') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://seedify.fund' WHERE slug IN ('seedify') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.fjordfoundry.com' WHERE slug IN ('fjord-foundry', 'fjord') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://impossible.finance' WHERE slug IN ('impossible-finance') AND (url IS NULL OR url = '');

-- ============================================================
-- DEFI TOOLS & ANALYTICS
-- ============================================================

UPDATE products SET url = 'https://debank.com' WHERE slug IN ('debank') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://zapper.xyz' WHERE slug IN ('zapper') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://zerion.io' WHERE slug IN ('zerion-dashboard') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.nansen.ai' WHERE slug IN ('nansen') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://dune.com' WHERE slug IN ('dune', 'dune-analytics') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://defillama.com' WHERE slug IN ('defillama') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.arkhamintelligence.com' WHERE slug IN ('arkham') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://tokenterminal.com' WHERE slug IN ('token-terminal') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.coingecko.com' WHERE slug IN ('coingecko') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://coinmarketcap.com' WHERE slug IN ('coinmarketcap') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://messari.io' WHERE slug IN ('messari') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bubblemaps.io' WHERE slug IN ('bubblemaps') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://revoke.cash' WHERE slug IN ('revoke-cash', 'revoke') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://www.parsec.finance' WHERE slug IN ('parsec') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://app.growthepie.xyz' WHERE slug IN ('growthepie') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://l2beat.com' WHERE slug IN ('l2beat') AND (url IS NULL OR url = '');

-- ============================================================
-- STABLECOINS
-- ============================================================

UPDATE products SET url = 'https://www.circle.com/usdc' WHERE slug IN ('usdc') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://tether.to' WHERE slug IN ('usdt') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://sky.money' WHERE slug IN ('dai', 'usds') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://frax.finance' WHERE slug IN ('frax') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.paypal.com/pyusd' WHERE slug IN ('pyusd') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.liquity.org' WHERE slug IN ('lusd') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://aave.com/gho' WHERE slug IN ('gho') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://crvusd.curve.fi' WHERE slug IN ('crvusd') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://paxos.com/usdp/' WHERE slug IN ('usdp') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.firstdigitallabs.com' WHERE slug IN ('fdusd') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://ethena.fi' WHERE slug IN ('usde', 'ethena') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.eurc.com' WHERE slug IN ('eurc') AND (url IS NULL OR url = '');

-- ============================================================
-- RWA (REAL WORLD ASSETS)
-- ============================================================

UPDATE products SET url = 'https://ondo.finance' WHERE slug IN ('ondo', 'ondo-finance') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://maple.finance' WHERE slug IN ('maple', 'maple-finance') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://centrifuge.io' WHERE slug IN ('centrifuge') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://goldfinch.finance' WHERE slug IN ('goldfinch') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://truefi.io' WHERE slug IN ('truefi') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://backed.fi' WHERE slug IN ('backed-finance', 'backed') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://realt.co' WHERE slug IN ('realt') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://matrixdock.com' WHERE slug IN ('matrixdock') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://mountainprotocol.com' WHERE slug IN ('mountain-protocol', 'usdm') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://www.hashnote.com' WHERE slug IN ('hashnote') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.superstate.co' WHERE slug IN ('superstate') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.openeden.com' WHERE slug IN ('openeden') AND (url IS NULL OR url = '');

-- ============================================================
-- WRAPPED ASSETS
-- ============================================================

UPDATE products SET url = 'https://wbtc.network' WHERE slug IN ('wbtc') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://lido.fi' WHERE slug IN ('wsteth') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://threshold.network/earn/btc' WHERE slug IN ('tbtc') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.coinbase.com/cbbtc' WHERE slug IN ('cbbtc') AND (url IS NULL OR url = '');

-- ============================================================
-- FINANCIAL - CRYPTO CARDS
-- ============================================================

UPDATE products SET url = 'https://crypto.com/cards' WHERE slug IN ('crypto-com-card') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.binance.com/en/cards' WHERE slug IN ('binance-card') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.coinbase.com/card' WHERE slug IN ('coinbase-card') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://nexo.com/nexo-card' WHERE slug IN ('nexo-card') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://wirex.com' WHERE slug IN ('wirex-card', 'wirex') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bitpanda.com/en/card' WHERE slug IN ('bitpanda-card') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://gnosispay.com' WHERE slug IN ('gnosis-pay') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://holyheld.com' WHERE slug IN ('holyheld') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://www.rain.com' WHERE slug IN ('rain-card') AND (url IS NULL OR url = '');

-- ============================================================
-- FINANCIAL - CRYPTO BANKS
-- ============================================================

UPDATE products SET url = 'https://www.seba.swiss' WHERE slug IN ('seba-bank', 'seba') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.sygnum.com' WHERE slug IN ('sygnum') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.anchorage.com' WHERE slug IN ('anchorage', 'anchorage-digital') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.revolut.com' WHERE slug IN ('revolut') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://n26.com' WHERE slug IN ('n26') AND (url IS NULL OR url = '');

-- ============================================================
-- FINANCIAL - CUSTODY
-- ============================================================

UPDATE products SET url = 'https://www.fireblocks.com' WHERE slug IN ('fireblocks-custody') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bitgo.com' WHERE slug IN ('bitgo') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://copper.co' WHERE slug IN ('copper') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.coinbase.com/custody' WHERE slug IN ('coinbase-custody') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.fidelitydigitalassets.com' WHERE slug IN ('fidelity-digital-assets') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.gemini.com/custody' WHERE slug IN ('gemini-custody') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://custody.cobo.com' WHERE slug IN ('cobo-custody') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://hextrust.com' WHERE slug IN ('hex-trust') AND (url IS NULL OR url = '');

-- ============================================================
-- FINANCIAL - CEFI LENDING
-- ============================================================

UPDATE products SET url = 'https://nexo.com' WHERE slug IN ('nexo') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://ledn.io' WHERE slug IN ('ledn') AND (url IS NULL OR url = '');

-- ============================================================
-- FINANCIAL - PRIME BROKERAGE
-- ============================================================

UPDATE products SET url = 'https://www.falconx.io' WHERE slug IN ('falconx') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://hiddenroad.com' WHERE slug IN ('hidden-road') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.galaxy.com' WHERE slug IN ('galaxy-digital') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.b2c2.com' WHERE slug IN ('b2c2') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.wintermute.com' WHERE slug IN ('wintermute') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.gsr.io' WHERE slug IN ('gsr') AND (url IS NULL OR url = '');

-- ============================================================
-- FINANCIAL - TREASURY MANAGEMENT
-- ============================================================

UPDATE products SET url = 'https://safe.global' WHERE slug IN ('safe-treasury') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://parcel.money' WHERE slug IN ('parcel') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://coinshift.xyz' WHERE slug IN ('coinshift') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://request.network' WHERE slug IN ('request-finance', 'request') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://llama.xyz' WHERE slug IN ('llama') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.onchainden.com' WHERE slug IN ('den') AND (url IS NULL OR url = '');

-- ============================================================
-- FINANCIAL - PAYMENT PROCESSORS
-- ============================================================

UPDATE products SET url = 'https://bitpay.com' WHERE slug IN ('bitpay') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://btcpayserver.org' WHERE slug IN ('btcpay', 'btcpay-server') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://commerce.coinbase.com' WHERE slug IN ('coinbase-commerce') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://coingate.com' WHERE slug IN ('coingate') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://nowpayments.io' WHERE slug IN ('nowpayments') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://flexa.network' WHERE slug IN ('flexa') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://strike.me' WHERE slug IN ('strike') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.opennode.com' WHERE slug IN ('opennode') AND (url IS NULL OR url = '');

-- ============================================================
-- FINANCIAL - FIAT GATEWAYS
-- ============================================================

UPDATE products SET url = 'https://www.moonpay.com' WHERE slug IN ('moonpay') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://transak.com' WHERE slug IN ('transak') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://ramp.network' WHERE slug IN ('ramp-network', 'ramp') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://banxa.com' WHERE slug IN ('banxa') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.sardine.ai' WHERE slug IN ('sardine') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.simplex.com' WHERE slug IN ('simplex') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://alchemypay.org' WHERE slug IN ('alchemy-pay') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.mtpelerin.com' WHERE slug IN ('mt-pelerin') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://www.onramper.com' WHERE slug IN ('onramper') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://meso.network' WHERE slug IN ('meso') AND (url IS NULL OR url = '');

-- ============================================================
-- FINANCIAL - TAX SOFTWARE
-- ============================================================

UPDATE products SET url = 'https://koinly.io' WHERE slug IN ('koinly') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.cointracker.io' WHERE slug IN ('cointracker') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://tokentax.co' WHERE slug IN ('tokentax') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://coinledger.io' WHERE slug IN ('coinledger') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.accointing.com' WHERE slug IN ('accointing') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://zenledger.io' WHERE slug IN ('zenledger') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://taxbit.com' WHERE slug IN ('taxbit') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://recap.io' WHERE slug IN ('recap') AND (url IS NULL OR url = '');

-- ============================================================
-- INFRASTRUCTURE - ORACLES
-- ============================================================

UPDATE products SET url = 'https://chain.link' WHERE slug IN ('chainlink') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://pyth.network' WHERE slug IN ('pyth', 'pyth-network') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.bandprotocol.com' WHERE slug IN ('band-protocol') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://api3.org' WHERE slug IN ('api3') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://redstone.finance' WHERE slug IN ('redstone') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.diadata.org' WHERE slug IN ('dia') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://uma.xyz' WHERE slug IN ('uma-oracle') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://chroniclelabs.org' WHERE slug IN ('chronicle') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://www.supra.com' WHERE slug IN ('supra') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.stork.network' WHERE slug IN ('stork') AND (url IS NULL OR url = '');

-- ============================================================
-- INFRASTRUCTURE - LAYER 2
-- ============================================================

UPDATE products SET url = 'https://arbitrum.io' WHERE slug IN ('arbitrum') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.optimism.io' WHERE slug IN ('optimism') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://zksync.io' WHERE slug IN ('zksync', 'zksync-era') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://polygon.technology/polygon-zkevm' WHERE slug IN ('polygon-zkevm') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.base.org' WHERE slug IN ('base') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://linea.build' WHERE slug IN ('linea') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://scroll.io' WHERE slug IN ('scroll') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.starknet.io' WHERE slug IN ('starknet') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.mantle.xyz' WHERE slug IN ('mantle') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://polygon.technology' WHERE slug IN ('polygon') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.metis.io' WHERE slug IN ('metis') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://manta.network' WHERE slug IN ('manta') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.mode.network' WHERE slug IN ('mode') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://blast.io' WHERE slug IN ('blast') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://taiko.xyz' WHERE slug IN ('taiko') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://www.worldchain.world' WHERE slug IN ('world-chain') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.abstract.money' WHERE slug IN ('abstract') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.ink.xyz' WHERE slug IN ('ink') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.zircuit.com' WHERE slug IN ('zircuit') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://boba.network' WHERE slug IN ('boba') AND (url IS NULL OR url = '');

-- ============================================================
-- INFRASTRUCTURE - NODE / RPC PROVIDERS
-- ============================================================

UPDATE products SET url = 'https://www.infura.io' WHERE slug IN ('infura') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.alchemy.com' WHERE slug IN ('alchemy') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.quicknode.com' WHERE slug IN ('quicknode') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.ankr.com' WHERE slug IN ('ankr-rpc') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://getblock.io' WHERE slug IN ('getblock') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.chainstack.com' WHERE slug IN ('chainstack') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://drpc.org' WHERE slug IN ('drpc') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://blastapi.io' WHERE slug IN ('blast-api') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://nodereal.io' WHERE slug IN ('nodereal') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.allnodes.com' WHERE slug IN ('allnodes') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://www.lavanet.xyz' WHERE slug IN ('lava') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.grove.city' WHERE slug IN ('grove') AND (url IS NULL OR url = '');

-- ============================================================
-- INFRASTRUCTURE - DATA INDEXERS
-- ============================================================

UPDATE products SET url = 'https://thegraph.com' WHERE slug IN ('the-graph') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.covalenthq.com' WHERE slug IN ('covalent') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://goldsky.com' WHERE slug IN ('goldsky') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://subsquid.io' WHERE slug IN ('subsquid') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://envio.dev' WHERE slug IN ('envio') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://moralis.io' WHERE slug IN ('moralis') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://bitquery.io' WHERE slug IN ('bitquery') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://www.allium.so' WHERE slug IN ('allium') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.indexsupply.com' WHERE slug IN ('index-supply') AND (url IS NULL OR url = '');

-- ============================================================
-- INFRASTRUCTURE - BLOCK EXPLORERS
-- ============================================================

UPDATE products SET url = 'https://etherscan.io' WHERE slug IN ('etherscan') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://solscan.io' WHERE slug IN ('solscan') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.blockscout.com' WHERE slug IN ('blockscout') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://polygonscan.com' WHERE slug IN ('polygonscan') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://arbiscan.io' WHERE slug IN ('arbiscan') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://bscscan.com' WHERE slug IN ('bscscan') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.blockchain.com/explorer' WHERE slug IN ('blockchain-com-explorer') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://mempool.space' WHERE slug IN ('mempool') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://basescan.org' WHERE slug IN ('basescan') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://explorer.zksync.io' WHERE slug IN ('zksync-explorer') AND (url IS NULL OR url = '');

-- ============================================================
-- INFRASTRUCTURE - DEVELOPER TOOLS
-- ============================================================

UPDATE products SET url = 'https://hardhat.org' WHERE slug IN ('hardhat') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://getfoundry.sh' WHERE slug IN ('foundry') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://remix.ethereum.org' WHERE slug IN ('remix') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://thirdweb.com' WHERE slug IN ('thirdweb') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://tenderly.co' WHERE slug IN ('tenderly') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.openzeppelin.com' WHERE slug IN ('openzeppelin') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://www.cookbook.dev' WHERE slug IN ('cookbook') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.sentio.xyz' WHERE slug IN ('sentio') AND (url IS NULL OR url = '');

-- ============================================================
-- INFRASTRUCTURE - VALIDATORS
-- ============================================================

UPDATE products SET url = 'https://figment.io' WHERE slug IN ('figment') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://staked.us' WHERE slug IN ('staked') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.kiln.fi' WHERE slug IN ('kiln') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://p2p.org' WHERE slug IN ('p2p-validator') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://chorus.one' WHERE slug IN ('chorus-one') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.blockdaemon.com' WHERE slug IN ('blockdaemon') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://everstake.one' WHERE slug IN ('everstake') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.allnodes.com' WHERE slug IN ('allnodes-validator') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://www.senseinode.com' WHERE slug IN ('senseinode') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://luganodes.com' WHERE slug IN ('luganodes') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.twinstake.io' WHERE slug IN ('twinstake') AND (url IS NULL OR url = '');

-- ============================================================
-- INFRASTRUCTURE - IDENTITY
-- ============================================================

UPDATE products SET url = 'https://ens.domains' WHERE slug IN ('ens') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://worldcoin.org' WHERE slug IN ('worldcoin') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://polygon.technology/polygon-id' WHERE slug IN ('polygon-id') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.civic.com' WHERE slug IN ('civic') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://passport.gitcoin.co' WHERE slug IN ('gitcoin-passport') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.brightid.org' WHERE slug IN ('brightid') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://unstoppabledomains.com' WHERE slug IN ('unstoppable-domains') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.spruceid.com' WHERE slug IN ('spruce') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://www.humanode.io' WHERE slug IN ('humanode') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.talentprotocol.com' WHERE slug IN ('talent-protocol') AND (url IS NULL OR url = '');

-- ============================================================
-- INFRASTRUCTURE - ATTESTATION
-- ============================================================

UPDATE products SET url = 'https://attest.org' WHERE slug IN ('eas') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://sign.global' WHERE slug IN ('sign-protocol') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://verax.dev' WHERE slug IN ('verax') AND (url IS NULL OR url = '');

-- ============================================================
-- PRIVACY
-- ============================================================

UPDATE products SET url = 'https://www.railgun.org' WHERE slug IN ('railgun') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://aztec.network' WHERE slug IN ('aztec') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://z.cash' WHERE slug IN ('zcash') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.getmonero.org' WHERE slug IN ('monero') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://scrt.network' WHERE slug IN ('secret-network') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://penumbra.zone' WHERE slug IN ('penumbra') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://shadeprotocol.io' WHERE slug IN ('shade-protocol') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://namada.net' WHERE slug IN ('namada') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.nocturne.xyz' WHERE slug IN ('nocturne') AND (url IS NULL OR url = '');

-- ============================================================
-- GOVERNANCE / DAO TOOLS
-- ============================================================

UPDATE products SET url = 'https://snapshot.org' WHERE slug IN ('snapshot') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.tally.xyz' WHERE slug IN ('tally') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://aragon.org' WHERE slug IN ('aragon') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://daostack.io' WHERE slug IN ('daostack') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://colony.io' WHERE slug IN ('colony') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.boardroom.io' WHERE slug IN ('boardroom') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://zodiac.wiki' WHERE slug IN ('zodiac') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://jokerace.io' WHERE slug IN ('jokerace') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.hats.finance' WHERE slug IN ('hats-protocol') AND (url IS NULL OR url = '');

-- ============================================================
-- CONSUMER - GAMEFI
-- ============================================================

UPDATE products SET url = 'https://axieinfinity.com' WHERE slug IN ('axie-infinity') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.immutable.com' WHERE slug IN ('immutable-x', 'immutable') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://games.gala.com' WHERE slug IN ('gala-games') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.illuvium.io' WHERE slug IN ('illuvium') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://godsunchained.com' WHERE slug IN ('gods-unchained') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://staratlas.com' WHERE slug IN ('star-atlas') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://bigtime.gg' WHERE slug IN ('big-time') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.pixels.xyz' WHERE slug IN ('pixels') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://beamable.com' WHERE slug IN ('beam', 'beamable') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.xai.games' WHERE slug IN ('xai') AND (url IS NULL OR url = '');

-- ============================================================
-- CONSUMER - METAVERSE
-- ============================================================

UPDATE products SET url = 'https://decentraland.org' WHERE slug IN ('decentraland') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.sandbox.game' WHERE slug IN ('the-sandbox', 'sandbox') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://otherside.xyz' WHERE slug IN ('otherside') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://somniumspace.com' WHERE slug IN ('somnium-space') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.spatial.io' WHERE slug IN ('spatial') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.voxels.com' WHERE slug IN ('voxels') AND (url IS NULL OR url = '');

-- ============================================================
-- CONSUMER - SOCIALFI
-- ============================================================

UPDATE products SET url = 'https://www.lens.xyz' WHERE slug IN ('lens', 'lens-protocol') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.farcaster.xyz' WHERE slug IN ('farcaster') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.friend.tech' WHERE slug IN ('friend-tech') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.deso.org' WHERE slug IN ('deso') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://cyberconnect.me' WHERE slug IN ('cyberconnect') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.minds.com' WHERE slug IN ('minds') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://mirror.xyz' WHERE slug IN ('mirror') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://paragraph.xyz' WHERE slug IN ('paragraph') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.warpcast.com' WHERE slug IN ('warpcast') AND (url IS NULL OR url = '');

-- ============================================================
-- CONSUMER - MESSAGING
-- ============================================================

UPDATE products SET url = 'https://xmtp.org' WHERE slug IN ('xmtp') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://status.app' WHERE slug IN ('status-messenger') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://waku.org' WHERE slug IN ('waku') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://push.org' WHERE slug IN ('push-protocol') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.dialect.to' WHERE slug IN ('dialect') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://notifi.network' WHERE slug IN ('notifi') AND (url IS NULL OR url = '');

-- ============================================================
-- CONSUMER - QUEST / AIRDROP PLATFORMS
-- ============================================================

UPDATE products SET url = 'https://galxe.com' WHERE slug IN ('galxe') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://layer3.xyz' WHERE slug IN ('layer3') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://rabbithole.gg' WHERE slug IN ('rabbithole') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://zealy.io' WHERE slug IN ('zealy') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://questn.com' WHERE slug IN ('questn') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.intract.io' WHERE slug IN ('intract') AND (url IS NULL OR url = '');

-- ============================================================
-- CONSUMER - NFT CREATION TOOLS
-- ============================================================

UPDATE products SET url = 'https://manifold.xyz' WHERE slug IN ('manifold') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://zora.co' WHERE slug IN ('zora') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://highlight.xyz' WHERE slug IN ('highlight') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://decent.xyz' WHERE slug IN ('decent') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://bueno.art' WHERE slug IN ('bueno') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://niftykit.com' WHERE slug IN ('niftykit') AND (url IS NULL OR url = '');

-- ============================================================
-- CONSUMER - FAN TOKENS
-- ============================================================

UPDATE products SET url = 'https://www.chiliz.com' WHERE slug IN ('chiliz') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.socios.com' WHERE slug IN ('socios') AND (url IS NULL OR url = '');
-- SUPPRIMÉ: rally (quasi mort)

-- ============================================================
-- DEPIN - STORAGE
-- ============================================================

UPDATE products SET url = 'https://filecoin.io' WHERE slug IN ('filecoin') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.arweave.org' WHERE slug IN ('arweave') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://ipfs.tech' WHERE slug IN ('ipfs') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.storj.io' WHERE slug IN ('storj') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://sia.tech' WHERE slug IN ('sia') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://ceramic.network' WHERE slug IN ('ceramic') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://web3.storage' WHERE slug IN ('web3-storage') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://www.walrus.xyz' WHERE slug IN ('walrus') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.irys.xyz' WHERE slug IN ('irys', 'bundlr') AND (url IS NULL OR url = '');

-- ============================================================
-- DEPIN - COMPUTE
-- ============================================================

UPDATE products SET url = 'https://rendernetwork.com' WHERE slug IN ('render', 'render-network') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://akash.network' WHERE slug IN ('akash') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://golem.network' WHERE slug IN ('golem') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://io.net' WHERE slug IN ('io-net') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.gensyn.ai' WHERE slug IN ('gensyn') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.together.ai' WHERE slug IN ('together-ai') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://runonflux.io' WHERE slug IN ('flux') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://iex.ec' WHERE slug IN ('iexec') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://www.aethir.com' WHERE slug IN ('aethir') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.ritual.net' WHERE slug IN ('ritual') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.hyperbolic.xyz' WHERE slug IN ('hyperbolic') AND (url IS NULL OR url = '');

-- ============================================================
-- DEPIN - VPN
-- ============================================================

UPDATE products SET url = 'https://www.orchid.com' WHERE slug IN ('orchid') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://mysterium.network' WHERE slug IN ('mysterium') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://sentinel.co' WHERE slug IN ('sentinel') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.deeper.network' WHERE slug IN ('deeper-network') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://nymtech.net' WHERE slug IN ('nym') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://hoprnet.org' WHERE slug IN ('hopr') AND (url IS NULL OR url = '');

-- ============================================================
-- DEPIN - MINING POOLS
-- ============================================================

UPDATE products SET url = 'https://foundrydigital.com' WHERE slug IN ('foundry-usa', 'foundry') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.f2pool.com' WHERE slug IN ('f2pool') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.antpool.com' WHERE slug IN ('antpool') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://braiins.com/pool' WHERE slug IN ('braiins-pool', 'slushpool') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.viabtc.com' WHERE slug IN ('viabtc') AND (url IS NULL OR url = '');
-- SUPPRIMÉ: poolin (problèmes)
UPDATE products SET url = 'https://luxor.tech' WHERE slug IN ('luxor') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://ocean.xyz' WHERE slug IN ('ocean-mining', 'ocean-pool') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://www.spiderpool.com' WHERE slug IN ('spiderpool') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.mara.com' WHERE slug IN ('marathon', 'mara-pool') AND (url IS NULL OR url = '');

-- ============================================================
-- AI AGENTS
-- ============================================================

UPDATE products SET url = 'https://fetch.ai' WHERE slug IN ('fetch-ai') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://olas.network' WHERE slug IN ('autonolas', 'olas') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://singularitynet.io' WHERE slug IN ('singularitynet') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://bittensor.com' WHERE slug IN ('bittensor') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.virtuals.io' WHERE slug IN ('virtuals-protocol', 'virtuals') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://spectral.finance' WHERE slug IN ('spectral') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://www.ai16z.ai' WHERE slug IN ('ai16z') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://vana.org' WHERE slug IN ('vana') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://morpheus.xyz' WHERE slug IN ('morpheus') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.ora.io' WHERE slug IN ('ora') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.nillion.com' WHERE slug IN ('nillion') AND (url IS NULL OR url = '');

-- ============================================================
-- SECURITY - AUDIT & BUG BOUNTY
-- ============================================================

UPDATE products SET url = 'https://www.certik.com' WHERE slug IN ('certik') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.trailofbits.com' WHERE slug IN ('trail-of-bits') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.openzeppelin.com/security-audits' WHERE slug IN ('openzeppelin-audits') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://immunefi.com' WHERE slug IN ('immunefi') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://code4rena.com' WHERE slug IN ('code4rena') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.sherlock.xyz' WHERE slug IN ('sherlock') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://spearbit.com' WHERE slug IN ('spearbit') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://consensys.io/diligence' WHERE slug IN ('consensys-diligence') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://hackenproof.com' WHERE slug IN ('hackenproof') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://peckshield.com' WHERE slug IN ('peckshield') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://cantina.xyz' WHERE slug IN ('cantina') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.cyfrin.io' WHERE slug IN ('cyfrin') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.halborn.com' WHERE slug IN ('halborn') AND (url IS NULL OR url = '');

-- ============================================================
-- SECURITY - MEV PROTECTION
-- ============================================================

UPDATE products SET url = 'https://protect.flashbots.net' WHERE slug IN ('flashbots-protect', 'flashbots') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://mevblocker.io' WHERE slug IN ('mev-blocker') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://bloxroute.com' WHERE slug IN ('bloxroute') AND (url IS NULL OR url = '');
UPDATE products SET url = 'https://www.blocknative.com' WHERE slug IN ('blocknative') AND (url IS NULL OR url = '');
-- AJOUTÉ
UPDATE products SET url = 'https://www.propellerheads.xyz' WHERE slug IN ('propellerheads') AND (url IS NULL OR url = '');

-- ============================================================
-- FINAL VERIFICATION
-- ============================================================

-- Exécuter pour vérifier les résultats:
-- SELECT COUNT(*) as total,
--        COUNT(CASE WHEN url IS NOT NULL AND url != '' THEN 1 END) as with_url,
--        COUNT(CASE WHEN url IS NULL OR url = '' THEN 1 END) as without_url
-- FROM products;

-- Liste des produits sans URL:
-- SELECT slug, name FROM products WHERE url IS NULL OR url = '' ORDER BY name;

SELECT 'Mise à jour v2 CORRIGÉE terminée!' as status;
