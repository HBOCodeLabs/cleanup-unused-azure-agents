const fetch = require('node-fetch');

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
            // Hack
            throw new Error('Unable to access resource, please check that your API token has "Read & Manage Agent Pools" permission.');
        }
        let json = await result.json();
        return json.value;
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
