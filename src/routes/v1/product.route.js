const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const userValidation = require('../../validations/user.validation');
const userController = require('../../controllers/user.controller');

const router = express.Router();

// TODO: Aggiungere gli altri verbi

router
  .route('/')
  .get(validate(userValidation.getUsers), userController.getUsers);
  //.post(auth('manageUsers'), validate(userValidation.createUser), userController.createUser)

auth('getUsers').then(function(err) {
    if (err) {

    }
})

router
  .route('/:userId')
  .get(auth('getUsers'), validate(userValidation.getUser), userController.getUser)
  .patch(auth('manageUsers'), validate(userValidation.updateUser), userController.updateUser)
  .delete(auth('manageUsers'), validate(userValidation.deleteUser), userController.deleteUser);

module.exports = router;