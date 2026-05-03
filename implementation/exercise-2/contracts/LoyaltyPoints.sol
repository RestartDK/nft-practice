// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

error InvalidMintRecipient();
error InvalidMintAmount();

/// @title Campus Loyalty Points
/// @notice ERC-20 loyalty point token where the business owner can mint rewards and users can transfer points.
contract LoyaltyPoints is ERC20, Ownable {
    event RewardMinted(address indexed to, uint256 amount);

    constructor() ERC20("Campus Loyalty Points", "CLP") Ownable(msg.sender) {}

    /// @notice Mints loyalty points to a customer wallet. Only the owner/admin can call this.
    function mint(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert InvalidMintRecipient();
        if (amount == 0) revert InvalidMintAmount();

        _mint(to, amount);
        emit RewardMinted(to, amount);
    }
}
