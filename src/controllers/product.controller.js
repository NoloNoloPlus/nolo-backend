const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { productService } = require('../services');
const mergeRanges = require('merge-ranges');
const Decimal = require('decimal.js');

const getProducts = catchAsync(async (req, res) => {
    const filter = {
        stars : { $gte : req.query.stars }
    }

    if (req.query.keywords) {
        filter['$text'] = {
            $search : req.query.keywords
        }
    }

    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const result = await productService.queryProducts(filter, null, options);
    res.send(result);
  });

const getProduct = catchAsync(async (req, res) => {
    const filter = {
        _id : req.params.classId
    }
    let result = await productService.queryProduct(filter);

    if (!result) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Class id not found');
    }

    result = result._doc
    delete result.instances;

    res.send(result);
  });

const getProductInstances = catchAsync(async (req, res) => {
    const filter = {
        _id: req.params.classId
    }
    const projection = {
        _id: 0,
        instances: 1
    }
    const result = await productService.queryProduct(filter, projection);

    if (!result) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Class id not found');
    }

    res.send(result._doc.instances)
})

const getProductInstance = catchAsync(async (req, res) => {
    const filter = {
        _id: req.params.classId
    }

    const projection = {
        _id: 0
    }
    projection['instances.' + req.params.instanceId] = 1

    const result = await productService.queryProduct(filter, projection);

    if (!result) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Class id not found');
    }

    if (Object.keys(result._doc.instances).length === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Instance id not found');
    }

    res.send(result._doc.instances[req.params.instanceId])
})

const getAvailability = catchAsync(async (req, res) => {
    const filter = {
        _id: req.params.classId
    }
    const projection = {
        _id: 0,
        instances: 1
    }
    const result = await productService.queryProduct(filter, projection);

    if (!result) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Class id not found');
    }

    const instances = result._doc.instances

    let intervals = []

    for (const [_, instance] of Object.entries(instances)) {
        intervals = intervals.concat(mergeRanges(instance.availability.map(interval => [interval.from, interval.to])))
    }

    const availability = mergeRanges(intervals)

    res.send(availability)
})

const getQuote = catchAsync(async (req, res) => {
    const filter = {
        _id: req.params.classId
    }
    const projection = {
        _id: 0,
        instances: 1
    }
    const result = await productService.queryProduct(filter, projection);

    if (!result) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Class id not found');
    }

    const instances = result._doc.instances

    let price = new Decimal(0);
    let chosenInstances = [];

    for (const from = req.query.from; from <= req.query.to; from.setDate(from.getDate() + 1)) {
        const to = new Date(from);
        to.setDate(to.getDate() + 1)

        const matchingIntervals = []

        for (const [instanceId, instance] of Object.entries(instances)) {

            const matchingInterval = instance.availability.find((interval) => from >= interval.from && to <= interval.to)
            if (matchingInterval) {
                matchingIntervals.push({id: instanceId, price: new Decimal(matchingInterval.price.toString())})
            }
        }

        if (matchingIntervals.length == 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Interval not available.');
        }

        matchingIntervals.sort(((interval1, interval2) => interval1.price.minus(interval2.price).toNumber()))
        chosenInstances.push(matchingIntervals[0].id);
        price = price.plus(matchingIntervals[0].price);
    }

    // TODO: Formattare meglio chosenInstances in instanceIntervals

    res.send({
        price: price,
        chosenInstances: chosenInstances
    })
})

module.exports = {
    getProducts,
    getProduct,
    getProductInstances,
    getProductInstance,
    getAvailability,
    getQuote
}