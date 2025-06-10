import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  FlipCreated,
  FlipAccepted,
  FlipResolved,
  FlipCancelled
} from "../generated/MatchainCoinflip-asdadfsafaf/CoinflipGame"

export function createFlipCreatedEvent(
  id: BigInt,
  creator: Address,
  amount: BigInt,
  tokenAddress: Address
): FlipCreated {
  let mockEvent = newMockEvent()
  let newFlipEvent = new FlipCreated(
    mockEvent.address,
    mockEvent.logIndex,
    mockEvent.transactionLogIndex,
    mockEvent.logType,
    mockEvent.block,
    mockEvent.transaction,
    mockEvent.parameters,
    mockEvent.receipt
  )

  newFlipEvent.parameters = new Array()
  let idParam = new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  let creatorParam = new ethereum.EventParam("creator", ethereum.Value.fromAddress(creator))
  let amountParam = new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  let tokenAddressParam = new ethereum.EventParam("tokenAddress", ethereum.Value.fromAddress(tokenAddress))
  
  newFlipEvent.parameters.push(idParam)
  newFlipEvent.parameters.push(creatorParam)
  newFlipEvent.parameters.push(amountParam)
  newFlipEvent.parameters.push(tokenAddressParam)

  return newFlipEvent
}

export function createFlipAcceptedEvent(
  id: BigInt,
  acceptor: Address
): FlipAccepted {
  let mockEvent = newMockEvent()
  let newFlipAcceptedEvent = new FlipAccepted(
    mockEvent.address,
    mockEvent.logIndex,
    mockEvent.transactionLogIndex,
    mockEvent.logType,
    mockEvent.block,
    mockEvent.transaction,
    mockEvent.parameters,
    mockEvent.receipt
  )

  newFlipAcceptedEvent.parameters = new Array()
  let idParam = new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  let acceptorParam = new ethereum.EventParam("acceptor", ethereum.Value.fromAddress(acceptor))

  newFlipAcceptedEvent.parameters.push(idParam)
  newFlipAcceptedEvent.parameters.push(acceptorParam)

  return newFlipAcceptedEvent
}

export function createFlipResolvedEvent(
  id: BigInt,
  winner: Address,
  payout: BigInt,
  fee: BigInt,
  tokenAddress: Address
): FlipResolved {
  let mockEvent = newMockEvent()
  let newFlipResolvedEvent = new FlipResolved(
    mockEvent.address,
    mockEvent.logIndex,
    mockEvent.transactionLogIndex,
    mockEvent.logType,
    mockEvent.block,
    mockEvent.transaction,
    mockEvent.parameters,
    mockEvent.receipt
  )

  newFlipResolvedEvent.parameters = new Array()
  let idParam = new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  let winnerParam = new ethereum.EventParam("winner", ethereum.Value.fromAddress(winner))
  let payoutParam = new ethereum.EventParam("payout", ethereum.Value.fromUnsignedBigInt(payout))
  let feeParam = new ethereum.EventParam("fee", ethereum.Value.fromUnsignedBigInt(fee))
  let tokenAddressParam = new ethereum.EventParam("tokenAddress", ethereum.Value.fromAddress(tokenAddress))

  newFlipResolvedEvent.parameters.push(idParam)
  newFlipResolvedEvent.parameters.push(winnerParam)
  newFlipResolvedEvent.parameters.push(payoutParam)
  newFlipResolvedEvent.parameters.push(feeParam)
  newFlipResolvedEvent.parameters.push(tokenAddressParam)

  return newFlipResolvedEvent
}

export function createFlipCancelledEvent(id: BigInt): FlipCancelled {
  let mockEvent = newMockEvent()
  let newFlipCancelledEvent = new FlipCancelled(
    mockEvent.address,
    mockEvent.logIndex,
    mockEvent.transactionLogIndex,
    mockEvent.logType,
    mockEvent.block,
    mockEvent.transaction,
    mockEvent.parameters,
    mockEvent.receipt
  )

  newFlipCancelledEvent.parameters = new Array()
  let idParam = new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  newFlipCancelledEvent.parameters.push(idParam)

  return newFlipCancelledEvent
} 