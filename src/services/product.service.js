const { Product } = require('../models');

const misc = require('../utils/misc');

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
  const product = await Product.findOne(filter);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  
  update = misc.replaceDelete(update);
  console.log('Update:', update)
  Object.assign(product, update);

  console.log('Updated product:', product);


  await product.save();

  return product;
}

/**
 * Create a user
 * @param {Object} productBody
 * @returns {Promise<Product>}
 */
const createProduct = async (productBody) => {
  return Product.create(productBody);
};

/**
 * Delete a product
 * @param {Object} filter - Mongo filter
 * @returns {Promise<Product>}
 */
const deleteProduct = async (filter) => {
  return Product.deleteOne(filter);
};

module.exports = {
  queryProducts,
  queryProduct,
  createProduct,
  updateProduct,
  deleteProduct
};
