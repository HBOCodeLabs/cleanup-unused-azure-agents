#!/usr/bin/env node

const sywac = require('sywac');
const { deleteUnusedAgents } = require('.');

sywac
    .string('--org', { desc: 'organization name', required: true })
    .string('--token', { desc: 'API token in Azure DevOps', required: true })
    .number('--delay', { desc: 'number of seconds to pause', required: false, defaultValue: 180 })
    .help('-h,--help', { desc: 'show help' })
    .example('$0 --org MyAzureOrg --token myapitoken --delay 240', {
        desc: 'Delete unused agents with a safety delay of 240 seconds'
    })
    .strict()
    .style(require('sywac-style-chunky'))
    .parseAndExit()
    .then(argv => deleteUnusedAgents(argv))
    .catch(error => {
        console.error(error.message);
        process.exitCode = 1;
    });
