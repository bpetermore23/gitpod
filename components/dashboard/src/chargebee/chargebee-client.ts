/**
 * Copyright (c) 2021 Gitpod GmbH. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License-AGPL.txt in the project root for license information.
 */

import * as chargebee from 'chargebee';

import { Without } from '@gitpod/gitpod-protocol/lib/util/without';
import { GitpodServer } from '@gitpod/gitpod-protocol';

export class ChargebeeClientProvider {
    protected static client: chargebee.Client;

    static async get(gitpodServer: GitpodServer) {
        if (!this.client) {
            const site = await gitpodServer.getChargebeeSiteId();
            this.client = (((window as any).Chargebee) as chargebee.Client).init({
                site
            });
        }
        return this.client;
    }
}

export interface OpenPortalParams {
    loaded?: () => void;
    close?: () => void;
    visit?: (sectionName: string) => void;
}

// https://www.chargebee.com/checkout-portal-docs/api.html
export class ChargebeeClient {
    constructor(
        protected readonly client: chargebee.Client,
        protected readonly paymentServer: GitpodServer) {}

    static async new(paymentServer: GitpodServer): Promise<ChargebeeClient> {
        const chargebeeClient = await ChargebeeClientProvider.get(paymentServer);
        const client = new ChargebeeClient(chargebeeClient, paymentServer);
        client.createPortalSession();
        return client;
    }

    checkout(hostedPage: (paymentServer: GitpodServer) => Promise<{}>, params: Without<chargebee.CheckoutCallbacks, 'hostedPage'> = { success: noOp })  {
        const paymentServer = this.paymentServer;
        this.client.openCheckout({
            ...params,
            async hostedPage(): Promise<any> {
                return hostedPage(paymentServer);
            }
        });
    }

    checkoutExisting(hostedPage: (paymentServer: GitpodServer) => Promise<{}>, params: Without<chargebee.CheckoutCallbacks, 'hostedPage'> = { success: noOp }) {
        const paymentServer = this.paymentServer;
        this.client.openCheckout({
            ...params,
            async hostedPage(): Promise<any> {
                return hostedPage(paymentServer);
            }
        });
    }

    createPortalSession() {
        const paymentServer = this.paymentServer;
        this.client.setPortalSession(async () => {
            return paymentServer.createPortalSession();
        });
    }

    openPortal(params: OpenPortalParams = {}) {
        this.client.createChargebeePortal().open(params);
    }
}
const noOp = () => { /* tslint:disable:no-empty */ };