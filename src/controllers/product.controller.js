const httpStatus = require('http-status');
const mergeRanges = require('merge-ranges');
const Decimal = require('decimal.js');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { productService } = require('../services');

const pick = require('../utils/pick');

const getProducts = catchAsync(async (req, res) => {
  const filter = {
    stars: { $gte: req.query.stars },
  };

  if (req.query.keywords?.length > 0) {
    filter.$text = {
      $search: req.query.keywords,
    };
  }

  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await productService.queryProducts(filter, null, options);
  res.send(result);
});

const getProduct = catchAsync(async (req, res) => {
  const filter = {
    _id: req.params.classId,
  };
  let result = await productService.queryProduct(filter);

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Class id not found');
  }

  result = result._doc;
  delete result.instances;

  res.send(result);
});

const getProductInstances = catchAsync(async (req, res) => {
  const filter = {
    _id: req.params.classId,
  };
  const projection = {
    _id: 0,
    instances: 1,
  };
  const result = await productService.queryProduct(filter, projection);

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Class id not found');
  }

  res.send(result._doc.instances);
});

const getProductInstance = catchAsync(async (req, res) => {
  const filter = {
    _id: req.params.classId,
  };

  const projection = {
    _id: 0,
  };
  projection[`instances.${req.params.instanceId}`] = 1;

  const result = await productService.queryProduct(filter, projection);

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Class id not found');
  }

  if (Object.keys(result._doc.instances).length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Instance id not found');
  }

  res.send(result._doc.instances[req.params.instanceId]);
});

const getAvailability = catchAsync(async (req, res) => {
  const filter = {
    _id: req.params.classId,
  };
  const projection = {
    _id: 0,
    instances: 1,
  };
  const result = await productService.queryProduct(filter, projection);

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Class id not found');
  }

  const instances = result.toObject().instances;

  let intervals = [];

  for (const [_, instance] of instances.entries()) {
    intervals = intervals.concat(mergeRanges(instance.toObject().availability.map((interval) => [interval.from, interval.to])));
  }

  const availability = mergeRanges(intervals);

  res.send(availability);
});

const getQuote = catchAsync(async (req, res) => {
  const filter = {
    _id: req.params.classId,
  };
  const projection = {
    _id: 0,
    instances: 1,
  };
  const result = await productService.queryProduct(filter, projection);

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Class id not found');
  }

  const { instances } = result.toObject();

  let price = new Decimal(0);
  const chosenInstances = {};

  for (const day = new Date(req.query.from); day <= req.query.to; day.setDate(day.getDate() + 1)) {

    const matchingIntervals = [];

    for (const [instanceId, instance] of instances.entries()) {
      const matchingInterval = instance.toObject().availability.find((interval) => day >= interval.from && day <= interval.to);
      if (matchingInterval) {
        matchingIntervals.push({ id: instanceId, price: new Decimal(matchingInterval.price.toString()) });
      }
    }

    if (matchingIntervals.length == 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Interval not available.');
    }

    matchingIntervals.sort((interval1, interval2) => interval1.price.minus(interval2.price).toNumber());

    const chosenId = matchingIntervals[0].id;

    if (!(chosenId in chosenInstances)) {
      chosenInstances[chosenId] = { dateRanges: [] }
    }

    chosenInstances[chosenId].dateRanges.push({from: new Date(day), to: new Date(day)});
    price = price.plus(matchingIntervals[0].price);
  }

  res.send({
    price,
    instances: chosenInstances
  });
});

const addProduct = catchAsync(async (req, res) => {
  const product = await productService.createProduct(req.body);
  res.status(httpStatus.CREATED).send(product);
});

module.exports = {
  getProducts,
  getProduct,
  getProductInstances,
  getProductInstance,
  getAvailability,
  getQuote,
  addProduct
};
