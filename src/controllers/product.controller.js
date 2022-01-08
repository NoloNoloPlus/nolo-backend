const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { productService } = require('../services');
const dijkstra = require('dijkstrajs');

const { computeRentabilities } = require('../utils/ranges');
const { harmonizeResult, mapToObjectRec } = require('../utils/misc');

const pick = require('../utils/pick');

const getProducts = catchAsync(async (req, res) => {
  const filter = {
    //stars: { $gte: req.query.stars },
  };

  /*if (req.query.keywords?.length > 0) {
    filter.$text = {
      $search: req.query.keywords,
    };
  }*/

  if (req.query.name && req.query.keywords) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot use both "name" and "keywords" parameters.');
  }

  const keywords = req.query.keywords?.split(' ');

  if (keywords) {
    delete req.query.keywords;
  }

  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await productService.queryProducts(filter, null, options);

  const harmonized = harmonizeResult(result);

  const allMatch = (product) => {
    return keywords?.every((keyword) => product.name.toLowerCase().includes(keyword.toLowerCase()));
  }

  if (keywords) {
    harmonized.results = harmonized.results.filter(product => allMatch(product));
  }

  res.send(harmonized);
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

  res.send(harmonizeResult(result));
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

  res.send(harmonizeResult(result._doc.instances));
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

  res.send(harmonizeResult(result._doc.instances[req.params.instanceId]));
});

const getRentability = catchAsync(async (req, res) => {
  const filter = {
    _id: req.params.classId,
  };
  const projection = {
    _id: 0,
    instances: 1,
  };
  const result = mapToObjectRec(await productService.queryProduct(filter, projection));

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Class id not found');
  }

  const instances = result.instances;

  const { ignoreRental } = req.query;

  const rentabilities = await computeRentabilities(req.params.classId, instances, false, ignoreRental);
  res.send(harmonizeResult(rentabilities));
});


const createGraph = (instances, exchangeCost, startDay, endDay) => {
  for (const [instanceId, instance] of Object.entries(instances)) {

    for (const dateRange of instance.availability) {
      dateRange.nodes = [
        dateRange.from,
        dateRange.to
      ];
    }
  }

  const graph = {};


  function linkNode(startNode, endNode, weight) {
    if (!graph[startNode]) {
        graph[startNode] = {};
    }
    graph[startNode][endNode] = weight;
  }

  function getContainingDateRange (availability, day) {
    return availability.find((otherDateRange) => {
      return otherDateRange.from <= day && otherDateRange.to >= day;
    });
  }

  for (const [instanceId, instance] of Object.entries(instances)) {
    const dateRangeContainingStartDay = getContainingDateRange(instance.availability, startDay);
    const dateRangeContainingEndDay = getContainingDateRange(instance.availability, endDay);

    if (dateRangeContainingStartDay) {
      const startArrivalNode = `${instanceId}-${startDay}`;
      // Free link from start to all possible starting instances
      linkNode('Start', startArrivalNode, 0);
      if (!dateRangeContainingStartDay.nodes.includes(startDay)) {
        dateRangeContainingStartDay.nodes.push(startDay);
      }
    }

    if (dateRangeContainingEndDay) {
      const endStartingNode = `${instanceId}-${endDay}`;
      // Free link from all possible ending instances to end
      linkNode(endStartingNode, 'End', 0);
      if (!dateRangeContainingEndDay.nodes.includes(endDay)) {
        dateRangeContainingEndDay.nodes.push(endDay);
      }
    }
  }

  for (const [instanceId, instance] of Object.entries(instances)) {
    for (const dateRange of instance.availability) {
      const fromNode = `${instanceId}-${dateRange.from}`;
      const toNode = `${instanceId}-${dateRange.to}`;

      for (const [otherInstanceId, otherInstance] of Object.entries(instances)) {
        // From
        const otherInstanceDateRangeOnFromDate = getContainingDateRange(otherInstance.availability, dateRange.from);

        // To
        const otherInstanceDateRangeOnToDate = getContainingDateRange(otherInstance.availability, dateRange.to);

        if (otherInstanceId != instanceId) {
          if (otherInstanceDateRangeOnFromDate) {
            const fromStartingNode = `${otherInstanceId}-${dateRange.from}`;
            // Jump from one instance to another
            linkNode(fromStartingNode, fromNode, exchangeCost);

            // If the other instance doesn't already have a node on the considered date,
            // add it
            if (!otherInstanceDateRangeOnFromDate.nodes.includes(dateRange.from)) {
              otherInstanceDateRangeOnFromDate.nodes.push(dateRange.from);
            }
          }

          if (otherInstanceDateRangeOnToDate) {
            const toArrivalNode = `${otherInstanceId}-${dateRange.to}`;
            // Finished the current dateRange, jump to another instance
            linkNode(toNode, toArrivalNode, exchangeCost);

            // If the other instance doesn't already have a node on the considered date,
            // add it
            if (!otherInstanceDateRangeOnToDate.nodes.includes(dateRange.to)) {
              otherInstanceDateRangeOnToDate.nodes.push(dateRange.to);
            }
          }
        }
      }
    }
  }

  for (const [instanceId, instance] of Object.entries(instances)) {
    for (let j = 0; j < instance.availability.length; j++) {
        const dateRange = instance.availability[j];
        dateRange.nodes.sort((a, b) => a - b);

        for (let i = 0; i < dateRange.nodes.length - 1; i++) {
            const firstNode = `${instanceId}-${dateRange.nodes[i]}`;
            const secondNode = `${instanceId}-${dateRange.nodes[i + 1]}`;

            // The cost for continuing on a certain instance is #days * cost per day
            const nDays = dateRange.nodes[i + 1] - dateRange.nodes[i];
            linkNode(firstNode, secondNode, dateRange.price * nDays);
        }
    }
  }

  return graph;
}

