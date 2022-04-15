# strapi3to4migration
Strapi three to four migration script along with database migration script generator

How to migrate 
This script migrates strapi 3 to a fresh instance of strapi 4 and takes cares of major work related to migrating source files including policies and  generates MySQL database migration script that will copy database from old structure to newly generated database. 
Please note the new code and old strapi instance needs to be on same computer and both new and old databases need to be on the same MySQL instance.

In order to perform the migration, you will need a strapi 3 working instance on your local computer with database configuration file properly set up as it uses the database config of strapi3. (Only works with MySQL and MariaDB)
It will need a clean instance of strapi 4 latest.  

Now download this code from git hub https://github.com/eharain/strapi3to4migration 

In index.js file at the end of the file setup three paths correctly for strapi 3, strapi 4 installation directories and a migration-snapshots directory path with migrate function call.
Now carefully copy any special configurations required if any along with any npm libraries if required in custom strapi code.  

Now execute this by node. command line the command line will migrate all code and schema from strapi3 to strapi 4 installation directory. It will generate the database migration sql script in migration-snapshots directory. 

Start the new instance of strapi 4 and it should work straight away. Stop the instance and now open the migration SQL script named after both old and new database names in migration-snapshots directory and executes in MySQL workbench or equivalent. This should move the data from old structure to new.  

If ADMIN_JWT_SECRET is moved to new instance the strapi users should be able to login without any problem if not the users should follow the reset password route to setup new passwords.
	
The migrated coded largely works but for advance customisations specially please look at the migrated files where you may need some substitutions like the reference to entities and models where strapi 3 entities are referred simply by name  example ‘contect’ while in strapi 4 these are called ‘api:contact.contect’ or in case of plugin ‘plugin::contact.contact’ or in case of components ‘contact.contact’ so perform these substitutions carefully. 

read more at https://zeptosystems.com/strapi-3-to-strapi-4-migration/
