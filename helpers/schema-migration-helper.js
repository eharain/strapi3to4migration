`use strict`;

const u = require('./migration-utils');
const pluralize = require('pluralize');
const substitutions = require("../config/substitutions");
//const models = [{}];

const migrateSchemaPrivateAttributes = (model, models) => {
    let schema = model.dest.schema;
    var attribs =u.namedAttribsOf(schema);
    var private = attribs.filter(attrib => attrib.private).map(a => a._an);
    if (private.length > 0) {
        schema.options = schema.options ? schema.options : {};
        const options=schema.options;
        options.privateAttributes = Array.isArray(options.privateAttributes) ? options.privateAttributes : [];

        private.filter(p => options.privateAttributes.indexOf(p) < 0).forEach(p => { options.privateAttributes.push(p) });
        attribs.filter(attrib => attrib.private).forEach(attrib => delete attrib.private);
    }
    return model;
};

const getComponentsNewName = (name, models) => {
    let nameParts = name.split("."); nameParts = { component: nameParts[0], name: nameParts[1] }
    let rmatch = models.find(row => row.component === nameParts.component && (row.name === nameParts.name || row.singular === row.name))
    if (rmatch) {
        return rmatch.apiName;
    }
    return name;
}
/// component names correction
const schemaCorrectComponentNames = (model, models) => {
    let schema = model.dest.schema;
    let attribs = u.namedAttribsOf(schema).filter(a => a.component);
    attribs.forEach(attrib => { attrib.component = getComponentsNewName(attrib.component, models);    });

    attribs = u.namedAttribsOf(schema).filter(a => a.components);
    attribs.forEach(attrib => {
        attrib.components = attrib.components.map(name => getComponentsNewName(name, models))
    });
    return model;
}

const enhanceSchemaProperties = (model) => {
    let schema = model.dest.schema;

    // model.dest.singular = model.source.name;
    // model.dest.plural = model.source.name.endsWith("s") ? model.source.name : schema.collectionName;
    if (model.dest.singularize) {
        schema.collectionName = pluralize.plural(schema.collectionName).replaceAll('-', '_');
        model.source.schema.info.name = model.source.name;
    }
    schema.info.singularName = model.dest.singular;
    schema.info.pluralName = model.dest.plural;
    schema.info.displayName = model.dest.plural.replace(/\-/ig, " ").replace(/\_/ig, " ");
    delete schema.info.name;
    return model;
};

const transformRelationsInSchema = models => {
   // models.forEach(model => { schemaCorrectTargets(model, models) });
    models.forEach(model => {
        const schema = model.dest.schema;
        u.namedAttribsOf(schema).filter(attrib => attrib.plugin === "upload" || attrib.model === "model").forEach(attrib => {
            attrib.type = "media"; attrib.multiple = attrib.model ? false : true; delete attrib.model; delete attrib.collection;
            delete attrib.plugin; delete attrib.via; delete attrib.target;
        });
        const rels = u.relAttribsOf(schema).filter(attrib => !attrib.hasOwnProperty("relation"));
        rels.forEach(attrib => { attrib.relation = attrib.model ? "oneToOne" : "oneToMany"; });
        rels.filter(attrib => attrib.via).forEach(attrib => {
            let right = (attrib.model ? "one" : "many");
            let left = (attrib.model ? "one" : "many");
            let related = models.find(relModel => relModel.dest.apiName === attrib.target);
            let relAttrib = related ? u.relAttribsOf(related.dest.schema).find(a => a._an === attrib.via) : false;
            attrib.relation = relateTarget(left, right);

            if (!related) {
                console.error("related model not found", model.dest.apiName, attrib.target, attrib.via, attrib._an);
            }

            if (related && !relAttrib) {
                console.error("related attrib failed ", model.dest.apiName, attrib.target, attrib.via, attrib._an);
            }
            if (relAttrib && relAttrib.via === attrib._an) {
                left = (relAttrib.model ? "one" : "many");
                attrib.relation = relateTarget(left, right);
                relAttrib.relation = relateTarget(right, left);
                let swap = (left != 'many' && right == 'many') || (relAttrib.dominant == true);
                if (swap) {
                    relAttrib.inversedBy = attrib._an;
                    attrib.mappedBy = attrib.via;
                } else {
                    attrib.inversedBy = attrib.via;
                    relAttrib.mappedBy = attrib._an;
                }
            }
        });
    });

    substitutions.models.forEach(s => {
        models.filter(m => m.dest.apiName === s.apiName).forEach(f => {
            f.dest.schema = Object.assign(f.dest.schema, s.schema);
        });
    });
    return models;
};

function schemaCorrectTargets(model, models) {
    //  return model => {
    u.relAttribsOf(model.dest.schema).forEach(attrib => {
        attrib.type = "relation";
        let relModel = models.find(row => row.source.name === attrib.model || row.source.name === attrib.collection);
        attrib.target = attrib.plugin ?
            (attrib.plugin === "admin" ?
                "admin::" + (attrib.model ? attrib.model : attrib.collection) :
                "plugin::" + attrib.plugin + "." + (attrib.model ? attrib.model : attrib.collection)) :
            relModel.dest.apiName;
    });
    //};
    return model;
}

function relateTarget(left, right) {
    return left.toLowerCase() + "To" + right[0].toUpperCase() + right.substring(1).toLowerCase();
}

function mergeSchemas(shemas, schemad) {
    var schema = JSON.parse(JSON.stringify(shemas));
    var attribs = u.namedAttribsOf(schemad);
    var dattribs = u.namedAttribsOf(schema).map(a => {
        let da = attribs.find(d => d._an == a._an);
        return da ? da : a;
    });
    dattribs.filter(d => !attribs.find(f => f._an == d._an)).forEach(d => attribs.push(d));
    schema.attributes = {};
    attribs.forEach(d => schema.attributes[d._an] = JSON.parse(JSON.stringify(d)));
    return schema;
}

function mergeStrapiStanderdSchemasToCustomised(models, strapiOwnModels) {
    strapiOwnModels.forEach(smodel => {
        let model = models.find(m => m.dest.apiName == smodel.dest.apiName);
        if (model) {
            model.source.schema = mergeSchemas(smodel.source.schema, model.source.schema);
            model.dest.schema = mergeSchemas(smodel.dest.schema, model.dest.schema);
        }
    });
}

const renameDuplicateCollections = (models) => {
    const dupeModels = models.map((model, index) => { return { model: model, dup: models.slice(index + 1).filter(duplicate => duplicate.dest.schema.collectionName === model.dest.schema.collectionName) }; }).filter(f => f.dup.length > 0);
    dupeModels.forEach(model => {
        model.dup.forEach(dup => {
            if (dup.dest.schema.collectionName === model.model.dest.schema.collectionName) {
                dup.dest.schema.collectionName = dup.dest.location.substring(0, 3) + '_' + dup.dest.schema.collectionName;
            }
        });
    });
};



Object.assign(exports, {
    schemaCorrectComponentNames,
    getComponentsNewName,
    migrateSchemaPrivateAttributes,
    enhanceSchemaProperties,
    transformRelationsInSchema,
    mergeStrapiStanderdSchemasToCustomised,
    renameDuplicateCollections,
    schemaCorrectTargets
})