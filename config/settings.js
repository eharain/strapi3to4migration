const settings = {
    files: [
        {
            source: { type: "model", dir: "models", file: "{name}.settings.json", isJson: true, rgx: "(?<location>[A-Za-z0-9_\-]+)/(?<group>[A-Za-z0-9_\-]+)/models/(?<name>[A-Za-z0-9_\-]+)\.settings\.json" },
            dest: { type: "model", dir: "{group}/content-types/{name}", isJson: true, file: "schema.json" },
        },
        {
            source: { type: "model", dir: "models", isJson: true, file: "{name}.json", rgx: "(?<location>components)/(?<group>[A-Za-z0-9_\-]+)/(?<name>[A-Za-z0-9_\-]+)\.json" },
            dest: { type: "model", dir: "{group}", isJson: true, file: "{name}.json" }
        },
        {
            source: { type: "lifecycle", dir: "models", file: "{name}.js", rgx: "(?<location>[A-Za-z0-9_\-]+)/(?<group>[A-Za-z0-9_\-]+)\/models\/(?<name>[A-Za-z0-9_\-]+)\.js" },
            dest: { type: "lifecycle", dir: "{group}/content-types/{name}", file: "lifecycles.js" }
        },
        {
            source: { type: "controller", dir: "{group}/controllers", file: "{name}.js", rgx: "(?<location>[A-Za-z0-9_\-]+)/(?<group>[A-Za-z0-9_\-]+)\/controllers\/(?<name>[A-Za-z0-9_\-]+)\.js" },
            dest: { type: "controller", dir: "{group}/controllers", file: "{name}.js", factory: "createCoreController" }
        },
        {
            source: { type: "service", dir: "services", file: "{name}.js", rgx: "(?<location>[A-Za-z0-9_\-]+)/(?<group>[A-Za-z0-9_\-]+)\/services\/(?<name>[A-Za-z0-9_\-]+)\.js" },
            dest: { type: "service", dir: "{group}/services", file: "{name}.js", factory: "createCoreService" }
        },
        {
            source: { type: "route", dir: "config", isJson: true, file: "routes.json", rgx: "(?<location>[A-Za-z0-9_\-]+)/(?<group>[A-Za-z0-9_\-]+)/config/routes\.json", methods: ["find", "count", "findOne", "create", "delete", "update"] },
            dest: { type: "route", dir: "{group}/routes", isJson: true, file: "{name}.js", factory: "createCoreRouter" }
        }
    ],
    locations: [
        { location: "api", apiPrefix: "api::", singularize: true },
        { location: "components", apiPrefix: "" },
        { location: "extensions", apiPrefix: "plugin::" }
    ], strapiDefaultPlugins: {
        "admin": {
            source: {
                src: "/node_modules/strapi-admin",
                schemaPrefix: "strapi_"
            },
            dest: {
                src: "/node_modules/@strapi/admin",
                schemaPrefix: "admin_"
            },
            apiPrefix: "admin::"
        },
        "users-permissions": {
            source: {
                src: "/node_modules/strapi-plugin-users-permissions",
                schemaPrefix: "users-permissions_"
            },
            dest: {
                src: "/node_modules/@strapi/plugin-users-permissions",
                schemaPrefix: "up_"
            },
            apiPrefix: "plugin::users-permissions."
        },
        "upload": {
            source: {
                src: "/node_modules/strapi-plugin-upload",
                schemaPrefix: "upload_"
            },
            dest: {
                src: "/node_modules/@strapi/plugin-upload",
                schemaPrefix: ""
            },
            apiPrefix: "plugin::upload."
        },
    }
};

settings.files.filter(f2 => f2.source.rgx).forEach(f2 => { f2.source.rgx = new RegExp(f2.source.rgx); });
exports.settings = settings;