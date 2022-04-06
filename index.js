'use strict';

const fs = require("fs");

const path = require("path");
const zeptoSystemsStrapi3to4 = require("./lib");

const migrate = (strapi4Dir, strapi3Dir, snapshotPath, completedCallback) => {

    const dirs = [{ name: "strapi3Dir", dir: strapi3Dir, needsNodeModulesDir: true }, { name: "strapi4Dir", dir: strapi4Dir, needsNodeModulesDir: true }, { name: "snapshotPath", dir: snapshotPath, needsNodeModulesDir: false }]
        .map(dir => { return Object.assign({}, dir, { hasDir: fs.existsSync(dir.dir), hasNodeModulesDir: fs.existsSync(path.join(dir.dir, 'node_modules')) }); });

    const missingdirs = dirs.filter(f => !f.hasDir || (f.needsNodeModulesDir && !f.hasNodeModulesDir));
    if (missingdirs.length > 0) {
        console.error("missing directories ", missingdirs);
        completedCallback(-2);
        return;
    }

    process.env.snapshotPath = snapshotPath;


    // load the source files from strapi 3 installation, it will scan api, componenets and extensions directories
    let matches = zeptoSystemsStrapi3to4.loadStrapi3SourceMatches(strapi3Dir);
    //migrate the loaded schema files to new format
    let models = zeptoSystemsStrapi3to4.migrateSchemaModels(matches, strapi3Dir, strapi4Dir);

    //migrate route files to new format
    let routes = zeptoSystemsStrapi3to4.migrateRoutes(matches);

    //save the migrated files to new destination. schemas, routes, controllers, lifecyle files and services etc.
    zeptoSystemsStrapi3to4.saveAllMatches(matches, models, strapi4Dir);

    //copy policies and apply few basic repplacments 
    zeptoSystemsStrapi3to4.copyPolicies(path.join(strapi3Dir, "config/policies"), path.join(strapi4Dir, "src/policies"))


    //models.map(model => { return { source: model.source.schema, dest: model.source.dest } })

    //map the old and new database , these mapping will be used to generated migration sql files.
    const db_mappings = zeptoSystemsStrapi3to4.createDbMapping(models, strapi3Dir, strapi4Dir);


    //const fourDb = require("./helpers/db-migration-validator").initWithDefaultConfig(strapi4Dir);
    //const threeDb = require("./helpers/db-migration-validator").initWithDefaultConfig(strapi3Dir);

    const dbValidator = require("./helpers/db-migration-validator");
    const threeDbCfg = dbValidator.loadStrapiDatabaseConfig(strapi3Dir);
    const fourDbCfg = dbValidator.loadStrapiDatabaseConfig(strapi4Dir);


    dbValidator.validateBothWithQuery(threeDbCfg, fourDbCfg, db_mappings)
        .then(validationResults => {


            console.log("done with validate with query");

            zeptoSystemsStrapi3to4.snaphotValidationResults(validationResults);

            zeptoSystemsStrapi3to4.snapshotDbMappings(db_mappings, dbValidator.isInValid);

            const qscombined = zeptoSystemsStrapi3to4.generateMySqlMigrationQueries(db_mappings);

            zeptoSystemsStrapi3to4.snapshotDatabaseMigrationScript(qscombined, threeDbCfg.database, fourDbCfg.database);

            console.log("done exit with success")

            completedCallback();

        }).catch(err => {
            completedCallback(-1)
        });
};



/// please set the correct directories. 
migrate(
    //strapi 4 a fresh instance directory .. please install latest version of strapi 4 . this is tested with 4.1.0
    path.join(__dirname, "../../TrustList/strapi410/"),

    // strapi 3 installation directory . this is the instance you are migrating to 4.
    path.join(__dirname, "../../TrustList/trustlist-backend/strapi/"),


    //path where the snapshot files including the migration sql files will be outputted
    path.join(__dirname, "../", "migration-snapshots"),

    //exit on completion
    process.exit
);