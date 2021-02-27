const logger = require('./logger');
const azure = require('./azure');

const task = {
    async deleteUnusedAgents({ org, token, delay }) {
        let auth = Buffer.from(`:${token}`).toString('base64');
        let pools = await azure.listAgentPools(org, auth);
        pools = pools.filter(pool => !pool.isHosted);

        let firstPhase = await Promise.all(pools.map(pool => {
            logger.log(`Retrieving agents in pool ${pool.name}...`);
            return azure.listAgents(org, pool.id, auth);
        }));

        logger.log(`Pausing for ${delay} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay * 1000));

        let secondPhase = await Promise.all(pools.map(pool => {
            logger.log(`Retrieving agents in pool ${pool.name}...`);
            return azure.listAgents(org, pool.id, auth);
        }));

        for (let idx = 0; idx < pools.length; idx++) {
            let unusedAgents = secondPhase[idx].filter(agent2 => {
                let agent1 = firstPhase[idx].find(agent => agent.id === agent2.id);
                return agent1 && agent1.status === 'offline' && agent2.status === 'offline';
            });

            if (unusedAgents.length > 0) {
                logger.log(`Deleting ${unusedAgents.length} agents in pool ${pools[idx].name}...`);

                for (let agent of unusedAgents) {
                    await azure.deleteAgent(org, pools[idx].id, agent.id, auth);
                }
            } else {
                logger.log(`No unused agents in pool ${pools[idx].name}`);
            }
        }

        logger.log('Done.');
    }
};

module.exports = task;
