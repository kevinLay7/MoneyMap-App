/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

import {
  PlaidAccountDto,
  PlaidItemResponseDto,
  PlaidSyncDto,
  PublicTokenDto,
  TransactionsSyncResponseDto,
} from "./data-contracts";
import { ContentType, HttpClient, RequestParams } from "./http-client";

export class Plaid<SecurityDataType = unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  /**
   * No description
   *
   * @tags Plaid
   * @name PlaidControllerCreateLinkToken
   * @summary Create a Plaid Link token for client-side initialization
   * @request POST:/plaid/create-link-token
   * @secure
   */
  plaidControllerCreateLinkToken = (params: RequestParams = {}) =>
    this.http.request<
      {
        /** The Plaid Link token */
        linkToken?: string;
      },
      void
    >({
      path: `/plaid/create-link-token`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Plaid
   * @name PlaidControllerExchangePublicToken
   * @summary Exchange a public token for the plaid item
   * @request POST:/plaid/exchange-public-token
   * @secure
   */
  plaidControllerExchangePublicToken = (
    data: PublicTokenDto,
    params: RequestParams = {},
  ) =>
    this.http.request<PlaidItemResponseDto, void>({
      path: `/plaid/exchange-public-token`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Plaid
   * @name PlaidControllerGetPlaidItem
   * @summary Get a Plaid item
   * @request GET:/plaid/{plaidItemId}
   * @secure
   */
  plaidControllerGetPlaidItem = (
    plaidItemId: string,
    params: RequestParams = {},
  ) =>
    this.http.request<PlaidItemResponseDto, void>({
      path: `/plaid/${plaidItemId}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Plaid
   * @name PlaidControllerGetAccounts
   * @summary Get accounts for a Plaid item
   * @request GET:/plaid/{plaidItemId}/accounts
   * @secure
   */
  plaidControllerGetAccounts = (
    plaidItemId: string,
    params: RequestParams = {},
  ) =>
    this.http.request<PlaidAccountDto[], void>({
      path: `/plaid/${plaidItemId}/accounts`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Plaid
   * @name PlaidControllerGetTransactions
   * @summary Get transactions for a Plaid item
   * @request GET:/plaid/plaid/{plaidItemId}/transactions/sync
   * @secure
   */
  plaidControllerGetTransactions = (
    plaidItemId: string,
    query: {
      cursor: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<TransactionsSyncResponseDto, void>({
      path: `/plaid/plaid/${plaidItemId}/transactions/sync`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Plaid
   * @name PlaidControllerSyncAccountsForPlaidItem
   * @summary Sync accounts for a Plaid item. If the user has multiple plaid items, this will sync all of them.
   * @request POST:/plaid/items/sync
   * @secure
   */
  plaidControllerSyncAccountsForPlaidItem = (params: RequestParams = {}) =>
    this.http.request<PlaidItemResponseDto[], void>({
      path: `/plaid/items/sync`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Plaid
   * @name PlaidControllerHandleWebhook
   * @summary Handle a Plaid webhook
   * @request POST:/plaid/webhook
   * @secure
   */
  plaidControllerHandleWebhook = (params: RequestParams = {}) =>
    this.http.request<void, void>({
      path: `/plaid/webhook`,
      method: "POST",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Plaid
   * @name PlaidControllerCheckForUpdates
   * @summary Check for updates for a Plaid item
   * @request GET:/plaid/updates/check
   * @secure
   */
  plaidControllerCheckForUpdates = (params: RequestParams = {}) =>
    this.http.request<PlaidSyncDto[], void>({
      path: `/plaid/updates/check`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
}
