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

import { PullChangesDto, PushChangesDto } from "./data-contracts";
import { ContentType, HttpClient, RequestParams } from "./http-client";

export class Sync<SecurityDataType = unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  /**
   * No description
   *
   * @tags Sync
   * @name SyncControllerPullChanges
   * @summary Pull changes from server (WatermelonDB sync)
   * @request POST:/sync/pull
   * @secure
   */
  syncControllerPullChanges = (
    data: PullChangesDto,
    params: RequestParams = {},
  ) =>
    this.http.request<
      {
        changes: Record<
          string,
          {
            created?: any[];
            updated?: any[];
            deleted?: any[];
          }
        >;
        timestamp: number;
      },
      void
    >({
      path: `/sync/pull`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags Sync
   * @name SyncControllerPushChanges
   * @summary Push changes to server (WatermelonDB sync)
   * @request POST:/sync/push
   * @secure
   */
  syncControllerPushChanges = (
    data: PushChangesDto,
    params: RequestParams = {},
  ) =>
    this.http.request<void, void>({
      path: `/sync/push`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
}
