const expect = require('chai').expect;
const sinon = require('sinon');

const logger = require('../lib/logger');
const azure = require('../lib/azure');
const { deleteUnusedAgents } = require('../lib/delete-unused-agents');

const TOKEN = 'abcd0000';
const BASE64 = Buffer.from(':abcd0000').toString('base64');

describe('deleteUnusedAgents', () => {
    beforeEach(() => {
        sinon.stub(logger, 'log');
        sinon.stub(azure);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('deletes an unused agent from the agent pool', async () => {
        azure.listAgentPools.resolves([
            { id: 307, name: 'Test Pool', isHosted: false }
        ]);
        azure.listAgents.onFirstCall().resolves([
            { id: 1, status: 'offline' }
        ]);
        azure.listAgents.onSecondCall().resolves([
            { id: 1, status: 'offline' }
        ]);

        await deleteUnusedAgents({ org: 'Acme', pool: ['Test Pool'], token: TOKEN, delay: 0.1 });

        expect(logger.log.args).to.deep.equal([
            ['Retrieving agents in pool Test Pool...'],
            ['Pausing for 0.1 seconds...'],
            ['Retrieving agents in pool Test Pool...'],
            ['Deleting 1 agents in pool Test Pool...'],
            ['Done.']
        ]);
        expect(azure.deleteAgent.args).to.deep.equal([
            ['Acme', 307, 1, BASE64]
        ]);
    });

    it('ignores managed agent pools', async () => {
        azure.listAgentPools.resolves([
            { id: 307, name: 'Test Pool', isHosted: false },
            { id: 10, name: 'TSFS VFS', isHosted: true }
        ]);
        azure.listAgents.onFirstCall().resolves([
            { id: 1, status: 'offline' }
        ]);
        azure.listAgents.onSecondCall().resolves([
            { id: 1, status: 'offline' }
        ]);

        await deleteUnusedAgents({ org: 'Acme', pool: ['Test Pool', 'TSFS VFS'], token: TOKEN, delay: 0.1 });

        expect(logger.log.args).to.deep.equal([
            ['Retrieving agents in pool Test Pool...'],
            ['Pausing for 0.1 seconds...'],
            ['Retrieving agents in pool Test Pool...'],
            ['Deleting 1 agents in pool Test Pool...'],
            ['Done.']
        ]);
        expect(azure.deleteAgent.args).to.deep.equal([
            ['Acme', 307, 1, BASE64]
        ]);
    });

    it('ignores agent pools that are not listed', async () => {
        azure.listAgentPools.resolves([
            { id: 307, name: 'Pool 1', isHosted: false },
            { id: 308, name: 'Pool 2', isHosted: false }
        ]);
        azure.listAgents.onFirstCall().resolves([
            { id: 1, status: 'offline' }
        ]);
        azure.listAgents.onSecondCall().resolves([
            { id: 1, status: 'offline' }
        ]);

        await deleteUnusedAgents({ org: 'Acme', pool: ['Pool 1'], token: TOKEN, delay: 0.1 });

        expect(logger.log.args).to.deep.equal([
            ['Retrieving agents in pool Pool 1...'],
            ['Pausing for 0.1 seconds...'],
            ['Retrieving agents in pool Pool 1...'],
            ['Deleting 1 agents in pool Pool 1...'],
            ['Done.']
        ]);
        expect(azure.deleteAgent.args).to.deep.equal([
            ['Acme', 307, 1, BASE64]
        ]);
    });

    it('deletes multiple agents from multiple pools', async () => {
        azure.listAgentPools.resolves([
            { id: 307, name: 'Pool 1', isHosted: false },
            { id: 308, name: 'Pool 2', isHosted: false }
        ]);
        azure.listAgents.withArgs('Acme', 307, BASE64).onFirstCall().resolves([
            { id: 1, status: 'offline' },
            { id: 2, status: 'offline' }
        ]);
        azure.listAgents.withArgs('Acme', 308, BASE64).onFirstCall().resolves([
            { id: 3, status: 'offline' },
            { id: 4, status: 'offline' }
        ]);
        azure.listAgents.withArgs('Acme', 307, BASE64).onSecondCall().resolves([
            { id: 1, status: 'offline' },
            { id: 2, status: 'offline' }
        ]);
        azure.listAgents.withArgs('Acme', 308, BASE64).onSecondCall().resolves([
            { id: 3, status: 'offline' },
            { id: 4, status: 'offline' }
        ]);

        await deleteUnusedAgents({ org: 'Acme', pool: ['Pool 1', 'Pool 2'], token: TOKEN, delay: 0.1 });

        expect(logger.log.args).to.deep.equal([
            ['Retrieving agents in pool Pool 1...'],
            ['Retrieving agents in pool Pool 2...'],
            ['Pausing for 0.1 seconds...'],
            ['Retrieving agents in pool Pool 1...'],
            ['Retrieving agents in pool Pool 2...'],
            ['Deleting 2 agents in pool Pool 1...'],
            ['Deleting 2 agents in pool Pool 2...'],
            ['Done.']
        ]);
        expect(azure.deleteAgent.args).to.deep.equal([
            ['Acme', 307, 1, BASE64],
            ['Acme', 307, 2, BASE64],
            ['Acme', 308, 3, BASE64],
            ['Acme', 308, 4, BASE64]
        ]);
    });

    it('does not delete an agent that is online after a pause', async () => {
        azure.listAgentPools.resolves([
            { id: 307, name: 'Test Pool', isHosted: false }
        ]);
        azure.listAgents.onFirstCall().resolves([
            { id: 1, status: 'offline' }
        ]);
        azure.listAgents.onSecondCall().resolves([
            { id: 1, status: 'online' }
        ]);

        await deleteUnusedAgents({ org: 'Acme', pool: ['Test Pool'], token: TOKEN, delay: 0.1 });

        expect(logger.log.args).to.deep.equal([
            ['Retrieving agents in pool Test Pool...'],
            ['Pausing for 0.1 seconds...'],
            ['Retrieving agents in pool Test Pool...'],
            ['No unused agents in pool Test Pool'],
            ['Done.']
        ]);
        expect(azure.deleteAgent.args).to.deep.equal([]);
    });

    it('does not delete an agent that is online before the pause', async () => {
        azure.listAgentPools.resolves([
            { id: 307, name: 'Test Pool', isHosted: false }
        ]);
        azure.listAgents.onFirstCall().resolves([
            { id: 1, status: 'online' }
        ]);
        azure.listAgents.onSecondCall().resolves([
            { id: 1, status: 'offline' }
        ]);

        await deleteUnusedAgents({ org: 'Acme', pool: ['Test Pool'], token: TOKEN, delay: 0.1 });

        expect(logger.log.args).to.deep.equal([
            ['Retrieving agents in pool Test Pool...'],
            ['Pausing for 0.1 seconds...'],
            ['Retrieving agents in pool Test Pool...'],
            ['No unused agents in pool Test Pool'],
            ['Done.']
        ]);
        expect(azure.deleteAgent.args).to.deep.equal([]);
    });

    it('does not delete an agent that was not listed before the pause', async () => {
        azure.listAgentPools.resolves([
            { id: 307, name: 'Test Pool', isHosted: false }
        ]);
        azure.listAgents.onFirstCall().resolves([]);
        azure.listAgents.onSecondCall().resolves([
            { id: 1, status: 'offline' }
        ]);

        await deleteUnusedAgents({ org: 'Acme', pool: ['Test Pool'], token: TOKEN, delay: 0.1 });

        expect(logger.log.args).to.deep.equal([
            ['Retrieving agents in pool Test Pool...'],
            ['Pausing for 0.1 seconds...'],
            ['Retrieving agents in pool Test Pool...'],
            ['No unused agents in pool Test Pool'],
            ['Done.']
        ]);
        expect(azure.deleteAgent.args).to.deep.equal([]);
    });

    it('does not delete an agent that was not listed after the pause', async () => {
        azure.listAgentPools.resolves([
            { id: 307, name: 'Test Pool', isHosted: false }
        ]);
        azure.listAgents.onFirstCall().resolves([
            { id: 1, status: 'offline' }
        ]);
        azure.listAgents.onSecondCall().resolves([]);

        await deleteUnusedAgents({ org: 'Acme', pool: ['Test Pool'], token: TOKEN, delay: 0.1 });

        expect(logger.log.args).to.deep.equal([
            ['Retrieving agents in pool Test Pool...'],
            ['Pausing for 0.1 seconds...'],
            ['Retrieving agents in pool Test Pool...'],
            ['No unused agents in pool Test Pool'],
            ['Done.']
        ]);
        expect(azure.deleteAgent.args).to.deep.equal([]);
    });
});
