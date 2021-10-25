const allRoles = {
  user: ['basic'],
  employee: ['basic', 'manageProducts'],
  admin: ['basic', 'getUsers', 'manageUsers', 'manageProducts'],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
