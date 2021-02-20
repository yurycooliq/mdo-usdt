require('dotenv').config({})
const { get } = require('axios')
const Web3 = require('web3')
const web3 = new Web3(process.env.BSC_RPC)
const user = process.env.USER_ADDRESS

const getPrice = async (tokenID, priceSource) => {
    const price = await get(`https://api.coingecko.com/api/v3/coins/${tokenID}/tickers`)
    return price && price.data.tickers[priceSource].converted_last.usd
}

module.exports = async (poolAddress, token1ID, token2ID, poolID, rewardPoolID, token1PriceSource, token2PriceSource, name, deposit = 0) => {
    const pool = new web3.eth.Contract(require('./abis/pool.json'), poolAddress, web3)
    const vault = new web3.eth.Contract(require('./abis/vault.json'), "0xB390B07fcF76678089cb12d8E615d5Fe494b01Fb", web3)

    const token1Price   = +(await getPrice(token1ID, token1PriceSource))//$
    const token2Price   = +(await getPrice(token2ID, token2PriceSource))//$
    const totalSupply   = +(await pool.methods.totalSupply().call())
    const reserves      = await pool.methods.getReserves().call()
    const amount        = +(await vault.methods.stakedWantTokens(poolID, user).call()) / 1e18
    const unclaimed     = +(await vault.methods.pendingReward(poolID, rewardPoolID, user).call()) / 1e18
    const lpTokenPrice  = ((+reserves[0] * token1Price) + (+reserves[1] * token2Price)) / totalSupply
    const tvl           = lpTokenPrice * totalSupply

    const info = {}
    info.name           = name
    info.lp_token_price = formatToDollarView(lpTokenPrice),
    info.token1_price   = formatToDollarView(token1Price)
    info.token2_price   = formatToDollarView(token2Price)
    info.TVL            = formatToDollarView(tvl / 1e18),
    info.lp_amount      = amount.toFixed(6),
    info.bdo_reward     = unclaimed.toFixed(6),
    info.lp_cost        = formatToDollarView(amount * lpTokenPrice),
    info.profit         = formatToDollarView(amount * lpTokenPrice - deposit) 

    return info
}

const formatToDollarView = num => {
    const negative = num < 0
    const symbol = negative ? "-$" : "$"
    if (negative) num *= -1
    return symbol + num.toLocaleString('en-US', {maximumFractionDigits: 2})
}
