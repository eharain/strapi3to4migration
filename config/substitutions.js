module.exports = {
    models: [
        {
            apiName: "plugin::users-permissions.user",
            schema: {
                "collectionName": "up_users",
                "info": {
                    "name": "user",
                    "description": "",
                    "singularName": "user",
                    "pluralName": "users",
                    "displayName": "User"
                }
            }
        },
        {
            apiName: "plugin::users-permissions.role",
            schema: {
                collectionName: 'up_roles',
                info: {
                    name: 'role',
                    description: '',
                    singularName: 'role',
                    pluralName: 'roles',
                    displayName: 'Role',
                }
            }
        }
    ],
    literals: [
        {
            source: "require('strapi-admin')",
            dest: "require('@strapi/admin')",
            types: ""
        },
        {
            source: "require('strapi-babel-plugin-switch-ee-ce')",
            dest: "require('@strapi/babel-plugin-switch-ee-ce')"
        },
        {
            source: "require('strapi-database')",
            dest: "require('@strapi/database')"
        },
        {
            source: "require('strapi-generate-new')",
            dest: "require('@strapi/generate-new')"
        },
        {
            source: "require('strapi-generators')",
            dest: "require('@strapi/generators')"
        },
        {
            source: "require('strapi-logger')",
            dest: "require('@strapi/logger')"
        },
        {
            source: "require('strapi-plugin-content-manager')",
            dest: "require('@strapi/plugin-content-manager')"
        },
        {
            source: "require('strapi-plugin-content-type-builder')",
            dest: "require('@strapi/plugin-content-type-builder')"
        },
        {
            source: "require('strapi-plugin-email')",
            dest: "require('@strapi/plugin-email')"
        },
        {
            source: "require('strapi-plugin-graphql')",
            dest: "require('@strapi/plugin-graphql')"
        },
        {
            source: "require('strapi-plugin-i18n')",
            dest: "require('@strapi/plugin-i18n')"
        },
        {
            source: "require('strapi-plugin-upload')",
            dest: "require('@strapi/plugin-upload')"
        },
        {
            source: "require('strapi-plugin-users-permissions')",
            dest: "require('@strapi/plugin-users-permissions')"
        },
        {
            source: "require('strapi-provider-email-amazon-ses')",
            dest: "require('@strapi/provider-email-amazon-ses')"
        },
        {
            source: "require('strapi-provider-email-sendmail')",
            dest: "require('@strapi/provider-email-sendmail')"
        },
        {
            source: "require('strapi-provider-upload-aws-s3')",
            dest: "require('@strapi/provider-upload-aws-s3')"
        },
        {
            source: "require('strapi-provider-upload-local')",
            dest: "require('@strapi/provider-upload-local')"
        },
        {
            source: "require('strapi-strapi')",
            dest: "require('@strapi/strapi')"
        },
        {
            source: "require('strapi-utils')",
            dest: "require('@strapi/utils')"
        },
        {
            source: "strapi.query(",
            dest: "strapi.db.query("
        },
        {
            source: "strapi-plugin-users-permissions/controllers/Auth",
            dest: "@strapi/plugin-users-permissions/server/controllers/auth"
        },
        {
            source: "strapi-plugin-users-permissions/controllers/User",
            dest: "@strapi/plugin-users-permissions/server/controllers/user"
        },
        {
            source: "strapi-plugin-users-permissions/controllers/Role",
            dest: "@strapi/plugin-users-permissions/server/controllers/role"
        },
        {
            source: "strapi-plugin-users-permissions/controllers/auth",
            dest: "@strapi/plugin-users-permissions/server/controllers/auth"
        },
        {
            source: "strapi-plugin-users-permissions/controllers/user",
            dest: "@strapi/plugin-users-permissions/server/controllers/user"
        },
        {
            source: "strapi-plugin-users-permissions/controllers/role",
            dest: "@strapi/plugin-users-permissions/server/controllers/role"
        },
        {
            source: "/api",
            dest: ""
        },
        {
            source: "subscriptions.",
            dest: "subscription.",
            types: "custom-route"
        },
        {
            source: "user_profile.",
            dest: "user-profile.",
            types: "custom-route"
        }//
    ]
};
