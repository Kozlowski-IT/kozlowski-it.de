import * as migration_20261107_215035_initial from './20261107_215035_initial';

export const migrations = [
  {
    up: migration_20261107_215035_initial.up,
    down: migration_20261107_215035_initial.down,
    name: '20261107_215035_initial'
  },
];
