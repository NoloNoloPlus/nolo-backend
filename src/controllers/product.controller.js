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

module.exports = {
    getProducts
}