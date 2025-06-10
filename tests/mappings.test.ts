import {
  assert,
  describe,
  test,
  clearStore,
  beforeEach,
  afterAll,
  createMockedFunction,
} from "matchstick-as/assembly/index"
import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts"
import { Flip, Player, Token, PlayerTokenBalance, PlatformData } from "../generated/schema"
import {
  handleFlipCreated,
  handleFlipAccepted,
  handleFlipResolved,
  handleFlipCancelled,
} from "../src/mappings"
import {
  createFlipCreatedEvent,
  createFlipAcceptedEvent,
  createFlipResolvedEvent,
  createFlipCancelledEvent,
} from "./events"
import { ONE_BI, ZERO_BI } from "../src/helpers"

// --- Constants ---
const CONTRACT_ADDRESS = "0xb71348d7035bC86bbb82471d2963789863E64b60"
const FLIP_ID = BigInt.fromI32(1)
const CREATOR_ADDRESS = "0x0000000000000000000000000000000000000001"
const ACCEPTOR_ADDRESS = "0x0000000000000000000000000000000000000002"
const TOKEN_ADDRESS = "0x0000000000000000000000000000000000000003"
const AMOUNT = BigInt.fromI32(100)
const PAYOUT = BigInt.fromI32(198) // amount * 2 * (1 - fee)
const FEE = BigInt.fromI32(2)

