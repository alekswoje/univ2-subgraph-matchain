import { ethereum, BigInt, Address, log } from "@graphprotocol/graph-ts"
import {
  FlipCreated,
  FlipResolved,
  FlipAccepted
} from "./types/MatchainCoinflip-asdadfsafaf/CoinflipGame"
import { Player, Flip, PlayerTokenBalance, PlatformData, Token } from "./types/schema"

// --- Constants ---
const ZERO_BI = BigInt.fromI32(0)
const ONE_BI = BigInt.fromI32(1)
const PLATFORM_DATA_ID = "1"
const NATIVE_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000"

// --- Helper Functions ---

function loadOrInitializePlayer(address: Address): Player {
  log.info("Loading or initializing player: {}", [address.toHexString()]);
  let player = Player.load(address.toHexString())
  if (player === null) {
    log.info("Creating new player: {}", [address.toHexString()]);
    player = new Player(address.toHexString())
    player.totalFlips = ZERO_BI
    player.wins = ZERO_BI
    player.losses = ZERO_BI
    player.save()

    const platform = loadOrInitializePlatform()
    platform.uniquePlayers = platform.uniquePlayers.plus(ONE_BI)
    platform.save()
  }
  return player
}

function loadOrInitializePlatform(): PlatformData {
    log.info("Loading or initializing platform", []);
    let platform = PlatformData.load(PLATFORM_DATA_ID)
    if (platform === null) {
        log.info("Creating new platform", []);
        platform = new PlatformData(PLATFORM_DATA_ID)
        platform.totalFlips = ZERO_BI
        platform.uniquePlayers = ZERO_BI
        platform.save()
    }
    return platform as PlatformData
}

function loadOrInitializeToken(tokenAddress: Address): Token {
  log.info("Loading or initializing token: {}", [tokenAddress.toHexString()]);
  let token = Token.load(tokenAddress.toHexString())
  if (token === null) {
    log.info("Creating new token: {}", [tokenAddress.toHexString()]);
    token = new Token(tokenAddress.toHexString())
    token.symbol = "MATCH"
    token.decimals = 18 
    token.totalVolume = ZERO_BI
    token.save()
  }
  return token as Token
}

function loadOrInitializePlayerTokenBalance(player: Player, token: Token): PlayerTokenBalance {
    const balanceId = player.id + "-" + token.id
    log.info("Loading or initializing player token balance: {}", [balanceId]);
    let balance = PlayerTokenBalance.load(balanceId)
    if (balance === null) {
        log.info("Creating new player token balance: {}", [balanceId]);
        balance = new PlayerTokenBalance(balanceId)
        balance.player = player.id
        balance.token = token.id
        balance.totalVolume = ZERO_BI
        balance.save()
    }
    return balance as PlayerTokenBalance
}

// --- Event Handlers ---

export function handleFlipCreated(event: FlipCreated): void {
  log.info("--- Handling FlipCreated: id {} ---", [event.params.id.toString()]);
  const creator = loadOrInitializePlayer(event.params.creator)
  const token = loadOrInitializeToken(Address.fromString(NATIVE_TOKEN_ADDRESS))

  const flipId = event.params.id.toString()
  log.info("Creating new Flip: {}", [flipId]);
  const flip = new Flip(flipId)
  flip.creator = creator.id
  flip.token = token.id
  flip.amount = event.params.amount
  flip.createdAt = event.block.timestamp
  flip.createdTx = event.transaction.hash
  flip.save()
  log.info("Flip {} saved", [flipId]);

  creator.totalFlips = creator.totalFlips.plus(ONE_BI)
  creator.save()
  
  const playerTokenBalance = loadOrInitializePlayerTokenBalance(creator, token)
  playerTokenBalance.totalVolume = playerTokenBalance.totalVolume.plus(event.params.amount)
  playerTokenBalance.save()

  const platform = loadOrInitializePlatform()
  platform.totalFlips = platform.totalFlips.plus(ONE_BI)
  platform.save()

  token.totalVolume = token.totalVolume.plus(event.params.amount)
  token.save()
  log.info("--- Finished FlipCreated: id {} ---", [event.params.id.toString()]);
}

export function handleFlipAccepted(event: FlipAccepted): void {
  log.info("--- Handling FlipAccepted: id {} ---", [event.params.id.toString()]);
  const flipId = event.params.id.toString()
  const flip = Flip.load(flipId)

  if (flip === null) {
    log.error("CRITICAL: Accepted a flip that doesn't exist: {}", [flipId])
    return
  }
  
  const acceptor = loadOrInitializePlayer(event.params.acceptor)
  
  flip.acceptor = acceptor.id
  flip.save()
  log.info("Flip {} updated with acceptor {}", [flipId, acceptor.id]);

  acceptor.totalFlips = acceptor.totalFlips.plus(ONE_BI)
  acceptor.save()

  const token = loadOrInitializeToken(Address.fromString(flip.token))
  const playerTokenBalance = loadOrInitializePlayerTokenBalance(acceptor, token)
  playerTokenBalance.totalVolume = playerTokenBalance.totalVolume.plus(flip.amount)
  playerTokenBalance.save()
  log.info("--- Finished FlipAccepted: id {} ---", [event.params.id.toString()]);
}

export function handleFlipResolved(event: FlipResolved): void {
  log.info("--- Handling FlipResolved: id {} ---", [event.params.id.toString()]);
  const flipId = event.params.id.toString()
  const winnerAddress = event.params.winner
  
  const flip = Flip.load(flipId)
  if (flip === null) {
    log.error("CRITICAL: Resolved a flip that doesn't exist: {}", [flipId])
    return
  }
  if (flip.acceptor === null) {
    log.error("CRITICAL: Resolved a flip with no acceptor: {}", [flipId])
    return
  }

  const winner = loadOrInitializePlayer(winnerAddress)
  const creator = loadOrInitializePlayer(Address.fromString(flip.creator))
  const acceptor = loadOrInitializePlayer(Address.fromString(flip.acceptor!))

  flip.resolvedAt = event.block.timestamp
  flip.resolvedTx = event.transaction.hash
  flip.winner = winner.id
  flip.save()
  log.info("Flip {} resolved with winner {}", [flipId, winner.id]);

  if (winner.id == creator.id) {
    creator.wins = creator.wins.plus(ONE_BI)
    acceptor.losses = acceptor.losses.plus(ONE_BI)
  } else {
    acceptor.wins = acceptor.wins.plus(ONE_BI)
    creator.losses = creator.losses.plus(ONE_BI)
  }

  creator.save()
  acceptor.save()
  log.info("--- Finished FlipResolved: id {} ---", [event.params.id.toString()]);
} 