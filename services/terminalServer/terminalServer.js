/* eslint-disable @typescript-eslint/no-var-requires, import/no-unresolved */

const yargs = require('yargs');
const wetty = require('wetty/dist').default;

/**
 * Check if being run by cli or require
 */
wetty.init(
    yargs
        .options({
            sslkey: {
                demand: false,
                type: 'string',
                description: 'path to SSL key',
            },
            sslcert: {
                demand: false,
                type: 'string',
                description: 'path to SSL certificate',
            },
            sshhost: {
                demand: false,
                description: 'ssh server host',
                type: 'string',
                default: process.env.SSHHOST || 'localhost',
            },
            sshport: {
                demand: false,
                description: 'ssh server port',
                type: 'number',
                default: parseInt(process.env.SSHPORT, 10) || 22,
            },
            sshuser: {
                demand: false,
                description: 'ssh user',
                type: 'string',
                default: process.env.SSHUSER || '',
            },
            title: {
                demand: false,
                description: 'window title',
                type: 'string',
                default: process.env.TITLE || 'Xcalar Shell',
            },
            sshauth: {
                demand: false,
                description:
                'defaults to "password", you can use "publickey,password" instead',
                type: 'string',
                default: process.env.SSHAUTH || 'password',
            },
            sshpass: {
                demand: false,
                description: 'ssh password',
                type: 'string',
                default: process.env.SSHPASS || undefined,
            },
            sshkey: {
                demand: false,
                description:
                'path to an optional client private key (connection will be password-less and insecure!)',
                type: 'string',
                default: process.env.SSHKEY || undefined,
            },
            forcessh: {
                demand: false,
                description: 'Connecting through ssh even if running as root',
                type: 'boolean',
                default: process.env.FORCESSH || false
            },
            base: {
                demand: false,
                alias: 'b',
                description: 'base path to xshell',
                type: 'string',
                default: process.env.BASE || '/xshell/',
            },
            port: {
                demand: false,
                alias: 'p',
                description: 'xshell listen port',
                type: 'number',
                default: parseInt(process.env.PORT, 10) || 3000,
            },
            host: {
                demand: false,
                description: 'xshell listen host',
                default: '127.0.0.1',
                type: 'string',
            },
            command: {
                demand: false,
                alias: 'c',
                description: 'command to run in shell',
                type: 'string',
                default: process.env.COMMAND || 'login',
            },
            bypasshelmet: {
                demand: false,
                description: 'disable helmet from placing security restrictions',
                type: 'boolean',
                default: false,
            },
            help: {
                demand: false,
                alias: 'h',
                type: 'boolean',
                description: 'Print help message',
            },
        })
        .boolean('allow_discovery').argv
);
