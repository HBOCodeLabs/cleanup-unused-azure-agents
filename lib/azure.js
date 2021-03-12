const fetch = require('node-fetch');
const logger = require('./logger');

const azure = {
    async makeRequest(url, method, auth) {
        let result = await fetch(url, {
            method,
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json'
            }
        });
        if (result.status >= 400) {
            throw new Error(`Status ${result.status} ${await result.text()}`);
        }
        if (result.status === 203) {
            // Azure likes to return 203 instead of 403 for bad access tokens
            throw new Error('Unable to access resource, please check that your API token has "Read & Manage Agent Pools" permission.');
        }
        if (result.status === 204) {
            // Treat "204 No Content" as an empty JSON body
            return {};
        }
        let raw = await result.text();
        try {
            return JSON.parse(raw).value;
        } catch (error) {
            logger.log(`Unexpected response: ${raw}`);
            throw error;
        }
    },

    async listAgentPools(org, auth) {
        return this.makeRequest(
            `https://dev.azure.com/${org}/_apis/distributedtask/pools`,
            'get',
            auth
        );
    },

    async listAgents(org, poolId, auth) {
        return this.makeRequest(
            `https://dev.azure.com/${org}/_apis/distributedtask/pools/${poolId}/agents`,
            'get',
            auth
        );
    },

    async deleteAgent(org, poolId, agentId, auth) {
        return this.makeRequest(
            `https://dev.azure.com/${org}/_apis/distributedtask/pools/${poolId}/agents/${agentId}?api-version=4.1`,
            'delete',
            auth
        );
    }
};

module.exports = azure;
