import knex from 'knex';

const database = knex({
    client: 'sqlite3',
    connection: {
        filename: './fiddle.sqlite3',
    },
    useNullAsDefault: true,
});

export default database;