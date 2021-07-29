const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const productValidation = require('../../validations/product.validation');
const productController = require('../../controllers/product.controller');

const router = express.Router();

// TODO: Aggiungere gli altri verbi

router
  .route('/')
  .get(validate(productValidation.getProducts), productController.getProducts);
  //.post(auth('manageUsers'), validate(userValidation.createUser), userController.createUser)


module.exports = router;