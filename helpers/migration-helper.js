const fs = require("fs");
const path = require("path");
const pluralize = require('pluralize');
const { settings } = require("../config/settings");
const substitutions = require("../config/substitutions");

const u = require('./migration-utils');


//template("/task/{module}?taskId={taskId}#{hash}", { module: "foo", taskId: 2, hash: "bar" });

const copyPolicies = (sourceDir, destdir) => {
    u.getFileslist(sourceDir).map(fileFullName => {

        const fileName = path.basename(fileFullName);
        var destFileName = path.join(destdir, fileName);
        var text = fs.readFileSync(fileFullName, "utf-8");
        text = u.replaceSubstitutions(text, "policies");
        u.ensureDirectoryExistence(destFileName);
        fs.writeFileSync(destFileName, text);
    });
};


const createFactoryModule = (module, models) => {

    let oexport = module.isJson ? `'use strict';\nmodule.exports = {};` : module.text;

    oexport = oexport.replace("module\.exports", "const oexport").replace(/module\\.exports/ig, "oexport");

    let apiNames = models.map(m => m.dest.apiName);

    oexport = u.replaceSubstitutions(oexport, module.type);
    // module.oexport = oexport;
    let contents = oexport
        + '/**\n*  {name} - {type} - {apiName}\n */\n'
        + 'const { {factory} } = require("@strapi/strapi").factories; \n'
        + 'module.exports = {factory}("{apiName}", ({ strapi }) => { return oexport;});';
    return u.template(contents, module);
};

const saveModel = (model, baseDir) => {
    let dir = path.join(baseDir, 'src', model.dest.location, model.dest.dir);
    let fileName = model.dest.file;
    let content = model.dest.factoryContent;

    switch (model.dest.type) {
        case "model":
            u.cleanAttribs(model.dest.schema);
            content = JSON.stringify(model.dest.schema, null, 4);
            break;
        case "route":
            if (model.dest.schema.routes.length > 0) {
                let customRoute = `'use strict';\nmodule.exports =` + JSON.stringify(model.dest.schema, null, 4) + `\n`;
                customRoute = u.replaceSubstitutions(customRoute, "custom-route");
                u.saveFile(dir, 'custom-' + fileName, customRoute);
            }
            //  content = JSON.stringify(model.dest.schema, null, 4);
            break;

        case "lifecycle":
            content = model.source.text + `\n` + `module.exports = module.exports.lifecycles ? module.exports.lifecycles : module.exports;`;
            break;

    }
    console.log("saveModel => in dir", dir, fileName, content.length);
    u.saveFile(dir, fileName, content);
};


const pathToStrapi3Source = (sourcePath, loc) => {
    return u.getFileslist(sourcePath).map(fileFullName => {
        let fileName = fileFullName.substring(sourcePath.length - loc.location.length).replace(/\\/g, '/').toLocaleLowerCase();
        let model = { source: { input: fileName } };
        let identity = settings.files.filter(f2 => f2.source.rgx).find(f2 => f2.source.rgx.exec(fileName) != null);
        if (identity) {
            let match = identity.source.rgx.exec(fileName);
            if (match) {
                match = match.groups;
                let sourceT = u.cleanCode(fs.readFileSync(fileFullName, "utf-8").trimEnd());
                match.name = match.name ? match.name : match.group;
                model = Object.assign(model, identity,
                    {
                        dest: Object.assign({}, identity.dest, loc, match,
                            {
                                schema: identity.source.isJson ? JSON.parse(sourceT) : false,
                                pluralize: pluralize.isSingular(match.name),
                                plural: pluralize.plural(match.name),
                                singular: pluralize.singular(match.name),
                            },
                        ),
                        source: Object.assign({}, identity.source, loc, match,
                            {
                                input: fileName,
                                text: sourceT,
                                schema: identity.source.isJson ? JSON.parse(sourceT) : false
                            }
                        )
                    });

                //const dest = file.dest;//Object.assign({}, , file.dest);
                const x = loc.singularize;
                if (x) {
                    model.dest.plural = model.dest.plural.replaceAll('_', '-');
                    model.dest.singular = model.dest.singular.replaceAll('_', '-');
                    model.dest.group = model.dest.singular;
                    model.dest.name = model.dest.singular;
                }
                model.dest.dir = u.template(model.dest.dir, model.dest);
                model.dest.file = u.template(model.dest.file, model.dest);
                model.dest.apiName = model.dest.apiPrefix + model.dest.group + "." + model.dest.name;
            }
        }
        return model;
    }).filter(f => f.source.group);
};

const transformRoute = routeModel => {

    const router = routeModel.dest.schema;
    const routes = router.routes;
    //sourceO.routes.
    ///TODO: we should remove the routes that are statnderd and leave extensions
    const standerdAPINames = ["find", "count", "findOne", "create", "delete", "update"];
    //  const standerdAPI = routes.filter(m => standerdAPINames.find(f => m.handler.endsWith(f)));
    routes.filter(route => !standerdAPINames.find(f => route.handler.endsWith(f))).forEach(r => { r.__keep = true; });
    routes.filter(route => route.config).filter(route => (Array.isArray(route.config.policies) && route.config.policies.length > 0)).forEach(route => { route.__keep = true; });
    router.routes = routes.filter(f => f.__keep);
    //if (router.routes.length > 0) {
    //    console.log("router.routes", router.routes);
    //}
    return routeModel;
};

const loadStrapiPluginModels = (s3Dir, s4Dir) => {

    var y = u.toNV(settings.strapiDefaultPlugins).map(plugin => {

        const dpath = path.join(s4Dir, plugin.val.dest.src, "server", "content-types");
        const x = require(dpath)
        const map = u.toNV(x).map(pluginModel => {
            let fileName = pluginModel.name[0].toUpperCase() + pluginModel.name.substring(1);
            const sinput = path.join(s3Dir, plugin.val.source.src, "models", fileName + ".settings.json");

            const sschema = (fs.existsSync(sinput)) ? require(sinput) : pluginModel.val.schema;
            let model = {
                source: {
                    name: pluginModel.name.toLowerCase(),
                    type: "model",
                    dir: "models",
                    file: fileName + ".settings.json",
                    isJson: true,
                    location: "node-modules",
                    group: plugin.name,
                    input: sinput,
                    plugin: plugin.name,

                    text: JSON.stringify(pluginModel.val.schema),
                    schema: sschema,
                },
                dest: {
                    apiName: plugin.val.apiPrefix + pluginModel.name,
                    input: path.join(dpath, pluginModel.name),
                    schema: pluginModel.val.schema,
                }
            };


            model.source.schema.collectionName = model.source.schema.collectionName ? model.source.schema.collectionName : plugin.val.source.schemaPrefix + pluginModel.name;

            model.dest.schema.collectionName = model.dest.schema.collectionName ? model.dest.schema.collectionName : plugin.val.dest.schemaPrefix + pluralize.plural(pluginModel.name);
            model.dest.singular = model.dest.schema.info && model.dest.schema.info.singularName ? model.dest.schema.info.singularName : pluralize.singular(model.source.name);
            model.dest.plural = model.dest.schema.info && model.dest.schema.info.pluralName ? model.dest.schema.info.pluralName : pluralize.plural(model.source.name);

            return model;
        });

        return map;
    });

    return y.flat();
}


Object.assign(exports, {
    substitutions,
    copyPolicies,
    loadStrapiPluginModels,
    transformRoute,
    pathToStrapi3Source,
    saveModel,
    createFactoryModule,
});