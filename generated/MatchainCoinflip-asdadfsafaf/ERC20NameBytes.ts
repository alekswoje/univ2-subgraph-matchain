import {
  ethereum,
  JSONValue,
  TypedMap,
  Entity,
  Bytes,
  Address,
  BigInt
} from "@graphprotocol/graph-ts";

export class ERC20NameBytes extends ethereum.SmartContract {
  static bind(address: Address): ERC20NameBytes {
    return new ERC20NameBytes("ERC20NameBytes", address);
  }

  name(): Bytes {
    let result = super.call("name", "name():(bytes32)", []);

    return result[0].toBytes();
  }

  try_name(): ethereum.CallResult<Bytes> {
    let result = super.tryCall("name", "name():(bytes32)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBytes());
  }
} 