const prepareData = (instances, startDay, endDay) => {
  function toDays(date) {
    const millisecondsToDays = 1000 * 60 * 60 * 24;
    return Math.round(new Date(date).getTime() / millisecondsToDays);
  }

  let firstDay = undefined;

  for (const [instanceId, instance] of Object.entries(instances)) {
    console.log('Instance:', instance)
    for (const dateRange of instance.availability) {
      if (!firstDay) {
        firstDay = dateRange.from;
      }
      else {
        firstDay = Math.min(firstDay, dateRange.from);
      }
    }
  }

  firstDay = Math.min(firstDay, startDay);

  firstDay = toDays(firstDay);
  startDay = toDays(startDay) - firstDay;
  endDay = toDays(endDay) - firstDay;

  endDay++; // Since we use [from, to)

  const newInstances = {};
  for (const [instanceId, instance] of Object.entries(instances)) {
    const newInstance = {...instance};
    
    newInstance.availability = [];

    // instance.availability = instance.availability;

    // TODO: è il caso di ordinare le dateRanges?

    for (const dateRange of instance.availability) {
      // TODO: Bisogna convertire le date in Date?
      const newDateRange = {...dateRange};

      newDateRange.from = toDays(newDateRange.from) - firstDay;
      newDateRange.to = toDays(newDateRange.to) - firstDay;

      // Graph creation requires [from, to) format
      newDateRange.to++;

      console.log('Original date range:', dateRange);
      console.log('New date range:', newDateRange);

      // TODO: Usa prezzo scontato/segnalo

      newInstance.availability.push(newDateRange);
    }

    newInstances[instanceId] = newInstance;
  }

  return { instances: newInstances, startDay, endDay, firstDay };
}

const parseShortestPath = (path, instances, firstDay) => {
  const parsedInstances = {};

  function nodeInstance(node) {
    if (node == 'End') {
      return 'End';
    }
    return node.split('-')[0];
  }

  function getDateRangeContainingNode(node) {
    const instanceId = nodeInstance(node);
    const day = node.split('-')[1];
    const instance = instances[instanceId];

    return instance.availability.find((otherDateRange) => {
      return otherDateRange.from <= day && otherDateRange.to >= day;
    });
  }

  const splitNodes = [];

  let i = 1;
  while(i < path.length - 2) {
    const firstNode = path[i];

    const instanceNodes = [
      firstNode
    ];

    while (nodeInstance(path[i + 2]) == nodeInstance(firstNode)) {
      i++;
      instanceNodes.push(path[i]);
    }

    i++;

    instanceNodes.push(path[i]);

    splitNodes.push(instanceNodes);

    i++;
  }
  console.log('Split nodes:', splitNodes);

  for (const instanceNodes of splitNodes) {
    const instanceId = nodeInstance(instanceNodes[0]);

    const splitInstanceNodes = [
      [instanceNodes[0]]
    ];

    for (let i = 1; i < instanceNodes.length; i++) {
      const currentDateRange = getDateRangeContainingNode(splitInstanceNodes[splitInstanceNodes.length - 1][0]);

      if (getDateRangeContainingNode(instanceNodes[i]) == currentDateRange) {
        splitInstanceNodes[splitInstanceNodes.length - 1].push(instanceNodes[i]);
      } else  {
        splitInstanceNodes.push([
          instanceNodes[i]
        ]);
      }
    }

    // Add the "connector node" for paths that switch dateRange while remaining on the same instance
    for (let j = 1; j < splitInstanceNodes.length; j++) {
      splitInstanceNodes[j].unshift(splitInstanceNodes[j - 1][splitInstanceNodes[j - 1].length - 1]);
    }

    console.log('Split instance nodes:', splitInstanceNodes); 

    for (const dateRangeNodes of splitInstanceNodes) {
      const firstNode = dateRangeNodes[0];
      const lastNode = dateRangeNodes[dateRangeNodes.length - 1];

      // Don't use the first node because it might potentially be the "connector node"
      const dateRange = getDateRangeContainingNode(lastNode);

      const fromDay = parseInt(firstNode.split('-')[1]);
      const toDay = parseInt(lastNode.split('-')[1]) - 1; // Since quotes use the [from, to] format instead of [from, to)

      const dayToMilliseconds = 1000 * 60 * 60 * 24;

      const fromDate = new Date((firstDay + fromDay) * dayToMilliseconds);
      const toDate = new Date((firstDay + toDay) * dayToMilliseconds);

      const parsedDateRange = {
        ...dateRange,
        from: fromDate,
        to: toDate
      };

      // Remove node infos
      delete parsedDateRange.nodes;

      if (!parsedInstances[instanceId]) {
        // TODO: Non deve restituire logs e current status
        parsedInstances[instanceId] = {...instances[instanceId]};
        delete parsedInstances[instanceId].availability;
        parsedInstances[instanceId].dateRanges = [];
      }

      parsedInstances[instanceId].dateRanges.push(parsedDateRange)
    }
  }

  return parsedInstances;
}


