// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.6.7;


/// @dev Delegable enables users (holders) to delegate their account management to other users (delegates).
/// Delegable implements addDelegateByPermit, to add delegates using a permit instead of a separate transaction.
contract Delegable {
    event Delegated(address indexed holder, address indexed delegate, bytes4 indexed signature, uint256 expiry);

    // keccak256("Permit(address holder,address delegate,bytes4 signature,uint256 expiry,uint256 count)");
    bytes32 public immutable DELEGABLE_TYPEHASH = 0x58f34037ff23a95a5e0cabb4f92d90f9486d501633c3708a19e031ebd6e1f59c;
    bytes32 public immutable DELEGABLE_SEPARATOR;
    mapping(address => uint) public count;

    mapping(address => mapping(address => mapping(bytes4 => uint256))) public delegates;

    constructor () public {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }

        DELEGABLE_SEPARATOR = keccak256(
            abi.encode(
                keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
                keccak256(bytes('Delegable')),
                keccak256(bytes('1')),
                chainId,
                address(this)
            )
        );
    }

    /// @dev Require that msg.sender is the account holder or a delegate
    /// @param holder The account holder
    /// @param err The error to display if the validation fails 
    modifier onlyHolderOrDelegate(address holder, string memory err) {
        require(msg.sender == holder || delegates[holder][msg.sender][msg.sig] > block.timestamp, err);
        _;
    }

    /// @dev Enable a delegate to act on the behalf of caller
    /// @param delegate The address being allowed to act on behalf of the caller
    /// @param signature The function that the delegate is allowed to execute, as a bytes4 function signature
    /// @param expiry The latest block timestamp in unix time that the delegation is valid for
    function addDelegate(address delegate, bytes4 signature, uint256 expiry) public {
        _addDelegate(msg.sender, delegate, signature, expiry);
    }

    /// @dev Revoke a delegate's right to act on the behalf of caller
    /// @param delegate The delegate being revoked
    /// @param signature The function that the delegate is not allowed to execute anymore, as a bytes4 function signature
    function revokeDelegate(address delegate, bytes4 signature) public {
        _revokeDelegate(msg.sender, delegate, signature);
    }

    /// @dev Add a delegate through an encoded permit
    /// @param holder The address giving delegation rights
    /// @param delegate The address receiving delegation rights
    /// @param signature The function that the delegate is allowed to execute, as a bytes4 function signature
    /// @param expiry The latest block timestamp in unix time that the delegation is valid for
    /// @param v Permit component
    /// @param r Permit component
    /// @param s Permit component
    function addDelegateByPermit(address holder, address delegate, bytes4 signature, uint expiry, uint8 v, bytes32 r, bytes32 s) public {
        bytes32 hashStruct = keccak256(
            abi.encode(
                DELEGABLE_TYPEHASH,
                holder,
                delegate,
                signature,
                expiry,
                count[holder]++
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked(
                '\x19\x01',
                DELEGABLE_SEPARATOR,
                hashStruct
            )
        );
        address signer = ecrecover(digest, v, r, s);
        require(
            signer != address(0) && signer == holder,
            'Delegable: invalid-signature'
        );

        _addDelegate(holder, delegate, signature, expiry);
    }

    /// @dev Enable a delegate to act on the behalf of an holder
    /// @param holder The address giving delegation rights
    /// @param delegate The address receiving delegation rights
    /// @param signature The function that the delegate is allowed to execute, as a bytes4 function signature
    /// @param expiry The latest block timestamp in unix time that the delegation is valid for
    function _addDelegate(address holder, address delegate, bytes4 signature, uint expiry) internal {
        require(delegates[msg.sender][delegate][signature] != expiry, "Delegable: already-delegated");
        delegates[holder][delegate][signature] = expiry;
        emit Delegated(holder, delegate, signature, expiry);
    }

    /// @dev Stop a delegate from acting on the behalf of an holder
    /// @param holder The address that gave the delegation rights
    /// @param delegate The address having delegation rights revoked
    /// @param signature The function that the delegate is not allowed to execute anymore, as a bytes4 function signature
    function _revokeDelegate(address holder, address delegate, bytes4 signature) internal {
        require(delegates[msg.sender][delegate][signature] > 0, "Delegable: not-delegated");
        delete delegates[holder][delegate][signature];
        emit Delegated(holder, delegate, signature, 0);
    }
}