// --- Tests ---
describe("Coinflip Subgraph Mappings", () => {
  beforeEach(() => {
    // Mock the ERC20 contract calls needed for token creation
    createMockedFunction(Address.fromString(TOKEN_ADDRESS), "symbol", "symbol():(string)")
      .returns([ethereum.Value.fromString("MOCK")]);
    createMockedFunction(Address.fromString(TOKEN_ADDRESS), "decimals", "decimals():(uint256)")
      .returns([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(18))]);
  })

  afterAll(() => {
    clearStore()
  })

  // --- Test handleFlipCreated ---
  test("Should handle FlipCreated event correctly", () => {
    createMockedFunction(Address.fromString(CONTRACT_ADDRESS), "flips", "flips(uint256):(address,address,uint256,address,bool,uint256,bool,address,bool,bool)")
      .withArgs([ethereum.Value.fromUnsignedBigInt(FLIP_ID)])
      .returns([
        ethereum.Value.fromAddress(Address.fromString(CREATOR_ADDRESS)),
        ethereum.Value.fromAddress(Address.zero()),
        ethereum.Value.fromUnsignedBigInt(AMOUNT),
        ethereum.Value.fromAddress(Address.zero()),
        ethereum.Value.fromBoolean(false),
        ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(123)),
        ethereum.Value.fromBoolean(false),
        ethereum.Value.fromAddress(Address.fromString(TOKEN_ADDRESS)),
        ethereum.Value.fromBoolean(true), // creatorUsedSession
        ethereum.Value.fromBoolean(false),
      ]);

    const event = createFlipCreatedEvent(FLIP_ID, Address.fromString(CREATOR_ADDRESS), AMOUNT, Address.fromString(TOKEN_ADDRESS))
    event.address = Address.fromString(CONTRACT_ADDRESS)
    handleFlipCreated(event)

    assert.fieldEquals("Flip", FLIP_ID.toString(), "creator", CREATOR_ADDRESS)
    assert.fieldEquals("Flip", FLIP_ID.toString(), "creatorUsedSession", "true")
    assert.fieldEquals("Player", CREATOR_ADDRESS, "totalFlips", "1")
    assert.fieldEquals("Token", TOKEN_ADDRESS, "totalVolume", AMOUNT.toString())
    assert.fieldEquals("PlatformData", "1", "totalFlips", "1")
  })

  // --- Test handleFlipAccepted ---
  test("Should handle FlipAccepted event correctly", () => {
    // 1. Setup initial state (create the flip entity)
    const flip = new Flip(FLIP_ID.toString())
    flip.creator = CREATOR_ADDRESS
    flip.token = TOKEN_ADDRESS
    flip.amount = AMOUNT
    flip.cancelled = false
    flip.creatorUsedSession = false
    flip.createdAt = BigInt.fromI32(123)
    flip.createdTx = Address.fromString("0x0000000000000000000000000000000000000000")
    flip.save()

    // 2. Mock contract call
    createMockedFunction(Address.fromString(CONTRACT_ADDRESS), "flips", "flips(uint256):(address,address,uint256,address,bool,uint256,bool,address,bool,bool)")
      .withArgs([ethereum.Value.fromUnsignedBigInt(FLIP_ID)])
      .returns([
          ethereum.Value.fromAddress(Address.fromString(CREATOR_ADDRESS)),
          ethereum.Value.fromAddress(Address.fromString(ACCEPTOR_ADDRESS)),
          ethereum.Value.fromUnsignedBigInt(AMOUNT),
          ethereum.Value.fromAddress(Address.zero()),
          ethereum.Value.fromBoolean(false),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(123)),
          ethereum.Value.fromBoolean(false),
          ethereum.Value.fromAddress(Address.fromString(TOKEN_ADDRESS)),
          ethereum.Value.fromBoolean(false),
          ethereum.Value.fromBoolean(true), // acceptorUsedSession
      ]);

    // 3. Handle event
    const event = createFlipAcceptedEvent(FLIP_ID, Address.fromString(ACCEPTOR_ADDRESS));
    event.address = Address.fromString(CONTRACT_ADDRESS)
    handleFlipAccepted(event);

    assert.fieldEquals("Flip", FLIP_ID.toString(), "acceptor", ACCEPTOR_ADDRESS);
    assert.fieldEquals("Flip", FLIP_ID.toString(), "acceptorUsedSession", "true");
    assert.fieldEquals("Player", ACCEPTOR_ADDRESS, "totalFlips", "1");
  });

  // --- Test handleFlipCancelled ---
  test("Should handle FlipCancelled correctly", () => {
    // 1. Setup initial state
    const flip = new Flip(FLIP_ID.toString())
    flip.creator = CREATOR_ADDRESS
    flip.token = TOKEN_ADDRESS
    flip.amount = AMOUNT
    flip.cancelled = false
    flip.creatorUsedSession = false
    flip.createdAt = BigInt.fromI32(123)
    flip.createdTx = Address.fromString("0x0000000000000000000000000000000000000000")
    flip.save()

    // 2. Handle event
    const event = createFlipCancelledEvent(FLIP_ID);
    handleFlipCancelled(event);

    assert.fieldEquals("Flip", FLIP_ID.toString(), "cancelled", "true");
  });

  // --- Test handleFlipResolved (Creator Wins) ---
  test("Should handle FlipResolved correctly when creator wins", () => {
    // 1. Setup initial state
    const creator = new Player(CREATOR_ADDRESS)
    creator.totalFlips = ONE_BI; creator.wins = ZERO_BI; creator.losses = ZERO_BI;
    creator.save()
    const acceptor = new Player(ACCEPTOR_ADDRESS)
    acceptor.totalFlips = ONE_BI; acceptor.wins = ZERO_BI; acceptor.losses = ZERO_BI;
    acceptor.save()
    const flip = new Flip(FLIP_ID.toString())
    flip.creator = CREATOR_ADDRESS; flip.acceptor = ACCEPTOR_ADDRESS; flip.token = TOKEN_ADDRESS; flip.amount = AMOUNT; flip.cancelled = false; flip.creatorUsedSession = false; flip.createdAt = BigInt.fromI32(123); flip.createdTx = Address.fromString("0x0000000000000000000000000000000000000000");
    flip.save()

    // 2. Handle event
    const event = createFlipResolvedEvent(FLIP_ID, Address.fromString(CREATOR_ADDRESS), PAYOUT, FEE, Address.fromString(TOKEN_ADDRESS));
    handleFlipResolved(event);

    assert.fieldEquals("Flip", FLIP_ID.toString(), "winner", CREATOR_ADDRESS);
    assert.fieldEquals("Player", CREATOR_ADDRESS, "wins", "1");
    assert.fieldEquals("Player", ACCEPTOR_ADDRESS, "losses", "1");
  });

  // --- Test handleFlipResolved (Acceptor Wins) ---
  test("Should handle FlipResolved correctly when acceptor wins", () => {
    // 1. Setup initial state
    const creator = new Player(CREATOR_ADDRESS)
    creator.totalFlips = ONE_BI; creator.wins = ZERO_BI; creator.losses = ZERO_BI;
    creator.save()
    const acceptor = new Player(ACCEPTOR_ADDRESS)
    acceptor.totalFlips = ONE_BI; acceptor.wins = ZERO_BI; acceptor.losses = ZERO_BI;
    acceptor.save()
    const flip = new Flip(FLIP_ID.toString())
    flip.creator = CREATOR_ADDRESS; flip.acceptor = ACCEPTOR_ADDRESS; flip.token = TOKEN_ADDRESS; flip.amount = AMOUNT; flip.cancelled = false; flip.creatorUsedSession = false; flip.createdAt = BigInt.fromI32(123); flip.createdTx = Address.fromString("0x0000000000000000000000000000000000000000");
    flip.save()

    // 2. Handle event
    const event = createFlipResolvedEvent(FLIP_ID, Address.fromString(ACCEPTOR_ADDRESS), PAYOUT, FEE, Address.fromString(TOKEN_ADDRESS));
    handleFlipResolved(event);

    assert.fieldEquals("Flip", FLIP_ID.toString(), "winner", ACCEPTOR_ADDRESS);
    assert.fieldEquals("Player", CREATOR_ADDRESS, "losses", "1");
    assert.fieldEquals("Player", ACCEPTOR_ADDRESS, "wins", "1");
  });
}) 