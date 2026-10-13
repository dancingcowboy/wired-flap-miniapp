// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./WiredFlapFsiLauncher.sol";

/// @notice WIRED Flap launcher for both sponsored and user-paid launches.
/// @dev Public launches require an owner signature bound to the caller, exact
///      Flap parameters, record URI, nonce, deadline, chain, and this contract.
contract WiredFlapFsiLauncherV2 is WiredFlapFsiLauncher {
    error AuthorizationExpired();
    error InvalidAuthorization();

    bytes32 public constant AUTHORIZATION_TYPEHASH = keccak256(
        "WiredFlapLaunch(address launcher,uint256 chainId,address caller,uint256 nonce,uint256 deadline,uint256 launchId,bytes32 paramsHash,bytes32 dataHash)"
    );

    mapping(address caller => uint256 nonce) public nonces;

    constructor(address portal_) WiredFlapFsiLauncher(portal_) {}

    function authorizationDigest(
        address caller,
        uint256 nonce,
        uint256 deadline,
        uint256 launchId,
        IFlapPortalFsi.NewTokenV6Params calldata params,
        string calldata metadataCid
    ) public view returns (bytes32) {
        bytes32 requestHash = keccak256(
            abi.encode(
                AUTHORIZATION_TYPEHASH,
                address(this),
                block.chainid,
                caller,
                nonce,
                deadline,
                launchId,
                keccak256(abi.encode(params)),
                keccak256(bytes(metadataCid))
            )
        );
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", requestHash));
    }

    function launchAndIndexAuthorized(
        uint256 launchId,
        IFlapPortalFsi.NewTokenV6Params calldata params,
        string calldata metadataCid,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external payable returns (address token) {
        if (block.timestamp > deadline) revert AuthorizationExpired();
        if (nonce != nonces[msg.sender]) revert InvalidAuthorization();
        bytes32 digest = authorizationDigest(msg.sender, nonce, deadline, launchId, params, metadataCid);
        if (_recover(digest, signature) != owner) revert InvalidAuthorization();
        nonces[msg.sender] = nonce + 1;
        token = _launchAndIndex(launchId, params, metadataCid, msg.sender);
    }

    function _recover(bytes32 digest, bytes calldata signature) private pure returns (address signer) {
        if (signature.length != 65) revert InvalidAuthorization();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;
        // secp256k1n / 2 prevents signature malleability.
        if (v != 27 && v != 28) revert InvalidAuthorization();
        if (uint256(s) > 0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0) {
            revert InvalidAuthorization();
        }
        signer = ecrecover(digest, v, r, s);
        if (signer == address(0)) revert InvalidAuthorization();
    }
}
