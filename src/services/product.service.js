const { Product } = require('../models');

/**
 * Query for products
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryProducts = async (filter, options) => {
    const products = await Product.paginate(filter, options);
    return products;
};

/**
 * Query a specific product
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryProduct = async (filter, options) => {
    const products = await Product.findOne(filter, options);
    return products;
};

module.exports = {
    queryProducts,
    queryProduct
}