// Copyright (c) WarnerMedia Direct, LLC. All rights reserved. Licensed under the MIT license.
// See the LICENSE file for license information.

const logger = require('./logger');
const azure = require('./azure');

const task = {
    async cleanupUnusedAgents(options) {
        let orgName = options.org;
        let poolNames = options.pool;
        let auth = Buffer.from(`:${options.token}`).toString('base64');
        let delay = options.delay || 180;

        if (!Array.isArray(poolNames)) poolNames = [poolNames];

        let pools = await azure.listAgentPools(orgName, auth);
        pools = pools.filter(pool => !pool.isHosted);
        pools = pools.filter(pool => poolNames.includes(pool.name));

        let firstPhase = await Promise.all(pools.map(pool => {
            logger.log(`Retrieving agents in pool ${pool.name}...`);
            return azure.listAgents(orgName, pool.id, auth);
        }));

        logger.log(`Pausing for ${delay} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay * 1000));

        let secondPhase = await Promise.all(pools.map(pool => {
            logger.log(`Retrieving agents in pool ${pool.name}...`);
            return azure.listAgents(orgName, pool.id, auth);
        }));

        for (let idx = 0; idx < pools.length; idx++) {
            let unusedAgents = secondPhase[idx].filter(agent2 => {
                let agent1 = firstPhase[idx].find(agent => agent.id === agent2.id);
                return agent1 && agent1.status === 'offline' && agent2.status === 'offline';
            });

            if (unusedAgents.length > 0) {
                logger.log(`Deleting ${unusedAgents.length} agents in pool ${pools[idx].name}...`);

                for (let agent of unusedAgents) {
                    await azure.deleteAgent(orgName, pools[idx].id, agent.id, auth);
                }
            } else {
                logger.log(`No unused agents in pool ${pools[idx].name}`);
            }
        }

        logger.log('Done.');
    }
};

module.exports = task;
