// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

error EmptyMetadataValue();
error InvalidRecipient();
error InvalidStartTime();
error InvalidTicket();

/// @title ERC-721 Event Tickets
/// @notice NFT ticket contract where each token represents one unique event ticket with on-chain metadata.
contract EventTicketNFT is ERC721Enumerable, Ownable {
    using Strings for uint256;

    struct TicketMetadata {
        string eventName;
        string venue;
        uint64 startsAt;
        string seat;
        string tier;
    }

    struct TicketView {
        uint256 tokenId;
        address owner;
        string eventName;
        string venue;
        uint64 startsAt;
        string seat;
        string tier;
    }

    event TicketMinted(
        uint256 indexed tokenId,
        address indexed to,
        string eventName,
        string seat,
        string tier
    );

    uint256 private nextTokenId;
    mapping(uint256 => TicketMetadata) private ticketMetadata;

    constructor() ERC721("Campus Event Ticket", "CET") Ownable(msg.sender) {}

    /// @notice Mints a unique NFT ticket to a wallet. Only the owner/admin can call this.
    function mintTicket(
        address to,
        string calldata eventName,
        string calldata venue,
        uint64 startsAt,
        string calldata seat,
        string calldata tier
    ) external onlyOwner returns (uint256 tokenId) {
        if (to == address(0)) revert InvalidRecipient();
        if (
            bytes(eventName).length == 0 ||
            bytes(venue).length == 0 ||
            bytes(seat).length == 0 ||
            bytes(tier).length == 0
        ) revert EmptyMetadataValue();
        if (startsAt <= block.timestamp) revert InvalidStartTime();

        tokenId = nextTokenId;
        nextTokenId++;

        ticketMetadata[tokenId] = TicketMetadata({
            eventName: eventName,
            venue: venue,
            startsAt: startsAt,
            seat: seat,
            tier: tier
        });

        _safeMint(to, tokenId);
        emit TicketMinted(tokenId, to, eventName, seat, tier);
    }

    /// @notice Returns the metadata for one NFT ticket.
    function getTicketMetadata(uint256 tokenId) external view returns (TicketMetadata memory) {
        _requireExistingTicket(tokenId);
        return ticketMetadata[tokenId];
    }

    /// @notice Returns all NFT tickets currently owned by one wallet for the frontend.
    function getTicketsOfOwner(address ticketOwner) external view returns (TicketView[] memory tickets) {
        uint256 count = balanceOf(ticketOwner);
        tickets = new TicketView[](count);

        for (uint256 i = 0; i < count; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(ticketOwner, i);
            tickets[i] = _ticketToView(tokenId);
        }
    }

    /// @notice Returns a token URI containing simple base64 JSON metadata stored fully on-chain.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireExistingTicket(tokenId);
        TicketMetadata storage metadata = ticketMetadata[tokenId];

        bytes memory json = abi.encodePacked(
            "{\"name\":\"",
            metadata.eventName,
            " #",
            tokenId.toString(),
            "\",\"description\":\"ERC-721 event ticket for ",
            metadata.eventName,
            " at ",
            metadata.venue,
            "\",\"attributes\":[",
            "{\"trait_type\":\"Venue\",\"value\":\"",
            metadata.venue,
            "\"},",
            "{\"trait_type\":\"Seat\",\"value\":\"",
            metadata.seat,
            "\"},",
            "{\"trait_type\":\"Tier\",\"value\":\"",
            metadata.tier,
            "\"},",
            "{\"trait_type\":\"Starts At\",\"value\":\"",
            uint256(metadata.startsAt).toString(),
            "\"}",
            "]}"
        );

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(json)));
    }

    /// @notice Returns the number of minted tickets.
    function totalMinted() external view returns (uint256) {
        return nextTokenId;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _ticketToView(uint256 tokenId) private view returns (TicketView memory) {
        TicketMetadata storage metadata = ticketMetadata[tokenId];
        return TicketView({
            tokenId: tokenId,
            owner: ownerOf(tokenId),
            eventName: metadata.eventName,
            venue: metadata.venue,
            startsAt: metadata.startsAt,
            seat: metadata.seat,
            tier: metadata.tier
        });
    }

    function _requireExistingTicket(uint256 tokenId) private view {
        if (_ownerOf(tokenId) == address(0)) revert InvalidTicket();
    }
}
