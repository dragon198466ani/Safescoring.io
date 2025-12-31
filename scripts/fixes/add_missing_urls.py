#!/usr/bin/env python3
"""Add missing URLs for products without URL"""

import requests
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from scripts.translate_supabase_data import SUPABASE_URL, SUPABASE_KEY

# Known URLs for products that might be missing
KNOWN_URLS = {
    'Autofarm': 'https://autofarm.network',
    'BitGo': 'https://www.bitgo.com',
    'Bitpanda': 'https://www.bitpanda.com',
    'BitPay Card': 'https://bitpay.com/card',
    'BitPlates Domino': 'https://www.bitplates.com',
    'Bleap Card': 'https://bleap.io',
    'BlockBar': 'https://blockbar.com',
    'BlockFi Card': 'https://blockfi.com',
    'Blockstream Green': 'https://blockstream.com/green',
    'Bolero Music': 'https://bolero.xyz',
    'Breez Wallet': 'https://breez.technology',
    'Carbon Wallet': 'https://carbonwallet.com',
    'Celer cBridge': 'https://cbridge.celer.network',
    'COCA Card': 'https://coca.xyz',
    'Coinkite SATSCARD': 'https://satscard.com',
    'Coinkite TAPSIGNER': 'https://tapsigner.com',
    'Coinplate Alpha': 'https://coinplate.com',
    'COLDTI': 'https://coldti.com',
    'Copper ClearLoop': 'https://copper.co',
    'Crypto.com Exchange': 'https://crypto.com/exchange',
    'Cryptopay Card': 'https://cryptopay.me',
    'CryptoTag Zeus': 'https://cryptotag.io',
    'Cypherock X1': 'https://cypherock.com',
    'DeFi Saver': 'https://defisaver.com',
    'Dopex': 'https://dopex.io',
    'Ellipal Mnemonic Metal': 'https://www.ellipal.com',
    'eToro Card': 'https://www.etoro.com',
    'Euler Finance': 'https://euler.finance',
    'Fireblocks': 'https://www.fireblocks.com',
    'Fold Card': 'https://foldapp.com',
    'Foundation Passport': 'https://foundationdevices.com',
    'Frax Ether': 'https://frax.finance',
    'Fraxlend': 'https://frax.finance/fraxlend',
    'Gains Network': 'https://gains.trade',
    'Gemini Card': 'https://www.gemini.com/credit-card',
    'Glacier Protocol': 'https://glacierprotocol.org',
    'GoMining': 'https://gomining.com',
    'Harvest Finance': 'https://harvest.finance',
    'HashWallet': 'https://hashwallet.co',
    'Hegic': 'https://www.hegic.co',
    'Instadapp': 'https://instadapp.io',
    'Paycent Card': 'https://paycent.com',
    'Ren Bridge': 'https://renproject.io',
    'SAFU Ninja': 'https://safu.ninja',
    'SeedPlate': 'https://seedplate.com',
    'Shakepay Card': 'https://shakepay.com',
    'Solayer Emerald': 'https://solayer.org',
    'SpectroCoin Card': 'https://spectrocoin.com',
    'Swipe Card': 'https://swipe.io',
    'TenX Card': 'https://tenx.tech',
    'Trastra Card': 'https://trastra.com',
    'Jito': 'https://jito.network',
    'Keystone Nexus': 'https://keyst.one',
    'Krux': 'https://selfcustody.github.io/krux',
    'LlamaPay': 'https://llamapay.io',
    'Lyra Finance': 'https://lyra.finance',
    'MakerDAO': 'https://makerdao.com',
    'Marinade Finance': 'https://marinade.finance',
    'Material Bitcoin': 'https://materialbitcoin.com',
    'Maya Protocol': 'https://mayaprotocol.com',
    'Mercuryo Card': 'https://mercuryo.io',
    'Meria': 'https://meria.com',
    'Morpho': 'https://morpho.org',
    'Muun Wallet': 'https://muun.com',
    'N26': 'https://n26.com',
    'Nexo': 'https://nexo.io',
    'Nexo Card': 'https://nexo.io/nexo-card',
    'Nunchuk': 'https://nunchuk.io',
    'OKX': 'https://www.okx.com',
    'Ondo Finance': 'https://ondo.finance',
    'OneKey Classic': 'https://onekey.so',
    'OneKey Pro': 'https://onekey.so',
    'Pendle': 'https://pendle.finance',
    'Pickle Finance': 'https://pickle.finance',
    'Prokey Optimum': 'https://prokey.io',
    'Radiant Capital': 'https://radiant.capital',
    'Rainbow Wallet': 'https://rainbow.me',
    'RealT': 'https://realt.co',
    'Rocket Pool': 'https://rocketpool.net',
    'Safe Wallet': 'https://safe.global',
    'Samourai Wallet': 'https://samouraiwallet.com',
    'Satochip': 'https://satochip.io',
    'SeedSigner': 'https://seedsigner.com',
    'Seedor': 'https://seedor.io',
    'Sommelier': 'https://sommelier.finance',
    'Spark Protocol': 'https://sparkprotocol.io',
    'StakeWise': 'https://stakewise.io',
    'Stargate': 'https://stargate.finance',
    'Status Keycard': 'https://status.im/keycard',
    'SteelDisk': 'https://steeldisk.com',
    'SushiSwap': 'https://sushi.com',
    'Synapse Protocol': 'https://synapseprotocol.com',
    'Synthetix': 'https://synthetix.io',
    'THORChain': 'https://thorchain.org',
    'Trezor Keep Metal': 'https://trezor.io/trezor-keep-metal',
    'Trezor Model One': 'https://trezor.io/trezor-model-one',
    'Trezor Model T': 'https://trezor.io/trezor-model-t',
    'Trezor Safe 3': 'https://trezor.io/trezor-safe-3',
    'Trezor Safe 5': 'https://trezor.io/trezor-safe-5',
    'Trezor Safe 7': 'https://trezor.io/trezor-safe-7',
    'Trezor Shamir Backup': 'https://trezor.io/learn/a/what-is-shamir-backup',
    'Unchained Capital': 'https://unchained.com',
    'Vault12 Guard': 'https://vault12.com',
    'Wormhole': 'https://wormhole.com',
    'Xapo Bank': 'https://xapo.com',
    'Yearn Finance': 'https://yearn.fi',
    'YubiKey 5': 'https://www.yubico.com',
    'Zapper': 'https://zapper.xyz',
    'Zerion': 'https://zerion.io',
    'Gnosis Pay': 'https://gnosispay.com',
    'Holyheld': 'https://holyheld.com',
    'Baanx CryptoLife': 'https://baanx.com',
    'Wirex': 'https://wirexapp.com',
    'Wirex Card': 'https://wirexapp.com/card',
    'Kwenta': 'https://kwenta.eth.limo',
    'dYdX': 'https://dydx.exchange',
    'Lido': 'https://lido.fi',
    'Arbitrum Bridge': 'https://bridge.arbitrum.io',
    'Axelar': 'https://axelar.network',
    'Base Bridge': 'https://base.org',
    'Connext': 'https://connext.network',
    'deBridge': 'https://debridge.finance',
    'Hyperlane': 'https://hyperlane.xyz',
    'LayerZero': 'https://layerzero.network',
    'LI.FI': 'https://li.fi',
    'Orbiter Finance': 'https://orbiter.finance',
    'Portal Bridge (Wormhole)': 'https://portalbridge.com',
    'Router Protocol': 'https://routerprotocol.com',
    'Socket': 'https://socket.tech',
    'Squid Router': 'https://squidrouter.com',
    'Allbridge': 'https://allbridge.io',
    'Bungee Exchange': 'https://bungee.exchange',
    'Chainflip': 'https://chainflip.io',
    'Keystone 3 Pro': 'https://keyst.one',
    'Keystone Essential': 'https://keyst.one',
    'Keystone Pro': 'https://keyst.one',
    'Keystone Tablet': 'https://keyst.one',
    'Keystone Tablet Plus': 'https://keyst.one',
    'Ledger Enterprise': 'https://enterprise.ledger.com',
    'Ledger Flex': 'https://www.ledger.com/flex',
    'Ledger Live': 'https://www.ledger.com/ledger-live',
    'Ledger Nano S': 'https://www.ledger.com/products/ledger-nano-s',
    'Ledger Nano S Plus': 'https://www.ledger.com/products/ledger-nano-s-plus',
    'Ledger Nano X': 'https://www.ledger.com/products/ledger-nano-x',
    'Ledger Recover': 'https://www.ledger.com/recover',
    'Ledger Stax': 'https://www.ledger.com/stax',
    'Coldcard Mk4': 'https://coldcard.com',
    'Coldcard Q': 'https://coldcard.com/q',
    'Jade': 'https://blockstream.com/jade',
    'BitBox02': 'https://bitbox.swiss',
    'Billfodl': 'https://privacypros.io/products/billfodl',
    'Blockplate': 'https://www.blockplate.com',
    'Blockplate 24': 'https://www.blockplate.com',
    'NGRAVE GRAPHENE': 'https://www.ngrave.io',
    'NGRAVE ZERO': 'https://www.ngrave.io',
    'Cryptosteel Capsule': 'https://cryptosteel.com',
    'Cryptosteel Cassette': 'https://cryptosteel.com',
    'CryptoTag Thor': 'https://cryptotag.io',
    'SeedXOR': 'https://seedxor.com',
    'Ballet REAL Bitcoin': 'https://www.balletcrypto.com',
    'Casa': 'https://casa.io',
    'Hermit (Unchained)': 'https://unchained.com/hermit',
    'Liana Wallet': 'https://wizardsardine.com/liana',
    'Wasabi Wallet': 'https://wasabiwallet.io',
    'Exodus': 'https://www.exodus.com',
    'MetaMask': 'https://metamask.io',
    'MetaMask Card': 'https://metamask.io',
    'Uniswap Wallet': 'https://uniswap.org/wallet',
    'Coinbase Card': 'https://www.coinbase.com/card',
    'Coinbase cbETH': 'https://www.coinbase.com/cbeth',
    'Coinbase Exchange': 'https://www.coinbase.com',
    'Binance': 'https://www.binance.com',
    'Binance Card': 'https://www.binance.com/en/cards',
    'Bybit': 'https://www.bybit.com',
    'KuCoin': 'https://www.kucoin.com',
    'Kraken': 'https://www.kraken.com',
    'AMINA Bank': 'https://aminagroup.com',
    'Deblock': 'https://deblock.com',
    'Deblock Card': 'https://deblock.com',
    'Benqi': 'https://benqi.fi',
    'Aave': 'https://aave.com',
    'Convex Finance': 'https://convexfinance.com',
    'Beefy Finance': 'https://beefy.com',
    'Balancer': 'https://balancer.fi',
    'Optimism Bridge': 'https://optimism.io',
    '1inch': 'https://1inch.io',
    '1inch Card': 'https://1inch.io',
    'Uniswap': 'https://uniswap.org',
    'Curve Finance': 'https://curve.fi',
    'Compound': 'https://compound.finance',
    'GMX': 'https://gmx.io',
    'PancakeSwap': 'https://pancakeswap.finance',
    'Venus Protocol': 'https://venus.io',
    'ParaSwap': 'https://paraswap.io',
    'THORSwap': 'https://thorswap.finance',
    'DeBank': 'https://debank.com',
    'Hop Protocol': 'https://hop.exchange',
    'Multichain (Anyswap)': 'https://multichain.org',
    'Gravity Bridge': 'https://www.gravitybridge.net',
    'StarkGate (StarkNet)': 'https://starkware.co/starknet',
    'zkSync Bridge': 'https://zksync.io',
    'Polygon Bridge': 'https://polygon.technology',
    'Phoenix Wallet': 'https://phoenix.acinq.co',
    'Rabby Wallet': 'https://rabby.io',
    'Zeus Wallet': 'https://zeusln.com',
    'Specter Desktop': 'https://specter.solutions',
    'Specter DIY': 'https://specter.solutions/hardware',
    'Seed Phrase Steel': 'https://bitcoinseedbackup.com',
    'Steelwallet': 'https://shiftcrypto.ch/steelwallet/',
    'Revolut': 'https://www.revolut.com/crypto',
    'Sygnum Bank': 'https://www.sygnum.com',
    'Trust Wallet': 'https://trustwallet.com',
}

