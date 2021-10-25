const { roleRights } = require('../config/roles');

const verifyRights = (user, requiredRights) => {
  if (requiredRights.length) {
    const userRights = roleRights.get(user.role);
    console.log(requiredRights.every)
    return requiredRights.every((requiredRight) => userRights.includes(requiredRight));
  }

  return true;
};

module.exports = verifyRights;
