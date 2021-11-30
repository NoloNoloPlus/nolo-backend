const allRoles = {
  user: ['basic'],
  employee: ['basic', 'manageProducts', 'manageRentals'],
  manager: ['basic', 'getUsers', 'manageUsers', 'manageProducts', 'manageRentals'],
  admin: ['basic', 'getUsers', 'manageUsers', 'manageProducts', 'manageRentals']
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
