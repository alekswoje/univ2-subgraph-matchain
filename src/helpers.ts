import { BigInt, Address, log } from "@graphprotocol/graph-ts"
import { Player, PlatformData, Token, PlayerTokenBalance } from "../generated/schema"
import { ERC20 } from '../generated/MatchainCoinflip-asdadfsafaf/ERC20'
import { ERC20SymbolBytes } from '../generated/MatchainCoinflip-asdadfsafaf/ERC20SymbolBytes'
import { ERC20NameBytes } from '../generated/MatchainCoinflip-asdadfsafaf/ERC20NameBytes'


// --- Constants ---
export const ZERO_BI = BigInt.fromI32(0)
export const ONE_BI = BigInt.fromI32(1)
export const PLATFORM_DATA_ID = "1"

export function isNullEthValue(value: string): boolean {
  return value == '0x0000000000000000000000000000000000000000000000000000000000000001'
}

export function fetchTokenSymbol(tokenAddress: Address): string {
  let contract = ERC20.bind(tokenAddress)
  let contractSymbolBytes = ERC20SymbolBytes.bind(tokenAddress)

  // try types string and bytes32 for symbol
  let symbolValue = 'unknown'
  let symbolResult = contract.try_symbol()
  if (symbolResult.reverted) {
    let symbolResultBytes = contractSymbolBytes.try_symbol()
    if (!symbolResultBytes.reverted) {
      // for broken pairs that have no symbol function exposed
      if (!isNullEthValue(symbolResultBytes.value.toHexString())) {
        symbolValue = symbolResultBytes.value.toString()
      }
    }
  } else {
    symbolValue = symbolResult.value
  }

  return symbolValue
}

export function fetchTokenDecimals(tokenAddress: Address): BigInt {
  let contract = ERC20.bind(tokenAddress)
  // try types uint8 for decimals
  let decimalValue = BigInt.fromI32(18) // Default to 18 decimals
  let decimalResult = contract.try_decimals()
  if (!decimalResult.reverted) {
    decimalValue = decimalResult.value
  }
  return decimalValue
}


export function loadOrInitializePlayer(address: Address): Player {
  log.info("Loading or initializing player: {}", [address.toHexString()]);
  let player = Player.load(address.toHexString())
  if (player === null) {
    log.info("Creating new player: {}", [address.toHexString()]);
    player = new Player(address.toHexString())
    player.totalFlips = ZERO_BI
    player.wins = ZERO_BI
    player.losses = ZERO_BI
    player.totalWinnings = ZERO_BI
    player.save()

    const platform = loadOrInitializePlatform()
    platform.uniquePlayers = platform.uniquePlayers.plus(ONE_BI)
    platform.save()
  }
  return player
}

export function loadOrInitializePlatform(): PlatformData {
    log.info("Loading or initializing platform", []);
    let platform = PlatformData.load(PLATFORM_DATA_ID)
    if (platform === null) {
        log.info("Creating new platform", []);
        platform = new PlatformData(PLATFORM_DATA_ID)
        platform.totalFlips = ZERO_BI
        platform.uniquePlayers = ZERO_BI
        platform.totalPendingWithdrawals = ZERO_BI
        platform.save()
    }
    return platform as PlatformData
}

export function loadOrInitializeToken(tokenAddress: Address): Token {
  log.info("Loading or initializing token: {}", [tokenAddress.toHexString()]);
  let token = Token.load(tokenAddress.toHexString())
  if (token === null) {
    log.info("Creating new token: {}", [tokenAddress.toHexString()]);
    token = new Token(tokenAddress.toHexString())
    if (tokenAddress.toHexString() == "0x0000000000000000000000000000000000000000") {
      token.symbol = "BNB"
      token.decimals = 18
    } else {
      token.symbol = fetchTokenSymbol(tokenAddress)
      token.decimals = fetchTokenDecimals(tokenAddress).toI32()
    }
    token.totalVolume = ZERO_BI
    token.pendingWithdrawals = ZERO_BI
    token.save()
  }
  return token as Token
}

export function loadOrInitializePlayerTokenBalance(player: Player, token: Token): PlayerTokenBalance {
    const balanceId = player.id + "-" + token.id
    log.info("Loading or initializing player token balance: {}", [balanceId]);
    let balance = PlayerTokenBalance.load(balanceId)
    if (balance === null) {
        log.info("Creating new player token balance: {}", [balanceId]);
        balance = new PlayerTokenBalance(balanceId)
        balance.player = player.id
        balance.token = token.id
        balance.totalVolume = ZERO_BI
        balance.sessionBalance = ZERO_BI
        balance.save()
    }
    return balance as PlayerTokenBalance
} 