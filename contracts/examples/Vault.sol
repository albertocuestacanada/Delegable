// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.6.7;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../Delegable.sol";


contract Vault is Delegable, ERC20 {
    using SafeMath for uint256;
    IERC20 public collateral;

    mapping(address => uint256) public posted;
    mapping(address => uint256) public minted;

    /**
     * @dev Calls the constructors of Delegable and ERC20(name, symbol)
     */
    constructor (address collateral_, string memory name, string memory symbol)
        public
        Delegable()
        ERC20(name, symbol)
    { 
        collateral = ERC20(collateral_);
    }

    /// @dev Post `amount` collateral `from` a wallet `to` a vault.
    function post(address from, address to, uint256 amount)
        public
        onlyOwnerOrDelegate(from, "Vault: post-access")
    {
        posted[to] = posted[to].add(amount);
        collateral.transferFrom(from, address(this), amount);
    }

    /// @dev Withdraw `amount` collateral `from` a vault `to` a wallet.
    function withdraw(address from, address to, uint256 amount)
        public
        onlyOwnerOrDelegate(from, "Vault: withdraw-access")
    {
        posted[from] = posted[from].sub(amount);
        collateral.transfer(to, amount);
    }

    /// @dev Use `amount` collateral `from` a vault `to` mint tokens in a given wallet.
    function mint(address from, address to, uint256 amount)
        public
        onlyOwnerOrDelegate(from, "Vault: mint-access")
    {
        minted[from] = minted[from].add(amount);
        require(minted[from] <= posted[from], "Vault: mint-too-much");
        _mint(to, amount);
    }

    /// @dev Burn `amount` tokens `from` a wallet `to` reduce debt of a given wallet.
    function burn(address from, address to, uint256 amount)
        public
        onlyOwnerOrDelegate(from, "Vault: burn-access")
    {
        minted[to] = minted[to].sub(amount);
        _burn(from, amount);
    }
}
