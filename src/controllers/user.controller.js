const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService } = require('../services');
const { harmonizeResult } = require('../utils/misc');
const verifyRights = require('../utils/verifyRights');

const createUser = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  res.status(httpStatus.CREATED).send(harmonizeResult(user));
});

const getUsers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['email', 'role']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await userService.queryUsers(filter, options);
  res.send(harmonizeResult(result));
});

const getUser = catchAsync(async (req, res) => {
  if (req.params.userId != req.user.id && !verifyRights(req.user, ['getUsers'])) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Cannot get other users without "getUsers" capability.');
  }

  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.send(harmonizeResult(user));
});

const updateUser = catchAsync(async (req, res) => {
  if (req.params.userId != req.user.id && !verifyRights(req.user, ['manageUsers'])) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Cannot update other users without "manageUsers" capability.');
  }

  const user = await userService.updateUserById(req.params.userId, req.body);
  res.send(harmonizeResult(user));
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser
};
