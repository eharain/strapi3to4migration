const pluralize = require("pluralize");
const u = require('./migration-utils');
const _ = require("lodash");
const { loadStrapiPluginModels } = require("./migration-helper");

function createdbMapping(models, strapi3Dir, strapi4Dir) {

    console.log("targets ", models.map(m => m.dest.schema.attributes).flat().filter(a => a.target).map(a => a.target));
    const defaultModels = loadStrapiPluginModels(strapi3Dir, strapi4Dir);

    const allmappings = [models, defaultModels].flat().map(model => {
        //  return [defaultModels].flat().map(model => {
        // if (!model || !model.source) {
        console.log("creating db mappings =>", model.dest.apiName);
        //  }

        const { sschema, dschema, sattribs, dattribs } = expandModel(model);

        if (!sschema || !dschema) {
            console.error("model schema dest and source missing in ", model);
        }
        var mappings = [
            creatingDirectDbmapping(model)
        ];
        directMappingAddOptionalFields(mappings, model);

        //if (.length > 0) {
        mappings = mapComponenetsAndMedia(mappings, model, models);


        const relations = dattribs.filter(attr => attr.hasOwnProperty("relation") && attr.hasOwnProperty("target")); //.filter(attr => !attr.hasOwnProperty("mappedBy"));

        mappings = [mappings, relations.map(attr => {
            const inversedBy = attr.hasOwnProperty("inversedBy");
            const mappedBy = attr.hasOwnProperty("mappedBy");
            const isTowWay = inversedBy || mappedBy;

            const tmodel = findModelByAPIName(models, attr.target, strapi3Dir, strapi4Dir);
            if (!tmodel) {
                console.error("no tmodel for attr", attr);
            }
            const tsschema = tmodel.source.schema;
            const tdschema = tmodel.dest.schema;

            const left = attr.relation.replaceAll("To", '-').split('-')[0];
            const right = attr.relation.replaceAll("To", '-').split('-')[1];
            const dominant = !isTowWay || inversedBy;

            let mapping = {
                dest: { table: (dschema.collectionName + '_' + attr._an) + "_links" },
                source: {}, attr: attr._an, direction: attr.relation,
                dominant, inversedBy, mappedBy, isTowWay, valid: false,
            };

            //const tmodel = findModelByAPIName(models, attr.target, strapi3Dir, strapi4Dir);

            switch (attr.relation) {
                case "oneToOne":
                    mapping.source.table = sschema.collectionName;
                    mapping.source.fields = ['id', attr._an];
                    mapping.dest.fields = [dschema.info.singularName + '_id', tmodel.dest.schema.info.singularName + '_id'];
                    mapping.valid = true;
                    break;
                case "oneToMany":
                    mapping.dest.fields = [dschema.info.singularName + '_id', tdschema.info.singularName + '_id'];
                    mapping.source.table = sschema.collectionName + "__" + attr._an; //pluralize.plural(tmodel.source.name);
                    mapping.source.fields = [
                        pluralize.singular(sschema.collectionName) + '_id',
                        pluralize.singular(tmodel.source.schema.info.name) + '_id'
                    ];

                    mapping.valid = (!isTowWay || (isTowWay && inversedBy));

                    if (dominant === false && inversedBy == false && mappedBy == true) {
                        mapping.source.table = sschema.collectionName;
                        mapping.source.fields = ['id', attr._an];
                    }

                    break;
                case "manyToOne":
                    if (isTowWay && inversedBy) {
                        mapping.source.table = model.source.schema.collectionName;

                        mapping.source.fields = ['id', attr._an];
                        mapping.dest.fields = [
                            pluralize.singular(tmodel.dest.schema.collectionName) + '_id',
                            pluralize.singular(dschema.collectionName) + '_id'
                        ];

                        mapping.valid = true;
                    } else {
                        console.log("db mapping manyToOne skipped ", attr.relation, isTowWay, inversedBy, mappedBy);
                    }
                    break;
                case "manyToMany":
                    if (isTowWay && inversedBy) {
                        mapping.source.table = (sschema.collectionName + '_' + attr._an) + (isTowWay ? ("__" + pluralize.plural(tmodel.source.name) + "_" + attr.inversedBy) : "");
                        mapping.source.table = (isTowWay ? (pluralize.plural(tmodel.source.name) + "_" + attr.inversedBy + "__") : "") + (sschema.collectionName + '_' + attr._an);
                        mapping.source.fields = [
                            pluralize.singular(sschema.info.name) + '_id',
                            pluralize.singular(tmodel.source.schema.info.name) + '_id'
                        ];
                        mapping.dest.fields = [
                            dschema.info.singularName + '_id',
                            tmodel.dest.schema.info.singularName + '_id'
                        ];
                        mapping.valid = true;
                    } else if (isTowWay && !inversedBy) {
                        //  mapping.source.table = (source.collectionName + '_' + attr._an) + (isTowWay && target ? ("__" + pluralize.plural(target.source.name) + "_" + attr.mappedBy) : "");
                        mapping.source.table = (tmodel.source.schema.collectionName + '_' + attr.mappedBy) + (isTowWay ? ("__" + pluralize.plural(sschema.info.name) + "_" + attr._an) : "");
                        mapping.source.fields = [
                            pluralize.singular(sschema.info.name) + '_id',
                            pluralize.singular(tmodel.source.schema.info.name) + '_id'
                        ];

                        mapping.dest.fields = [
                            dschema.info.singularName + '_id',
                            tmodel.dest.schema.info.singularName + '_id'
                        ];
                        mapping.dest.table = (tmodel.source.schema.collectionName + '_' + attr.mappedBy) + "_links"

                        mapping.valid = true;
                    }
                    else {
                        console.log("db mapping manyToMany skipped ", attr.relation, isTowWay, inversedBy, mappedBy);

                    }
                    break;
            }

            if (attr.collectionName) {
                mapping.source.table = attr.collectionName;
            }

            mapping.source.fields = mapping.source.fields.map(f => _.snakeCase(f));
            mapping.dest.fields = mapping.dest.fields.map(f => _.snakeCase(f));
            //mapping.dest.table = _.snakeCase(mapping.dest.table);
            //mapping.source.table = _.snakeCase(mapping.source.table);
            return { mapping, model };

            //console.log(
            //    " TRUNCATE TABLE trustlist211." + schema.collectionName + "_" + attr._an + "_links;",
            //    " INSERT  INTO   trustlist211." + schema.collectionName + "_" + attr._an + "_links ",//(", r.singular + "_id,", srefColName+ "_id)",
            //    " SELECT distinct id,", attr._an, " FROM trustlist20." + schema.collectionName, " WHERE ", attr._an, " is not null ;")
        })].flat();

        //model.queries = mappings;


        return mappings;
    });

    return allmappings
}