def main():
    h = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}'
    }
    
    patch_h = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    # Get products without URL
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?url=is.null&select=id,name',
        headers=h
    )
    
    if r.status_code != 200:
        print(f'Error: {r.status_code}')
        return
    
    products_no_url = r.json()
    print(f'📦 Products without URL: {len(products_no_url)}')
    print('=' * 60)
    
    if not products_no_url:
        print('✅ All products have URLs!')
        return
    
    added = 0
    not_found = []
    
    for p in products_no_url:
        name = p['name']
        print(f'  {name:<35}', end=' ')
        
        if name in KNOWN_URLS:
            url = KNOWN_URLS[name]
            r = requests.patch(
                f"{SUPABASE_URL}/rest/v1/products?id=eq.{p['id']}",
                headers=patch_h,
                json={'url': url}
            )
            if r.status_code in [200, 204]:
                print(f'✅ {url}')
                added += 1
            else:
                print(f'❌ DB error: {r.status_code}')
        else:
            print(f'⚠️ URL not found in database')
            not_found.append(name)
        
        time.sleep(0.1)
    
    print('\n' + '=' * 60)
    print(f'✅ URLs added: {added}')
    print(f'⚠️ Not found: {len(not_found)}')
    
    if not_found:
        print('\n⚠️ Products still missing URLs:')
        for name in not_found:
            print(f'   - {name}')

if __name__ == '__main__':
    main()
