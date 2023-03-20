import { DataTypes, Model } from 'sequelize';
import { createSequelize6Instance } from '../setup/create-sequelize-instance';
import { expect } from 'chai';
import sinon from 'sinon';
import { IndexHints } from '@sequelize/core';

// if your issue is dialect specific, remove the dialects you don't need to test on.
export const testingOnDialects = new Set(['mssql', 'sqlite', 'mysql', 'mariadb', 'postgres', 'postgres-native']);

// You can delete this file if you don't want your SSCCE to be tested against Sequelize 6

// Your SSCCE goes inside this function.
export async function run() {
  // This function should be used instead of `new Sequelize()`.
  // It applies the config for your SSCCE to work on CI.
  const sequelize = createSequelize6Instance({
    logQueryParameters: true,
    benchmark: true,
    define: {
      // For less clutter in the SSCCE
      timestamps: false,
    },
  });

  /**
   * Model Movie
   */
  class Movie extends Model { }

  Movie.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: DataTypes.CHAR({ length: 50 }),
  }, {
    sequelize,
    modelName: 'Movie',
    indexes: [
      {
        name: 'testIndex',
        fields: ['title'],
      },
    ],
  });


  /**
   * Model Actor
   */
  class Actor extends Model { }

  Actor.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: DataTypes.CHAR({ length: 50 }),
  }, {
    sequelize,
    modelName: 'Actor',
    indexes: [],
  });

  /**
   * Associations
  */
  Movie.hasMany(Actor);
  Actor.belongsTo(Movie);

  await sequelize.sync({ force: true });


  // Create movie
  await Movie.create({
    title: 'Movie title',
  });

  // Create actor and associate with movie
  await Actor.create({
    name: 'Actor name',
    // @ts-ignore
    MovieId: movieRes.id,
  });

  /**
   * This will cause an error.
   * Sequelize attempts to make a USE INDEX in the Actors query.
   *
   * SELECT `Movie`.`id`, `Movie`.`title`
   *    FROM `Movies` AS `Movie` USE INDEX (`testIndex`);
   *
   * SELECT `id`, `name`, `MovieId`
   *    FROM `Actors` AS `Actor` USE INDEX (`testIndex`)
   *    WHERE `Actor`.`MovieId` IN (1);
   */
  await Movie.findAll({
    indexHints: [{
      type: IndexHints.USE,
      values: ['testIndex'],
    }],
    include: [{
      separate: true,
      model: Actor,
    }]
  });
}
