import { ServiceClient } from './ServiceClient';

class ServiceClientFactory {
    public static readonly DEFAULT_CLIENT_NAME = 'DEFAULT';
    private static _serviceClients = new Map<string, ServiceClient>();

    public static getServiceClient(name: string): ServiceClient {
        return this._serviceClients.get(name);
    }

    public static create(name: string, endpoint: string): ServiceClient {
        if (!this._serviceClients.has(name)) {
            this._serviceClients.set(name, new ServiceClient(endpoint));
        }
        return this._serviceClients.get(name);
    }
}

// Shortcut functions
function createClient(name: string, endpoint: string): ServiceClient {
    return ServiceClientFactory.create(name, endpoint);
}

function getClient(name: string): ServiceClient {
    return ServiceClientFactory.getServiceClient(name);
}

const DEFAULT_CLIENT_NAME = ServiceClientFactory.DEFAULT_CLIENT_NAME;

export { ServiceClientFactory, createClient, getClient, DEFAULT_CLIENT_NAME };