const findModelByAPIName = (models, apiName, s3Dir, s4Dir) => {
    let target = models.find(m => m.dest.apiName === apiName);
    if (!target) {
        const maps = loadStrapiPluginModels(s3Dir, s4Dir);
        target = maps.find(m => m.dest.apiName === apiName);
    }
    if (!target) {
        console.error("findModelByAPIName not found ", apiName)
    }
    return target;
};

function expandModel(model) {
    const sschema = model.source.schema; //JSON.parse(model.source.text);
    const dschema = model.dest.schema;
    const sattribs = u.namedAttribsOf(sschema);
    const dattribs = u.namedAttribsOf(dschema);
    return { sschema, dschema, sattribs, dattribs };
}

function mapComponenetsAndMedia(mappings, model, models) {
    models = models.filter(m => m.dest.location == 'components');
    const { sschema, dschema, sattribs, dattribs } = expandModel(model);
    mappings = [mappings, dattribs.filter(attrib => (['component', 'dynamiczone'].includes(attrib.type))).map(attr => {
        const xattrib = sattribs.find(a => a._an == attr._an);
        var fill = Array.isArray(xattrib.components) ? (m) => xattrib.components.includes(m.dest.apiName) : (m) => m.dest.apiName == xattrib.component;
        const xcompmodel = models.filter(fill);

        console.log(xcompmodel);

        return xcompmodel.map(xc => {

            return {
                mapping: {
                    source: {
                        table: sschema.collectionName + "_components",
                        fields: [model.source.name + "_id", "component_id", "component_type", "field", "order"],
                        $where: { field: xattrib._an, component_type: xc.source.schema.collectionName }
                    },
                    dest: {
                        table: dschema.collectionName + "_components",
                        fields: ["entity_id", "component_id", "component_type", "field", "order"],
                        $where: { field: attr._an, component_type: xc.source.schema.collectionName },
                        $update: { field: attr._an, component_type: xc.dest.apiName },
                    },
                    direction: attr.type, inversedBy: false, valid: true, mappedBy: false, isTowWay: false
                },
                model
            };
        });
    }).flat()].flat();

    mappings = [mappings, dattribs.filter(attrib => (['media'].includes(attrib.type))).map(attr => {
        const xattrib = sattribs.find(a => a._an == attr._an);
        return {
            mapping: {
                source: {
                    table: "upload_file_morph",
                    fields: ["upload_file_id", "related_id", "related_type", "field", "order"],

                    $where: { field: xattrib._an, related_type: sschema.collectionName }
                },
                dest: {
                    table: "files_related_morphs",
                    fields: ["file_id", "related_id", "related_type", "field", "order"],
                    $where: { field: attr._an, related_type: sschema.collectionName },
                    $update: { field: attr._an, related_type: model.dest.apiName },
                },
                direction: 'media', inversedBy: false, valid: true, mappedBy: false, isTowWay: false
            },
            model
        };

    })].flat();
    return mappings;
}

function directMappingAddOptionalFields(mappings, model) {
    const { sschema, dschema, sattribs, dattribs } = expandModel(model);
    const doptions = dschema.options;
    if (model.dest.location != "components") {
        if (doptions) {
            const map0 = mappings[0].mapping;
            if (doptions.increments == true) {
                map0.source.fields.push("created_by", "updated_by");
                map0.dest.fields.push("created_by_id", "updated_by_id");
            }
            if (doptions.timestamps == true) {
                map0.source.fields.push("created_at", "updated_at");
                map0.dest.fields.push("created_at", "updated_at");
            } if (doptions.draftAndPublish == true) {
                map0.source.fields.push("published_at");
                map0.dest.fields.push("published_at");
            }
        }
    }
}

function creatingDirectDbmapping(model) {
    const { sschema, dschema, sattribs, dattribs } = expandModel(model);
    return {
        mapping: {
            source: {
                table: sschema.collectionName, fields: sattribs.filter(attrib => !(
                    attrib.hasOwnProperty("collection") || attrib.hasOwnProperty("model")
                    || ['component', 'relation', 'file', 'dynamiczone'].includes(attrib.type))).map(a => a._an)
            },
            dest: { table: dschema.collectionName, fields: dattribs.filter(attrib => !(['component', 'relation', 'media', 'dynamiczone'].includes(attrib.type))).map(a => a._an) },
            direction: 'direct', inversedBy: false, valid: true, mappedBy: false, isTowWay: false
        },
        model
    };
}


Object.assign(exports, { createdbMapping, findModelByAPIName });