const findBestOffer = (instances, exchangeCost, startDay, endDay) => {
  const result = prepareData(instances, startDay, endDay);
  instances = result.instances;
  startDay = result.startDay;
  endDay = result.endDay;
  const firstDay = result.firstDay;

  console.log('Instances:')
  console.log(instances);
  console.log('Start day:', startDay);
  console.log('End day:', endDay);

  const graph = createGraph(instances, exchangeCost, startDay, endDay);

  console.log('Graph:');
  console.log(graph);

  console.log('Getting shortest path')

  const shortestPath = dijkstra.find_path(graph, 'Start', 'End');

  console.log('Shortest path:');
  console.log(shortestPath);

  return parseShortestPath(shortestPath, instances, firstDay);
}

const getQuote = catchAsync(async (req, res) => {
  const filter = {
    _id: req.params.classId,
  };
  const projection = {
    _id: 0,
    instances: 1,
  };
  const result = mapToObjectRec(await productService.queryProduct(filter, projection));

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Class id not found');
  }

  // TODO: Controllo che il from sia prima del to
  const { instances } = result;

  if (req.query.ignoreAllRentals && req.query.ignoreRental) {
    throw new ApiError(httpStatus.BAD_REQUEST, '"ignoreAllRentals" and "ignoreRental" are mutually exclusive');
  }

  const rentabilities = await computeRentabilities(req.params.classId, instances, req.query.ignoreAllRentals, req.query.ignoreRental);

  for (const [instanceId, rentability] of Object.entries(rentabilities)) {
    instances[instanceId].availability = rentability;
  }

  console.log('Query', req.query);

  const exchangeCost = req.query.exchangeCost;

  const bestOffer = findBestOffer(instances, exchangeCost, req.query.from, req.query.to);

  res.send(harmonizeResult({
    instances: bestOffer,
    discounts: result.discounts || []
  }));
});

const addProduct = catchAsync(async (req, res) => {
  for (const instance of Object.values(req.body.instances)) {
    for (const dateRange of instance.availability) {
      if (dateRange.from > dateRange.to) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid date range: "from" cannot be after "to".');
      }
    }
  }

  const product = await productService.createProduct(req.body);
  res.status(httpStatus.CREATED).send(harmonizeResult(product));
});

const updateProduct = catchAsync(async (req, res) => {
  const filter = {
    _id: req.params.classId,
  };
  const product = await productService.updateProduct(filter, req.body);
  res.send(harmonizeResult(product));
});

const deleteProduct = catchAsync(async (req, res) => {
  const filter = {
    _id: req.params.classId,
  };
  const product = await productService.deleteProduct(filter);
  res.status(httpStatus.OK).send(harmonizeResult(product));
});

module.exports = {
  getProducts,
  getProduct,
  getProductInstances,
  getProductInstance,
  getRentability,
  getQuote,
  addProduct,
  updateProduct,
  deleteProduct
};

/*
A: [0, 5), [5, 14)
B: [2, 9)

Periodo: [2, 7)

A: A0 - A2 - A3 - A5 - A9 - A14
B:      B2 - B3 - B5 - B9
*/