import { Address, log } from "@graphprotocol/graph-ts"
import {
  FlipCreated,
  FlipResolved,
  FlipAccepted,
} from "../generated/MatchainCoinflip-asdadfsafaf/CoinflipGame"
import { Flip } from "../generated/schema"
import {
  loadOrInitializePlayer,
  loadOrInitializeToken,
  loadOrInitializePlayerTokenBalance,
  loadOrInitializePlatform,
  ONE_BI,
} from "./helpers"

// --- Event Handlers ---

export function handleFlipCreated(event: FlipCreated): void {
  log.info("--- Handling FlipCreated: id {} ---", [event.params.id.toString()]);
  const creator = loadOrInitializePlayer(event.params.creator)
  const token = loadOrInitializeToken(event.params.tokenAddress)

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