const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { productService } = require('../services');

const getProducts = catchAsync(async (req, res) => {
    const filter = {
        $text : {
            $search : req.query.keywords
        },
        stars : { $gte : req.query.stars }
    }
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const result = await productService.queryProducts(filter, options);
    res.send(result);
  });

const getProduct = catchAsync(async (req, res) => {
    const filter = {
        _id : req.params.classId
    }
    const options = {}
    const result = await productService.queryProduct(filter, options);

    if (!result) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Id not found');
    }

    res.send(result);
  });

module.exports = {
    getProducts,
    getProduct
}