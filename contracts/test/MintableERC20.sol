// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.6.7;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract MintableERC20 is ERC20 {

    /**
     * @dev Calls the constructor of ERC20(name, symbol)
     */
    constructor (string memory name, string memory symbol) ERC20(name, symbol) public { }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
