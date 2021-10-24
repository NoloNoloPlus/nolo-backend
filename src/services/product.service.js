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
const queryProducts = async (filter, projection, options) => {
  // TODO: Valore di default?
  if (options) {
    options.projection = projection;
  }
  const products = await Product.paginate(filter, options);
  return products;
};

/**
 * Query a specific product
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryProduct = async (filter, projection = {}, options = {}) => {
  const product = await Product.findOne(filter, projection, options);
  return product;
};

const updateProduct = async (filter, update) => {
  return Product.updateOne(filter, update, {strict: false})
}

/**
 * Create a user
 * @param {Object} productBody
 * @returns {Promise<Product>}
 */
const createProduct = async (productBody) => {
  return Product.create(productBody);
};

module.exports = {
  queryProducts,
  queryProduct,
  updateProduct,
  createProduct
};
