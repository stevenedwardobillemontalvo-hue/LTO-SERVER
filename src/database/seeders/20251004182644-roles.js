'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('roles', [
      {
        id: '66e4fa17-7d37-4c33-98ba-d77a30cffae4',
        name: 'Admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'd04b1fde-e566-11ec-9c9e-000c2932cea3',
        name: 'Client',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '9a9bb8d3-0ef8-11ed-8746-000c2932cea3',
        name: 'SuperAdmin',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('roles', null, {});
  },
};
