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
  CreateLinkTokenDto,
  LiabilitiesGetResponseDto,
  PlaidAccountDto,
  PlaidApiItemResponseDto,
  PlaidItemCombinedResponseDto,
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
   * @summary Create a Plaid Link token for client-side initialization. Can be used to add a new item or update an existing one.
   * @request POST:/plaid/create-link-token
   */
  plaidControllerCreateLinkToken = (
    data?: CreateLinkTokenDto,
    params: RequestParams = {},
  ) =>
    this.http.request<
      {
        /** The Plaid Link token */
        linkToken?: string;
      },
      void
    >({
      path: `/plaid/create-link-token`,
      method: "POST",
      body: data,
      type: ContentType.Json,
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
   */
  plaidControllerExchangePublicToken = (
    data: PublicTokenDto,
    params: RequestParams = {},
  ) =>
    this.http.request<PlaidApiItemResponseDto, void>({
      path: `/plaid/exchange-public-token`,
      method: "POST",
      body: data,
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
   */
  plaidControllerGetPlaidItem = (
    plaidItemId: string,
    params: RequestParams = {},
  ) =>
    this.http.request<PlaidItemCombinedResponseDto, void>({
      path: `/plaid/${plaidItemId}`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Plaid
   * @name PlaidControllerRefreshInstitutionData
   * @summary Refresh institution data including logo for a Plaid item
   * @request POST:/plaid/{plaidItemId}/institution/refresh
   */
  plaidControllerRefreshInstitutionData = (
    plaidItemId: string,
    params: RequestParams = {},
  ) =>
    this.http.request<PlaidItemResponseDto, void>({
      path: `/plaid/${plaidItemId}/institution/refresh`,
      method: "POST",
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
   */
  plaidControllerGetAccounts = (
    plaidItemId: string,
    params: RequestParams = {},
  ) =>
    this.http.request<PlaidAccountDto[], void>({
      path: `/plaid/${plaidItemId}/accounts`,
      method: "GET",
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
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Plaid
   * @name PlaidControllerGetLiabilities
   * @summary Get liabilities for a Plaid item (credit cards, loans, etc.)
   * @request GET:/plaid/{plaidItemId}/liabilities
   */
  plaidControllerGetLiabilities = (
    plaidItemId: string,
    params: RequestParams = {},
  ) =>
    this.http.request<LiabilitiesGetResponseDto, void>({
      path: `/plaid/${plaidItemId}/liabilities`,
      method: "GET",
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
   */
  plaidControllerSyncAccountsForPlaidItem = (params: RequestParams = {}) =>
    this.http.request<
      {
        /** @example "Items synced successfully" */
        message?: string;
      },
      void
    >({
      path: `/plaid/items/sync`,
      method: "POST",
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
   */
  plaidControllerHandleWebhook = (params: RequestParams = {}) =>
    this.http.request<void, void>({
      path: `/plaid/webhook`,
      method: "POST",
      ...params,
    });
  /**
   * No description
   *
   * @tags Plaid
   * @name PlaidControllerCheckForUpdates
   * @summary Check for updates for a Plaid item
   * @request GET:/plaid/updates/check
   */
  plaidControllerCheckForUpdates = (params: RequestParams = {}) =>
    this.http.request<PlaidSyncDto[], void>({
      path: `/plaid/updates/check`,
      method: "GET",
      format: "json",
      ...params,
    });
}
