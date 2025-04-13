const { hashPassword, protect } = require('@feathersjs/authentication-local').hooks;

module.exports = {
  before: {
    all: [],
    find: [],
    get: [],
    create: [hashPassword('password')],
    update: [hashPassword('password')],
    patch: [hashPassword('password')],
    remove: []
  },
  after: {
    all: [protect('password')],
    find: [protect('password')],
    get: [protect('password')],
    create: [protect('password')],
    update: [protect('password')],
    patch: [protect('password')],
    remove: []
  },
  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};