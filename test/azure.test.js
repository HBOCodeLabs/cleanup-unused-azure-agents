const expect = require('chai').expect;
const sinon = require('sinon');

const azure = require('../lib/azure');

const TOKEN = 'abcd0000';
const BASE64 = Buffer.from(':abcd0000').toString('base64');

describe('azure', () => {
    beforeEach(() => {
        sinon.stub(azure, 'makeRequest');
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('#listAgentPools', () => {
        it('calls the agent pools endpoint', async () => {
            azure.makeRequest.resolves([{ id: 307, name: 'Test Pool', isHosted: false }]);

            const result = await azure.listAgentPools('Acme', BASE64);
            expect(result).to.deep.equal([
                { id: 307, name: 'Test Pool', isHosted: false }
            ]);

            expect(azure.makeRequest.args).to.deep.equal([
                ['https://dev.azure.com/Acme/_apis/distributedtask/pools', 'get', BASE64]
            ]);
        });
    });

    describe('#listAgents', () => {
        it('calls the agents endpoint for a given pool', async () => {
            azure.makeRequest.resolves([{ id: 1 }]);

            const result = await azure.listAgents('Acme', 307, BASE64);
            expect(result).to.deep.equal([
                { id: 1 }
            ]);

            expect(azure.makeRequest.args).to.deep.equal([
                ['https://dev.azure.com/Acme/_apis/distributedtask/pools/307/agents', 'get', BASE64]
            ]);
        });
    });

    describe('#deleteAgent', () => {
        it('calls the delete agent endpoint for a given agent', async () => {
            azure.makeRequest.resolves({});

            const result = await azure.deleteAgent('Acme', 307, 1, BASE64);
            expect(result).to.deep.equal({});

            expect(azure.makeRequest.args).to.deep.equal([
                ['https://dev.azure.com/Acme/_apis/distributedtask/pools/307/agents/1?api-version=4.1', 'delete', BASE64]
            ]);
        });
    });
});
