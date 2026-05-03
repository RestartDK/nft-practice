// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

error EmptyName();
error IncorrectArrayLength();
error InvalidPrice();
error InvalidQuantity();
error InvalidProduct();
error OutOfStock(uint256 available, uint256 requested);
error PaymentTransferFailed();
error ProductInactive();
error RefundFailed();
error Unauthorized();
error WrongPayment(uint256 expected, uint256 received);

contract VendingMachine {
    struct Product {
        uint256 id;
        string name;
        uint256 priceWei;
        uint256 stock;
        bool active;
    }

    struct OwnedProduct {
        uint256 productId;
        string name;
        uint256 quantity;
    }

    event ProductCreated(uint256 indexed productId, string name, uint256 priceWei, uint256 stock);
    event ProductPurchased(
        address indexed buyer,
        uint256 indexed productId,
        uint256 quantity,
        uint256 totalPriceWei
    );
    event ProductRestocked(uint256 indexed productId, uint256 addedStock, uint256 newStock);
    event ProductPriceUpdated(uint256 indexed productId, uint256 oldPriceWei, uint256 newPriceWei);
    event ProductStatusUpdated(uint256 indexed productId, bool active);
    event Withdrawal(address indexed recipient, uint256 amountWei);

    address public immutable admin;
    uint256 private nextProductId;

    mapping(uint256 => Product) private products;
    mapping(address => mapping(uint256 => uint256)) private ownedQuantities;

    modifier onlyAdmin() {
        if (msg.sender != admin) revert Unauthorized();
        _;
    }

    constructor(string[] memory names, uint256[] memory pricesWei, uint256[] memory stocks) {
        if (names.length == 0 || names.length != pricesWei.length || names.length != stocks.length) {
            revert IncorrectArrayLength();
        }

        admin = msg.sender;

        for (uint256 i = 0; i < names.length; i++) {
            _createProduct(names[i], pricesWei[i], stocks[i]);
        }
    }

    /// @notice Adds a new product that can be bought from the vending machine.
    function addProduct(
        string calldata name,
        uint256 priceWei,
        uint256 stock
    ) external onlyAdmin returns (uint256 productId) {
        productId = _createProduct(name, priceWei, stock);
    }

    /// @notice Restocks an existing product with additional quantity.
    function restockProduct(uint256 productId, uint256 addedStock) external onlyAdmin {
        if (addedStock == 0) revert InvalidQuantity();

        Product storage product = _getProduct(productId);
        product.stock += addedStock;

        emit ProductRestocked(productId, addedStock, product.stock);
    }

    /// @notice Updates the price for an existing product.
    function updateProductPrice(uint256 productId, uint256 newPriceWei) external onlyAdmin {
        if (newPriceWei == 0) revert InvalidPrice();

        Product storage product = _getProduct(productId);
        uint256 oldPriceWei = product.priceWei;
        product.priceWei = newPriceWei;

        emit ProductPriceUpdated(productId, oldPriceWei, newPriceWei);
    }

    /// @notice Enables or disables a product without deleting its ownership history.
    function setProductActive(uint256 productId, bool active) external onlyAdmin {
        Product storage product = _getProduct(productId);
        product.active = active;

        emit ProductStatusUpdated(productId, active);
    }

    /// @notice Purchases one or more units of a product and records ownership on-chain.
    function purchase(uint256 productId, uint256 quantity) external payable {
        if (quantity == 0) revert InvalidQuantity();

        Product storage product = _getProduct(productId);

        if (!product.active) revert ProductInactive();
        if (product.stock < quantity) revert OutOfStock(product.stock, quantity);

        uint256 totalPriceWei = product.priceWei * quantity;
        if (msg.value < totalPriceWei) revert WrongPayment(totalPriceWei, msg.value);

        product.stock -= quantity;
        ownedQuantities[msg.sender][productId] += quantity;

        uint256 refund = msg.value - totalPriceWei;
        if (refund > 0) {
            (bool refunded, ) = payable(msg.sender).call{value: refund}("");
            if (!refunded) revert RefundFailed();
        }

        emit ProductPurchased(msg.sender, productId, quantity, totalPriceWei);
    }

    /// @notice Withdraws collected Ether from primary sales to an admin-selected wallet.
    function withdraw(address payable recipient) external onlyAdmin {
        uint256 balance = address(this).balance;
        (bool sent, ) = recipient.call{value: balance}("");
        if (!sent) revert PaymentTransferFailed();

        emit Withdrawal(recipient, balance);
    }

    /// @notice Returns all configured products for the storefront UI.
    function getProducts() external view returns (Product[] memory productList) {
        productList = new Product[](nextProductId);

        for (uint256 i = 0; i < nextProductId; i++) {
            productList[i] = products[i];
        }
    }

    /// @notice Returns one product by id.
    function getProduct(uint256 productId) external view returns (Product memory) {
        return _getProduct(productId);
    }

    /// @notice Returns the purchased quantity for a buyer and product pair.
    function getOwnedQuantity(address buyer, uint256 productId) external view returns (uint256) {
        return ownedQuantities[buyer][productId];
    }

    /// @notice Returns the buyer's owned products with quantities greater than zero.
    function getOwnedProducts(address buyer) external view returns (OwnedProduct[] memory ownedProducts) {
        uint256 ownedCount;

        for (uint256 i = 0; i < nextProductId; i++) {
            if (ownedQuantities[buyer][i] > 0) {
                ownedCount++;
            }
        }

        ownedProducts = new OwnedProduct[](ownedCount);
        uint256 insertIndex;

        for (uint256 i = 0; i < nextProductId; i++) {
            uint256 quantity = ownedQuantities[buyer][i];
            if (quantity > 0) {
                Product storage product = products[i];
                ownedProducts[insertIndex] = OwnedProduct({
                    productId: product.id,
                    name: product.name,
                    quantity: quantity
                });
                insertIndex++;
            }
        }
    }

    /// @notice Returns the total number of configured products.
    function getProductCount() external view returns (uint256) {
        return nextProductId;
    }

    function _createProduct(
        string memory name,
        uint256 priceWei,
        uint256 stock
    ) private returns (uint256 productId) {
        if (bytes(name).length == 0) revert EmptyName();
        if (priceWei == 0) revert InvalidPrice();
        if (stock == 0) revert InvalidQuantity();

        productId = nextProductId;
        nextProductId++;

        products[productId] = Product({
            id: productId,
            name: name,
            priceWei: priceWei,
            stock: stock,
            active: true
        });

        emit ProductCreated(productId, name, priceWei, stock);
    }

    function _getProduct(uint256 productId) private view returns (Product storage product) {
        if (productId >= nextProductId) revert InvalidProduct();
        product = products[productId];
    }
}
