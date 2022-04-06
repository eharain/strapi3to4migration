'use strict';

const path = require("path");
const mh = require("./helpers/migration-helper");
const { settings } = require("./config/settings");
const utils = require('./helpers/migration-utils');
const dbmysql = require("./helpers/db-migration-mysql");
const dbh = require("./helpers/db-migration-helper");
const schemaMigration = require("./helpers/schema-migration-helper");
const { snapshot } = utils;


function createDbMapping(models, strapi3Dir, strapi4Dir) {
    const db_mappings = dbh.createdbMapping(models, strapi3Dir, strapi4Dir).flat();

    db_mappings.forEach(d => {
        const mapping = d.mapping;
        console.log("db mapping =>",
            mapping.source.table, mapping.dest.table, mapping.direction,
            mapping.valid, mapping.isTowWay, mapping.inversedBy, mapping.mappedBy);
    });

    console.log("done with db-mapping");
    return db_mappings;
}

function saveAllMatches(matches, models, strapi4Dir) {
    const templatedModels = matches.filter(m => m.dest.factory);
    templatedModels.forEach(m => { m.dest.factoryContent = mh.createFactoryModule(Object.assign({}, m.source, m.dest), models); });


    snapshot("templated-output", templatedModels);

 
    snapshot("custom-models", models);


    matches.forEach(match => { mh.saveModel(match, strapi4Dir); });

    console.log("done with saving code files ", strapi4Dir);
}

function migrateRoutes(matches) {
    let routes = matches.filter(m => m.source.type === "route").map(mh.transformRoute);
    const customRoutes = routes.filter(m => m.dest.schema.routes.length > 0);
    snapshot("custom-routes", routes);
    return routes;
}

function snapshotDatabaseMigrationScript(qscombined, threeDbName, fourDbName) {
    const queryText = qscombined.allSQl();
    snapshot("mysql-db-migration-" + threeDbName + "-" + fourDbName + ".sql", queryText.replaceAll("source_db_name", threeDbName).replaceAll("dest_db_name", fourDbName));
}

function migrateSchemaModels(matches, strapi3Dir, strapi4Dir) {
    let models = matches.filter(m => m.source.type === "model");

    models.forEach(model => {
        schemaMigration.enhanceSchemaProperties(model, models);
        schemaMigration.schemaCorrectComponentNames(model, models);
        // smh.schemaCorrectComponentNames(model, models)
        schemaMigration.migrateSchemaPrivateAttributes(model, models);
        schemaMigration.schemaCorrectTargets(model, models);
    });

    schemaMigration.transformRelationsInSchema(models);
    let strapiOwnModels = mh.loadStrapiPluginModels(strapi3Dir, strapi4Dir);
    schemaMigration.mergeStrapiStanderdSchemasToCustomised(models, strapiOwnModels);
    schemaMigration.renameDuplicateCollections(models);

    snapshot("strapiplugin-models", strapiOwnModels.map(m => m));
    return models;
}

function generateMySqlMigrationQueries(db_mappings) {

    const db = db_mappings.map(m => m.mapping).flat();
    const dbmaster = db.filter(d => d.direction == 'direct');
    const dbslave = db.filter(d => d.direction != 'direct');
    const dbcomponent = db.filter(d => d.direction == 'component');
    const qs = [dbmysql.mappingToQueries(dbmaster), dbmysql.mappingToQueries(dbslave)].flat();
    const qscombined = dbmysql.combineQueries(qs);
    console.log("done with generating combined mysql queries");
    snapshot("db-mapped-sql", qs /*{ qs, casestmt }*/);
    console.log("done with created combined mysql migration queries");
    snapshot("mysql-db-truncate.sql", qscombined.truncate);
    snapshot("mysql-db-insert.sql", qscombined.insert_select);
    snapshot("mysql-db-update.sql", qscombined.update);

    return qscombined;
}

function snaphotValidationResults(validationResults) {
    snapshot("db-dest-view-output", utils.createDbView(validationResults[0], 'dest'));
    snapshot("db-source-view-output", utils.createDbView(validationResults[1], 'source'));
    snapshot("db-result-mappings", validationResults.flat().map(x => x.mappings));
    console.log("done with snapshotting validated results");
}
function snapshotDbMappings(db_mappings, isInValid) {
    snapshot("db-mappings-by-name", utils.groupBy(db_mappings.map(m => { return { mapping: m.mapping, apiName: m.model.dest.apiName }; }), 'apiName'));
    //intermediateSnapshpt("models-db-mapped-output", db_mappings);
    const db_mapping_brief = db_mappings.map(m => { return { mapping: m.mapping, apiName: m.model.dest.apiName }; });
    snapshot("db-mappings-brief-valid", db_mapping_brief.filter(f => !isInValid(f)));
    snapshot("db-mappings-brief-errors", db_mapping_brief.filter(f => isInValid(f)).sort((a, b) => (b.mapping.dominant && !a.mapping.dominant) || (b.mapping.inversedBy && !a.mapping.inversedBy) ? 1 : -1));
    snapshot("db-mappings-complete", db_mappings);
    console.log("done with snapshotting validated results db mappings");
}

function loadStrapi3SourceMatches(strapi3Dir) {
    return settings.locations.map(loc => { return mh.pathToStrapi3Source(path.join(strapi3Dir, loc.location), loc); }).flat();
}

function copyPolicies(sourceDir, destDir) {
    mh.copyPolicies(sourceDir, destDir);
}


Object.assign(exports, {
    createDbMapping,
    saveAllMatches,
    migrateRoutes,
    snapshotDatabaseMigrationScript,
    migrateSchemaModels,
    generateMySqlMigrationQueries,
    snaphotValidationResults,
    snapshotDbMappings,
    loadStrapi3SourceMatches,
    copyPolicies,
    snapshot
});